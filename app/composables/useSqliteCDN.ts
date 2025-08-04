/**
 * 使用 CDN 的 SQLite composable
 * 專為 GitHub Pages 優化
 */
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';

// 單例模式
let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

export const useSqliteCDN = () => {
  /**
   * 從 CDN 載入資料庫
   */
  const loadFromCDN = async (): Promise<ArrayBuffer> => {
    // CDN URLs - jsdelivr 是最快的
    const cdnUrls = [
      {
        name: 'jsDelivr',
        url: 'https://cdn.jsdelivr.net/gh/TroyeXu/taiwan-activity@main/public/tourism.sqlite'
      },
      {
        name: 'GitHub Raw',
        url: 'https://raw.githubusercontent.com/TroyeXu/taiwan-activity/main/public/tourism.sqlite'
      },
      {
        name: 'Statically',
        url: 'https://cdn.statically.io/gh/TroyeXu/taiwan-activity/main/public/tourism.sqlite'
      }
    ];

    console.log('🌐 開始從 CDN 載入資料庫...');

    for (const cdn of cdnUrls) {
      try {
        console.log(`📥 嘗試 ${cdn.name}: ${cdn.url}`);
        
        const response = await fetch(cdn.url, {
          method: 'GET',
          // 重要：不使用 cache 以避免 CORS 問題
          cache: 'no-cache',
          mode: 'cors',
        });

        if (!response.ok) {
          console.log(`❌ ${cdn.name} 回應錯誤: ${response.status}`);
          continue;
        }

        const buffer = await response.arrayBuffer();
        
        // 驗證檔案大小
        if (buffer.byteLength < 1000) {
          console.log(`❌ ${cdn.name} 檔案太小: ${buffer.byteLength} bytes`);
          continue;
        }

        // 驗證 SQLite 檔案頭
        const header = new Uint8Array(buffer, 0, 16);
        const headerStr = new TextDecoder().decode(header);
        
        if (!headerStr.startsWith('SQLite format 3')) {
          console.log(`❌ ${cdn.name} 非有效的 SQLite 檔案`);
          continue;
        }

        console.log(`✅ 成功從 ${cdn.name} 載入 (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
        return buffer;
        
      } catch (error) {
        console.error(`❌ ${cdn.name} 載入失敗:`, error);
      }
    }

    throw new Error('無法從任何 CDN 載入資料庫');
  };

  /**
   * 初始化資料庫
   */
  const initDatabase = async (): Promise<Database> => {
    // 如果已經有資料庫實例，直接返回
    if (db) return db;

    // 如果正在初始化，等待完成
    if (dbPromise) return await dbPromise;

    // 開始初始化
    dbPromise = (async () => {
      try {
        console.log('🚀 開始初始化資料庫...');

        // 初始化 SQL.js
        if (!SQL) {
          SQL = await initSqlJs({
            locateFile: (file: string) => {
              if (file === 'sql-wasm.wasm') {
                // 使用官方 CDN
                return 'https://sql.js.org/dist/sql-wasm.wasm';
              }
              return `https://sql.js.org/dist/${file}`;
            },
          });
          console.log('✅ SQL.js 初始化成功');
        }

        // 從 CDN 載入資料庫
        const buffer = await loadFromCDN();

        // 創建資料庫實例
        db = new SQL.Database(new Uint8Array(buffer));

        // 驗證資料庫
        const testResult = db.exec('SELECT COUNT(*) FROM sqlite_master WHERE type="table"');
        const tableCount = testResult[0]?.values[0][0] as number;
        console.log(`✅ 資料庫載入成功，包含 ${tableCount} 個資料表`);

        return db;
      } catch (error) {
        // 清理失敗的狀態
        db = null;
        dbPromise = null;
        throw error;
      }
    })();

    return await dbPromise;
  };

  /**
   * 執行查詢
   */
  const query = async (sql: string, params: any[] = []): Promise<any[]> => {
    const database = await initDatabase();
    
    try {
      const stmt = database.prepare(sql);
      stmt.bind(params);
      
      const results: any[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      
      stmt.free();
      return results;
    } catch (error) {
      console.error('查詢錯誤:', { sql, params, error });
      throw error;
    }
  };

  /**
   * 查詢單一結果
   */
  const queryOne = async (sql: string, params: any[] = []): Promise<any | null> => {
    const results = await query(sql, params);
    return results[0] || null;
  };

  /**
   * 取得活動列表
   */
  const getActivities = async (options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) => {
    let sql = `
      SELECT DISTINCT
        a.*,
        l.address, l.city, l.district, l.latitude, l.longitude
      FROM activities a
      LEFT JOIN locations l ON l.activity_id = a.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (options.search) {
      sql += ` AND (a.name LIKE ? OR a.description LIKE ?)`;
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    sql += ` ORDER BY a.id`;
    
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

  /**
   * 重置資料庫
   */
  const resetDatabase = () => {
    if (db) {
      db.close();
      db = null;
    }
    dbPromise = null;
    console.log('🔄 資料庫已重置');
  };

  return {
    initDatabase,
    query,
    queryOne,
    getActivities,
    resetDatabase,
  };
};