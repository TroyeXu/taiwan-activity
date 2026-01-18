# 台灣觀光活動地圖 🗺️

用互動式地圖探索台灣觀光活動，支援搜尋、篩選與收藏管理。

English README: [README.en.md](README.en.md)

## 功能特色

- 🗺️ **互動地圖** - Leaflet 標記與群聚顯示活動位置
- 🔎 **多條件搜尋** - 關鍵字、分類、地區、日期與收藏篩選
- ⭐ **收藏管理** - 收藏清單、分組檢視與匯出
- 📱 **響應式介面** - 手機、平板與桌面皆可流暢使用

## 技術架構

- **前端框架**: Nuxt 4 + Vue 3
- **UI**: Element Plus + Tailwind CSS
- **地圖服務**: Leaflet + OpenStreetMap
- **資料**: SQLite (`public/tourism.sqlite`) + SQL.js
- **狀態管理**: Pinia
- **開發工具**: TypeScript + ESLint + Prettier + Vitest

## 快速開始

### 環境需求

- Node.js 18+
- npm

### 安裝與啟動

```bash
npm install
npm run dev
```

開啟瀏覽器訪問 http://localhost:3000

### 環境變數

複製 `.env.example` 為 `.env`，依需求調整：

- `NUXT_PUBLIC_APP_URL`: 前端 base URL（預設 `http://localhost:3000`）
- `NUXT_PUBLIC_DEBUG_LOGS`: 是否保留除錯 log（`true`/`false`）
- `CLOUDINARY_BASE_URL`: Nuxt Image 的 Cloudinary base URL（可選）
- `CLAUDE_API_KEY`: 爬蟲/資料處理使用（Nuxt App 非必填）

若要使用爬蟲工具，請同步參考 `crawler/.env.example`。

## 常用指令

```bash
# 開發 / 建置
npm run dev
npm run build
npm run preview
npm run generate

# 程式碼品質
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck

# 測試
npm run test
npm run test:run
npm run test:coverage
npm run test:e2e
npm run test:visual
```

PWA 手動測試流程請參考 `docs/pwa-manual-test.md`。
E2E/視覺回歸測試請參考 `docs/e2e-testing.md`。
效能基準測試請參考 `docs/performance-lighthouse.md`。

## 部署 (GitHub Pages)

1. 確認 `nuxt.config.ts` 的 `app.baseURL` 為 `/<repo>/`（例如 `/taiwan-activity/`）
2. 建置靜態網站：`npm run generate`（輸出於 `.output/public`）
3. 專案已包含 `.github/workflows/deploy-simple.yml`，如需調整可參考如下

```yaml
name: Simple Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm install --legacy-peer-deps
      - name: Build
        run: npm run generate
      - name: List output files
        run: |
          echo "=== Output directory structure ==="
          ls -la .output/public/
          echo "=== Check if tourism.sqlite exists ==="
          ls -lh .output/public/tourism.sqlite || echo "tourism.sqlite not found!"
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./.output/public
          force_orphan: true
          enable_jekyll: false
          keep_files: false
          cname: # Leave empty unless you have a custom domain
```

4. GitHub Pages 設定 `Source: Deploy from a branch`，Branch: `gh-pages` / `/`
5. 訪問 `https://<user>.github.io/<repo>/`

## 專案結構

```
.
├── app/            # Nuxt App（頁面、元件、composables）
├── server/         # Nitro API
├── public/         # 靜態檔案與 tourism.sqlite
├── crawler/        # 資料抓取與匯入工具
├── scripts/        # SQL / 維護腳本
└── docs/           # 專案與資料管理說明
```

## 資料與爬蟲

- 主要資料檔案為 `public/tourism.sqlite`
- 若要更新或重新匯入資料，請參考 `docs/crawler-simple-guide.md` 與 `docs/deployment-and-data-management.md`

### 爬蟲常用指令 (crawler/)

以下指令請在 `crawler/` 目錄執行：

```bash
cd crawler
npm install

# 政府資料
npm run crawl:gov
npm run crawl:gov-quick
npm run crawl:gov-local

# 商業平台與全量
npm run crawl:all
npm run crawl:klook
npm run crawl:kkday
npm run crawl:taiwan

# 完整流程（爬取 + 轉換 + 匯入）
npm run crawl:full
npm run crawl:full-quick
npm run crawl:full-local

# 匯入 JSON 到資料庫
node import-to-database.js path/to/activities.json

# 健康檢查
npm run health
```

更多細節請參考 `crawler/HOW_TO_RUN_CRAWLERS.md`。

## 貢獻

歡迎提交 Issue 與 Pull Request。

## 授權

MIT License
