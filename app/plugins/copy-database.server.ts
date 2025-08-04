import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * 伺服器端插件：確保資料庫檔案在構建時被複製
 */
export default defineNuxtPlugin(async () => {
  // 只在構建時執行
  if (process.env.NODE_ENV === 'production' || process.env.NUXT_GENERATE) {
    console.log('📦 準備複製資料庫檔案...');
    
    try {
      const sourcePath = join(process.cwd(), 'public', 'tourism.sqlite');
      const outputPath = join(process.cwd(), '.output', 'public', 'tourism.sqlite');
      
      // 確保輸出目錄存在
      await fs.mkdir(join(process.cwd(), '.output', 'public'), { recursive: true });
      
      // 複製檔案
      await fs.copyFile(sourcePath, outputPath);
      
      console.log('✅ 資料庫檔案已複製到輸出目錄');
    } catch (error) {
      console.error('❌ 複製資料庫檔案失敗:', error);
    }
  }
});