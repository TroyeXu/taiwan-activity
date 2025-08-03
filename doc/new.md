# 台灣觀光活動地圖平台 - 技術文件

## 1. 產品概述

### 1.1 產品願景

建立一個整合性的觀光活動地圖平台，協助使用者快速發現並規劃參與台灣各地的觀光活動。

### 1.2 核心價值

- **資訊整合**：從多個來源收集觀光活動資訊
- **資料準確**：透過 Claude API 驗證確保資料真實性
- **便捷搜尋**：基於位置與時間的智慧篩選
- **視覺化呈現**：Leaflet 地圖標記展示
- **互動體驗**：地圖與列表雙重檢視模式

### 1.3 目標使用者

- 國內外遊客
- 週末活動規劃者
- 文化活動愛好者
- 在地居民

## 2. 技術架構

### 2.1 前端技術堆疊

```yaml
框架: Nuxt 4 + Vue 3 + TypeScript
UI 框架: Element Plus
地圖整合: Leaflet + Vue-Leaflet
狀態管理: Pinia + VueUse
CSS 框架: Tailwind CSS
構建工具: Vite (內建於 Nuxt)
```

### 2.2 後端技術堆疊（Nuxt 全端）

```yaml
運行環境: Node.js 20 LTS
框架: Nuxt 4 Server API (Nitro)
資料庫: SQLite + Better-SQLite3
ORM: Drizzle ORM
快取: Nuxt Storage
排程: 內建排程系統
```

### 2.3 資料收集與驗證

```yaml
驗證服務: Claude API
數據品質: 自動化驗證流程
排程管理: Node-cron 整合
```

### 2.4 部署與基礎設施

```yaml
部署平台: Vercel / Netlify / Railway
資料庫: 本地 SQLite 文件
監控: 內建健康檢查 API
CDN: 部署平台內建
```

## 3. 核心功能

### 3.1 地圖展示系統

- **雙重檢視模式**
  - 互動式 Leaflet 地圖檢視
  - 傳統列表檢視
  - 無縫切換體驗

- **地圖功能**
  - 標記聚合 (Marker Clustering)
  - 自定義活動標記 (依分類顯示不同圖標顏色)
  - 彈出視窗展示活動摘要
  - 當前位置定位
  - 地圖移動自動搜尋

### 3.2 搜尋與篩選系統

- **多維度搜尋**
  - 全文搜尋 (活動名稱、描述)
  - 空間搜尋 (基於地理位置)
  - 進階搜尋 (多條件組合)
  - 附近活動搜尋

- **智慧篩選**
  - 活動分類篩選 (8 大主要分類)
  - 時間範圍篩選
  - 地區篩選 (北中南東離島)
  - 價格類型篩選
  - 距離篩選

### 3.3 活動分類系統

```yaml
主要分類:
  - 傳統節慶
  - 浪漫之旅
  - 藝術文化
  - 養生樂活
  - 美食饗宴
  - 自然生態
  - 原民慶典
  - 客家文化
```

### 3.4 收藏與推薦系統

- **個人收藏**
  - 本地儲存收藏清單
  - 收藏活動管理
  - 收藏統計追蹤

- **智慧推薦**
  - 基於位置的推薦
  - 熱門活動推薦
  - 個人化推薦算法

### 3.5 資料匯出功能

- 日曆格式匯出
- JSON 格式匯出
- 篩選結果匯出

## 4. API 設計

### 4.1 核心 API 端點

