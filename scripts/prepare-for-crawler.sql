-- ============================================
-- 資料庫準備爬蟲整合腳本
-- 版本: 1.0.0
-- 日期: 2025-08-12
-- 說明: 為爬蟲系統準備必要的資料庫結構
-- ============================================

BEGIN TRANSACTION;

-- ============================================
-- 1. 為 activities 表新增爬蟲相關欄位
-- ============================================

-- 新增爬蟲必要欄位（不影響現有功能）
ALTER TABLE activities ADD COLUMN url TEXT;
ALTER TABLE activities ADD COLUMN source_url TEXT;
ALTER TABLE activities ADD COLUMN last_crawled_at INTEGER;
ALTER TABLE activities ADD COLUMN data_hash TEXT;
ALTER TABLE activities ADD COLUMN external_id TEXT;

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_activities_external ON activities(external_id);
CREATE INDEX IF NOT EXISTS idx_activities_hash ON activities(data_hash);
CREATE INDEX IF NOT EXISTS idx_activities_crawled ON activities(last_crawled_at);

-- ============================================
-- 2. 建立活動圖片表
-- ============================================

CREATE TABLE IF NOT EXISTS activity_images (
    id TEXT PRIMARY KEY NOT NULL,
    activity_id TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'main' CHECK(type IN ('main', 'gallery', 'thumbnail', 'cover')),
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_activity ON activity_images(activity_id);
CREATE INDEX IF NOT EXISTS idx_images_type ON activity_images(type, display_order);

-- ============================================
-- 3. 建立爬蟲日誌表（追蹤爬蟲執行狀況）
-- ============================================

CREATE TABLE IF NOT EXISTS crawl_logs (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL, -- 資料來源（如：klook, kkday, tripadvisor）
    status TEXT NOT NULL CHECK(status IN ('running', 'success', 'failed', 'partial')),
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    total_found INTEGER DEFAULT 0,
    total_processed INTEGER DEFAULT 0,
    total_created INTEGER DEFAULT 0,
    total_updated INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata TEXT -- JSON 格式的額外資訊
);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_source ON crawl_logs(source, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_status ON crawl_logs(status);

-- ============================================
-- 4. 建立資料來源對應表
-- ============================================

CREATE TABLE IF NOT EXISTS data_sources (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE, -- klook, kkday, taiwan_tourism
    base_url TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    crawl_frequency TEXT DEFAULT 'daily', -- daily, weekly, monthly
    last_successful_crawl INTEGER,
    config TEXT -- JSON 格式的爬蟲設定
);

-- 插入預設資料來源
INSERT OR IGNORE INTO data_sources (id, name, base_url, is_active) VALUES
('src_1', 'taiwan_tourism', 'https://www.taiwan.net.tw', 1),
('src_2', 'klook', 'https://www.klook.com', 1),
('src_3', 'kkday', 'https://www.kkday.com', 1),
('src_4', 'tripadvisor', 'https://www.tripadvisor.com.tw', 0);

-- ============================================
-- 5. 建立爬蟲防重複機制視圖
-- ============================================

CREATE VIEW IF NOT EXISTS v_crawl_duplicates AS
SELECT 
    a1.id as id1,
    a1.name as name1,
    a1.external_id as external_id1,
    a2.id as id2,
    a2.name as name2,
    a2.external_id as external_id2,
    a1.data_hash
FROM activities a1
JOIN activities a2 ON a1.data_hash = a2.data_hash AND a1.id < a2.id
WHERE a1.data_hash IS NOT NULL;

-- ============================================
-- 6. 建立爬蟲統計視圖
-- ============================================

CREATE VIEW IF NOT EXISTS v_crawl_stats AS
SELECT 
    (SELECT COUNT(*) FROM activities WHERE last_crawled_at IS NOT NULL) as total_crawled,
    (SELECT COUNT(*) FROM activities WHERE last_crawled_at > strftime('%s', 'now', '-1 day')) as crawled_today,
    (SELECT COUNT(*) FROM activities WHERE last_crawled_at > strftime('%s', 'now', '-7 days')) as crawled_week,
    (SELECT COUNT(DISTINCT data_hash) FROM activities WHERE data_hash IS NOT NULL) as unique_activities,
    (SELECT COUNT(*) FROM activity_images) as total_images,
    (SELECT COUNT(*) FROM crawl_logs WHERE status = 'success') as successful_crawls,
    (SELECT COUNT(*) FROM crawl_logs WHERE status = 'failed') as failed_crawls;

-- ============================================
-- 7. 更新現有資料的預設值
-- ============================================

-- 為現有活動生成 data_hash（基於名稱和地點）
UPDATE activities 
SET data_hash = lower(hex(randomblob(16)) || '_' || substr(name, 1, 20))
WHERE data_hash IS NULL;

-- 設定預設的 external_id（使用現有 id）
UPDATE activities 
SET external_id = 'manual_' || id
WHERE external_id IS NULL;

-- ============================================
-- 8. 建立爬蟲輔助函數（觸發器）
-- ============================================

-- 自動更新 updated_at 時間戳
CREATE TRIGGER IF NOT EXISTS update_activity_timestamp 
AFTER UPDATE ON activities
BEGIN
    UPDATE activities SET updated_at = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 自動更新爬蟲時間
CREATE TRIGGER IF NOT EXISTS update_crawl_timestamp 
AFTER UPDATE ON activities
WHEN NEW.data_hash != OLD.data_hash OR NEW.external_id != OLD.external_id
BEGIN
    UPDATE activities SET last_crawled_at = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

COMMIT;

-- ============================================
-- 9. 驗證結果
-- ============================================

SELECT '=== 爬蟲準備完成統計 ===' as info;
SELECT 
    (SELECT COUNT(*) FROM pragma_table_info('activities') WHERE name IN ('url', 'source_url', 'data_hash')) as new_columns,
    (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'activity_images') as images_table,
    (SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'crawl_logs') as logs_table,
    (SELECT COUNT(*) FROM data_sources) as data_sources_count;

SELECT '✅ 資料庫已準備好進行爬蟲整合！' as status;