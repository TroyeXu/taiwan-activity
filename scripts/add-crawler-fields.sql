-- ============================================
-- 新增爬蟲必要欄位
-- 版本: 1.0.0
-- 日期: 2025-08-12
-- 說明: 為 activities 表新增爬蟲整合所需的欄位
-- ============================================

BEGIN TRANSACTION;

-- ============================================
-- 1. 為 activities 表新增爬蟲欄位
-- ============================================

-- 新增活動官方連結
ALTER TABLE activities ADD COLUMN url TEXT;

-- 新增資料來源網址
ALTER TABLE activities ADD COLUMN source_url TEXT;

-- 新增最後爬取時間
ALTER TABLE activities ADD COLUMN last_crawled_at INTEGER;

-- 新增資料雜湊值（防重複）
ALTER TABLE activities ADD COLUMN data_hash TEXT;

-- 新增外部系統ID
ALTER TABLE activities ADD COLUMN external_id TEXT;

-- ============================================
-- 2. 建立索引以優化查詢效能
-- ============================================

-- external_id 索引（快速查找外部ID）
CREATE INDEX IF NOT EXISTS idx_activities_external ON activities(external_id);

-- data_hash 索引（防重複檢查）
CREATE INDEX IF NOT EXISTS idx_activities_hash ON activities(data_hash);

-- last_crawled_at 索引（查詢需要更新的活動）
CREATE INDEX IF NOT EXISTS idx_activities_crawled ON activities(last_crawled_at);

-- source_url 索引（依來源查詢）
CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source_url);

-- ============================================
-- 3. 為現有資料設定預設值
-- ============================================

-- 為現有活動生成 data_hash（基於名稱、城市和日期）
UPDATE activities 
SET data_hash = lower(
    hex(randomblob(8)) || '_' || 
    substr(replace(lower(name), ' ', '_'), 1, 20)
)
WHERE data_hash IS NULL;

-- 設定預設的 external_id（使用 manual_ 前綴表示手動輸入）
UPDATE activities 
SET external_id = 'manual_' || id
WHERE external_id IS NULL;

-- 設定最後爬取時間為現在（表示這些是手動輸入的資料）
UPDATE activities 
SET last_crawled_at = strftime('%s', 'now')
WHERE last_crawled_at IS NULL;

-- ============================================
-- 4. 建立爬蟲輔助視圖
-- ============================================

-- 建立視圖：需要更新的活動（超過7天未更新）
CREATE VIEW IF NOT EXISTS v_activities_need_update AS
SELECT 
    id,
    name,
    external_id,
    source_url,
    last_crawled_at,
    datetime(last_crawled_at, 'unixepoch') as last_crawled_date,
    CAST((strftime('%s', 'now') - last_crawled_at) / 86400 AS INTEGER) as days_since_crawl
FROM activities
WHERE last_crawled_at IS NULL 
   OR last_crawled_at < strftime('%s', 'now', '-7 days')
ORDER BY last_crawled_at ASC;

-- 建立視圖：檢查重複活動
CREATE VIEW IF NOT EXISTS v_duplicate_activities AS
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
-- 5. 建立觸發器自動更新時間戳
-- ============================================

-- 當資料被更新時，自動更新 updated_at
DROP TRIGGER IF EXISTS update_activity_timestamp;
CREATE TRIGGER update_activity_timestamp 
AFTER UPDATE ON activities
FOR EACH ROW
WHEN NEW.name != OLD.name 
  OR NEW.description != OLD.description 
  OR NEW.price != OLD.price
  OR NEW.status != OLD.status
BEGIN
    UPDATE activities 
    SET updated_at = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 當爬蟲相關欄位更新時，自動更新 last_crawled_at
DROP TRIGGER IF EXISTS update_crawl_timestamp;
CREATE TRIGGER update_crawl_timestamp 
AFTER UPDATE ON activities
FOR EACH ROW
WHEN NEW.data_hash != OLD.data_hash 
  OR NEW.external_id != OLD.external_id
  OR NEW.source_url != OLD.source_url
BEGIN
    UPDATE activities 
    SET last_crawled_at = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

COMMIT;

-- ============================================
-- 6. 驗證更新結果
-- ============================================

-- 檢查新欄位是否成功新增
SELECT '=== 新增欄位檢查 ===' as info;
SELECT 
    COUNT(*) as new_fields_count
FROM pragma_table_info('activities') 
WHERE name IN ('url', 'source_url', 'last_crawled_at', 'data_hash', 'external_id');

-- 檢查索引是否建立
SELECT '=== 索引建立檢查 ===' as info;
SELECT 
    COUNT(*) as index_count
FROM sqlite_master 
WHERE type = 'index' 
AND name IN ('idx_activities_external', 'idx_activities_hash', 'idx_activities_crawled', 'idx_activities_source');

-- 顯示範例資料
SELECT '=== 範例資料（前3筆）===' as info;
SELECT 
    id,
    name,
    external_id,
    data_hash,
    datetime(last_crawled_at, 'unixepoch') as last_crawled
FROM activities 
LIMIT 3;

-- 統計資料
SELECT '=== 資料統計 ===' as info;
SELECT 
    COUNT(*) as total_activities,
    COUNT(external_id) as has_external_id,
    COUNT(data_hash) as has_data_hash,
    COUNT(url) as has_url,
    COUNT(source_url) as has_source_url
FROM activities;

SELECT '✅ 爬蟲欄位新增完成！' as status;