```typescript
// 活動相關
GET /api/activities              // 取得活動列表
GET /api/activities/[id]         // 取得單一活動詳情
POST /api/activities/search      // 基本搜尋
POST /api/activities/fulltext-search    // 全文搜尋
POST /api/activities/spatial-search     // 空間搜尋
POST /api/activities/advanced-search    // 進階搜尋
GET /api/activities/nearby       // 附近活動
GET /api/activities/popular      // 熱門活動
GET /api/activities/recommend    // 推薦活動
GET /api/activities/calendar     // 日曆格式
GET /api/activities/export       // 資料匯出

// 分類與地區
GET /api/categories              // 取得分類列表

// 收藏功能
POST /api/favorites              // 新增/移除收藏
GET /api/favorites/[userId]      // 取得用戶收藏

// 系統管理
GET /api/health                  // 健康檢查
GET /api/stats/system           // 系統統計
GET /api/admin/dashboard        // 管理儀表板

// 資料驗證
POST /api/validation/submit     // 提交驗證請求
POST /api/validation/batch      // 批次驗證

// 爬蟲與排程
GET /api/crawler/status         // 爬蟲狀態
POST /api/crawler/trigger       // 觸發爬蟲
GET /api/scheduler/status       // 排程狀態
POST /api/scheduler/trigger     // 觸發排程

// 分析追蹤
POST /api/analytics/track       // 行為追蹤
```

### 4.2 資料結構

```typescript
interface Activity {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  status: ActivityStatus;
  qualityScore: number;
  location?: Location;
  time?: ActivityTime;
  categories?: Category[];
  tags?: Tag[];
  price?: number;
  priceType?: 'free' | 'paid' | 'donation';
  viewCount?: number;
  favoriteCount?: number;
  popularityScore?: number;
  media?: ActivityMedia;
  distance?: number;
}

interface Location {
  address: string;
  district?: string;
  city: string;
  region: string;
  latitude?: number;
  longitude?: number;
  venue?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  colorCode?: string;
  icon?: string;
}
```

## 5. 資料庫設計

### 5.1 主要資料表

```sql
-- 活動主表
activities (
  id, name, description, summary, status,
  quality_score, price, price_type, currency,
  view_count, favorite_count, click_count,
  popularity_score, created_at, updated_at
)

-- 地點資訊表
locations (
  id, activity_id, address, district, city, region,
  latitude, longitude, venue, landmarks
)

-- 分類表
categories (
  id, name, slug, color_code, icon
)

-- 活動分類關聯表
activity_categories (
  id, activity_id, category_id
)

-- 活動時間表
activity_times (
  id, activity_id, start_date, end_date,
  start_time, end_time, timezone
)

-- 標籤表
tags (
  id, name, slug, color
)

-- 資料來源表
data_sources (
  id, name, url, type, reliability_score,
  last_crawled_at, created_at, updated_at
)

-- 驗證記錄表
validation_logs (
  id, activity_id, validation_type, status,
  score, feedback, validated_at
)
```

### 5.2 空間索引

- 地理位置空間索引 (latitude, longitude)
- 分類與地區複合索引
- 時間範圍索引

## 6. 組件架構

### 6.1 頁面組件

```
pages/
├── index.vue                 // 主頁 (地圖+搜尋)
├── activity/[id].vue        // 活動詳情頁
└── favorites.vue            // 收藏頁面
```

### 6.2 功能組件

```
components/
├── Activity/                // 活動相關組件
│   ├── ActivityCard.vue     // 活動卡片
│   ├── ActivityDetailModal.vue  // 活動詳情彈窗
│   ├── FavoriteButton.vue   // 收藏按鈕
│   └── FavoritesList.vue    // 收藏列表
├── Map/                     // 地圖相關組件
│   ├── ActivityMap.vue      // 活動地圖 (主要)
│   └── LeafletMap.vue       // 基礎地圖封裝
├── Filter/                  // 篩選相關組件
│   └── FilterPanel.vue      // 篩選面板
└── UI/                      // 通用 UI 組件
    └── ActivityCardSkeleton.vue  // 載入骨架
```

### 6.3 Composables

```
composables/
├── useActivities.ts         // 活動資料管理
├── useCategories.ts         // 分類資料管理
├── useFavorites.ts          // 收藏功能
├── useFilters.ts            // 篩選邏輯
├── useGeolocation.ts        // 地理定位
└── useLeafletMap.ts         // 地圖功能封裝
```

