import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import {
  DatabaseHealthMonitor,
  DatabaseError,
  DatabaseErrorType,
  withRetry,
} from '~/utils/database-health';

// 全域 SQLite 實例
let db: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

// 健康監控實例
const healthMonitor = DatabaseHealthMonitor.getInstance();

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
        console.log('🔄 開始初始化資料庫...');

        // 使用重試機制初始化 sql.js
        const SQL = await withRetry(
          async () => {
            return await initSqlJs({
              locateFile: (file: string) => {
                if (file === 'sql-wasm.wasm') {
                  return 'https://sql.js.org/dist/sql-wasm.wasm';
                }
                return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
              },
            });
          },
          { maxAttempts: 3, delay: 500, backoffMultiplier: 2 }
        );

        // 載入資料庫檔案
        const { $config } = useNuxtApp();
        const baseURL = $config.app.baseURL || '/';
        const dbPath = baseURL.endsWith('/')
          ? `${baseURL}tourism.sqlite`
          : `${baseURL}/tourism.sqlite`;

        console.log('📁 載入資料庫檔案:', dbPath);

        // 使用重試機制載入資料庫檔案
        const buffer = await withRetry(async () => {
          const response = await fetch(dbPath, {
            signal: AbortSignal.timeout(30000), // 30秒超時
          });

          if (!response.ok) {
            throw new DatabaseError(
              DatabaseErrorType.CONNECTION_FAILED,
              `無法載入資料庫檔案: ${response.status} ${response.statusText} - 路徑: ${dbPath}`
            );
          }

          const contentLength = response.headers.get('content-length');
          if (contentLength && parseInt(contentLength) === 0) {
            throw new DatabaseError(DatabaseErrorType.INVALID_DATA, '資料庫檔案為空');
          }

          return await response.arrayBuffer();
        });

        // 建立資料庫實例
        db = new SQL.Database(new Uint8Array(buffer));

        // 執行健康檢查
        const healthCheck = await healthMonitor.performHealthCheck(async () => {
          const result = db!.exec('SELECT 1 as test');
          if (!result || result.length === 0) {
            throw new Error('健康檢查查詢失敗');
          }
        });

        if (healthCheck.status === 'unhealthy') {
          throw new DatabaseError(DatabaseErrorType.CONNECTION_FAILED, '資料庫健康檢查失敗');
        }

        console.log('✅ 資料庫初始化成功', healthCheck);
        return db;
      } catch (error) {
        isInitializing = false;
        initPromise = null;

        // 記錄錯誤到健康監控
        healthMonitor.recordError(error as Error);

        // 轉換為 DatabaseError
        const dbError =
          error instanceof DatabaseError ? error : DatabaseError.fromError(error as Error);

        console.error('❌ 資料庫初始化失敗:', dbError);
        throw dbError;
      }
    })();

    return await initPromise;
  };

  // 執行查詢
  const query = async (sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> => {
    try {
      const database = await initDatabase();

      // 查詢超時控制
      const queryPromise = new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new DatabaseError(DatabaseErrorType.TIMEOUT, 'SQL 查詢超時'));
        }, 10000); // 10秒超時

        try {
          const stmt = database.prepare(sql);
          const results: Record<string, unknown>[] = [];

          stmt.bind(params as any);

          while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(row);
          }

          stmt.free();
          clearTimeout(timeout);

          // 記錄成功
          healthMonitor.recordSuccess();
          resolve(results);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });

      return await queryPromise;
    } catch (error) {
      // 記錄錯誤
      healthMonitor.recordError(error as Error);

      const dbError =
        error instanceof DatabaseError ? error : DatabaseError.fromError(error as Error);

      console.error('查詢錯誤:', { sql, params, error: dbError });
      throw dbError;
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
      region?: string;
      startDate?: string;
      endDate?: string;
      tags?: string[];
    } = {}
  ) => {
    let sql = `
      SELECT DISTINCT
        a.*,
        l.address, l.city, l.district, l.latitude, l.longitude,
        GROUP_CONCAT(DISTINCT c.name) as categories,
        at.start_date, at.end_date, at.start_time, at.end_time
      FROM activities a
      LEFT JOIN locations l ON l.activity_id = a.id
      LEFT JOIN activity_categories ac ON ac.activity_id = a.id
      LEFT JOIN categories c ON c.id = ac.category_id
      LEFT JOIN activity_times at ON at.activity_id = a.id
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

    if (options.region) {
      sql += ` AND l.region = ?`;
      params.push(options.region);
    }

    // 日期篩選
    if (options.startDate) {
      sql += ` AND at.start_date >= ?`;
      params.push(options.startDate);
    }

    if (options.endDate) {
      sql += ` AND (at.end_date <= ? OR (at.end_date IS NULL AND at.start_date <= ?))`;
      params.push(options.endDate, options.endDate);
    }

    // 標籤篩選
    if (options.tags && options.tags.length > 0) {
      const tagPlaceholders = options.tags.map(() => '?').join(',');
      sql += ` AND a.id IN (
        SELECT activity_id FROM activity_tags 
        WHERE tag_id IN (
          SELECT id FROM tags WHERE slug IN (${tagPlaceholders})
        )
      )`;
      params.push(...options.tags);
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

    console.log('SQL 查詢:', sql);
    console.log('查詢參數:', params);
    
    const results = await query(sql, params);

    return results;
  };

  // 取得單一活動
  const getActivity = async (id: string) => {
    const sql = `
      SELECT 
        a.*,
        l.address, l.city, l.district, l.latitude, l.longitude,
        t.start_date, t.end_date, t.start_time, t.end_time
      FROM activities a
      LEFT JOIN locations l ON l.activity_id = a.id
      LEFT JOIN activity_times t ON t.activity_id = a.id
      WHERE a.id = ?
    `;

    return await queryOne(sql, [id]);
  };

  // 取得所有分類
  const getCategories = async () => {
    const sql = `SELECT * FROM categories ORDER BY name`;
    return await query(sql);
  };

  // 取得所有標籤
  const getTags = async () => {
    const sql = `SELECT * FROM tags ORDER BY usage_count DESC, name`;
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
      INNER JOIN locations l ON l.activity_id = a.id
      LEFT JOIN activity_categories ac ON ac.activity_id = a.id
      LEFT JOIN categories c ON c.id = ac.category_id
      WHERE l.latitude BETWEEN ? AND ?
        AND l.longitude BETWEEN ? AND ?
      GROUP BY a.id
      LIMIT 50
    `;

    return await query(sql, [lat - latDiff, lat + latDiff, lng - lngDiff, lng + lngDiff]);
  };

  // 健康檢查 API
  const checkHealth = async () => {
    return await healthMonitor.performHealthCheck(async () => {
      await query('SELECT 1 as test');
    });
  };

  // 重置資料庫連接
  const resetDatabase = async () => {
    console.log('🔄 重置資料庫連接...');
    db = null;
    isInitializing = false;
    initPromise = null;
    healthMonitor.reset();

    // 嘗試重新初始化
    try {
      await initDatabase();
      console.log('✅ 資料庫重置成功');
    } catch (error) {
      console.error('❌ 資料庫重置失敗:', error);
      throw error;
    }
  };

  return {
    initDatabase,
    query,
    queryOne,
    getActivities,
    getActivity,
    getCategories,
    getTags,
    getNearbyActivities,
    checkHealth,
    resetDatabase,
    getHealthStatus: () => healthMonitor.getStatus(),
  };
};
