import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

async function setupDatabase() {
  console.log('🔧 設置資料庫環境...');

  try {
    // 確保資料目錄存在
    const dataDir = path.join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log('📁 已建立 data 目錄');
    }

    // 建立資料庫連接
    const dbPath = path.join(dataDir, 'tourism.db');
    const sqlite = new Database(dbPath);
    
    console.log(`📦 資料庫路徑: ${dbPath}`);

    // 基本設定
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    console.log('⚙️ 基本設定完成');

    // 嘗試載入 SpatiaLite 擴展
    try {
      // 常見的 SpatiaLite 路徑
      const spatialitePaths = [
        'mod_spatialite',
        '/usr/lib/x86_64-linux-gnu/mod_spatialite.so',
        '/usr/local/lib/mod_spatialite.dylib',
        '/opt/homebrew/lib/mod_spatialite.dylib',
        '/usr/lib/mod_spatialite.so'
      ];

      let spatialiteLoaded = false;
      for (const libPath of spatialitePaths) {
        try {
          sqlite.exec(`SELECT load_extension('${libPath}')`);
          console.log(`✅ SpatiaLite 擴展載入成功: ${libPath}`);
          spatialiteLoaded = true;
          break;
        } catch (e) {
          // 繼續嘗試下一個路徑
        }
      }

      if (spatialiteLoaded) {
        // 初始化空間元數據
        try {
          sqlite.exec('SELECT InitSpatialMetaData(1)');
          console.log('🌍 空間元數據初始化完成');
        } catch (error) {
          // 元數據可能已存在
          console.log('ℹ️ 空間元數據已存在或初始化失敗');
        }
      } else {
        console.warn('⚠️ SpatiaLite 擴展載入失敗，將使用基本地理功能');
        console.log('💡 提示: 安裝 SpatiaLite 以獲得完整地理功能支援');
        console.log('   macOS: brew install spatialite-tools');
        console.log('   Ubuntu: sudo apt-get install spatialite-bin');
      }

    } catch (error) {
      console.warn('⚠️ SpatiaLite 擴展設定失敗:', error.message);
    }

    // 執行 Drizzle 遷移
    console.log('🚀 執行資料庫遷移...');
    const db = drizzle(sqlite);
    
    const migrationsFolder = path.join(process.cwd(), 'db', 'migrations');
    if (existsSync(migrationsFolder)) {
      await migrate(db, { migrationsFolder });
      console.log('✅ 資料庫遷移完成');
    } else {
      console.log('ℹ️ 沒有找到遷移文件，跳過遷移');
    }

    // 測試基本查詢
    const testQuery = sqlite.prepare('SELECT sqlite_version()').get();
    console.log(`📊 SQLite 版本: ${testQuery['sqlite_version()']}`);

    // 檢查表格是否存在
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    if (tables.length > 0) {
      console.log('📋 現有表格:', tables.map(t => t.name).join(', '));
    } else {
      console.log('ℹ️ 尚未建立資料表');
    }

    sqlite.close();
    console.log('🎉 資料庫設置完成！');

  } catch (error) {
    console.error('❌ 資料庫設置失敗:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => {
      console.log('✅ 設置腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 設置腳本執行失敗:', error);
      process.exit(1);
    });
}

export { setupDatabase };