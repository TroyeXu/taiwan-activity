# 開發工具實際使用指南

## 一、快速開始

### 1. 啟動開發環境
```bash
npm run dev
```

### 2. 開啟瀏覽器控制台（F12）

### 3. 確認工具載入
```javascript
// 應該看到以下訊息
🛠️ 資料驗證工具已載入
📊 資料檢查工具已載入
📊 效能監控工具已載入
```

## 二、實際使用案例

### 📊 案例 1：檢查資料狀況

**場景**：想了解目前資料庫有哪些資料

```javascript
// 1. 快速檢查所有資料
inspectData()

// 輸出範例：
// === 資料庫連接狀態 ===
// 狀態: healthy
// 
// === 活動資料統計 ===
// 總活動數: 150
// 不完整資料: 0
// 
// === 城市資料分布 ===
// ┌─────────┬────────┬───────┐
// │ (index) │  city  │ count │
// ├─────────┼────────┼───────┤
// │    0    │ 台北市 │  45   │
// │    1    │ 台中市 │  35   │
// │    2    │ 高雄市 │  30   │
// └─────────┴────────┴───────┘
```

### 🔍 案例 2：測試城市篩選

**場景**：測試「台北市」的篩選是否正常

```javascript
// 1. 測試篩選功能
testFilter({ cities: ['台北市'] })

// 輸出範例：
// 🧪 測試篩選查詢
// 篩選條件: { cities: ['台北市'] }
// 查詢執行時間: 45.23ms
// 查詢結果: 45 筆
// 
// 第一筆結果:
// ID: act-001
// 名稱: 2024台北音樂節
// 城市: 台北市
// 分類: 音樂表演, 文化藝術
```

### 🐛 案例 3：檢查特定活動資料

**場景**：某個活動顯示異常，需要檢查原始資料

```javascript
// 1. 先找出活動 ID（從網頁上點擊活動看 URL 或控制台）
// 2. 檢查該活動的完整資料
inspectActivity('act-001')

// 輸出範例：
// 🔍 檢查活動 ID: act-001
// 
// 基本資料:
// ┌─────────┬──────────────┬─────────────────┐
// │ (index) │     name     │   description   │
// ├─────────┼──────────────┼─────────────────┤
// │    0    │ 2024台北音樂節 │ 年度最大音樂盛會... │
// └─────────┴──────────────┴─────────────────┘
// 
// 位置資料:
// ┌─────────┬────────┬─────────┬───────────┐
// │ (index) │  city  │ district│  address  │
// ├─────────┼────────┼─────────┼───────────┤
// │    0    │ 台北市 │ 信義區  │ 松壽路9號  │
// └─────────┴────────┴─────────┴───────────┘
```

### ⚡ 案例 4：測試複雜篩選效能

**場景**：測試多條件篩選的效能

```javascript
// 1. 測試 JOIN 查詢效能
testJoinPerf()

// 輸出範例：
// 🧪 測試多表格 JOIN 效能...
// ┌─────────┬─────────────────────┬──────────┬─────────┐
// │ (index) │      測試項目        │ 執行時間  │  狀態   │
// ├─────────┼─────────────────────┼──────────┼─────────┤
// │    0    │ 簡單查詢（單表）      │  8.45ms  │ ✅ 成功 │
// │    1    │ 單一 JOIN           │  15.23ms │ ✅ 成功 │
// │    2    │ 多重 JOIN           │  45.67ms │ ✅ 成功 │
// │    3    │ 複雜查詢（含篩選）    │  89.12ms │ ✅ 成功 │
// └─────────┴─────────────────────┴──────────┴─────────┘

// 2. 查看效能報告
perfReport()

// 3. 取得優化建議
perfSuggestions()
```

### ✅ 案例 5：驗證資料格式

**場景**：確認前端資料格式是否正確

```javascript
// 1. 取得一筆活動資料
const { activities } = useActivitiesClient();
const activity = activities.value[0];

// 2. 驗證資料格式
DataValidator.validateActivity(activity)

// 輸出範例：
// {
//   valid: false,
//   errors: [
//     '缺少活動 ID',
//     '無效的城市名稱: 台北'  // 應該是「台北市」
//   ]
// }
```

### 🔧 案例 6：偵錯篩選問題

**場景**：篩選沒有結果，需要找出原因

```javascript
// 1. 檢查當前篩選條件
const { filters } = useFilters();
console.log('當前篩選:', filters.value);

// 2. 驗證篩選條件格式
DataValidator.validateSearchFilters(filters.value)

// 3. 手動測試 SQL 查詢
const { query } = useSqlite();
const result = await query(`
  SELECT COUNT(*) as count 
  FROM activities a
  LEFT JOIN locations l ON a.id = l.activity_id
  WHERE l.city = '台北市'
