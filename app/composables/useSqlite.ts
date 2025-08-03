import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

// 全域 SQLite 實例
let db: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

export const useSqlite = () => {
  // 初始化 SQLite
  const initDatabase = async (): Promise<Database> => {
    if (db) return db;

    if (isInitializing && initPromise) {
      return await initPromise;
    }

    isInitializing = true;

    initPromise = (async () => {
      try {
        console.log('🔄 正在初始化 SQL.js...');

        // 初始化 sql.js
        const SQL = await initSqlJs({
          locateFile: (file: string) =>
            `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
        });

        console.log('📥 正在下載資料庫檔案...');

        // 載入資料庫檔案
        const { $config } = useNuxtApp();
        const baseURL = $config.app.baseURL || '/';
        const response = await fetch(`${baseURL}tourism.sqlite`);
        const buffer = await response.arrayBuffer();

        // 建立資料庫實例
        db = new SQL.Database(new Uint8Array(buffer));

        console.log('✅ 資料庫初始化完成！');

        return db;
      } catch (error) {
        console.error('❌ 資料庫初始化失敗:', error);
        isInitializing = false;
        initPromise = null;
        throw error;
      }
    })();

    return await initPromise;
  };

  // 執行查詢
  const query = async (sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> => {
    const database = await initDatabase();

    try {
      const stmt = database.prepare(sql);
      const results: Record<string, unknown>[] = [];

      stmt.bind(params);

      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }

      stmt.free();

      return results;
    } catch (error) {
      console.error('查詢錯誤:', error);
      throw error;
    }
  };

  // 查詢單一結果
  const queryOne = async (
    sql: string,
    params: unknown[] = []
  ): Promise<Record<string, unknown> | null> => {
    const results = await query(sql, params);
    return results[0] || null;
  };

  // 取得所有活動
  const getActivities = async (
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      category?: string;
      city?: string;
    } = {}
  ) => {
    let sql = `
      SELECT 
        a.*,
        l.address, l.city, l.district, l.latitude, l.longitude,
        GROUP_CONCAT(c.name) as categories
      FROM activities a
      LEFT JOIN locations l ON l.activityId = a.id
      LEFT JOIN activity_categories ac ON ac.activityId = a.id
      LEFT JOIN categories c ON c.id = ac.categoryId
      WHERE 1=1
    `;

    const params: unknown[] = [];

    if (options.search) {
      sql += ` AND (a.name LIKE ? OR a.description LIKE ?)`;
      params.push(`%${options.search}%`, `%${options.search}%`);
    }

    if (options.category) {
      sql += ` AND c.slug = ?`;
      params.push(options.category);
    }

    if (options.city) {
      sql += ` AND l.city = ?`;
      params.push(options.city);
    }

    sql += ` GROUP BY a.id`;

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);

      if (options.offset) {
        sql += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    return await query(sql, params);
  };

  // 取得單一活動
  const getActivity = async (id: string) => {
    const sql = `
      SELECT 
        a.*,
        l.address, l.city, l.district, l.latitude, l.longitude,
        t.startDate, t.endDate, t.startTime, t.endTime
      FROM activities a
      LEFT JOIN locations l ON l.activityId = a.id
      LEFT JOIN activity_times t ON t.activityId = a.id
      WHERE a.id = ?
    `;

    return await queryOne(sql, [id]);
  };

  // 取得所有分類
  const getCategories = async () => {
    const sql = `SELECT * FROM categories ORDER BY name`;
    return await query(sql);
  };

  // 取得附近活動
  const getNearbyActivities = async (lat: number, lng: number, radius: number = 10) => {
    // 簡單的距離計算（使用經緯度差）
    // 1度約等於111公里
    const latDiff = radius / 111;
    const lngDiff = radius / (111 * Math.cos((lat * Math.PI) / 180));

    const sql = `
      SELECT 
        a.*,
        l.address, l.city, l.district, l.latitude, l.longitude,
        GROUP_CONCAT(c.name) as categories
      FROM activities a
      INNER JOIN locations l ON l.activityId = a.id
      LEFT JOIN activity_categories ac ON ac.activityId = a.id
      LEFT JOIN categories c ON c.id = ac.categoryId
      WHERE l.latitude BETWEEN ? AND ?
        AND l.longitude BETWEEN ? AND ?
      GROUP BY a.id
      LIMIT 50
    `;

    return await query(sql, [lat - latDiff, lat + latDiff, lng - lngDiff, lng + lngDiff]);
  };

  return {
    initDatabase,
    query,
    queryOne,
    getActivities,
    getActivity,
    getCategories,
    getNearbyActivities,
  };
};
