# 依賴更新記錄

## 更新日期：2025-08-02

### 已更新的套件

1. **element-plus**: 2.4.4 → 2.10.5
   - 修復了深層選擇器警告問題
   - 改善了性能和穩定性

2. **typescript**: 5.8.3 → 5.9.2
   - 新的 TypeScript 功能和改進
   - 更好的類型推斷

3. **vue-tsc**: 3.0.3 → 3.0.5
   - 改善了 Vue 組件的類型檢查

4. **drizzle-orm**: 0.29.5 → 0.44.4 ⚠️ 重大更新
   - 可能需要調整一些 API 使用方式
   - 查看 [遷移指南](https://orm.drizzle.team/docs/migrations)

5. **drizzle-kit**: 0.20.18 → 0.31.4 ⚠️ 重大更新
   - 命令可能有變更
   - 配置格式可能需要調整

### Node.js 版本要求

⚠️ **重要提醒**：Nuxt 4.0.2 需要 Node.js v20.19.0 或更高版本
- 當前版本：v20.17.0
- 建議升級到：v20.19.0+ 或 v22.x

```bash
# 使用 nvm 升級 Node.js
nvm install 20.19.0
nvm use 20.19.0
```

### 可能的破壞性變更

1. **Drizzle ORM 0.44.x**
   - `db.select()` API 可能有變更
   - 遷移腳本可能需要調整
   - 某些查詢方法可能已重命名

2. **需要檢查的檔案**
   - `/db/index.ts` - 資料庫初始化
   - `/server/utils/database.ts` - 資料庫工具
   - 所有 API 端點檔案

### 未更新的套件（需要手動處理）

1. **better-sqlite3**: 9.6.0 → 12.2.0
   - 等待確認與 Drizzle ORM 0.44 的相容性

2. **@typescript-eslint/***：6.21.0 → 8.38.0
   - 需要更新 ESLint 到 v9.x
   - 可能需要調整 ESLint 配置

3. **eslint**: 8.57.1 → 9.32.0
   - 配置格式有重大變更
   - 需要更新配置檔案

### 建議的後續步驟

1. 測試資料庫功能是否正常
2. 執行 `npm run type-check` 檢查類型錯誤
3. 執行 `npm run dev` 測試應用程式
4. 如果有問題，可以回滾：
   ```bash
   cp package.json.backup package.json
   rm -rf node_modules package-lock.json
   npm install
   ```

### 安全性漏洞

- 發現 4 個中等嚴重性漏洞
- 執行 `npm audit` 查看詳情
- 謹慎使用 `npm audit fix --force`（可能會破壞相容性）