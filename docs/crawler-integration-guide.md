# 爬蟲整合指南

## 1. 資料庫結構配合

### 核心原則

- **爬蟲應該配合現有資料庫結構**，不要大幅改動
- 使用 `external_id` 和 `data_hash` 防止重複
- 保持資料格式一致性

### 必要欄位對應

#### activities 表

```python
activity_data = {
    'id': generate_uuid(),  # 使用 UUID
    'name': '活動名稱',
    'description': '詳細描述',
    'summary': '簡短摘要（100字內）',
    'status': 'active',  # active, upcoming, ended
    'price': 500,  # 整數，0 表示免費
    'price_type': 'paid',  # free, paid, donation
    'external_id': 'klook_12345',  # 來源網站的ID
    'source_url': 'https://...',  # 原始連結
    'data_hash': hashlib.md5(content).hexdigest(),  # 防重複
    'created_at': int(time.time()),  # Unix timestamp
    'updated_at': int(time.time())
}
```

#### locations 表

```python
location_data = {
    'id': generate_uuid(),
    'activity_id': activity_id,
    'address': '完整地址',
    'district': '區域',  # 可為 NULL
    'city': '台北市',  # 必須符合標準城市名稱
    'region': 'north',  # north, central, south, east, islands
    'latitude': 25.0330,  # 可為 NULL
    'longitude': 121.5654,  # 可為 NULL
    'venue': '場館名稱'  # 可為 NULL
}
```

#### activity_times 表

```python
time_data = {
    'id': generate_uuid(),
    'activity_id': activity_id,
    'start_date': '2025-08-15',  # YYYY-MM-DD 格式
    'end_date': '2025-08-20',  # 可為 NULL
    'start_time': '09:00',  # HH:MM 格式，可為 NULL
    'end_time': '18:00',  # 可為 NULL
    'timezone': 'Asia/Taipei',
    'is_recurring': 0  # 0 或 1
}
```

## 2. 城市名稱標準化

### 必須使用的標準城市名稱

```python
STANDARD_CITIES = {
    # 北部
    '台北': '台北市',
    '臺北': '台北市',
    '新北': '新北市',
    '基隆': '基隆市',
    '桃園': '桃園市',
    '新竹市': '新竹市',
    '新竹縣': '新竹縣',
    '宜蘭': '宜蘭縣',

    # 中部
    '台中': '台中市',
    '臺中': '台中市',
    '苗栗': '苗栗縣',
    '彰化': '彰化縣',
    '南投': '南投縣',
    '雲林': '雲林縣',

    # 南部
    '台南': '台南市',
    '臺南': '台南市',
    '高雄': '高雄市',
    '嘉義市': '嘉義市',
    '嘉義縣': '嘉義縣',
    '屏東': '屏東縣',

    # 東部
    '花蓮': '花蓮縣',
    '台東': '台東縣',
    '臺東': '台東縣',

    # 離島
    '澎湖': '澎湖縣',
    '金門': '金門縣',
    '連江': '連江縣',
    '馬祖': '連江縣'
}
```

## 3. 分類對應

### 標準分類 (categories 表已存在)

```python
CATEGORY_MAPPING = {
    # 爬蟲關鍵字 -> 系統分類 slug
    '音樂': 'music',
    '演唱': 'music',
    '展覽': 'exhibition',
    '美術': 'exhibition',
    '運動': 'sports',
    '路跑': 'sports',
    '美食': 'food',
    '市集': 'food',
    '親子': 'family',
    '兒童': 'family',
    '文化': 'culture',
    '藝術': 'culture',
    '戶外': 'outdoor',
    '登山': 'outdoor',
    '節慶': 'festival',
    '祭典': 'festival'
}
```

## 4. 爬蟲實作範例

### Python 爬蟲基本結構

