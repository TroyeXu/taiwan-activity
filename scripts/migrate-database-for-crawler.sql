-- ============================================
-- 資料庫遷移腳本 - 爬蟲優化
-- 版本: 1.0.0
-- 日期: 2025-08-10
-- 說明: 優化資料庫結構以支援爬蟲處理
-- ============================================

-- 執行前請先備份資料庫！
-- sqlite3 tourism.sqlite ".backup tourism_backup.sqlite"

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

-- 爬蟲任務管理表
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

-- 活動重複偵測表
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

-- 資料變更歷史表
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

-- 外部 ID 對應表
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

-- 資料品質檢查表
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

-- 爬蟲查詢優化索引
CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source_platform, source_id);
CREATE INDEX IF NOT EXISTS idx_activities_status_quality ON activities(status, quality_score);
CREATE INDEX IF NOT EXISTS idx_activities_updated ON activities(updated_at);
CREATE INDEX IF NOT EXISTS idx_activities_verified ON activities(is_verified, completeness_score);

-- 地理查詢優化索引
CREATE INDEX IF NOT EXISTS idx_locations_city_region ON locations(city, region);
CREATE INDEX IF NOT EXISTS idx_locations_geocode ON locations(geocode_status);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);

-- 資料來源查詢索引
CREATE INDEX IF NOT EXISTS idx_data_sources_crawled ON data_sources(crawled_at);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(processing_status);
CREATE INDEX IF NOT EXISTS idx_data_sources_activity ON data_sources(activity_id, website);

-- 外部 ID 查詢索引
CREATE INDEX IF NOT EXISTS idx_external_ids_lookup ON external_ids(platform, external_id);

-- 爬蟲任務索引
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(platform, status, created_at);

-- 時間範圍查詢索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_activity_times_dates ON activity_times(start_date, end_date);

-- ============================================
-- 4. 建立視圖
-- ============================================

-- 活動完整資訊視圖
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

-- 待處理資料視圖
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

-- 重複活動檢測視圖
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

-- 設定完整度分數
UPDATE activities 
SET completeness_score = quality_score 
WHERE completeness_score = 0;

-- 設定預設來源平台
UPDATE activities 
SET source_platform = 'manual' 
WHERE source_platform IS NULL;

-- 設定地理編碼狀態
UPDATE locations 
SET geocode_status = 'completed' 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

UPDATE locations 
SET geocode_status = 'pending' 
WHERE latitude IS NULL OR longitude IS NULL;

-- 設定資料處理狀態
UPDATE data_sources 
SET processing_status = 'completed' 
WHERE processing_status = 'pending' OR processing_status IS NULL;

-- ============================================
-- 6. 插入初始資料
-- ============================================

-- 插入預設分類（如果不存在）
INSERT OR IGNORE INTO categories (id, name, slug, color_code, icon) VALUES
('cat-music', '音樂表演', 'music', '#FF6B6B', '🎵'),
('cat-exhibition', '展覽', 'exhibition', '#4ECDC4', '🎨'),
('cat-culture', '文化藝術', 'culture', '#45B7D1', '🎭'),
('cat-sports', '運動健身', 'sports', '#96CEB4', '⚽'),
('cat-food', '美食市集', 'food', '#FFEAA7', '🍜'),
('cat-outdoor', '戶外活動', 'outdoor', '#74B9FF', '🏞️'),
('cat-family', '親子活動', 'family', '#FD79A8', '👨‍👩‍👧‍👦'),
('cat-education', '教育講座', 'education', '#A29BFE', '📚'),
('cat-workshop', '工作坊', 'workshop', '#6C5CE7', '🛠️'),
('cat-other', '其他', 'other', '#B2BEC3', '📌');

-- 插入常用標籤（如果不存在）
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count) VALUES
('tag-indoor', '室內活動', 'indoor', 'location', 0),
('tag-outdoor', '戶外活動', 'outdoor', 'location', 0),
('tag-free', '免費活動', 'free', 'price', 0),
('tag-weekend', '週末活動', 'weekend', 'time', 0),
('tag-night', '夜間活動', 'night', 'time', 0),
('tag-family', '親子友善', 'family', 'feature', 0),
('tag-pets', '寵物友善', 'pets', 'feature', 0),
('tag-accessibility', '無障礙', 'accessibility', 'feature', 0),
('tag-parking', '附停車場', 'parking', 'facility', 0),
('tag-mrt', '近捷運站', 'mrt', 'facility', 0);

COMMIT;

-- ============================================
-- 7. 驗證遷移
-- ============================================

-- 檢查新欄位
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Activities table updated'
        ELSE '❌ Activities table update failed'
    END as status
FROM pragma_table_info('activities')
WHERE name IN ('source_id', 'source_platform', 'data_hash');

-- 檢查新表格
SELECT 
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ All new tables created'
        ELSE '❌ Some tables missing'
    END as status
FROM sqlite_master
WHERE type = 'table' 
  AND name IN ('crawl_jobs', 'activity_duplicates', 'activity_history', 'external_ids', 'quality_checks');

-- 檢查索引
SELECT 
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ All indexes created'
        ELSE '❌ Some indexes missing'
    END as status
FROM sqlite_master
WHERE type = 'index' 
  AND name LIKE 'idx_%';

-- 檢查視圖
SELECT 
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ All views created'
        ELSE '❌ Some views missing'
    END as status
FROM sqlite_master
WHERE type = 'view' 
  AND name IN ('v_activities_full', 'v_pending_activities', 'v_potential_duplicates');

-- 最終狀態
SELECT '🎉 Migration completed successfully!' as final_status;