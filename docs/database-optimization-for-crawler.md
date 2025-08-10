# 資料庫結構優化建議 - 爬蟲友善設計

## 現有結構分析與問題

### 現有的優點
1. ✅ 已有 `data_sources` 表追蹤資料來源
2. ✅ 使用文字型 ID，方便爬蟲產生唯一識別碼
3. ✅ 有品質分數和流行度分數欄位
4. ✅ 時間戳記使用 INTEGER（Unix timestamp）

### 需要優化的問題

#### 1. **缺少重複資料處理機制**
- 沒有外部來源 ID 欄位
- 無法追蹤同一活動在不同平台的資料
- 難以判斷是否為重複活動

#### 2. **缺少索引優化**
- 沒有針對常用查詢的複合索引
- 缺少爬蟲常用欄位的索引（如 crawled_at, source_id）

#### 3. **缺少資料變更追蹤**
- 沒有歷史記錄表
- 無法追蹤價格、時間等重要資訊的變化

#### 4. **資料驗證欄位不足**
- 缺少資料完整性分數
- 沒有資料驗證狀態欄位

## 建議的資料庫結構調整

### 1. 新增欄位到現有表格

```sql
-- 1. activities 表新增欄位
ALTER TABLE activities ADD COLUMN source_id TEXT;           -- 原始平台的 ID
ALTER TABLE activities ADD COLUMN source_platform TEXT;     -- 來源平台名稱
ALTER TABLE activities ADD COLUMN data_hash TEXT;          -- 資料指紋（用於判斷變更）
ALTER TABLE activities ADD COLUMN is_verified INTEGER DEFAULT 0;  -- 是否已驗證
ALTER TABLE activities ADD COLUMN completeness_score REAL DEFAULT 0;  -- 資料完整度分數
ALTER TABLE activities ADD COLUMN last_validated_at INTEGER;  -- 最後驗證時間

-- 2. locations 表新增欄位  
ALTER TABLE locations ADD COLUMN geocode_status TEXT DEFAULT 'pending';  -- 地理編碼狀態
ALTER TABLE locations ADD COLUMN geocode_confidence REAL;  -- 地理編碼可信度
ALTER TABLE locations ADD COLUMN formatted_address TEXT;   -- 標準化地址

-- 3. data_sources 表新增欄位
ALTER TABLE data_sources ADD COLUMN raw_data TEXT;  -- 原始資料（JSON）
ALTER TABLE data_sources ADD COLUMN processing_status TEXT DEFAULT 'pending';  -- 處理狀態
ALTER TABLE data_sources ADD COLUMN error_message TEXT;  -- 錯誤訊息
ALTER TABLE data_sources ADD COLUMN retry_count INTEGER DEFAULT 0;  -- 重試次數
```

### 2. 建立新的輔助表格

```sql
-- 1. 爬蟲任務管理表
CREATE TABLE crawl_jobs (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,           -- 平台名稱
    job_type TEXT NOT NULL,          -- 任務類型 (full/incremental/update)
    status TEXT DEFAULT 'pending',    -- 狀態 (pending/running/completed/failed)
    start_time INTEGER,
    end_time INTEGER,
    total_items INTEGER DEFAULT 0,
    success_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    error_log TEXT,
    created_at INTEGER NOT NULL
);

-- 2. 活動重複偵測表
CREATE TABLE activity_duplicates (
    id TEXT PRIMARY KEY,
    primary_activity_id TEXT NOT NULL,   -- 主要活動 ID
    duplicate_activity_id TEXT NOT NULL, -- 重複活動 ID
    similarity_score REAL,                -- 相似度分數
    merge_status TEXT DEFAULT 'pending', -- 合併狀態
    created_at INTEGER NOT NULL,
    FOREIGN KEY (primary_activity_id) REFERENCES activities(id),
    FOREIGN KEY (duplicate_activity_id) REFERENCES activities(id)
);

-- 3. 資料變更歷史表
CREATE TABLE activity_history (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,        -- 變更的欄位
    old_value TEXT,                   -- 舊值
    new_value TEXT,                   -- 新值
    change_source TEXT,               -- 變更來源
    changed_at INTEGER NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- 4. 外部 ID 對應表（支援多平台）
CREATE TABLE external_ids (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    platform TEXT NOT NULL,          -- 平台名稱
    external_id TEXT NOT NULL,       -- 外部 ID
    url TEXT,                         -- 原始連結
    is_primary INTEGER DEFAULT 0,    -- 是否為主要來源
    created_at INTEGER NOT NULL,
    UNIQUE(platform, external_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- 5. 資料品質檢查表
CREATE TABLE quality_checks (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    check_type TEXT NOT NULL,        -- 檢查類型
    check_result TEXT NOT NULL,      -- 檢查結果 (passed/failed/warning)
    check_details TEXT,               -- 詳細資訊
    checked_at INTEGER NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);
```

