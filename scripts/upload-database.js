#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 上傳資料庫檔案到 GitHub Release
 */
async function uploadDatabase() {
  try {
    const dbPath = join(__dirname, '..', 'public', 'tourism.sqlite');
    
    // 檢查檔案是否存在
    try {
      const stats = await fs.stat(dbPath);
      console.log(`📊 資料庫檔案大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('❌ 找不到資料庫檔案:', dbPath);
      process.exit(1);
    }
    
    // 取得當前 git 標籤或創建新標籤
    let tag;
    try {
      // 檢查是否有未提交的更改
      const status = execSync('git status --porcelain').toString();
      if (status) {
        console.warn('⚠️  有未提交的更改，請先提交');
        process.exit(1);
      }
      
      // 取得最新標籤
      tag = execSync('git describe --tags --abbrev=0').toString().trim();
    } catch (error) {
      // 如果沒有標籤，創建一個
      const date = new Date().toISOString().split('T')[0];
      tag = `db-${date}`;
      console.log(`📌 創建新標籤: ${tag}`);
      execSync(`git tag ${tag}`);
      execSync(`git push origin ${tag}`);
    }
    
    console.log(`🏷️  使用標籤: ${tag}`);
    
    // 使用 GitHub CLI 創建或更新 release
    try {
      // 檢查 release 是否存在
      execSync(`gh release view ${tag}`, { stdio: 'ignore' });
      
      // 如果存在，刪除舊的資料庫檔案
      try {
        execSync(`gh release delete-asset ${tag} tourism.sqlite -y`, { stdio: 'ignore' });
      } catch (e) {
        // 忽略刪除錯誤
      }
      
      // 上傳新檔案
      console.log('📤 上傳資料庫到現有 release...');
      execSync(`gh release upload ${tag} "${dbPath}" --clobber`);
    } catch (error) {
      // Release 不存在，創建新的
      console.log('📤 創建新 release 並上傳資料庫...');
      execSync(`gh release create ${tag} "${dbPath}" --title "Database Release ${tag}" --notes "SQLite database for Taiwan Activity Map"`);
    }
    
    console.log('✅ 資料庫上傳成功！');
    console.log(`🔗 下載連結: https://github.com/${process.env.GITHUB_REPOSITORY || 'TroyeXu/taiwan-activity'}/releases/download/${tag}/tourism.sqlite`);
    
  } catch (error) {
    console.error('❌ 上傳失敗:', error);
    process.exit(1);
  }
}

// 執行上傳
uploadDatabase();