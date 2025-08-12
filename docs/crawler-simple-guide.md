# 簡化版爬蟲整合指南

## 資料庫已準備完成

已新增以下欄位到 `activities` 表：

- `url` - 活動官方連結
- `source_url` - 資料來源網址
- `last_crawled_at` - 最後爬取時間（Unix timestamp）
- `data_hash` - 資料雜湊值（防重複）
- `external_id` - 外部系統ID

## Python 爬蟲範例

```python
import sqlite3
import hashlib
import uuid
import time

# 連接資料庫
conn = sqlite3.connect('public/tourism.sqlite')
cursor = conn.cursor()

def insert_activity(data):
    """插入新活動"""

    # 生成唯一ID
    activity_id = f"act_{uuid.uuid4().hex[:8]}"

    # 生成資料雜湊（用於防重複）
    content = f"{data['name']}_{data.get('city', '')}_{data.get('date', '')}"
    data_hash = hashlib.md5(content.encode()).hexdigest()

    # 檢查是否已存在
    cursor.execute(
        "SELECT id FROM activities WHERE data_hash = ?",
        (data_hash,)
    )
    if cursor.fetchone():
        print(f"活動已存在: {data['name']}")
        return None

    # 插入活動主資料
    cursor.execute("""
        INSERT INTO activities (
            id, name, description, summary,
            status, price, price_type,
            url, source_url, external_id, data_hash,
            last_crawled_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        activity_id,
        data['name'],
        data.get('description', ''),
        data.get('summary', ''),
        'active',
        data.get('price', 0),
        'free' if data.get('price', 0) == 0 else 'paid',
        data.get('url'),
        data.get('source_url'),
        data.get('external_id', f"crawl_{activity_id}"),
        data_hash,
        int(time.time()),  # last_crawled_at
        int(time.time()),  # created_at
        int(time.time())   # updated_at
    ))

    # 插入位置資料
    if 'city' in data:
        location_id = f"loc_{uuid.uuid4().hex[:8]}"
        cursor.execute("""
            INSERT INTO locations (
                id, activity_id, address, city, region,
                latitude, longitude, venue
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            location_id,
            activity_id,
            data.get('address', ''),
            data['city'],
            get_region_by_city(data['city']),  # 轉換城市到地區
            data.get('latitude'),
            data.get('longitude'),
            data.get('venue', '')
        ))

    # 插入時間資料
    if 'start_date' in data:
        time_id = f"time_{uuid.uuid4().hex[:8]}"
        cursor.execute("""
            INSERT INTO activity_times (
                id, activity_id, start_date, end_date,
                start_time, end_time, timezone
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            time_id,
            activity_id,
            data['start_date'],
            data.get('end_date'),
            data.get('start_time'),
            data.get('end_time'),
            'Asia/Taipei'
        ))

    conn.commit()
    print(f"✅ 新增活動: {data['name']}")
    return activity_id

def update_activity(external_id, data):
    """更新現有活動"""

    # 找到活動
    cursor.execute(
        "SELECT id FROM activities WHERE external_id = ?",
        (external_id,)
    )
    result = cursor.fetchone()
    if not result:
        print(f"找不到活動: {external_id}")
        return None

    activity_id = result[0]

    # 更新主資料
    cursor.execute("""
        UPDATE activities SET
            name = ?,
            description = ?,
            price = ?,
            url = ?,
            last_crawled_at = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        data['name'],
        data.get('description'),
        data.get('price', 0),
        data.get('url'),
        int(time.time()),
        int(time.time()),
        activity_id
    ))

    conn.commit()
    print(f"✅ 更新活動: {data['name']}")
    return activity_id

def get_region_by_city(city):
    """根據城市名稱返回地區"""
    regions = {
        'north': ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
        'central': ['台中市', '苗栗縣', '彰化縣', '南投縣', '雲林縣'],
        'south': ['台南市', '高雄市', '嘉義市', '嘉義縣', '屏東縣'],
        'east': ['花蓮縣', '台東縣'],
        'islands': ['澎湖縣', '金門縣', '連江縣']
    }

    for region, cities in regions.items():
        if city in cities:
            return region
    return 'north'  # 預設北部

# 測試範例
if __name__ == "__main__":
    # 新活動範例
    new_activity = {
        'name': '2025 台灣燈會',
        'description': '一年一度的台灣燈會盛事',
        'summary': '璀璨燈火照亮夜空',
        'city': '台北市',
        'address': '台北市信義區市府路1號',
        'start_date': '2025-02-15',
        'end_date': '2025-03-01',
        'start_time': '18:00',
        'end_time': '22:00',
        'price': 0,
        'url': 'https://taiwanlantern.tw',
        'source_url': 'https://example.com/events/12345',
        'external_id': 'tw_lantern_2025'
    }

    insert_activity(new_activity)
```

## 標準城市名稱（必須使用）

```python
STANDARD_CITIES = [
    '台北市', '新北市', '基隆市', '桃園市',
    '新竹市', '新竹縣', '宜蘭縣',  # 北部
    '台中市', '苗栗縣', '彰化縣', '南投縣', '雲林縣',  # 中部
    '台南市', '高雄市', '嘉義市', '嘉義縣', '屏東縣',  # 南部
    '花蓮縣', '台東縣',  # 東部
    '澎湖縣', '金門縣', '連江縣'  # 離島
]
```

## 分類對應

使用現有的分類 ID：

```python
CATEGORIES = {
    'cat-music': '音樂表演',
    'cat-exhibition': '展覽',
    'cat-culture': '文化藝術',
    'cat-sports': '運動健身',
    'cat-food': '美食市集',
    'cat-outdoor': '戶外活動',
    'cat-family': '親子活動',
    'cat-education': '教育講座',
    'cat-festival': '節慶活動',
    'cat-nature': '自然生態',
    'cat-adventure': '冒險體驗'
}
```

## 防重複策略

1. **使用 data_hash**：
   - 根據「名稱+城市+日期」生成雜湊值
   - 插入前檢查是否已存在

2. **使用 external_id**：
   - 儲存來源網站的活動ID
   - 用於追蹤和更新

## 必填欄位

- `name` - 活動名稱
- `city` - 城市（必須是標準名稱）
- `start_date` - 開始日期（YYYY-MM-DD）
- `created_at` - Unix timestamp
- `updated_at` - Unix timestamp

## 注意事項

1. **時間格式**：
   - 日期：`YYYY-MM-DD`
   - 時間：`HH:MM`
   - 時間戳：Unix timestamp（整數）

2. **價格處理**：
   - 免費活動：`price = 0, price_type = 'free'`
   - 付費活動：`price > 0, price_type = 'paid'`

3. **更新頻率**：
   - 檢查 `last_crawled_at` 決定是否需要更新
   - 建議：7天以上未更新的活動優先更新
