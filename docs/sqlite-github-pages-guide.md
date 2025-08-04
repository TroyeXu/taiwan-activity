# SQLite 在 GitHub Pages 的使用指南

## 一、技術原理

### GitHub Pages + SQLite 的運作方式
1. **靜態檔案託管**：GitHub Pages 只能託管靜態檔案
2. **SQLite 檔案**：`.sqlite` 檔案會被當作靜態資源下載到瀏覽器
3. **SQL.js**：在瀏覽器中使用 WebAssembly 版本的 SQLite 執行查詢
4. **唯讀模式**：無法修改資料庫，所有操作都在記憶體中

## 二、多表格的影響

### 優點 ✅
1. **資料正規化**：避免資料重複，維持資料一致性
2. **查詢彈性**：可以執行複雜的 JOIN 查詢
3. **維護容易**：資料結構清晰，易於管理

### 缺點 ❌
1. **檔案大小**：多表格會增加索引和元資料的大小
2. **查詢效能**：JOIN 操作在瀏覽器中可能較慢
3. **載入時間**：需要下載整個資料庫檔案

## 三、效能考量

### 1. 檔案大小影響
```
單表設計：
- 資料冗餘，檔案較大
- 但查詢簡單，不需 JOIN

多表設計：
- 資料正規化，檔案較小
- 但需要 JOIN，查詢複雜度增加
```

### 2. 實際測試數據
以您目前的資料結構為例：
- 6 個主要表格
- 2 個關聯表
- 預估 1000 筆活動資料

檔案大小估算：
```
activities: ~200KB
locations: ~150KB
categories: ~5KB
tags: ~10KB
activity_times: ~100KB
關聯表: ~50KB
索引: ~100KB
總計: ~615KB (壓縮後約 200-300KB)
```

## 四、最佳化建議

### 1. 保持現有多表結構 ✅
**理由：**
- 資料量不大（<1MB）
- 結構清晰，易於維護
- 查詢效能在可接受範圍

### 2. 優化策略

#### A. 資料庫優化
```sql
-- 1. 建立適當的索引
CREATE INDEX idx_locations_city ON locations(city);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_activity_times_dates ON activity_times(start_date, end_date);

-- 2. 使用 VACUUM 壓縮資料庫
VACUUM;

-- 3. 分析查詢計畫
ANALYZE;
```

#### B. 查詢優化
```typescript
// 避免 N+1 查詢問題
// ❌ 錯誤：多次查詢
const activities = await query('SELECT * FROM activities');
for (const activity of activities) {
  const location = await query('SELECT * FROM locations WHERE activity_id = ?', [activity.id]);
}

// ✅ 正確：一次 JOIN
const activities = await query(`
  SELECT a.*, l.city, l.address
  FROM activities a
  LEFT JOIN locations l ON a.id = l.activity_id
`);
```

#### C. 載入優化
```typescript
// 1. 顯示載入進度
const response = await fetch('/tourism.sqlite');
const reader = response.body?.getReader();
const contentLength = +response.headers.get('Content-Length')!;

let receivedLength = 0;
const chunks = [];

while(true) {
  const {done, value} = await reader!.read();
  if (done) break;
  
  chunks.push(value);
  receivedLength += value.length;
  
  // 更新進度
  const progress = (receivedLength / contentLength) * 100;
  console.log(`載入進度: ${progress.toFixed(0)}%`);
}

// 2. 使用 Service Worker 快取
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### 3. 何時考慮改變架構

需要重新考慮的情況：
1. **資料量超過 5MB**：載入時間會明顯變長
2. **需要即時更新**：考慮改用 API + 後端資料庫
3. **複雜查詢變慢**：考慮預先計算或快取結果

## 五、替代方案比較

### 1. 保持 SQLite 多表格（推薦）✅
```
優點：
- 結構化資料
- 複雜查詢支援
- 離線可用

缺點：
- 需要下載整個資料庫
- 無法即時更新
```

### 2. 改用 JSON 檔案
```
優點：
- 載入快速
- 可以分檔載入

缺點：
- 查詢功能受限
- 資料冗餘
- 難以維護關聯
```

### 3. 混合方案
```javascript
// 基本資料用 JSON（快速載入）
const activities = await fetch('/data/activities.json');

// 詳細資料用 SQLite（按需查詢）
const details = await query('SELECT * FROM activity_details WHERE id = ?');
```

## 六、實作建議

### 1. 維持現有架構
您目前的多表格設計是合理的，因為：
- 資料量適中
- 結構清晰
- 易於維護

### 2. 加入效能監控
```typescript
// 監控資料庫載入時間
console.time('資料庫載入');
await initDatabase();
console.timeEnd('資料庫載入');

// 監控查詢時間
console.time('查詢執行');
const results = await query(sql);
console.timeEnd('查詢執行');
```

### 3. 提供降級方案
```typescript
// 如果 SQLite 載入失敗，使用備用 JSON
try {
  await initDatabase();
} catch (error) {
  console.warn('SQLite 載入失敗，使用備用資料');
  const backup = await fetch('/data/activities-backup.json');
  // 使用 JSON 資料
}
```

## 七、部署檢查清單

- [ ] 資料庫檔案大小 < 1MB
- [ ] 已建立必要索引
- [ ] 已執行 VACUUM 壓縮
- [ ] 查詢都有使用索引
- [ ] 避免 SELECT * 查詢
- [ ] 實作載入進度顯示
- [ ] 加入錯誤處理
- [ ] 測試離線功能

## 結論

**多表格設計不會造成問題**，反而有助於：
1. 維持資料完整性
2. 減少資料冗餘
3. 提供靈活的查詢能力

只要注意優化和監控，SQLite 在 GitHub Pages 上可以運作良好。