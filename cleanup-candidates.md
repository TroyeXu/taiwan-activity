# API 檔案清理建議

根據目前的架構分析，以下 API 檔案可能是多餘的或過度設計的：

## 1. 重複的搜尋端點

目前有 5 個不同的搜尋實現，建議只保留一個統一的搜尋端點：

- `/api/activities/search.post.ts` - 基本搜尋
- `/api/activities/advanced-search.post.ts` - 進階搜尋
- `/api/activities/fulltext-search.post.ts` - 全文搜尋
- `/api/activities/spatial-search.post.ts` - 空間搜尋
- `/api/activities/unified-search.post.ts` - 統一搜尋

建議：保留 `unified-search.post.ts` 或 `search.post.ts`，其他可以刪除。

## 2. 進階功能（可能不需要）

- `/api/crawler/` - 網頁爬蟲功能
  - `status.get.ts`
  - `trigger.post.ts`
- `/api/scheduler/` - 排程功能
  - `status.get.ts`
  - `trigger.post.ts`
- `/api/validation/` - 驗證系統
  - `batch.post.ts`
  - `submit.post.ts`
- `/api/admin/dashboard.get.ts` - 管理員儀表板
- `/api/analytics/track.post.ts` - 分析追蹤

## 3. 測試/除錯檔案

- `/api/test.get.ts` - 測試端點（應該刪除）

## 4. 可能重複的功能

- `/api/activities/popular.get.ts` - 可能與 recommend.get.ts 功能重疊
- `/api/activities/calendar.get.ts` - 如果不需要日曆視圖可以刪除
- `/api/activities/export.get.ts` - 如果不需要匯出功能可以刪除

## 建議保留的核心 API

1. `/api/activities/index.get.ts` - 活動列表
2. `/api/activities/[id].get.ts` - 單一活動詳情
3. `/api/activities/nearby.get.ts` - 附近活動
4. `/api/activities/search.post.ts` 或 `/api/activities/unified-search.post.ts` - 搜尋
5. `/api/categories/index.get.ts` - 分類列表
6. `/api/favorites/` - 收藏功能
7. `/api/health.get.ts` - 健康檢查
8. `/api/stats/system.get.ts` - 系統狀態

## 執行建議

1. 先確認這些功能是否真的不需要
2. 備份要刪除的檔案
3. 逐步刪除並測試應用程式是否正常運作
4. 更新相關的前端程式碼
