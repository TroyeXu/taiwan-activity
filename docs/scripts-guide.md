# Scripts 指南

本專案提供了多個實用的 npm scripts 來協助開發和維護程式碼品質。

## 開發相關

- `npm run dev` - 啟動開發伺服器
- `npm run build` - 建置專案
- `npm run preview` - 預覽建置結果
- `npm run generate` - 生成靜態網站

## 程式碼品質檢查

### Linting (ESLint)

- `npm run lint` - 執行 ESLint 檢查，顯示所有錯誤和警告
- `npm run lint:fix` - 執行 ESLint 並自動修復可修復的問題

### 格式化 (Prettier)

- `npm run format` - 使用 Prettier 格式化所有支援的檔案類型
- `npm run format:check` - 檢查檔案是否符合 Prettier 格式（不修改檔案）

### 型別檢查 (TypeScript)

- `npm run typecheck` - 執行 TypeScript 型別檢查
- `npm run typecheck:ci` - CI 環境用的型別檢查（不安裝依賴）

### 綜合檢查

- `npm run check` - 依序執行 lint、format:check 和 typecheck
- `npm run check:fix` - 依序執行 lint:fix 和 format（自動修復問題）
- `npm run precommit` - commit 前的檢查和修復（等同於 check:fix）

## 資料庫相關

- `npm run db:init` - 初始化資料庫
- `npm run db:reset` - 重置資料庫（刪除並重新初始化）

## 其他

- `npm run clean` - 清理快取和建置檔案

## 使用建議

1. **開發時**：定期執行 `npm run check` 確保程式碼品質
2. **提交前**：執行 `npm run check:fix` 自動修復問題
3. **CI/CD**：使用 `npm run check` 進行品質檢查

## 支援的檔案類型

- JavaScript/TypeScript: `.js`, `.jsx`, `.ts`, `.tsx`
- Vue: `.vue`
- 設定檔: `.json`, `.yml`, `.yaml`
- 文檔: `.md`
- 樣式: `.css`, `.scss`
