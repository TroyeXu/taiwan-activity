-- 地理空間索引和優化設計
-- 此檔案包含 SpatiaLite 擴展所需的空間索引和優化

-- 1. 建立空間幾何欄位
-- 為 locations 表新增 geometry 欄位來儲存點位資訊
SELECT AddGeometryColumn('locations', 'geom', 4326, 'POINT', 'XY');

-- 2. 建立空間索引
-- 這將大幅提升地理查詢效能
SELECT CreateSpatialIndex('locations', 'geom');

-- 3. 建立複合索引提升查詢效能
CREATE INDEX IF NOT EXISTS idx_locations_city_region ON locations(city, region);
CREATE INDEX IF NOT EXISTS idx_locations_lat_lng ON locations(latitude, longitude);

-- 4. 活動狀態和品質分數索引
CREATE INDEX IF NOT EXISTS idx_activities_status_quality ON activities(status, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_popularity ON activities(popularity_score DESC);

-- 5. 時間相關索引
CREATE INDEX IF NOT EXISTS idx_activity_times_dates ON activity_times(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_activity_times_start_date ON activity_times(start_date);
CREATE INDEX IF NOT EXISTS idx_activity_times_activity_id ON activity_times(activity_id);

-- 6. 分類關聯索引
CREATE INDEX IF NOT EXISTS idx_activity_categories_activity_id ON activity_categories(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_categories_category_id ON activity_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 7. 驗證記錄索引
CREATE INDEX IF NOT EXISTS idx_validation_logs_activity_id ON validation_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_validated_at ON validation_logs(validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_logs_quality_score ON validation_logs(quality_score DESC);

-- 8. 使用者相關索引
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_activity_id ON user_favorites(activity_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_saved_at ON user_favorites(saved_at DESC);

-- 9. 搜尋記錄索引
CREATE INDEX IF NOT EXISTS idx_search_logs_searched_at ON search_logs(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);

-- 10. 標籤索引
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity_id ON activity_tags(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tag_id ON activity_tags(tag_id);

-- 11. 建立觸發器來自動更新 geometry 欄位
-- 當 latitude 或 longitude 更新時，自動更新 geom 欄位
CREATE TRIGGER IF NOT EXISTS update_geom_on_coordinates_change
AFTER UPDATE OF latitude, longitude ON locations
FOR EACH ROW
WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
BEGIN
  UPDATE locations 
  SET geom = MakePoint(NEW.longitude, NEW.latitude, 4326)
  WHERE id = NEW.id;
END;

-- 12. 建立觸發器來自動更新 geometry 欄位 (插入時)
CREATE TRIGGER IF NOT EXISTS insert_geom_on_coordinates_insert
AFTER INSERT ON locations
FOR EACH ROW
WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
BEGIN
  UPDATE locations 
  SET geom = MakePoint(NEW.longitude, NEW.latitude, 4326)
  WHERE id = NEW.id;
END;

-- 13. 建立觸發器來自動更新 updated_at 欄位
CREATE TRIGGER IF NOT EXISTS update_activities_updated_at
AFTER UPDATE ON activities
FOR EACH ROW
BEGIN
  UPDATE activities SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 14. 建立觸發器來更新熱門度分數
CREATE TRIGGER IF NOT EXISTS update_popularity_score
AFTER UPDATE OF view_count, favorite_count, click_count ON activities
FOR EACH ROW
BEGIN
  UPDATE activities 
  SET popularity_score = (
    (NEW.view_count * 0.1) + 
    (NEW.favorite_count * 0.5) + 
    (NEW.click_count * 0.3) +
    (NEW.quality_score * 0.1)
  ) / 100.0
  WHERE id = NEW.id;
END;

-- 15. 建立檢視用於常用查詢
-- 活動完整資訊檢視
CREATE VIEW IF NOT EXISTS activities_with_details AS
SELECT 
  a.*,
  l.address,
  l.city,
  l.region,
  l.latitude,
  l.longitude,
  l.venue,
  l.geom,
  t.start_date,
  t.end_date,
  t.start_time,
  t.end_time,
  t.is_recurring,
  GROUP_CONCAT(c.name) AS category_names,
  GROUP_CONCAT(c.slug) AS category_slugs,
  GROUP_CONCAT(c.color_code) AS category_colors,
  GROUP_CONCAT(c.icon) AS category_icons
FROM activities a
LEFT JOIN locations l ON a.id = l.activity_id
LEFT JOIN activity_times t ON a.id = t.activity_id
LEFT JOIN activity_categories ac ON a.id = ac.activity_id
LEFT JOIN categories c ON ac.category_id = c.id
GROUP BY a.id;

-- 16. 活動統計檢視
CREATE VIEW IF NOT EXISTS activity_statistics AS
SELECT 
  COUNT(*) AS total_activities,
  COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_activities,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_activities,
  AVG(quality_score) AS average_quality,
  COUNT(CASE WHEN quality_score >= 80 THEN 1 END) AS high_quality_activities,
  COUNT(DISTINCT l.city) AS cities_covered,
  COUNT(DISTINCT l.region) AS regions_covered
FROM activities a
LEFT JOIN locations l ON a.id = l.activity_id;

-- 17. 分類統計檢視
CREATE VIEW IF NOT EXISTS category_statistics AS
SELECT 
  c.id,
  c.name,
  c.slug,
  COUNT(ac.activity_id) AS activity_count,
  AVG(a.quality_score) AS average_quality,
  AVG(a.popularity_score) AS average_popularity
FROM categories c
LEFT JOIN activity_categories ac ON c.id = ac.category_id
LEFT JOIN activities a ON ac.activity_id = a.id AND a.status = 'active'
GROUP BY c.id, c.name, c.slug
ORDER BY activity_count DESC;

-- 18. 地區統計檢視
CREATE VIEW IF NOT EXISTS region_statistics AS
SELECT 
  region,
  city,
  COUNT(*) AS activity_count,
  AVG(a.quality_score) AS average_quality,
  COUNT(CASE WHEN a.status = 'active' THEN 1 END) AS active_count
FROM locations l
JOIN activities a ON l.activity_id = a.id
GROUP BY region, city
ORDER BY activity_count DESC;

-- 19. 建立全文搜尋索引 (FTS5)
-- 為活動名稱和描述建立全文搜尋
CREATE VIRTUAL TABLE IF NOT EXISTS activities_fts USING fts5(
  id,
  name,
  description,
  summary,
  address,
  venue,
  category_names,
  content='activities_with_details',
  content_rowid='id'
);

-- 20. 建立觸發器來維護 FTS 索引
CREATE TRIGGER IF NOT EXISTS activities_ai AFTER INSERT ON activities BEGIN
  INSERT INTO activities_fts(id, name, description, summary) 
  VALUES (new.id, new.name, new.description, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS activities_ad AFTER DELETE ON activities BEGIN
  INSERT INTO activities_fts(activities_fts, id) VALUES('delete', old.id);
END;

CREATE TRIGGER IF NOT EXISTS activities_au AFTER UPDATE ON activities BEGIN
  INSERT INTO activities_fts(activities_fts, id) VALUES('delete', old.id);
  INSERT INTO activities_fts(id, name, description, summary) 
  VALUES (new.id, new.name, new.description, new.summary);
END;

-- 21. 建立空間查詢函數 (如果需要自定義函數)
-- 由於 SQLite 限制，我們無法建立自定義函數，但可以準備常用的空間查詢模板

-- 常用空間查詢範例：
-- 
-- 找尋指定位置周圍的活動 (使用空間索引)：
-- SELECT a.*, l.*, 
--        Distance(l.geom, MakePoint(longitude, latitude, 4326)) / 1000 as distance_km
-- FROM activities a
-- JOIN locations l ON a.id = l.activity_id
-- WHERE a.status = 'active'
--   AND Within(l.geom, Buffer(MakePoint(longitude, latitude, 4326), radius_meters))
-- ORDER BY distance_km;
--
-- 找尋指定邊界內的活動：
-- SELECT a.*, l.*
-- FROM activities a
-- JOIN locations l ON a.id = l.activity_id
-- WHERE a.status = 'active'
--   AND Within(l.geom, BuildMbr(min_lng, min_lat, max_lng, max_lat, 4326));

-- 22. 效能分析輔助
-- 建立查詢統計表來追蹤慢查詢
CREATE TABLE IF NOT EXISTS query_performance (
  id TEXT PRIMARY KEY,
  query_type TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  parameters TEXT, -- JSON
  executed_at INTEGER NOT NULL,
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_query_performance_type_time ON query_performance(query_type, execution_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_executed_at ON query_performance(executed_at DESC);

-- 23. 資料完整性檢查
-- 建立檢查約束來確保資料品質
-- 注意：SQLite 的 CHECK 約束支援有限，主要在應用層處理

-- 確保座標在台灣範圍內的檢查可以在觸發器中實現
CREATE TRIGGER IF NOT EXISTS validate_taiwan_coordinates
BEFORE INSERT ON locations
FOR EACH ROW
WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
  AND (NEW.latitude < 21.8 OR NEW.latitude > 25.4 
       OR NEW.longitude < 119.3 OR NEW.longitude > 122.1)
BEGIN
  SELECT RAISE(ABORT, 'Coordinates are outside Taiwan region');
END;

CREATE TRIGGER IF NOT EXISTS validate_taiwan_coordinates_update
BEFORE UPDATE OF latitude, longitude ON locations
FOR EACH ROW
WHEN NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
  AND (NEW.latitude < 21.8 OR NEW.latitude > 25.4 
       OR NEW.longitude < 119.3 OR NEW.longitude > 122.1)
BEGIN
  SELECT RAISE(ABORT, 'Coordinates are outside Taiwan region');
END;