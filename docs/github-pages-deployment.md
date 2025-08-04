# GitHub Pages 部署指南

## 一、部署前檢查清單

### 1. 確認 Repository 名稱 ✅
您的 repository 名稱：`taiwan-activity`
baseURL 設定：`/taiwan-activity/`

### 2. 檢查 nuxt.config.ts ✅
```typescript
app: {
  baseURL: '/taiwan-activity/', // ✅ 已正確設定
  buildAssetsDir: '/_nuxt/',
}
```

### 3. 確認資料庫檔案位置 ✅
```
public/
├── tourism.sqlite  ✅
├── favicon.ico     ✅
├── manifest.json   ✅
└── 404.html        ✅
```

## 二、GitHub Actions 自動部署設定 ✅

已建立 `.github/workflows/deploy.yml`

## 三、部署步驟

### 1. 本地測試生產版本
```bash
# 生成靜態檔案
npm run generate

# 本地預覽
npm run preview
```

### 2. 推送到 GitHub
```bash
# 添加所有檔案
git add .

# 提交
git commit -m "Deploy to GitHub Pages"

# 推送到 main 分支
git push origin main
```

### 3. 設定 GitHub Pages

1. 前往 GitHub repository
2. Settings → Pages
3. Source 選擇 "GitHub Actions"
4. 等待 Actions 完成部署

### 4. 訪問網站
部署完成後，您的網站將在：
```
https://[您的用戶名].github.io/taiwan-activity/
```

## 四、部署前最終檢查

- [x] baseURL 設定正確 (`/taiwan-activity/`)
- [x] 資料庫檔案在 `public/` 目錄
- [x] GitHub Actions 檔案已建立
- [x] 移除開發工具（DevToolsPanel 只在開發環境顯示）
- [x] 確認所有靜態資源路徑正確

## 五、常見問題

### 問題 1：404 錯誤
**解決方案**：確認 `404.html` 檔案存在，用於處理 SPA 路由

### 問題 2：資料庫載入失敗
**解決方案**：檢查資料庫路徑是否包含 baseURL
```javascript
const dbPath = baseURL.endsWith('/')
  ? `${baseURL}tourism.sqlite`
  : `${baseURL}/tourism.sqlite`;
```

### 問題 3：樣式或圖片失效
**解決方案**：確保所有資源路徑都使用相對路徑或包含 baseURL

## 六、部署後驗證

1. **檢查首頁載入**
   - 開啟瀏覽器控制台
   - 確認沒有 404 錯誤
   - 確認資料庫載入成功

2. **測試篩選功能**
   - 選擇城市篩選
   - 選擇分類篩選
   - 確認結果正確顯示

3. **檢查地圖功能**
   - 確認地圖正常載入
   - 測試標記點點擊

4. **測試響應式設計**
   - 在手機瀏覽器測試
   - 確認介面正常顯示