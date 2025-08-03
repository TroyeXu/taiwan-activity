import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../db/schema';

// 使用 lazy loading 來避免在客戶端載入
let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

export function getDatabase() {
  if (!_db) {
    // 初始化資料庫
    _sqlite = new Database('./database/tourism.sqlite', {
      readonly: false,
      fileMustExist: true,
    });

    // 啟用外鍵約束
    _sqlite.pragma('foreign_keys = ON');

    // 建立 Drizzle 實例
    _db = drizzle(_sqlite, { schema });
  }

  return _db;
}

export function getSqlite() {
  if (!_sqlite) {
    getDatabase(); // 確保資料庫已初始化
  }
  return _sqlite;
}

// 關閉資料庫連接
export function closeDatabase() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}