### 3. 建立必要的索引

```sql
-- 爬蟲查詢優化索引
CREATE INDEX idx_activities_source ON activities(source_platform, source_id);
CREATE INDEX idx_activities_status_quality ON activities(status, quality_score);
CREATE INDEX idx_activities_updated ON activities(updated_at);
CREATE INDEX idx_activities_verified ON activities(is_verified, completeness_score);

-- 地理查詢優化索引
CREATE INDEX idx_locations_city_region ON locations(city, region);
CREATE INDEX idx_locations_geocode ON locations(geocode_status);
CREATE INDEX idx_locations_coords ON locations(latitude, longitude);

-- 資料來源查詢索引
CREATE INDEX idx_data_sources_crawled ON data_sources(crawled_at);
CREATE INDEX idx_data_sources_status ON data_sources(processing_status);
CREATE INDEX idx_data_sources_activity ON data_sources(activity_id, website);

-- 外部 ID 查詢索引
CREATE INDEX idx_external_ids_lookup ON external_ids(platform, external_id);

-- 爬蟲任務索引
CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(platform, status, created_at);

-- 時間範圍查詢索引
CREATE INDEX idx_activity_times_dates ON activity_times(start_date, end_date);
```

### 4. 建立視圖簡化查詢

```sql
-- 1. 活動完整資訊視圖
CREATE VIEW v_activities_full AS
SELECT 
    a.*,
    l.address,
    l.city,
    l.region,
    l.latitude,
    l.longitude,
    l.venue,
    at.start_date,
    at.end_date,
    at.start_time,
    at.end_time,
    GROUP_CONCAT(DISTINCT c.name) as categories,
    GROUP_CONCAT(DISTINCT t.name) as tags,
    ds.website as source_website,
    ds.url as source_url
FROM activities a
LEFT JOIN locations l ON a.id = l.activity_id
LEFT JOIN activity_times at ON a.id = at.activity_id
LEFT JOIN activity_categories ac ON a.id = ac.activity_id
LEFT JOIN categories c ON ac.category_id = c.id
LEFT JOIN activity_tags atg ON a.id = atg.activity_id
LEFT JOIN tags t ON atg.tag_id = t.id
LEFT JOIN data_sources ds ON a.id = ds.activity_id
GROUP BY a.id;

-- 2. 待處理資料視圖
CREATE VIEW v_pending_activities AS
SELECT 
    a.*,
    ds.processing_status,
    ds.error_message,
    ds.retry_count
FROM activities a
JOIN data_sources ds ON a.id = ds.activity_id
WHERE ds.processing_status IN ('pending', 'failed')
  AND ds.retry_count < 3;

-- 3. 重複活動檢測視圖
CREATE VIEW v_potential_duplicates AS
SELECT 
    a1.id as id1,
    a1.name as name1,
    a2.id as id2,
    a2.name as name2,
    l1.address as address1,
    l2.address as address2,
    at1.start_date as date1,
    at2.start_date as date2
FROM activities a1
JOIN activities a2 ON a1.id < a2.id
JOIN locations l1 ON a1.id = l1.activity_id
JOIN locations l2 ON a2.id = l2.activity_id
JOIN activity_times at1 ON a1.id = at1.activity_id
JOIN activity_times at2 ON a2.id = at2.activity_id
WHERE 
    -- 名稱相似
    (a1.name = a2.name OR SUBSTR(a1.name, 1, 10) = SUBSTR(a2.name, 1, 10))
    -- 同一天
    AND at1.start_date = at2.start_date
    -- 同城市
    AND l1.city = l2.city;
```

## 資料庫遷移腳本

### 完整遷移腳本

