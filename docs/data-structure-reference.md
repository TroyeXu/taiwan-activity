# 前端與資料庫資料結構完整對照表

## 一、資料庫結構（SQLite）

### 1. activities 表
```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  status TEXT DEFAULT 'active',
  quality_score REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**範例資料：**
```sql
id: "act-001"
name: "2024台北音樂節"
description: "年度最大音樂盛會..."
summary: "集結國內外知名音樂人..."
status: "active"
quality_score: 0.95
created_at: "2024-01-15 10:30:00"
updated_at: "2024-01-15 10:30:00"
```

### 2. locations 表
```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,        -- 中文城市名
  district TEXT,             -- 中文區域名
  region TEXT,               -- 英文地區代碼
  latitude REAL,
  longitude REAL,
  venue TEXT,
  landmarks TEXT,            -- JSON 陣列
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);
```

**範例資料：**
```sql
id: "loc-001"
activity_id: "act-001"
address: "台北市信義區松壽路9號"
city: "台北市"              -- 注意：存中文
district: "信義區"
region: "north"             -- 只能是: north/central/south/east/islands
latitude: 25.0330
longitude: 121.5654
venue: "台北小巨蛋"
landmarks: '["台北101","信義商圈"]'
```

### 3. categories 表
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,        -- 中文名稱
  slug TEXT UNIQUE NOT NULL, -- 英文代碼
  color_code TEXT,
  icon TEXT
);
```

**範例資料：**
```sql
id: "cat-001"
name: "音樂表演"            -- 中文顯示名稱
slug: "music"              -- 英文篩選代碼
color_code: "#FF6B6B"
icon: "🎵"
```

### 4. tags 表
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,        -- 中文名稱
  slug TEXT UNIQUE NOT NULL, -- 英文代碼
  category TEXT,
  usage_count INTEGER DEFAULT 0
);
```

**範例資料：**
```sql
id: "tag-001"
name: "室內活動"            -- 中文顯示名稱
slug: "indoor"             -- 英文篩選代碼
category: "feature"
usage_count: 156
```

### 5. activity_times 表
```sql
CREATE TABLE activity_times (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  start_date DATE NOT NULL,   -- YYYY-MM-DD 格式
  end_date DATE,
  start_time TIME,            -- HH:MM:SS 格式
  end_time TIME,
  timezone TEXT DEFAULT 'Asia/Taipei',
  is_recurring BOOLEAN DEFAULT 0,
  recurrence_rule TEXT,       -- JSON 格式
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);
```

**範例資料：**
```sql
id: "time-001"
activity_id: "act-001"
start_date: "2024-03-15"
end_date: "2024-03-17"
start_time: "19:00:00"
end_time: "22:00:00"
timezone: "Asia/Taipei"
is_recurring: 0
recurrence_rule: NULL
```

### 6. 關聯表
```sql
-- 活動與分類的關聯
CREATE TABLE activity_categories (
  activity_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  PRIMARY KEY (activity_id, category_id)
);

-- 活動與標籤的關聯
CREATE TABLE activity_tags (
  activity_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (activity_id, tag_id)
);
```

## 二、前端資料格式（TypeScript）

### 1. Activity 介面
```typescript
interface Activity {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  status: ActivityStatus;
  qualityScore: number;
  createdAt: Date;           // 轉換為 Date 物件
  updatedAt: Date;           // 轉換為 Date 物件
  
  // 嵌套物件
  location?: Location;
  time?: ActivityTime;
  categories?: Category[];
  tags?: Tag[];
  
  // 額外欄位
  price?: number;
  distance?: number;         // 計算得出的距離
  media?: ActivityMedia;
}
```

### 2. Location 介面
```typescript
interface Location {
  id: string;
  activityId: string;
  address: string;
  city: string;              // 中文城市名
  district?: string | null;  // 中文區域名
  region: Region;            // 轉換為 enum
  latitude?: number | null;
  longitude?: number | null;
  venue?: string | null;
  landmarks?: string[];      // 解析 JSON 為陣列
}

enum Region {
  NORTH = 'north',
  CENTRAL = 'central',
  SOUTH = 'south',
  EAST = 'east',
  ISLANDS = 'islands'
}
```

### 3. Category 介面
```typescript
interface Category {
  id: string;
  name: string;              // 中文名稱
  slug: string;              // 英文代碼（用於篩選）
  colorCode?: string;
  icon?: string;
}
```

### 4. Tag 介面
```typescript
interface Tag {
  id: string;
  name: string;              // 中文名稱
  slug: string;              // 英文代碼（用於篩選）
  category?: string;
  usageCount?: number;
}
```

### 5. ActivityTime 介面
```typescript
interface ActivityTime {
  id: string;
  activityId: string;
  startDate: string;         // YYYY-MM-DD 格式
  endDate?: string | null;
  startTime?: string | null; // HH:MM:SS 格式
  endTime?: string | null;
  timezone: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
}
```

## 三、查詢參數格式

### SQL 查詢參數（從前端傳到 useSqlite）
```typescript
interface QueryOptions {
  limit: number;
  offset: number;
  search?: string;           // 關鍵字搜尋
  category?: string;         // 分類 slug（如 "music"）
  city?: string;             // 城市中文名（如 "台北市"）
  region?: string;           // 地區英文代碼（如 "north"）
  startDate?: string;        // YYYY-MM-DD 格式
  endDate?: string;          // YYYY-MM-DD 格式
  tags?: string[];           // 標籤 slug 陣列
}
```

### 前端篩選參數（SearchFilters）
```typescript
interface SearchFilters {
  categories?: string[];     // 分類 slug 陣列
  regions?: string[];        // 地區英文代碼陣列
  cities?: string[];         // 城市中文名陣列
  tags?: string[];           // 標籤 slug 陣列
  
