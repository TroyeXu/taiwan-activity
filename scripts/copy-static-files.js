import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 複製靜態檔案到輸出目錄
 */
async function copyStaticFiles() {
  console.log('📦 開始複製靜態檔案...');
  
  try {
    const projectRoot = join(__dirname, '..');
    const outputDir = join(projectRoot, '.output', 'public');
    
    // 確保輸出目錄存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 複製 SQLite 檔案
    const sqliteSource = join(projectRoot, 'public', 'tourism.sqlite');
    const sqliteDest = join(outputDir, 'tourism.sqlite');
    
    // 檢查來源檔案是否存在
    try {
      const stats = await fs.stat(sqliteSource);
      console.log(`📊 SQLite 檔案大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // 複製檔案
      await fs.copyFile(sqliteSource, sqliteDest);
      console.log('✅ SQLite 檔案已複製到:', sqliteDest);
      
      // 驗證複製後的檔案
      const destStats = await fs.stat(sqliteDest);
      if (destStats.size === stats.size) {
        console.log('✅ 檔案複製驗證成功');
      } else {
        console.error('❌ 檔案大小不匹配！');
      }
    } catch (error) {
      console.error('❌ 找不到 SQLite 檔案:', sqliteSource);
      throw error;
    }
    
    // 複製其他必要的靜態檔案
    const otherFiles = ['404.html', 'favicon.ico', 'manifest.json'];
    
    for (const file of otherFiles) {
      try {
        const source = join(projectRoot, 'public', file);
        const dest = join(outputDir, file);
        await fs.copyFile(source, dest);
        console.log(`✅ 已複製: ${file}`);
      } catch (error) {
        console.warn(`⚠️ 無法複製 ${file}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 複製靜態檔案失敗:', error);
    process.exit(1);
  }
}

// 執行複製
copyStaticFiles();