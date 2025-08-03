import { db, runMigrations, closeDatabase } from '../db';
import { seedDatabase } from '../db/seeds';

async function initDatabase() {
  try {
    console.log('🚀 開始初始化資料庫...');

    // 執行資料庫遷移
    console.log('📋 執行資料庫遷移...');
    await runMigrations();

    // 插入種子資料
    console.log('🌱 插入種子資料...');
    await seedDatabase();

    console.log('✅ 資料庫初始化完成！');
    console.log('📁 資料庫檔案位置: ./database/tourism.sqlite');
  } catch (error) {
    console.error('❌ 資料庫初始化失敗:', error);
    process.exit(1);
  } finally {
    // 關閉資料庫連接
    closeDatabase();
  }
}

// 執行初始化
initDatabase();
