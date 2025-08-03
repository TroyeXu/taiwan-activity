# Taiwan Activity Map 🗺️

一個展示台灣各地活動的互動式地圖應用程式，讓使用者能夠輕鬆探索和搜尋各種精彩活動。

## 功能特色

- 🗺️ **互動式地圖** - 使用 Leaflet 展示活動位置
- 🔍 **智慧搜尋** - 支援關鍵字、分類、地區等多維度搜尋
- 📍 **附近活動** - 基於地理位置尋找周邊活動
- ❤️ **收藏功能** - 保存感興趣的活動
- 📱 **響應式設計** - 完美支援手機、平板與桌面瀏覽

## 技術架構

- **前端框架**: Nuxt 3 + Vue 3
- **UI 框架**: Element Plus + Tailwind CSS
- **地圖服務**: Leaflet + OpenStreetMap
- **資料庫**: SQLite + Drizzle ORM
- **狀態管理**: Pinia
- **開發工具**: TypeScript + ESLint + Prettier

## 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn

### 安裝步驟

1. 複製專案

```bash
git clone https://github.com/TroyeXu/taiwan-activity.git
cd taiwan-activity
```

2. 安裝依賴

```bash
npm install
```

3. 初始化資料庫

```bash
npm run db:init
npm run db:seed
```

4. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問 http://localhost:3000

## 開發指令

```bash
# 開發模式
npm run dev

# 建置專案
npm run build

# 預覽建置結果
npm run preview

# 資料庫相關
npm run db:init      # 初始化資料庫
npm run db:seed      # 載入種子資料
npm run db:fake      # 產生測試資料
npm run db:reset     # 重置資料庫
npm run db:studio    # 開啟資料庫管理介面

# 程式碼品質
npm run lint         # 檢查程式碼
npm run format       # 格式化程式碼
npm run type-check   # 類型檢查
```

## 專案結構

```
taiwan-activity/
├── components/      # Vue 元件
├── pages/          # 頁面路由
├── composables/    # 組合式函數
├── stores/         # Pinia 狀態管理
├── server/         # Nitro 伺服器 API
├── db/             # 資料庫結構與種子資料
├── assets/         # 靜態資源
└── public/         # 公開檔案
```

## 資料庫設計

專案使用 SQLite 作為輕量級資料庫，主要資料表包括：

- `activities` - 活動主表
- `locations` - 地點資訊
- `categories` - 活動分類
- `tags` - 標籤系統
- `users` - 使用者資料
- `user_favorites` - 收藏記錄

## 貢獻指南

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License