  priceRange?: {
    min?: number;
    max?: number;
    includeFreeze?: boolean; // 包含免費活動
  };
  
  dateRange?: {
    start?: string;          // YYYY-MM-DD
    end?: string;            // YYYY-MM-DD
  };
  
  location?: { 
    lat: number; 
    lng: number; 
  };
  radius?: number;           // 搜尋半徑（公里）
  
  sorting?: 'relevance' | 'distance' | 'popularity' | 'date' | 'price';
  features?: string[];       // 特色標籤
  minQuality?: number;       // 最低品質分數
}
```

## 四、資料轉換流程

### 1. 從資料庫到前端
```typescript
// SQL 查詢結果（原始格式）
const dbRow = {
  // 活動基本資料
  id: "act-001",
  name: "2024台北音樂節",
  description: "年度最大音樂盛會...",
  
  // 位置資料（JOIN 結果）
  address: "台北市信義區松壽路9號",
  city: "台北市",
  district: "信義區",
  latitude: 25.0330,
  longitude: 121.5654,
  
  // 分類資料（GROUP_CONCAT 結果）
  categories: "音樂表演,文化藝術",
  
  // 時間資料（JOIN 結果）
  start_date: "2024-03-15",
  end_date: "2024-03-17",
  start_time: "19:00:00",
  end_time: "22:00:00"
};

// 轉換後的前端格式
const activity: Activity = {
  id: "act-001",
  name: "2024台北音樂節",
  description: "年度最大音樂盛會...",
  
  location: {
    id: "loc-001",
    activityId: "act-001",
    address: "台北市信義區松壽路9號",
    city: "台北市",             // 保持中文
    district: "信義區",
    region: Region.NORTH,        // 轉換為 enum
    latitude: 25.0330,
    longitude: 121.5654
  },
  
  categories: [
    { id: "cat-001", name: "音樂表演", slug: "music" },
    { id: "cat-002", name: "文化藝術", slug: "culture" }
  ],
  
  time: {
    id: "time-001",
    activityId: "act-001",
    startDate: "2024-03-15",
    endDate: "2024-03-17",
    startTime: "19:00:00",
    endTime: "22:00:00",
    timezone: "Asia/Taipei",
    isRecurring: false
  }
};
```

### 2. 篩選條件轉換
```typescript
// 前端篩選條件
const filters: SearchFilters = {
  cities: ["台北市", "新北市"],     // 中文
  categories: ["music", "exhibition"], // 英文 slug
  tags: ["indoor", "family"],          // 英文 slug
  priceRange: { min: 0, max: 0, includeFreeze: true }
};

// 轉換為 SQL 查詢條件
const sqlWhere = `
  WHERE l.city IN ('台北市', '新北市')
    AND c.slug IN ('music', 'exhibition')
    AND t.slug IN ('indoor', 'family')
    AND a.price = 0
`;
```

## 五、常見資料問題檢查

### 1. 檢查城市資料一致性
```sql
-- 檢查是否有非標準城市名稱
SELECT DISTINCT city FROM locations 
WHERE city NOT IN (
  '台北市','新北市','桃園市','台中市','台南市','高雄市',
  '基隆市','新竹市','新竹縣','苗栗縣','彰化縣','南投縣',
  '雲林縣','嘉義市','嘉義縣','屏東縣','宜蘭縣','花蓮縣',
  '台東縣','澎湖縣','金門縣','連江縣'
);
```

### 2. 檢查分類資料完整性
```sql
-- 檢查活動是否都有分類
SELECT a.id, a.name 
FROM activities a
LEFT JOIN activity_categories ac ON a.id = ac.activity_id
WHERE ac.category_id IS NULL;

-- 檢查分類 slug 是否都是英文
SELECT * FROM categories WHERE slug REGEXP '[^a-z-]';
```

### 3. 檢查日期格式
```sql
-- 檢查日期格式是否正確
SELECT * FROM activity_times 
WHERE start_date NOT LIKE '____-__-__'
   OR (end_date IS NOT NULL AND end_date NOT LIKE '____-__-__');
```

## 六、控制台快速檢查命令

```javascript
// 1. 檢查當前活動資料格式
const { activities } = useActivitiesClient();
console.table(activities.value[0]);

// 2. 檢查篩選條件
const { filters } = useFilters();
console.log('當前篩選:', filters.value);

// 3. 檢查城市分布
const { query } = useSqlite();
const cities = await query('SELECT city, COUNT(*) as count FROM locations GROUP BY city');
console.table(cities);

// 4. 檢查分類使用情況
const categories = await query(`
  SELECT c.name, c.slug, COUNT(ac.activity_id) as count 
  FROM categories c
  LEFT JOIN activity_categories ac ON c.id = ac.category_id
  GROUP BY c.id
`);
console.table(categories);

// 5. 驗證資料格式
const activity = activities.value[0];
const validation = DataValidator.validateActivity(activity);
console.log('資料驗證結果:', validation);
```

## 七、資料格式規範總結

| 項目 | 資料庫儲存 | 前端顯示 | 篩選傳遞 |
|------|------------|----------|----------|
| 城市 | 中文（台北市） | 中文（台北市） | 中文（台北市） |
| 地區 | 英文（north） | 中文（北部地區） | 英文（north） |
| 分類 | name: 中文<br>slug: 英文 | 中文（音樂表演） | 英文 slug（music） |
| 標籤 | name: 中文<br>slug: 英文 | 中文（室內活動） | 英文 slug（indoor） |
| 日期 | YYYY-MM-DD | 格式化顯示 | YYYY-MM-DD |
| 時間 | HH:MM:SS | 格式化顯示 | HH:MM:SS |