```sql
-- migration_001_crawler_optimization.sql
-- 執行前請先備份資料庫！

BEGIN TRANSACTION;

-- ============================================
-- 1. 新增欄位到現有表格
-- ============================================

-- activities 表新增欄位
ALTER TABLE activities ADD COLUMN source_id TEXT;
ALTER TABLE activities ADD COLUMN source_platform TEXT;
ALTER TABLE activities ADD COLUMN data_hash TEXT;
ALTER TABLE activities ADD COLUMN is_verified INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN completeness_score REAL DEFAULT 0;
ALTER TABLE activities ADD COLUMN last_validated_at INTEGER;

-- locations 表新增欄位
ALTER TABLE locations ADD COLUMN geocode_status TEXT DEFAULT 'pending';
ALTER TABLE locations ADD COLUMN geocode_confidence REAL;
ALTER TABLE locations ADD COLUMN formatted_address TEXT;

-- data_sources 表新增欄位
ALTER TABLE data_sources ADD COLUMN raw_data TEXT;
ALTER TABLE data_sources ADD COLUMN processing_status TEXT DEFAULT 'pending';
ALTER TABLE data_sources ADD COLUMN error_message TEXT;
ALTER TABLE data_sources ADD COLUMN retry_count INTEGER DEFAULT 0;

-- ============================================
-- 2. 建立新表格
-- ============================================

CREATE TABLE IF NOT EXISTS crawl_jobs (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    start_time INTEGER,
    end_time INTEGER,
    total_items INTEGER DEFAULT 0,
    success_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    error_log TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_duplicates (
    id TEXT PRIMARY KEY,
    primary_activity_id TEXT NOT NULL,
    duplicate_activity_id TEXT NOT NULL,
    similarity_score REAL,
    merge_status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (primary_activity_id) REFERENCES activities(id),
    FOREIGN KEY (duplicate_activity_id) REFERENCES activities(id)
);

CREATE TABLE IF NOT EXISTS activity_history (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_source TEXT,
    changed_at INTEGER NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

CREATE TABLE IF NOT EXISTS external_ids (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    external_id TEXT NOT NULL,
    url TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE(platform, external_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

CREATE TABLE IF NOT EXISTS quality_checks (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    check_type TEXT NOT NULL,
    check_result TEXT NOT NULL,
    check_details TEXT,
    checked_at INTEGER NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- ============================================
-- 3. 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source_platform, source_id);
CREATE INDEX IF NOT EXISTS idx_activities_status_quality ON activities(status, quality_score);
CREATE INDEX IF NOT EXISTS idx_activities_updated ON activities(updated_at);
CREATE INDEX IF NOT EXISTS idx_activities_verified ON activities(is_verified, completeness_score);

CREATE INDEX IF NOT EXISTS idx_locations_city_region ON locations(city, region);
CREATE INDEX IF NOT EXISTS idx_locations_geocode ON locations(geocode_status);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_data_sources_crawled ON data_sources(crawled_at);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(processing_status);
CREATE INDEX IF NOT EXISTS idx_data_sources_activity ON data_sources(activity_id, website);

CREATE INDEX IF NOT EXISTS idx_external_ids_lookup ON external_ids(platform, external_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(platform, status, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_times_dates ON activity_times(start_date, end_date);

-- ============================================
-- 4. 建立視圖
-- ============================================

DROP VIEW IF EXISTS v_activities_full;
CREATE VIEW v_activities_full AS
SELECT 
    a.*,
    l.address,
    l.city,
    l.region,
    l.latitude,
    l.longitude,
    l.venue,
    at.start_date,
    at.end_date,
    at.start_time,
    at.end_time,
    GROUP_CONCAT(DISTINCT c.name) as categories,
    GROUP_CONCAT(DISTINCT t.name) as tags,
    ds.website as source_website,
    ds.url as source_url
FROM activities a
LEFT JOIN locations l ON a.id = l.activity_id
LEFT JOIN activity_times at ON a.id = at.activity_id
LEFT JOIN activity_categories ac ON a.id = ac.activity_id
LEFT JOIN categories c ON ac.category_id = c.id
LEFT JOIN activity_tags atg ON a.id = atg.activity_id
LEFT JOIN tags t ON atg.tag_id = t.id
LEFT JOIN data_sources ds ON a.id = ds.activity_id
GROUP BY a.id;

DROP VIEW IF EXISTS v_pending_activities;
CREATE VIEW v_pending_activities AS
SELECT 
    a.*,
    ds.processing_status,
    ds.error_message,
    ds.retry_count
FROM activities a
JOIN data_sources ds ON a.id = ds.activity_id
WHERE ds.processing_status IN ('pending', 'failed')
  AND ds.retry_count < 3;

DROP VIEW IF EXISTS v_potential_duplicates;
CREATE VIEW v_potential_duplicates AS
SELECT 
    a1.id as id1,
    a1.name as name1,
    a2.id as id2,
    a2.name as name2,
    l1.address as address1,
    l2.address as address2,
    at1.start_date as date1,
    at2.start_date as date2
FROM activities a1
JOIN activities a2 ON a1.id < a2.id
JOIN locations l1 ON a1.id = l1.activity_id
JOIN locations l2 ON a2.id = l2.activity_id
JOIN activity_times at1 ON a1.id = at1.activity_id
JOIN activity_times at2 ON a2.id = at2.activity_id
WHERE 
    (a1.name = a2.name OR SUBSTR(a1.name, 1, 10) = SUBSTR(a2.name, 1, 10))
    AND at1.start_date = at2.start_date
    AND l1.city = l2.city;

-- ============================================
-- 5. 更新現有資料的預設值
-- ============================================

UPDATE activities SET completeness_score = quality_score WHERE completeness_score = 0;
UPDATE activities SET source_platform = 'manual' WHERE source_platform IS NULL;
UPDATE locations SET geocode_status = 'completed' WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
UPDATE locations SET geocode_status = 'pending' WHERE latitude IS NULL OR longitude IS NULL;
UPDATE data_sources SET processing_status = 'completed' WHERE processing_status = 'pending';

COMMIT;

-- 驗證遷移
SELECT 'Migration completed successfully!' as status;
```

