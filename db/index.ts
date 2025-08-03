import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

// 使用 GitHub repo 中的 SQLite 檔案
const DATABASE_PATH = './database/tourism.sqlite';

// Initialize database
const sqlite = new Database(DATABASE_PATH);
const db = drizzle(sqlite, { schema });

// 啟用外鍵約束
sqlite.pragma('foreign_keys = ON');

// 嘗試載入 SpatiaLite 擴展（可選）
try {
  sqlite.exec('SELECT load_extension("mod_spatialite")');
  console.log('✅ SpatiaLite extension loaded');
} catch (error) {
  console.log('ℹ️ Using basic geo functions (SpatiaLite not available)');
}

// 匯出資料庫實例
export { db };
export { sqlite as sqlite3 };

// 執行遷移
export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: './db/migrations' });
    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// 關閉資料庫連接
export function closeDatabase() {
  sqlite.close();
  console.log('📦 Database connection closed');
}

// 在 Node.js 進程退出時關閉資料庫
if (typeof process !== 'undefined') {
  process.on('exit', closeDatabase);
  process.on('SIGINT', closeDatabase);
  process.on('SIGTERM', closeDatabase);
}
