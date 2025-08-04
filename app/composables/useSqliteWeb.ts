/**
 * Web 環境專用的 SQLite 載入器
 * 針對 GitHub Pages 優化
 */
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let isInitializing = false;

export const useSqliteWeb = () => {
  /**
   * 初始化 SQL.js
   */
  const initSqlJs = async (): Promise<SqlJsStatic> => {
    if (SQL) return SQL;
    
    console.log('🚀 初始化 SQL.js...');
    
    // 動態導入 sql.js
    const sqlJsModule = await import('sql.js');
    
    SQL = await sqlJsModule.default({
      locateFile: (file: string) => {
        // 使用 CDN 提供的 WASM 檔案
        if (file === 'sql-wasm.wasm') {
          return 'https://sql.js.org/dist/sql-wasm.wasm';
        }
        return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
      },
    });
    
    console.log('✅ SQL.js 初始化成功');
    return SQL;
  };

  /**
   * 載入資料庫檔案
   */
  const loadDatabaseFile = async (): Promise<ArrayBuffer> => {
    console.log('📂 開始載入資料庫檔案...');
    
    // 取得當前環境資訊
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const origin = window.location.origin;
    
    console.log('📍 當前環境:', { hostname, pathname, origin });
    
    // 構建可能的 URL
    const possibleUrls: string[] = [];
    
    // 1. GitHub Pages 直接路徑
    if (hostname.includes('github.io')) {
      // 從 URL 推斷專案名稱
      const pathSegments = pathname.split('/').filter(Boolean);
      const projectName = pathSegments[0] || 'taiwan-activity';
      
      possibleUrls.push(
        `${origin}/${projectName}/tourism.sqlite`,
        `https://troyexu.github.io/taiwan-activity/tourism.sqlite`
      );
    }
    
    // 2. 本地開發環境
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      possibleUrls.push(
        '/tourism.sqlite',
        `${origin}/tourism.sqlite`
      );
    }
    
    // 3. CDN 備用方案（推薦）
    possibleUrls.push(
      // jsDelivr CDN - 最快且穩定
      'https://cdn.jsdelivr.net/gh/TroyeXu/taiwan-activity@main/public/tourism.sqlite',
      // GitHub Raw
      'https://raw.githubusercontent.com/TroyeXu/taiwan-activity/main/public/tourism.sqlite'
    );
    
    console.log('🔍 嘗試載入的 URL:', possibleUrls);
    
    // 依序嘗試載入
    for (const url of possibleUrls) {
      try {
        console.log(`📥 嘗試: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          cache: 'default',
          mode: 'cors',
        });
        
        if (!response.ok) {
          console.log(`❌ 回應錯誤 (${response.status}): ${url}`);
          continue;
        }
        
        const buffer = await response.arrayBuffer();
        
        // 驗證檔案
        if (buffer.byteLength < 100) {
          console.log(`❌ 檔案太小，可能無效: ${url}`);
          continue;
        }
        
        // 檢查 SQLite 檔案頭
        const header = new Uint8Array(buffer, 0, 16);
        const headerStr = Array.from(header)
          .map(b => String.fromCharCode(b))
          .join('');
        
        if (headerStr.startsWith('SQLite format 3')) {
          console.log(`✅ 成功載入資料庫 (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB): ${url}`);
          return buffer;
        } else {
          console.log(`❌ 非 SQLite 檔案: ${url}`);
        }
      } catch (error) {
        console.error(`❌ 載入失敗: ${url}`, error);
      }
    }
    
    throw new Error('無法載入資料庫檔案：所有嘗試都失敗');
  };

  /**
   * 初始化資料庫
   */
  const initDatabase = async (): Promise<Database> => {
    if (db) return db;
    
    if (isInitializing) {
      // 等待初始化完成
      while (isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (db) return db;
    }
    
    isInitializing = true;
    
    try {
      // 初始化 SQL.js
      const sql = await initSqlJs();
      
      // 載入資料庫檔案
      const buffer = await loadDatabaseFile();
      
      // 創建資料庫實例
      db = new sql.Database(new Uint8Array(buffer));
      
      // 測試查詢
      const testResult = db.exec('SELECT COUNT(*) as count FROM sqlite_master');
      console.log('✅ 資料庫初始化成功，表格數量:', testResult[0]?.values[0][0]);
      
      return db;
    } catch (error) {
      console.error('❌ 資料庫初始化失敗:', error);
      throw error;
    } finally {
      isInitializing = false;
    }
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
   * 重置資料庫
   */
  const resetDatabase = () => {
    if (db) {
      db.close();
      db = null;
    }
    isInitializing = false;
    console.log('🔄 資料庫已重置');
  };

  return {
    initDatabase,
    query,
    resetDatabase,
    // 匯出原始方法供測試使用
    loadDatabaseFile,
  };
};