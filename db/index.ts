import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

// 建立資料庫連接
const databaseUrl = process.env.DATABASE_URL || './data/tourism.db';
const sqlite = new Database(databaseUrl);

// 啟用外鍵約束
sqlite.pragma('foreign_keys = ON');

// 嘗試載入 SpatiaLite 擴展
try {
  sqlite.exec('SELECT load_extension("mod_spatialite")');
  console.log('✅ SpatiaLite extension loaded');
  
  // 初始化空間元數據 (僅在首次使用時)
  try {
    sqlite.exec('SELECT InitSpatialMetaData(1)');
    console.log('✅ Spatial metadata initialized');
  } catch (error) {
    // 如果元數據已存在，會拋出錯誤，這是正常的
    console.log('ℹ️ Spatial metadata already exists or failed to initialize');
  }
} catch (error) {
  console.warn('⚠️ SpatiaLite extension not available, using basic geo functions');
}

// 建立 Drizzle 實例
export const db = drizzle(sqlite, { schema });

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