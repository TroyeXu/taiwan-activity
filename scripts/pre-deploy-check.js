#!/usr/bin/env node

/**
 * 部署前檢查腳本
 * 確保所有設定正確無誤
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 開始部署前檢查...\n');

let hasError = false;

// 1. 檢查 nuxt.config.ts 的 baseURL
console.log('1. 檢查 baseURL 設定...');
const nuxtConfig = fs.readFileSync('nuxt.config.ts', 'utf-8');
if (nuxtConfig.includes("baseURL: '/taiwan-activity/'")) {
  console.log('   ✅ baseURL 設定正確');
} else {
  console.log('   ❌ baseURL 設定錯誤，應該是 /taiwan-activity/');
  hasError = true;
}

// 2. 檢查資料庫檔案
console.log('\n2. 檢查資料庫檔案...');
const dbPath = path.join(__dirname, '../public/tourism.sqlite');
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   ✅ tourism.sqlite 存在 (大小: ${sizeMB} MB)`);
  
  if (stats.size > 5 * 1024 * 1024) {
    console.log('   ⚠️  警告：資料庫檔案大於 5MB，可能影響載入速度');
  }
} else {
  console.log('   ❌ tourism.sqlite 不存在');
  hasError = true;
}

// 3. 檢查 GitHub Actions 檔案
console.log('\n3. 檢查 GitHub Actions...');
const workflowPath = path.join(__dirname, '../.github/workflows/deploy.yml');
if (fs.existsSync(workflowPath)) {
  console.log('   ✅ deploy.yml 存在');
} else {
  console.log('   ❌ deploy.yml 不存在');
  hasError = true;
}

// 4. 檢查必要的靜態檔案
console.log('\n4. 檢查靜態檔案...');
const requiredFiles = [
  'public/favicon.ico',
  'public/404.html',
  'public/manifest.json'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    console.log(`   ✅ ${file} 存在`);
  } else {
    console.log(`   ❌ ${file} 不存在`);
    hasError = true;
  }
});

// 5. 檢查 package.json scripts
console.log('\n5. 檢查 build scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
if (packageJson.scripts.generate) {
  console.log('   ✅ generate script 存在');
} else {
  console.log('   ❌ generate script 不存在');
  hasError = true;
}

// 6. 檢查環境變數檔案不應該被提交
console.log('\n6. 檢查敏感檔案...');
if (fs.existsSync('.env')) {
  console.log('   ⚠️  警告：.env 檔案存在，確保已加入 .gitignore');
}

// 最終結果
console.log('\n' + '='.repeat(50));
if (hasError) {
  console.log('❌ 部署前檢查失敗，請修正上述問題');
  process.exit(1);
} else {
  console.log('✅ 部署前檢查通過！');
  console.log('\n下一步：');
  console.log('1. 執行 npm run generate 生成靜態檔案');
  console.log('2. 執行 git add . && git commit -m "Deploy to GitHub Pages"');
  console.log('3. 執行 git push origin main');
  console.log('4. 前往 GitHub Settings → Pages 確認部署狀態');
}