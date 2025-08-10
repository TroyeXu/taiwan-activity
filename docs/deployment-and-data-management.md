# 台灣活動地圖 - 部署與資料管理完整指南

## 目錄
1. [專案架構概述](#專案架構概述)
2. [部署方式](#部署方式)
3. [資料匯入指南](#資料匯入指南)
4. [爬蟲資料格式規範](#爬蟲資料格式規範)
5. [常見問題與故障排除](#常見問題與故障排除)

---

## 專案架構概述

### 技術架構
- **前端框架**: Nuxt 4 + Vue 3
- **樣式**: TailwindCSS + Element Plus
- **資料庫**: SQLite (透過 sql.js 在瀏覽器執行)
- **地圖**: Leaflet
- **部署**: GitHub Pages (靜態網站)

### 資料載入策略
```
使用者訪問網站 → 載入 sql.js → 下載 SQLite 檔案 → 在瀏覽器執行查詢
```

優點：
- 無需後端伺服器
- 完全免費部署
- 資料即時查詢
- 離線可用（快取後）

---

## 部署方式

### 一、GitHub Pages 自動部署

#### 1. 前置準備
確認以下檔案已正確配置：

**nuxt.config.ts**
```typescript
export default defineNuxtConfig({
  app: {
    baseURL: '/taiwan-activity/',  // 改成你的 repository 名稱
    buildAssetsDir: '/_nuxt/',
  },
  nitro: {
    preset: 'static',
  },
  ssr: false,  // 單頁應用程式模式
})
```

#### 2. GitHub Actions 設定
建立 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate static site
        run: npm run generate
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './.output/public'
          
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 3. 部署步驟

```bash
# 1. 確認資料庫檔案存在
ls -la public/tourism.sqlite

# 2. 測試本地建置
npm run generate
npm run preview

# 3. 推送到 GitHub
git add .
git commit -m "部署到 GitHub Pages"
git push origin main

# 4. 在 GitHub Repository 設定
# Settings → Pages → Source: GitHub Actions
```

#### 4. 訪問網站
```
https://[你的用戶名].github.io/[repository名稱]/
例如: https://troyexu.github.io/taiwan-activity/
```

### 二、自訂域名部署

#### 1. Vercel 部署
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

#### 2. Netlify 部署
```bash
# 建置檔案
npm run generate

# 拖放 .output/public 資料夾到 Netlify
```

### 三、資料庫 CDN 配置

為了提高載入速度，資料庫檔案會自動從多個來源嘗試載入：

1. **GitHub Pages 直接路徑**
2. **jsDelivr CDN** (最快)
3. **GitHub Raw** (備用)

配置位於 `composables/useSqliteWeb.ts`：

```typescript
const possibleUrls = [
  // GitHub Pages
  `https://[用戶名].github.io/[repo名]/tourism.sqlite`,
  
  // jsDelivr CDN (推薦)
  `https://cdn.jsdelivr.net/gh/[用戶名]/[repo名]@main/public/tourism.sqlite`,
  
  // GitHub Raw
  `https://raw.githubusercontent.com/[用戶名]/[repo名]/main/public/tourism.sqlite`
];
```

---

## 資料匯入指南

### 一、資料庫結構

#### 1. 核心資料表

**activities 表** - 活動主表
```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,           -- 唯一識別碼 (如: "act-001")
  name TEXT NOT NULL,            -- 活動名稱
  description TEXT,              -- 詳細描述
  summary TEXT,                  -- 簡短摘要
  status TEXT DEFAULT 'active',  -- 狀態: active/inactive/cancelled
  quality_score REAL DEFAULT 0,  -- 品質分數 (0-1)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**locations 表** - 地點資訊
```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  address TEXT NOT NULL,         -- 完整地址
  city TEXT NOT NULL,            -- 城市 (中文，如: "台北市")
  district TEXT,                 -- 區域 (中文，如: "信義區")
  region TEXT,                   -- 地區代碼 (north/central/south/east/islands)
  latitude REAL,                 -- 緯度
  longitude REAL,                -- 經度
  venue TEXT,                    -- 場地名稱
  landmarks TEXT,                -- 地標 (JSON 陣列)
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);
```

**categories 表** - 分類
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,            -- 中文名稱 (如: "音樂表演")
  slug TEXT UNIQUE NOT NULL,     -- 英文代碼 (如: "music")
  color_code TEXT,               -- 顏色代碼
  icon TEXT                      -- 圖示
);
```

**activity_times 表** - 時間資訊
```sql
CREATE TABLE activity_times (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  start_date DATE NOT NULL,      -- 開始日期 (YYYY-MM-DD)
  end_date DATE,                 -- 結束日期 (YYYY-MM-DD)
  start_time TIME,               -- 開始時間 (HH:MM:SS)
  end_time TIME,                 -- 結束時間 (HH:MM:SS)
  timezone TEXT DEFAULT 'Asia/Taipei',
  is_recurring BOOLEAN DEFAULT 0,
  recurrence_rule TEXT,          -- 循環規則 (JSON)
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);
```

#### 2. 關聯表

```sql
-- 活動與分類關聯
CREATE TABLE activity_categories (
  activity_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  PRIMARY KEY (activity_id, category_id)
);

-- 活動與標籤關聯
CREATE TABLE activity_tags (
  activity_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (activity_id, tag_id)
);
```

### 二、資料匯入方式

#### 方式一：使用 SQL 腳本匯入

1. **準備 SQL 檔案**
```sql
-- import-data.sql
BEGIN TRANSACTION;

-- 插入活動
INSERT INTO activities (id, name, description, summary, status, quality_score)
VALUES 
  ('act-001', '2024台北音樂節', '年度最大音樂盛會...', '集結國內外知名音樂人...', 'active', 0.95),
  ('act-002', '陽明山花季', '春季賞花活動...', '櫻花、杜鵑盛開...', 'active', 0.90);

-- 插入地點
INSERT INTO locations (id, activity_id, address, city, district, region, latitude, longitude, venue)
VALUES
  ('loc-001', 'act-001', '台北市信義區松壽路9號', '台北市', '信義區', 'north', 25.0330, 121.5654, '台北小巨蛋'),
  ('loc-002', 'act-002', '台北市北投區竹子湖路1-20號', '台北市', '北投區', 'north', 25.1720, 121.5297, '陽明山國家公園');

-- 插入時間
INSERT INTO activity_times (id, activity_id, start_date, end_date, start_time, end_time)
VALUES
  ('time-001', 'act-001', '2024-03-15', '2024-03-17', '19:00:00', '22:00:00'),
  ('time-002', 'act-002', '2024-02-15', '2024-03-31', '08:00:00', '17:00:00');

COMMIT;
```

2. **執行匯入**
```bash
# 使用 sqlite3 命令列工具
sqlite3 public/tourism.sqlite < import-data.sql
```

#### 方式二：使用 Node.js 腳本匯入

建立 `scripts/import-data.js`：

```javascript
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const db = new Database('public/tourism.sqlite');

// 準備資料
const activities = [
  {
    id: 'act-001',
    name: '2024台北音樂節',
    description: '年度最大音樂盛會...',
    summary: '集結國內外知名音樂人...',
    status: 'active',
    quality_score: 0.95
  }
];

// 插入資料
const insertActivity = db.prepare(`
  INSERT INTO activities (id, name, description, summary, status, quality_score)
  VALUES (@id, @name, @description, @summary, @status, @quality_score)
`);

const insertMany = db.transaction((activities) => {
  for (const activity of activities) {
    insertActivity.run(activity);
  }
});

// 執行交易
insertMany(activities);

console.log('✅ 資料匯入完成');
db.close();
```

執行：
```bash
node scripts/import-data.js
```

#### 方式三：使用 CSV 批量匯入

1. **準備 CSV 檔案**

`data/activities.csv`:
```csv
id,name,description,summary,status,quality_score
act-001,2024台北音樂節,年度最大音樂盛會...,集結國內外知名音樂人...,active,0.95
act-002,陽明山花季,春季賞花活動...,櫻花、杜鵑盛開...,active,0.90
```

2. **建立匯入腳本**

`scripts/import-csv.js`:
```javascript
import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const db = new Database('public/tourism.sqlite');

// 讀取 CSV
const csvContent = readFileSync('data/activities.csv', 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// 準備插入語句
const insert = db.prepare(`
  INSERT INTO activities (id, name, description, summary, status, quality_score)
  VALUES (@id, @name, @description, @summary, @status, @quality_score)
`);

// 批量插入
const insertAll = db.transaction((records) => {
  for (const record of records) {
    // 轉換資料類型
    record.quality_score = parseFloat(record.quality_score);
    insert.run(record);
  }
});

insertAll(records);
console.log(`✅ 成功匯入 ${records.length} 筆活動`);

db.close();
```

### 三、資料驗證

匯入後執行驗證腳本：

```javascript
// scripts/validate-data.js
import Database from 'better-sqlite3';

const db = new Database('public/tourism.sqlite');

// 檢查活動數量
const activityCount = db.prepare('SELECT COUNT(*) as count FROM activities').get();
console.log(`活動總數: ${activityCount.count}`);

// 檢查沒有地點的活動
const noLocation = db.prepare(`
  SELECT a.id, a.name 
  FROM activities a
  LEFT JOIN locations l ON a.id = l.activity_id
  WHERE l.id IS NULL
`).all();

if (noLocation.length > 0) {
  console.warn('⚠️ 以下活動沒有地點資訊:');
  console.table(noLocation);
}

// 檢查資料完整性
const stats = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM activities) as activities,
    (SELECT COUNT(*) FROM locations) as locations,
    (SELECT COUNT(*) FROM categories) as categories,
    (SELECT COUNT(*) FROM activity_times) as times
`).get();

console.table(stats);

db.close();
```

---

## 爬蟲資料格式規範

### 一、標準資料格式

爬蟲需要提供符合以下 JSON 格式的資料：

```json
{
  "activities": [
    {
      "id": "act-unique-001",
      "name": "活動名稱",
      "description": "詳細描述（可選）",
      "summary": "簡短摘要（可選）",
      "status": "active",
      "quality_score": 0.85,
      
      "location": {
        "address": "完整地址",
        "city": "台北市",
        "district": "信義區",
        "latitude": 25.0330,
        "longitude": 121.5654,
        "venue": "場地名稱（可選）",
        "landmarks": ["台北101", "信義商圈"]
      },
      
      "time": {
        "start_date": "2024-03-15",
        "end_date": "2024-03-17",
        "start_time": "19:00:00",
        "end_time": "22:00:00",
        "is_recurring": false
      },
      
      "categories": ["music", "culture"],
      "tags": ["indoor", "family", "weekend"],
      
      "media": {
        "images": [
          {
            "url": "https://example.com/image1.jpg",
            "caption": "活動主視覺"
          }
        ],
        "videos": []
      },
      
      "price": {
        "min": 500,
        "max": 1500,
        "currency": "TWD",
        "is_free": false
      },
      
      "contact": {
        "phone": "02-2345-6789",
        "email": "info@example.com",
        "website": "https://example.com"
      },
      
      "source": {
        "platform": "官方網站",
        "url": "https://source-url.com",
        "crawled_at": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "metadata": {
    "total_count": 150,
    "crawl_date": "2024-01-15",
    "crawler_version": "1.0.0"
  }
}
```

### 二、必要欄位說明

#### 必填欄位
- `id`: 唯一識別碼（建議格式: "平台縮寫-時間戳-流水號"）
- `name`: 活動名稱
- `location.address`: 地址
- `location.city`: 城市（必須是標準城市名稱）
- `time.start_date`: 開始日期

#### 選填但重要欄位
- `location.latitude` & `location.longitude`: 座標（用於地圖顯示）
- `categories`: 分類（至少一個）
- `quality_score`: 品質分數（0-1，用於排序）

### 三、資料處理規則

#### 1. ID 生成規則
```javascript
// 範例: klook-20240115-001
const generateId = (platform, index) => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${platform}-${date}-${index.toString().padStart(3, '0')}`;
};
```

#### 2. 城市名稱對應
```javascript
const CITY_MAPPING = {
  // 常見別名對應
  '臺北市': '台北市',
  'taipei': '台北市',
  '新北': '新北市',
  'new taipei': '新北市',
  '桃園': '桃園市',
  'taoyuan': '桃園市',
  // ... 其他對應
};

const normalizeCity = (city) => {
  return CITY_MAPPING[city.toLowerCase()] || city;
};
```

#### 3. 地區代碼判斷
```javascript
const getRegion = (city) => {
  const REGION_MAP = {
    north: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
    central: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
    south: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣'],
    east: ['花蓮縣', '台東縣'],
    islands: ['澎湖縣', '金門縣', '連江縣']
  };
  
  for (const [region, cities] of Object.entries(REGION_MAP)) {
    if (cities.includes(city)) return region;
  }
  return 'north'; // 預設值
};
```

#### 4. 分類對應
```javascript
const CATEGORY_MAP = {
  // 中文對應到英文 slug
  '音樂': 'music',
  '演唱會': 'music',
  '音樂會': 'music',
  '展覽': 'exhibition',
  '美術': 'exhibition',
  '藝術': 'culture',
  '文化': 'culture',
  '運動': 'sports',
  '體育': 'sports',
  '美食': 'food',
  '市集': 'market',
  '戶外': 'outdoor',
  '親子': 'family',
  '教育': 'education',
  '講座': 'workshop'
};

const mapCategory = (categoryText) => {
  for (const [key, value] of Object.entries(CATEGORY_MAP)) {
    if (categoryText.includes(key)) return value;
  }
  return 'other';
};
```

### 四、爬蟲整合範例

#### 1. 爬蟲腳本範例 (Python)

```python
# crawler.py
import json
import sqlite3
from datetime import datetime
import requests
from bs4 import BeautifulSoup

class ActivityCrawler:
    def __init__(self):
        self.activities = []
        
    def crawl_website(self, url):
        """爬取網站資料"""
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 解析活動資料
        for item in soup.find_all('div', class_='activity-item'):
            activity = self.parse_activity(item)
            self.activities.append(activity)
    
    def parse_activity(self, element):
        """解析單一活動"""
        return {
            'id': self.generate_id(),
            'name': element.find('h3').text.strip(),
            'description': element.find('p', class_='description').text.strip(),
            'location': {
                'address': element.find('span', class_='address').text.strip(),
                'city': self.extract_city(element.find('span', class_='city').text),
            },
            'time': {
                'start_date': self.parse_date(element.find('time')['datetime']),
            },
            'categories': self.extract_categories(element),
            'source': {
                'platform': 'example.com',
                'url': element.find('a')['href'],
                'crawled_at': datetime.now().isoformat()
            }
        }
    
    def save_to_json(self, filename='activities.json'):
        """儲存為 JSON"""
        data = {
            'activities': self.activities,
            'metadata': {
                'total_count': len(self.activities),
                'crawl_date': datetime.now().strftime('%Y-%m-%d'),
                'crawler_version': '1.0.0'
            }
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def import_to_database(self, db_path='public/tourism.sqlite'):
        """直接匯入資料庫"""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        for activity in self.activities:
            # 插入活動主表
            cursor.execute('''
                INSERT INTO activities (id, name, description, status, quality_score)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                activity['id'],
                activity['name'],
                activity.get('description', ''),
                'active',
                0.8
            ))
            
            # 插入地點表
            location = activity['location']
            cursor.execute('''
                INSERT INTO locations (id, activity_id, address, city, region)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                f"loc-{activity['id']}",
                activity['id'],
                location['address'],
                location['city'],
                self.get_region(location['city'])
            ))
        
        conn.commit()
        conn.close()

# 使用範例
crawler = ActivityCrawler()
crawler.crawl_website('https://example.com/activities')
crawler.save_to_json()
crawler.import_to_database()
```

#### 2. Node.js 爬蟲範例

```javascript
// crawler.js
import puppeteer from 'puppeteer';
import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';

class ActivityCrawler {
  constructor() {
    this.activities = [];
    this.db = new Database('public/tourism.sqlite');
  }

  async crawl(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    // 等待內容載入
    await page.waitForSelector('.activity-list');

    // 抓取活動資料
    const activities = await page.evaluate(() => {
      const items = document.querySelectorAll('.activity-item');
      return Array.from(items).map(item => ({
        name: item.querySelector('.title')?.textContent?.trim(),
        address: item.querySelector('.address')?.textContent?.trim(),
        date: item.querySelector('.date')?.getAttribute('data-date'),
        // ... 其他欄位
      }));
    });

    // 處理資料
    this.activities = activities.map((activity, index) => 
      this.processActivity(activity, index)
    );

    await browser.close();
  }

  processActivity(raw, index) {
    return {
      id: `crawl-${Date.now()}-${index}`,
      name: raw.name,
      location: {
        address: raw.address,
        city: this.extractCity(raw.address),
        region: this.getRegion(raw.address)
      },
      time: {
        start_date: this.formatDate(raw.date)
      },
      categories: this.detectCategories(raw.name),
      quality_score: this.calculateQuality(raw)
    };
  }

  extractCity(address) {
    const cityPatterns = [
      /^(台北市|新北市|桃園市|台中市|台南市|高雄市)/,
      /^(基隆市|新竹市|嘉義市)/,
      /^(\S+縣)/
    ];

    for (const pattern of cityPatterns) {
      const match = address.match(pattern);
      if (match) return match[1];
    }
    return '台北市'; // 預設值
  }

  getRegion(city) {
    const regionMap = {
      north: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
      central: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
      south: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣'],
      east: ['花蓮縣', '台東縣'],
      islands: ['澎湖縣', '金門縣', '連江縣']
    };

    for (const [region, cities] of Object.entries(regionMap)) {
      if (cities.includes(city)) return region;
    }
    return 'north';
  }

  saveToDatabase() {
    const insertActivity = this.db.prepare(`
      INSERT INTO activities (id, name, description, status, quality_score)
      VALUES (@id, @name, @description, @status, @quality_score)
    `);

    const insertLocation = this.db.prepare(`
      INSERT INTO locations (id, activity_id, address, city, region)
      VALUES (@id, @activity_id, @address, @city, @region)
    `);

    const insertAll = this.db.transaction(() => {
      for (const activity of this.activities) {
        // 插入活動
        insertActivity.run({
          id: activity.id,
          name: activity.name,
          description: activity.description || '',
          status: 'active',
          quality_score: activity.quality_score
        });

        // 插入地點
        insertLocation.run({
          id: `loc-${activity.id}`,
          activity_id: activity.id,
          address: activity.location.address,
          city: activity.location.city,
          region: activity.location.region
        });
      }
    });

    insertAll();
    console.log(`✅ 成功匯入 ${this.activities.length} 筆活動`);
  }

  exportToJson(filename = 'crawled-activities.json') {
    const data = {
      activities: this.activities,
      metadata: {
        total_count: this.activities.length,
        crawl_date: new Date().toISOString().split('T')[0],
        crawler_version: '1.0.0'
      }
    };

    writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`✅ 資料已匯出至 ${filename}`);
  }
}

// 使用範例
const crawler = new ActivityCrawler();
await crawler.crawl('https://example.com/activities');
crawler.saveToDatabase();
crawler.exportToJson();
```

### 五、資料品質要求

#### 1. 必要欄位完整性
- 每個活動必須有唯一 ID
- 必須有活動名稱
- 必須有地址和城市
- 必須有開始日期

#### 2. 資料格式正確性
- 日期格式: YYYY-MM-DD
- 時間格式: HH:MM:SS
- 座標範圍: 緯度 21-26, 經度 119-122
- 城市名稱必須是標準名稱

#### 3. 資料品質分數計算
```javascript
const calculateQualityScore = (activity) => {
  let score = 0;
  let total = 0;

  // 基本資訊完整性 (40%)
  if (activity.name) score += 10;
  if (activity.description) score += 10;
  if (activity.summary) score += 10;
  if (activity.location?.address) score += 10;
  total += 40;

  // 地理資訊 (20%)
  if (activity.location?.latitude && activity.location?.longitude) score += 10;
  if (activity.location?.venue) score += 5;
  if (activity.location?.landmarks?.length > 0) score += 5;
  total += 20;

  // 時間資訊 (20%)
  if (activity.time?.start_date) score += 10;
  if (activity.time?.end_date) score += 5;
  if (activity.time?.start_time) score += 5;
  total += 20;

  // 分類標籤 (10%)
  if (activity.categories?.length > 0) score += 5;
  if (activity.tags?.length > 0) score += 5;
  total += 10;

  // 媒體資訊 (10%)
  if (activity.media?.images?.length > 0) score += 10;
  total += 10;

  return score / total;
};
```

---

## 常見問題與故障排除

### 部署問題

#### Q1: GitHub Pages 404 錯誤
**解決方案**：
1. 確認 `baseURL` 設定正確
2. 確認 GitHub Pages 已啟用
3. 等待 5-10 分鐘讓部署完成

#### Q2: 資料庫載入失敗
**解決方案**：
1. 檢查瀏覽器控制台錯誤
2. 確認 SQLite 檔案存在於 `public/` 目錄
3. 檢查 CORS 設定

#### Q3: 樣式或圖片失效
**解決方案**：
確保所有資源路徑都使用相對路徑或包含 baseURL

### 資料問題

#### Q1: 匯入的資料沒有顯示
**檢查步驟**：
```sql
-- 檢查資料是否存在
SELECT COUNT(*) FROM activities;

-- 檢查關聯是否正確
SELECT a.*, l.* 
FROM activities a
LEFT JOIN locations l ON a.id = l.activity_id
LIMIT 5;
```

#### Q2: 篩選功能異常
**檢查城市和分類資料**：
```sql
-- 檢查城市資料
SELECT DISTINCT city FROM locations;

-- 檢查分類資料
SELECT * FROM categories;
```

#### Q3: 地圖標記不顯示
**檢查座標資料**：
```sql
-- 檢查座標是否有效
SELECT id, address, latitude, longitude 
FROM locations 
WHERE latitude IS NULL OR longitude IS NULL;
```

### 性能優化

#### 1. 資料庫優化
```sql
-- 建立索引
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_locations_city ON locations(city);
CREATE INDEX idx_locations_region ON locations(region);
CREATE INDEX idx_activity_times_dates ON activity_times(start_date, end_date);
```

#### 2. 減少資料庫大小
```bash
# 壓縮資料庫
sqlite3 tourism.sqlite "VACUUM;"

# 檢查大小
du -h tourism.sqlite
```

#### 3. CDN 快取設定
確保資料庫檔案有適當的快取頭：
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    publicAssets: [
      {
        baseURL: 'tourism.sqlite',
        maxAge: 86400 // 快取一天
      }
    ]
  }
})
```

---

## 聯絡與支援

如有問題或需要協助，請透過以下方式聯絡：

- GitHub Issues: [提交問題](https://github.com/[你的用戶名]/taiwan-activity/issues)
- Email: [你的郵箱]

最後更新日期: 2025-08-10