## 7. Claude API 驗證流程

### 7.1 驗證步驟

1. **格式檢查**
   - 檢查必要欄位是否存在
   - 驗證資料類型正確性
   - JSON 結構驗證

2. **內容驗證**
   - 地址格式與真實性驗證
   - 時間邏輯檢查 (開始時間早於結束時間)
   - 分類標籤有效性驗證
   - 描述內容合理性檢查

3. **重複檢測**
   - 比對現有資料庫記錄
   - 相似活動識別算法
   - 重複度評分機制

4. **品質評分**
   - 資料完整度評分 (0-100)
   - 來源可信度評分
   - 內容品質評分
   - 綜合品質分數計算

### 7.2 資料處理流程

1. **資料收集階段**
   - 爬蟲定期從各網站抓取資料
   - 原始資料存入暫存區
   - 資料預處理與清理

2. **資料驗證階段**
   - Claude API 接收待驗證資料
   - 執行多層驗證規則
   - 標記驗證結果與建議

3. **資料處理階段**
   - 格式標準化處理
   - 地理編碼 (地址轉座標)
   - 分類標籤自動分配
   - 時間格式統一化

4. **資料儲存階段**
   - 驗證通過資料存入主資料庫
   - 建立全文搜尋索引
   - 更新空間索引
   - 刷新快取資料

## 8. 效能優化

### 8.1 前端優化

- **地圖效能**
  - 標記聚合 (Marker Clustering)
  - 虛擬化長列表
  - 圖片懶載入
  - Canvas 渲染模式

- **搜尋優化**
  - 搜尋去抖動 (Debounce)
  - 地圖移動節流 (Throttle)
  - 結果分頁載入
  - 智慧快取機制

### 8.2 後端優化

- **資料庫優化**
  - 空間索引優化
  - 查詢結果快取
  - 連接池管理
  - 批次操作優化

- **API 效能**
  - 回應壓縮
  - 條件式快取
  - 分頁查詢
  - 並發限制

## 9. 部署配置

### 9.1 環境變數

```env
# 資料庫配置
DATABASE_URL=./data/tourism.db

# Claude API
CLAUDE_API_KEY=your_claude_api_key

# 應用配置
NUXT_PORT=3000
NUXT_HOST=0.0.0.0

# 功能開關
ENABLE_VALIDATION=true
ENABLE_CRAWLER=true
ENABLE_SCHEDULER=true
```

### 9.2 構建腳本

```json
{
  "scripts": {
    "setup": "tsx scripts/setup-database.ts",
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "generate": "nuxt generate",
    "db:generate": "drizzle-kit generate:sqlite",
    "db:push": "drizzle-kit push:sqlite",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx db/seeds/index.ts",
    "db:reset": "rm -f data/tourism.db && npm run setup && npm run db:seed"
  }
}
```

## 10. 系統監控

### 10.1 健康檢查

- API 端點狀態監控
- 資料庫連接檢查
- 記憶體使用監控
- 回應時間追蹤

### 10.2 錯誤處理

- 全域錯誤攔截
- API 錯誤統一處理
- 使用者友善錯誤訊息
- 錯誤日誌記錄

### 10.3 分析追蹤

- 使用者行為追蹤
- 搜尋查詢分析
- 熱門活動統計
- 效能指標監控

## 11. 未來擴展

### 11.1 功能擴展

- 使用者帳號系統
- 活動評論與評分
- 社群分享功能
- 活動提醒通知
- 多語言支援

### 11.2 技術升級

- 微服務架構遷移
- PostgreSQL + PostGIS
- Redis 快取層
- CDN 整合
- 容器化部署

### 11.3 資料來源擴展

- 更多政府開放資料
- 社群平台整合
- 即時活動資訊
- 使用者貢獻內容
- 商業夥伴資料接入

---

_最後更新：2025-01-28_
