# 資料庫部署指南

## 問題背景

GitHub Pages 是純靜態託管服務，無法執行伺服器端的資料庫查詢。而 SQLite 檔案通常較大且包含二進制數據，不適合直接提交到 Git 版本控制。

## 解決方案

我們使用以下策略來處理 SQLite 資料庫：

### 1. 資料庫儲存方案

- **開發環境**: 資料庫檔案存放在 `public/tourism.sqlite`
- **生產環境**: 使用 GitHub Release 儲存資料庫檔案
- **載入方式**: 瀏覽器端使用 sql.js 載入並查詢資料庫

### 2. 部署流程

#### 步驟 1: 準備資料庫
確保你的資料庫檔案位於 `public/tourism.sqlite`：

```bash
# 檢查資料庫
ls -lh public/tourism.sqlite

# 如果需要，可以從其他位置複製
cp /path/to/your/database.sqlite public/tourism.sqlite
```

#### 步驟 2: 上傳資料庫到 GitHub Release
```bash
# 上傳資料庫到 GitHub Release
npm run db:upload
```

這個命令會：
1. 檢查資料庫檔案是否存在
2. 創建或使用現有的 Git 標籤
3. 上傳資料庫到 GitHub Release

#### 步驟 3: 部署到 GitHub Pages
```bash
# 推送程式碼到 main 分支
git add .
git commit -m "Update code"
git push origin main
```

GitHub Actions 會自動：
1. 從 Release 下載最新的資料庫
2. 構建 Nuxt 應用
3. 部署到 GitHub Pages

### 3. 手動部署（如果自動部署失敗）

```bash
# 1. 確保資料庫在 .gitignore 中被排除
# 檢查 .gitignore，確保有以下設定：
# *.sqlite  # 註解掉
# !public/tourism.sqlite  # 允許這個特定檔案

# 2. 暫時提交資料庫檔案
git add -f public/tourism.sqlite
git commit -m "Add database for deployment"
git push origin main

# 3. 部署完成後，移除資料庫檔案
git rm --cached public/tourism.sqlite
git commit -m "Remove database from git"
git push origin main
```

### 4. 資料庫更新流程

當需要更新資料庫時：

```bash
# 1. 更新本地資料庫
# ... 進行資料庫更新操作 ...

# 2. 上傳新版本到 Release
npm run db:upload

# 3. 觸發重新部署
git commit --allow-empty -m "Trigger deployment with new database"
git push origin main
```

### 5. 故障排除

#### 資料庫無法載入
1. 檢查瀏覽器控制台的錯誤訊息
2. 確認 Release 中有資料庫檔案：
   ```
   https://github.com/[username]/[repo]/releases
   ```
3. 檢查 CORS 設定和檔案路徑

#### 資料庫檔案太大
- GitHub Release 單檔案限制為 2GB
- 如果檔案過大，考慮：
  - 壓縮資料庫：`VACUUM` 命令
  - 分割資料或使用外部儲存服務

#### 自動部署失敗
檢查 GitHub Actions 日誌：
```
https://github.com/[username]/[repo]/actions
```

### 6. 替代方案

如果 GitHub Release 方案不適用，可以考慮：

1. **CDN 服務**: 使用 jsDelivr 或其他 CDN
2. **對象儲存**: AWS S3、Cloudflare R2
3. **靜態 API**: 將資料庫轉換為 JSON API
4. **IndexedDB**: 首次載入後快取到瀏覽器

### 7. 最佳實踐

1. **資料庫優化**:
   ```sql
   -- 執行 VACUUM 減小檔案大小
   VACUUM;
   
   -- 建立索引提升查詢效能
   CREATE INDEX idx_activities_category ON activities(category);
   CREATE INDEX idx_activities_tags ON activities(tags);
   ```

2. **版本管理**:
   - 使用語義化版本標籤
   - 在 Release 說明中記錄資料庫變更

3. **監控**:
   - 追蹤資料庫大小
   - 監控載入時間和效能

## 相關檔案

- `.github/workflows/deploy-with-db.yml` - 自動部署工作流程
- `scripts/upload-database.js` - 上傳資料庫腳本
- `scripts/copy-static-files.js` - 複製靜態檔案腳本
- `app/composables/useGitHubPagesDatabase.ts` - 資料庫載入邏輯