`);
console.log('台北市活動數:', result[0].count);

// 4. 如果沒有結果，檢查資料
const cities = await query('SELECT DISTINCT city FROM locations');
console.table(cities); // 看看資料庫裡到底有哪些城市
```

## 三、常見問題排查流程

### 問題 1：「篩選後沒有結果」

```javascript
// 步驟 1：檢查資料庫有沒有資料
inspectData()

// 步驟 2：檢查篩選條件
const { filters } = useFilters();
console.log('篩選條件:', filters.value);

// 步驟 3：測試單一條件
testFilter({ cities: ['台北市'] })  // 只測試城市
testFilter({ categories: ['music'] }) // 只測試分類

// 步驟 4：檢查資料格式
dataReport()
```

### 問題 2：「載入很慢」

```javascript
// 步驟 1：監控載入時間
console.time('頁面載入');
location.reload();
// 看控制台的時間

// 步驟 2：檢查資料庫大小
perfReport()

// 步驟 3：測試查詢效能
testJoinPerf()

// 步驟 4：清除快取重試
clearPerfCache()
```

### 問題 3：「資料顯示不正確」

```javascript
// 步驟 1：找出問題活動的 ID
// （從網頁上點擊或從 activities.value 找）

// 步驟 2：檢查原始資料
inspectActivity('問題活動的ID')

// 步驟 3：檢查資料轉換
const { activities } = useActivitiesClient();
const problem = activities.value.find(a => a.id === '問題活動的ID');
console.log('轉換後資料:', problem);

// 步驟 4：驗證資料格式
DataValidator.validateActivity(problem)
```

## 四、進階技巧

### 1. 批量測試所有城市
```javascript
const cities = ['台北市', '台中市', '高雄市'];
for (const city of cities) {
  console.log(`\n測試 ${city}:`);
  await testFilter({ cities: [city] });
}
```

### 2. 監控即時效能
```javascript
// 開啟效能監控
let count = 0;
const interval = setInterval(async () => {
  count++;
  console.log(`第 ${count} 次測試:`);
  await testFilter({ 
    cities: ['台北市'], 
    categories: ['music'] 
  });
  if (count >= 5) clearInterval(interval);
}, 2000);
```

### 3. 產生測試資料
```javascript
// 生成測試活動
const testActivity = TestDataGenerator.generateTestActivity({
  name: '測試音樂會',
  location: {
    city: '台北市',
    district: '信義區'
  }
});
console.log('測試活動:', testActivity);

// 驗證測試資料
DataValidator.validateActivity(testActivity);
```

## 五、快速參考卡

```javascript
// === 基本檢查 ===
inspectData()              // 檢查所有資料
inspectActivity('id')      // 檢查特定活動
dataReport()               // 產生資料報告

// === 篩選測試 ===
testFilter({ cities: ['台北市'] })              // 測試城市
testFilter({ categories: ['music'] })           // 測試分類
testFilter({ tags: ['indoor'] })                // 測試標籤
testFilter({ 
  cities: ['台北市'],
  categories: ['music'],
  priceRange: { min: 0, max: 0 }
})                                              // 測試組合條件

// === 效能監控 ===
testJoinPerf()             // 測試 JOIN 效能
perfReport()               // 效能報告
perfSuggestions()          // 優化建議
clearPerfCache()           // 清除快取

// === 資料驗證 ===
DataValidator.validateActivity(activity)         // 驗證活動
DataValidator.validateSearchFilters(filters)     // 驗證篩選
TestDataGenerator.generateTestActivity()         // 生成測試資料
```

## 六、部署前檢查清單

在部署到 GitHub Pages 前，使用這些工具進行最終檢查：

```javascript
// 1. 資料完整性檢查
await inspectData();
// 確認沒有「不完整資料」

// 2. 效能檢查
await testJoinPerf();
// 確認所有查詢 < 100ms

// 3. 篩選功能檢查
const testCases = [
  { cities: ['台北市'] },
  { categories: ['music'] },
  { tags: ['indoor'] },
  { cities: ['台北市'], categories: ['music'] }
];

for (const testCase of testCases) {
  await testFilter(testCase);
  // 確認都有結果
}

// 4. 產生最終報告
await dataReport();
await perfReport();
```

這些工具讓您能夠：
- 🔍 快速診斷問題
- ⚡ 監控效能表現
- ✅ 驗證資料正確性
- 📊 產生詳細報告

記得這些工具只在開發環境可用，不會影響生產環境！