```python
import sqlite3
import hashlib
import uuid
import time
from datetime import datetime

class ActivityCrawler:
    def __init__(self, db_path='public/tourism.sqlite'):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()

    def check_duplicate(self, data_hash):
        """檢查是否重複"""
        self.cursor.execute(
            "SELECT id FROM activities WHERE data_hash = ?",
            (data_hash,)
        )
        return self.cursor.fetchone() is not None

    def insert_activity(self, data):
        """插入活動資料"""
        # 生成資料雜湊
        content = f"{data['name']}_{data['location']}_{data['date']}"
        data_hash = hashlib.md5(content.encode()).hexdigest()

        # 檢查重複
        if self.check_duplicate(data_hash):
            print(f"活動已存在: {data['name']}")
            return None

        # 插入主表
        activity_id = str(uuid.uuid4())
        self.cursor.execute("""
            INSERT INTO activities (
                id, name, description, summary, status,
                price, price_type, external_id, source_url,
                data_hash, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            activity_id,
            data['name'],
            data.get('description', ''),
            data.get('summary', ''),
            'active',
            data.get('price', 0),
            'free' if data.get('price', 0) == 0 else 'paid',
            data.get('external_id'),
            data.get('url'),
            data_hash,
            int(time.time()),
            int(time.time())
        ))

        # 插入位置資料
        if 'location' in data:
            self.insert_location(activity_id, data['location'])

        # 插入時間資料
        if 'time' in data:
            self.insert_time(activity_id, data['time'])

        # 插入分類
        if 'categories' in data:
            self.insert_categories(activity_id, data['categories'])

        self.conn.commit()
        return activity_id

    def update_activity(self, external_id, data):
        """更新現有活動"""
        # 更新邏輯
        pass
```

## 5. 資料品質要求

### 必填欄位

- ✅ name（活動名稱）
- ✅ city（城市）- 必須是標準名稱
- ✅ start_date（開始日期）

### 建議填寫

- 📝 description（詳細描述）
- 📝 summary（摘要）
- 📍 latitude/longitude（經緯度）
- 💰 price（價格）
- 🏷️ categories（分類）

### 資料驗證

```python
def validate_activity(data):
    """驗證活動資料完整性"""
    errors = []

    # 必填欄位
    if not data.get('name'):
        errors.append('缺少活動名稱')

    if not data.get('city'):
        errors.append('缺少城市資訊')
    elif data['city'] not in STANDARD_CITIES.values():
        errors.append(f'非標準城市名稱: {data["city"]}')

    if not data.get('start_date'):
        errors.append('缺少開始日期')

    # 日期格式驗證
    try:
        datetime.strptime(data.get('start_date', ''), '%Y-%m-%d')
    except:
        errors.append('日期格式錯誤，應為 YYYY-MM-DD')

    return len(errors) == 0, errors
```

## 6. 爬蟲執行建議

### 執行頻率

- **熱門活動**：每日更新
- **一般活動**：每週更新
- **已結束活動**：不再更新

### 防重複策略

1. 使用 `data_hash` 檢查內容是否變更
2. 使用 `external_id` 追蹤來源網站
3. 相同名稱+地點+日期視為同一活動

### 錯誤處理

```python
def safe_crawl(url):
    try:
        # 爬取邏輯
        pass
    except Exception as e:
        # 記錄到 crawl_logs 表
        log_error(url, str(e))
        return None
```

## 7. 前端配合事項

### 時間戳轉換

```typescript
// 前端處理 Unix timestamp
const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).toISOString();
};
```

### 圖片處理

```typescript
// 從 activity_images 表載入圖片
interface ActivityImage {
  url: string;
  type: 'main' | 'gallery' | 'thumbnail';
  alt_text?: string;
}
```

## 8. 測試資料範例

```json
{
  "name": "2025 台北燈節",
  "description": "年度最盛大的燈節活動...",
  "summary": "璀璨燈火照亮台北夜空",
  "location": {
    "address": "台北市中正區市府路1號",
    "city": "台北市",
    "district": "中正區",
    "latitude": 25.0375,
    "longitude": 121.5637
  },
  "time": {
    "start_date": "2025-02-10",
    "end_date": "2025-02-24",
    "start_time": "18:00",
    "end_time": "22:00"
  },
  "price": 0,
  "categories": ["festival", "culture"],
  "tags": ["free", "night", "family"],
  "external_id": "tp_lantern_2025",
  "source_url": "https://example.com/event/12345"
}
```

## 結論

爬蟲應該：

1. **配合現有資料庫結構**，不要改動核心表格
2. **使用標準化的資料格式**（城市名、日期格式等）
3. **實作防重複機制**（data_hash, external_id）
4. **記錄爬取日誌**便於追蹤問題
5. **漸進式更新**而非全部重建