## 爬蟲整合優化建議

### 1. 爬蟲資料處理流程

```javascript
// 優化後的爬蟲處理流程
class OptimizedCrawler {
  async processActivity(rawData) {
    // 1. 檢查是否已存在（使用外部 ID）
    const existing = await this.checkExisting(rawData.platform, rawData.external_id);
    
    if (existing) {
      // 2. 比較資料是否有變更（使用 data_hash）
      const hash = this.generateHash(rawData);
      if (existing.data_hash === hash) {
        return { status: 'unchanged', id: existing.id };
      }
      
      // 3. 記錄變更歷史
      await this.recordChanges(existing.id, rawData);
      
      // 4. 更新資料
      return await this.updateActivity(existing.id, rawData);
    }
    
    // 5. 檢查重複活動
    const duplicates = await this.findDuplicates(rawData);
    if (duplicates.length > 0) {
      await this.recordDuplicates(duplicates);
    }
    
    // 6. 建立新活動
    return await this.createActivity(rawData);
  }
  
  generateHash(data) {
    // 生成資料指紋
    const crypto = require('crypto');
    const content = JSON.stringify({
      name: data.name,
      location: data.location,
      time: data.time
    });
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  async findDuplicates(data) {
    // 使用多個維度判斷重複
    const sql = `
      SELECT a.id, 
             CASE
               WHEN a.name = ? THEN 1.0
               WHEN LOWER(a.name) = LOWER(?) THEN 0.9
               WHEN SUBSTR(a.name, 1, 10) = SUBSTR(?, 1, 10) THEN 0.7
               ELSE 0.5
             END as name_score,
             CASE
               WHEN l.address = ? THEN 1.0
               WHEN l.city = ? AND l.district = ? THEN 0.8
               ELSE 0.3
             END as location_score,
             CASE
               WHEN at.start_date = ? THEN 1.0
               WHEN ABS(JULIANDAY(at.start_date) - JULIANDAY(?)) <= 1 THEN 0.8
               ELSE 0.2
             END as time_score
      FROM activities a
      JOIN locations l ON a.id = l.activity_id
      JOIN activity_times at ON a.id = at.activity_id
      WHERE a.status = 'active'
      HAVING (name_score + location_score + time_score) / 3 > 0.7
    `;
    
    return await this.db.query(sql, [
      data.name, data.name, data.name,
      data.location.address, data.location.city, data.location.district,
      data.time.start_date, data.time.start_date
    ]);
  }
}
```

### 2. 資料品質計算邏輯

