-- ============================================
-- 資料庫清理腳本 - 移除爬蟲和使用者相關結構
-- 版本: 1.0.0
-- 日期: 2025-08-12
-- 說明: 清理未使用的爬蟲、使用者系統相關表格和欄位
-- ============================================

-- 執行前請先備份資料庫！
-- sqlite3 public/tourism.sqlite ".backup public/tourism_backup_$(date +%Y%m%d_%H%M%S).sqlite"

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- ============================================
-- 1. 刪除爬蟲相關視圖
-- ============================================

DROP VIEW IF EXISTS v_pending_activities;
DROP VIEW IF EXISTS v_potential_duplicates;

-- ============================================
-- 2. 刪除爬蟲和使用者相關表格
-- ============================================

-- 爬蟲相關表格
DROP TABLE IF EXISTS crawl_jobs;
DROP TABLE IF EXISTS activity_duplicates;
DROP TABLE IF EXISTS activity_history;
DROP TABLE IF EXISTS external_ids;
DROP TABLE IF EXISTS quality_checks;
DROP TABLE IF EXISTS data_sources;
DROP TABLE IF EXISTS validation_logs;

-- 使用者系統相關表格
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS search_logs;

-- ============================================
-- 3. 創建臨時表格來移除不需要的欄位
-- ============================================

-- 創建新的 activities 表（不含爬蟲欄位）
CREATE TABLE activities_new (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    quality_score INTEGER DEFAULT 0 NOT NULL,
    price INTEGER DEFAULT 0,
    price_type TEXT DEFAULT 'free',
    currency TEXT DEFAULT 'TWD',
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    popularity_score REAL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 複製資料（不包含爬蟲欄位）
INSERT INTO activities_new 
SELECT 
    id,
    name,
    description,
    summary,
    status,
    quality_score,
    price,
    price_type,
    currency,
    view_count,
    favorite_count,
    click_count,
    popularity_score,
    created_at,
    updated_at
FROM activities;

-- 刪除舊表格
DROP TABLE activities;

-- 重命名新表格
ALTER TABLE activities_new RENAME TO activities;

-- 創建新的 locations 表（不含爬蟲欄位）
CREATE TABLE locations_new (
    id TEXT PRIMARY KEY NOT NULL,
    activity_id TEXT NOT NULL,
    address TEXT NOT NULL,
    district TEXT,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    venue TEXT,
    landmarks TEXT,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- 複製資料（不包含爬蟲欄位）
INSERT INTO locations_new
SELECT 
    id,
    activity_id,
    address,
    district,
    city,
    region,
    latitude,
    longitude,
    venue,
    landmarks
FROM locations;

-- 刪除舊表格
DROP TABLE locations;

-- 重命名新表格
ALTER TABLE locations_new RENAME TO locations;

-- ============================================
-- 4. 重建必要的索引
-- ============================================

-- activities 表索引
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_quality ON activities(quality_score);
CREATE INDEX idx_activities_created ON activities(created_at);
CREATE INDEX idx_activities_updated ON activities(updated_at);
CREATE INDEX idx_activities_price ON activities(price_type, price);

-- locations 表索引
CREATE INDEX idx_locations_activity ON locations(activity_id);
CREATE INDEX idx_locations_city ON locations(city);
CREATE INDEX idx_locations_region ON locations(region);
CREATE INDEX idx_locations_coords ON locations(latitude, longitude);

-- activity_times 表索引（保留原有）
CREATE INDEX IF NOT EXISTS idx_activity_times_dates ON activity_times(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_activity_times_activity ON activity_times(activity_id);

-- categories 和 tags 關聯索引
CREATE INDEX IF NOT EXISTS idx_activity_categories_activity ON activity_categories(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_categories_category ON activity_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity ON activity_tags(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tag ON activity_tags(tag_id);

-- ============================================
-- 5. 重建簡化的視圖
-- ============================================

-- 活動完整資訊視圖（簡化版）
DROP VIEW IF EXISTS v_activities_full;
CREATE VIEW v_activities_full AS
SELECT 
    a.*,
    l.address,
    l.district,
    l.city,
    l.region,
    l.latitude,
    l.longitude,
    l.venue,
    l.landmarks,
    at.start_date,
    at.end_date,
    at.start_time,
    at.end_time,
    at.timezone,
    at.is_recurring,
    at.recurrence_rule,
    GROUP_CONCAT(DISTINCT c.name) as categories,
    GROUP_CONCAT(DISTINCT t.name) as tags
FROM activities a
LEFT JOIN locations l ON a.id = l.activity_id
LEFT JOIN activity_times at ON a.id = at.activity_id
LEFT JOIN activity_categories ac ON a.id = ac.activity_id
LEFT JOIN categories c ON ac.category_id = c.id
LEFT JOIN activity_tags atg ON a.id = atg.activity_id
LEFT JOIN tags t ON atg.tag_id = t.id
GROUP BY a.id;

COMMIT;

PRAGMA foreign_keys = ON;

-- ============================================
-- 6. 清理和優化
-- ============================================

VACUUM;
ANALYZE;

-- ============================================
-- 7. 驗證清理結果
-- ============================================

-- 列出所有表格
SELECT '=== 現有表格 ===' as info;
SELECT name FROM sqlite_master 
WHERE type = 'table' 
AND name NOT LIKE 'sqlite_%'
AND name NOT LIKE '__drizzle%'
ORDER BY name;

-- 檢查 activities 表結構
SELECT '=== Activities 表結構 ===' as info;
SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'activities';

-- 檢查 locations 表結構  
SELECT '=== Locations 表結構 ===' as info;
SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'locations';

-- 統計資料
SELECT '=== 資料統計 ===' as info;
SELECT 
    (SELECT COUNT(*) FROM activities) as total_activities,
    (SELECT COUNT(*) FROM locations) as total_locations,
    (SELECT COUNT(*) FROM categories) as total_categories,
    (SELECT COUNT(*) FROM tags) as total_tags;

SELECT '✅ 資料庫清理完成！' as status;