前資料庫架構說明

一、技術架構

1. 資料庫引擎

- 使用 SQLite 作為資料庫
- 透過 sql.js (WebAssembly 版本) 在瀏覽器端運行
- 資料庫檔案位於 /public/tourism.sqlite (約 420KB)

2. 資料存取層級
   瀏覽器 → sql.js (WASM) → SQLite 檔案 → 查詢結果

二、資料表結構

核心資料表：

1. activities - 活動主表
   - id, name, description, summary
   - status (狀態：active/pending)
   - quality_score (品質分數)
   - price, price_type, currency (價格資訊)
   - view_count, favorite_count, click_count (統計資料)
   - popularity_score (熱門度)

2. locations - 地點資訊
   - 關聯到 activities
   - address, district, city, region
   - latitude, longitude (座標)
   - venue, landmarks

3. activity_times - 活動時間
   - 關聯到 activities
   - start_date, end_date, start_time, end_time
   - timezone, is_recurring, recurrence_rule

4. categories - 分類
   - 8 個預設分類（音樂、展覽、運動等）
   - name, slug, color_code, icon

5. tags - 標籤
   - 靈活的標記系統
   - name, slug, category, usage_count

關聯表：

- activity_categories (活動-分類 多對多)
- activity_tags (活動-標籤 多對多)
- user_favorites (使用者收藏)

三、使用層面架構

1. Composables 層
   useSqlite.ts // 底層 SQL 操作
   useActivitiesClient.ts // 活動資料存取
   useCategoriesClient.ts // 分類資料存取

2. 主要功能

- 查詢活動: 支援分頁、搜尋、篩選（分類、城市、地區）
- 地理查詢: 根據經緯度查找附近活動
- 健康監控: 資料庫連接狀態追蹤
- 錯誤處理: 自動重試、錯誤分類

3. 資料流程
   使用者操作
   ↓
   Vue 組件
   ↓
   Composable (useActivitiesClient)
   ↓
   useSqlite (SQL 查詢)
   ↓
   sql.js (執行查詢)
   ↓
   SQLite 檔案

四、部署架構

- 靜態部署: 整個應用是 SPA，部署在 GitHub Pages
- 資料庫檔案: 作為靜態資源提供 (/taiwan-activity/tourism.sqlite)
- 無後端: 所有查詢在瀏覽器端執行

五、優缺點

優點：

- 無需後端伺服器
- 快速的本地查詢
- 簡單的部署流程
- 離線可用

缺點：

- 需下載整個資料庫檔案
- 無法即時更新資料
- 受瀏覽器記憶體限制
- 不適合大量資料

這個架構適合中小型、更新頻率不高的資料集，特別適合展示型網站。