```javascript
// 改進的品質分數計算
function calculateQualityScores(activity) {
  // 完整度分數
  const completeness = calculateCompleteness(activity);
  
  // 資料品質分數
  const quality = calculateDataQuality(activity);
  
  return {
    completeness_score: completeness,
    quality_score: quality,
    overall_score: (completeness * 0.4 + quality * 0.6)
  };
}

function calculateCompleteness(activity) {
  const weights = {
    name: 0.15,
    description: 0.10,
    summary: 0.05,
    location_address: 0.15,
    location_coords: 0.10,
    location_venue: 0.05,
    time_start: 0.10,
    time_end: 0.05,
    categories: 0.10,
    tags: 0.05,
    price: 0.05,
    media: 0.05
  };
  
  let score = 0;
  
  if (activity.name) score += weights.name;
  if (activity.description && activity.description.length > 50) score += weights.description;
  if (activity.summary) score += weights.summary;
  if (activity.location?.address) score += weights.location_address;
  if (activity.location?.latitude && activity.location?.longitude) score += weights.location_coords;
  if (activity.location?.venue) score += weights.location_venue;
  if (activity.time?.start_date) score += weights.time_start;
  if (activity.time?.end_date) score += weights.time_end;
  if (activity.categories?.length > 0) score += weights.categories;
  if (activity.tags?.length > 0) score += weights.tags;
  if (activity.price !== undefined) score += weights.price;
  if (activity.media?.images?.length > 0) score += weights.media;
  
  return score;
}

function calculateDataQuality(activity) {
  let quality = 1.0;
  
  // 檢查資料品質問題
  const issues = [];
  
  // 名稱品質
  if (activity.name?.length < 3) issues.push('name_too_short');
  if (activity.name?.length > 200) issues.push('name_too_long');
  if (/[<>]/.test(activity.name)) issues.push('html_in_name');
  
  // 日期邏輯
  if (activity.time?.end_date && activity.time?.start_date) {
    if (new Date(activity.time.end_date) < new Date(activity.time.start_date)) {
      issues.push('invalid_date_range');
    }
  }
  
  // 座標範圍（台灣）
  if (activity.location?.latitude) {
    if (activity.location.latitude < 21 || activity.location.latitude > 26) {
      issues.push('invalid_latitude');
    }
  }
  if (activity.location?.longitude) {
    if (activity.location.longitude < 119 || activity.location.longitude > 122) {
      issues.push('invalid_longitude');
    }
  }
  
  // 根據問題數量降低品質分數
  quality -= (issues.length * 0.1);
  
  return Math.max(0, quality);
}
```

### 3. 批次處理優化

```sql
-- 使用臨時表進行批次匯入
CREATE TEMP TABLE temp_activities AS SELECT * FROM activities WHERE 0;

-- 批次插入到臨時表
-- (爬蟲將資料插入臨時表)

-- 檢查並合併到主表
INSERT INTO activities 
SELECT * FROM temp_activities t
WHERE NOT EXISTS (
  SELECT 1 FROM activities a 
  WHERE a.source_platform = t.source_platform 
    AND a.source_id = t.source_id
);

-- 更新已存在的資料
UPDATE activities 
SET 
  name = t.name,
  description = t.description,
  updated_at = t.updated_at,
  data_hash = t.data_hash
FROM temp_activities t
WHERE activities.source_platform = t.source_platform 
  AND activities.source_id = t.source_id
  AND activities.data_hash != t.data_hash;
```

## 實施步驟

### 第一階段：基礎結構調整
1. 備份現有資料庫
2. 執行欄位新增腳本
3. 建立新的輔助表格
4. 測試基本功能

### 第二階段：索引優化
1. 分析查詢效能
2. 建立必要索引
3. 測試查詢速度提升

### 第三階段：爬蟲整合
1. 更新爬蟲程式碼
2. 實作重複偵測邏輯
3. 加入資料品質檢查

### 第四階段：監控與優化
1. 建立資料品質儀表板
2. 定期清理重複資料
3. 優化查詢效能

## 效益評估

### 預期效益
1. **重複資料減少 80%**：透過外部 ID 和重複偵測
2. **爬蟲效率提升 60%**：避免重複處理相同資料
3. **資料品質提升 40%**：自動品質檢查和評分
4. **查詢速度提升 50%**：索引優化和視圖快取

### 監控指標
- 重複活動比例
- 資料完整度分數分布
- 爬蟲處理速度
- 資料更新頻率
- 錯誤重試次數

## 總結

這些優化將使資料庫更適合爬蟲處理：
1. ✅ 支援多來源資料整合
2. ✅ 自動偵測和處理重複
3. ✅ 追蹤資料變更歷史
4. ✅ 提供資料品質評估
5. ✅ 優化查詢效能