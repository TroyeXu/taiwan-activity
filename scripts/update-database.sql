-- ============================================
-- 資料庫更新腳本 - 優化資料品質和內容
-- 版本: 1.0.0
-- 日期: 2025-08-12
-- 說明: 更新活動資料、修正日期、增加更多活動內容
-- ============================================

BEGIN TRANSACTION;

-- ============================================
-- 1. 更新現有活動的品質分數和統計
-- ============================================

-- 更新品質分數（根據資料完整度）
UPDATE activities 
SET quality_score = 
    CASE 
        WHEN description IS NOT NULL AND summary IS NOT NULL THEN 85 + (RANDOM() % 15)
        WHEN description IS NOT NULL OR summary IS NOT NULL THEN 70 + (RANDOM() % 15)
        ELSE 50 + (RANDOM() % 20)
    END
WHERE quality_score = 0;

-- 更新瀏覽次數（模擬真實數據）
UPDATE activities 
SET view_count = 100 + (ABS(RANDOM()) % 5000),
    click_count = 10 + (ABS(RANDOM()) % 500),
    favorite_count = 5 + (ABS(RANDOM()) % 200)
WHERE view_count = 0;

-- 更新熱門度分數
UPDATE activities 
SET popularity_score = 
    (view_count * 0.3 + click_count * 0.5 + favorite_count * 2) / 100.0;

-- ============================================
-- 2. 修正活動時間（確保未來日期）
-- ============================================

-- 更新已過期的活動日期到未來
UPDATE activity_times
SET start_date = DATE('now', '+' || (ABS(RANDOM()) % 60) || ' days'),
    end_date = DATE('now', '+' || (60 + ABS(RANDOM()) % 30) || ' days')
WHERE start_date < DATE('now');

-- 設定春季活動（3-5月）
UPDATE activity_times
SET start_date = '2025-03-01',
    end_date = '2025-05-31'
WHERE activity_id IN (
    SELECT id FROM activities WHERE name LIKE '%賞櫻%' OR name LIKE '%春%'
);

-- 設定夏季活動（6-8月）
UPDATE activity_times
SET start_date = '2025-06-01',
    end_date = '2025-08-31'
WHERE activity_id IN (
    SELECT id FROM activities WHERE name LIKE '%夏%' OR name LIKE '%海%' OR name LIKE '%衝浪%'
);

-- 設定賞螢活動（4-5月）
UPDATE activity_times
SET start_date = '2025-04-01',
    end_date = '2025-05-31'
WHERE activity_id IN (
    SELECT id FROM activities WHERE name LIKE '%螢%'
);

-- ============================================
-- 3. 新增更多精彩活動
-- ============================================

-- 新增北部活動
INSERT OR IGNORE INTO activities (id, name, description, summary, status, quality_score, price, price_type, view_count, favorite_count, click_count, popularity_score, created_at, updated_at)
VALUES 
('act_26', '九份老街懷舊之旅', '漫步在充滿懷舊氛圍的九份老街，品嚐道地小吃，欣賞山城美景。體驗採金歷史，探索神隱少女取景地。', '探索九份山城之美，品味懷舊時光', 'active', 92, 0, 'free', 3500, 180, 420, 85.2, strftime('%s','now'), strftime('%s','now')),
('act_27', '野柳地質公園奇岩之旅', '探索大自然的鬼斧神工，欣賞女王頭、仙女鞋等特殊地質景觀。專業導覽帶您了解地質形成過程。', '觀賞世界級地質奇觀', 'active', 88, 80, 'paid', 2800, 150, 350, 72.5, strftime('%s','now'), strftime('%s','now')),
('act_28', '貓空纜車賞夜景', '搭乘貓空纜車俯瞰台北盆地，在山頂品茗賞夜景。水晶車廂體驗，360度無死角美景。', '纜車品茗賞台北夜景', 'active', 90, 120, 'paid', 4200, 220, 500, 95.8, strftime('%s','now'), strftime('%s','now'));

-- 新增中部活動
INSERT OR IGNORE INTO activities (id, name, description, summary, status, quality_score, price, price_type, view_count, favorite_count, click_count, popularity_score, created_at, updated_at)
VALUES 
('act_29', '日月潭環湖自行車道', '騎乘全球十大最美自行車道，環繞日月潭一圈。沿途欣賞湖光山色，停靠向山遊客中心等景點。', '騎行台灣最美單車道', 'active', 95, 200, 'paid', 5200, 280, 620, 112.5, strftime('%s','now'), strftime('%s','now')),
('act_30', '清境農場綿羊秀', '觀賞精彩的綿羊脫衣秀，與可愛綿羊近距離互動。漫步青青草原，享受高山清新空氣。', '高山牧場親子同樂', 'active', 87, 200, 'paid', 3800, 195, 450, 88.2, strftime('%s','now'), strftime('%s','now')),
('act_31', '鹿港小鎮文化巡禮', '探訪古色古香的鹿港老街，參觀天后宮、龍山寺等古蹟。品嚐傳統小吃，體驗傳統工藝。', '穿越時空遊古鎮', 'active', 86, 0, 'free', 2600, 140, 320, 65.8, strftime('%s','now'), strftime('%s','now'));

-- 新增南部活動
INSERT OR IGNORE INTO activities (id, name, description, summary, status, quality_score, price, price_type, view_count, favorite_count, click_count, popularity_score, created_at, updated_at)
VALUES 
('act_32', '墾丁春吶音樂節', '台灣最大的戶外音樂盛會，匯集國內外知名樂團。在陽光沙灘享受音樂狂歡，體驗南國熱情。', '春天吶喊音樂狂歡', 'active', 93, 1500, 'paid', 8500, 450, 980, 182.5, strftime('%s','now'), strftime('%s','now')),
('act_33', '旗津海鮮美食節', '品嚐新鮮海產，體驗漁村文化。騎單車遊旗津，欣賞夕陽西下的海港美景。', '大啖海鮮賞夕陽', 'active', 85, 0, 'free', 3200, 170, 380, 75.5, strftime('%s','now'), strftime('%s','now')),
('act_34', '安平老街尋寶', '走訪台灣第一街，品嚐道地小吃。參觀安平古堡、樹屋等歷史景點，了解台灣開發史。', '探索府城歷史風華', 'active', 88, 50, 'paid', 2900, 155, 340, 70.2, strftime('%s','now'), strftime('%s','now'));

-- 新增東部活動
INSERT OR IGNORE INTO activities (id, name, description, summary, status, quality_score, price, price_type, view_count, favorite_count, click_count, popularity_score, created_at, updated_at)
VALUES 
('act_35', '太魯閣峽谷健行', '挑戰世界級峽谷步道，欣賞大理石峭壁奇景。專業嚮導帶領，探索燕子口、九曲洞等著名景點。', '征服大自然鬼斧神工', 'active', 96, 300, 'paid', 6200, 320, 720, 135.8, strftime('%s','now'), strftime('%s','now')),
('act_36', '花蓮賞鯨豚之旅', '出海尋找鯨豚蹤跡，近距離觀察海洋精靈。專業解說員介紹海洋生態，體驗與大自然的親密接觸。', '追尋海洋精靈', 'active', 91, 800, 'paid', 4500, 240, 520, 102.5, strftime('%s','now'), strftime('%s','now')),
('act_37', '台東熱氣球嘉年華', '搭乘熱氣球俯瞰花東縱谷，體驗飛行的夢想。光雕音樂會、熱氣球自由飛等精彩活動。', '飛越縱谷賞美景', 'active', 98, 2500, 'paid', 9800, 520, 1100, 215.8, strftime('%s','now'), strftime('%s','now'));

-- 新增離島活動
INSERT OR IGNORE INTO activities (id, name, description, summary, status, quality_score, price, price_type, view_count, favorite_count, click_count, popularity_score, created_at, updated_at)
VALUES 
('act_38', '澎湖花火節', '欣賞璀璨煙火照亮澎湖夜空，結合音樂表演的視聽饗宴。白天玩水上活動，晚上賞花火。', '海上花火浪漫夜', 'active', 94, 0, 'free', 7500, 400, 850, 165.5, strftime('%s','now'), strftime('%s','now')),
('act_39', '金門戰地風光巡禮', '探索戰地歷史，參觀坑道、碉堡等軍事設施。品嚐金門高粱、貢糖等特產。', '走訪戰地秘境', 'active', 87, 200, 'paid', 2100, 110, 250, 52.8, strftime('%s','now'), strftime('%s','now')),
('act_40', '綠島潛水體驗', '探索海底世界，欣賞珊瑚礁生態。專業教練指導，適合初學者的潛水天堂。', '潛入太平洋寶石', 'active', 92, 3500, 'paid', 3800, 200, 450, 92.5, strftime('%s','now'), strftime('%s','now'));

-- ============================================
-- 4. 為新活動新增位置資訊
-- ============================================

INSERT OR IGNORE INTO locations (id, activity_id, address, district, city, region, latitude, longitude, venue)
VALUES
('loc_26', 'act_26', '新北市瑞芳區基山街', '瑞芳區', '新北市', 'north', 25.1095, 121.8445, '九份老街'),
('loc_27', 'act_27', '新北市萬里區野柳里港東路167-1號', '萬里區', '新北市', 'north', 25.2069, 121.6902, '野柳地質公園'),
('loc_28', 'act_28', '台北市文山區指南路三段38巷35號', '文山區', '台北市', 'north', 24.9967, 121.5767, '貓空纜車站'),
('loc_29', 'act_29', '南投縣魚池鄉中山路599號', '魚池鄉', '南投縣', 'central', 23.8492, 120.9211, '日月潭環湖自行車道'),
('loc_30', 'act_30', '南投縣仁愛鄉仁和路170號', '仁愛鄉', '南投縣', 'central', 24.0584, 121.1613, '清境農場'),
('loc_31', 'act_31', '彰化縣鹿港鎮中山路', '鹿港鎮', '彰化縣', 'central', 24.0571, 120.4352, '鹿港老街'),
('loc_32', 'act_32', '屏東縣恆春鎮墾丁路', '恆春鎮', '屏東縣', 'south', 21.9485, 120.7786, '墾丁大街'),
('loc_33', 'act_33', '高雄市旗津區旗津三路', '旗津區', '高雄市', 'south', 22.6126, 120.2667, '旗津老街'),
('loc_34', 'act_34', '台南市安平區延平街', '安平區', '台南市', 'south', 23.0033, 120.1606, '安平老街'),
('loc_35', 'act_35', '花蓮縣秀林鄉富世291號', '秀林鄉', '花蓮縣', 'east', 24.1802, 121.4911, '太魯閣國家公園'),
('loc_36', 'act_36', '花蓮縣花蓮市華東15號', '花蓮市', '花蓮縣', 'east', 23.9943, 121.5923, '花蓮漁港'),
('loc_37', 'act_37', '台東縣鹿野鄉永安村高台路46號', '鹿野鄉', '台東縣', 'east', 22.9053, 121.1201, '鹿野高台'),
('loc_38', 'act_38', '澎湖縣馬公市介壽路', '馬公市', '澎湖縣', 'islands', 23.5660, 119.5786, '觀音亭'),
('loc_39', 'act_39', '金門縣金城鎮', '金城鎮', '金門縣', 'islands', 24.4329, 118.3175, '金門國家公園'),
('loc_40', 'act_40', '台東縣綠島鄉南寮村', '綠島鄉', '台東縣', 'islands', 22.6615, 121.4755, '綠島潛水中心');

-- ============================================
-- 5. 為新活動新增時間資訊
-- ============================================

INSERT OR IGNORE INTO activity_times (id, activity_id, start_date, end_date, start_time, end_time, timezone, is_recurring)
VALUES
('time_26', 'act_26', '2025-01-01', '2025-12-31', '09:00', '21:00', 'Asia/Taipei', 1),
('time_27', 'act_27', '2025-01-01', '2025-12-31', '08:00', '18:00', 'Asia/Taipei', 1),
('time_28', 'act_28', '2025-01-01', '2025-12-31', '09:00', '21:00', 'Asia/Taipei', 1),
('time_29', 'act_29', '2025-01-01', '2025-12-31', '06:00', '18:00', 'Asia/Taipei', 1),
('time_30', 'act_30', '2025-01-01', '2025-12-31', '08:00', '17:00', 'Asia/Taipei', 1),
('time_31', 'act_31', '2025-01-01', '2025-12-31', '09:00', '20:00', 'Asia/Taipei', 1),
('time_32', 'act_32', '2025-04-01', '2025-04-07', '14:00', '23:00', 'Asia/Taipei', 0),
('time_33', 'act_33', '2025-07-01', '2025-07-31', '10:00', '22:00', 'Asia/Taipei', 0),
('time_34', 'act_34', '2025-01-01', '2025-12-31', '09:00', '20:00', 'Asia/Taipei', 1),
('time_35', 'act_35', '2025-01-01', '2025-12-31', '07:00', '17:00', 'Asia/Taipei', 1),
('time_36', 'act_36', '2025-04-01', '2025-10-31', '06:00', '10:00', 'Asia/Taipei', 1),
('time_37', 'act_37', '2025-07-01', '2025-08-31', '05:30', '19:00', 'Asia/Taipei', 0),
('time_38', 'act_38', '2025-04-25', '2025-06-28', '20:00', '21:30', 'Asia/Taipei', 0),
('time_39', 'act_39', '2025-01-01', '2025-12-31', '08:30', '17:30', 'Asia/Taipei', 1),
('time_40', 'act_40', '2025-05-01', '2025-10-31', '08:00', '16:00', 'Asia/Taipei', 1);

-- ============================================
-- 6. 為新活動設定分類
-- ============================================

-- 先確保分類存在
INSERT OR IGNORE INTO categories (id, name, slug, color_code, icon)
VALUES 
('cat-festival', '節慶活動', 'festival', '#FFD93D', '🎉'),
('cat-nature', '自然生態', 'nature', '#6BCB77', '🌿'),
('cat-adventure', '冒險體驗', 'adventure', '#FF6B6B', '🎯');

-- 設定活動分類
INSERT OR IGNORE INTO activity_categories (activity_id, category_id)
VALUES
('act_26', 'cat-culture'),
('act_27', 'cat-nature'),
('act_28', 'cat-outdoor'),
('act_29', 'cat-sports'),
('act_30', 'cat-family'),
('act_31', 'cat-culture'),
('act_32', 'cat-music'),
('act_33', 'cat-food'),
('act_34', 'cat-culture'),
('act_35', 'cat-outdoor'),
('act_35', 'cat-adventure'),
('act_36', 'cat-nature'),
('act_37', 'cat-adventure'),
('act_38', 'cat-festival'),
('act_39', 'cat-culture'),
('act_40', 'cat-sports'),
('act_40', 'cat-adventure');

-- ============================================
-- 7. 為新活動新增標籤
-- ============================================

-- 新增更多標籤
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count)
VALUES
('tag-scenic', '風景名勝', 'scenic', 'type', 0),
('tag-photography', '攝影熱點', 'photography', 'feature', 0),
('tag-romantic', '浪漫約會', 'romantic', 'feature', 0),
('tag-adventure', '冒險刺激', 'adventure', 'feature', 0),
('tag-cultural', '文化體驗', 'cultural', 'type', 0),
('tag-seasonal', '季節限定', 'seasonal', 'time', 0),
('tag-water', '水上活動', 'water', 'type', 0),
('tag-mountain', '登山健行', 'mountain', 'type', 0),
('tag-island', '離島旅遊', 'island', 'location', 0);

-- 設定活動標籤
INSERT OR IGNORE INTO activity_tags (activity_id, tag_id)
VALUES
('act_26', 'tag-scenic'),
('act_26', 'tag-photography'),
('act_26', 'tag-cultural'),
('act_27', 'tag-scenic'),
('act_27', 'tag-photography'),
('act_28', 'tag-romantic'),
('act_28', 'tag-night'),
('act_29', 'tag-outdoor'),
('act_29', 'tag-scenic'),
('act_30', 'tag-family'),
('act_30', 'tag-mountain'),
('act_31', 'tag-cultural'),
('act_31', 'tag-indoor'),
('act_32', 'tag-seasonal'),
('act_32', 'tag-night'),
('act_33', 'tag-free'),
('act_33', 'tag-weekend'),
('act_34', 'tag-cultural'),
('act_34', 'tag-photography'),
('act_35', 'tag-adventure'),
('act_35', 'tag-mountain'),
('act_36', 'tag-water'),
('act_36', 'tag-seasonal'),
('act_37', 'tag-adventure'),
('act_37', 'tag-seasonal'),
('act_38', 'tag-free'),
('act_38', 'tag-island'),
('act_38', 'tag-romantic'),
('act_39', 'tag-island'),
('act_39', 'tag-cultural'),
('act_40', 'tag-island'),
('act_40', 'tag-water'),
('act_40', 'tag-adventure');

-- ============================================
-- 8. 更新標籤使用次數
-- ============================================

UPDATE tags 
SET usage_count = (
    SELECT COUNT(*) 
    FROM activity_tags 
    WHERE tag_id = tags.id
);

-- ============================================
-- 9. 更新活動狀態（根據日期）
-- ============================================

UPDATE activities
SET status = 
    CASE 
        WHEN t.end_date < DATE('now') THEN 'ended'
        WHEN t.start_date > DATE('now', '+7 days') THEN 'upcoming'
        ELSE 'active'
    END
FROM activity_times t
WHERE activities.id = t.activity_id;

-- ============================================
-- 10. 資料統計和驗證
-- ============================================

-- 顯示更新後的統計
SELECT '=== 更新後統計 ===' as info;
SELECT 
    (SELECT COUNT(*) FROM activities) as total_activities,
    (SELECT COUNT(*) FROM activities WHERE status = 'active') as active_activities,
    (SELECT COUNT(*) FROM locations) as total_locations,
    (SELECT COUNT(DISTINCT city) FROM locations) as unique_cities,
    (SELECT COUNT(*) FROM categories) as total_categories,
    (SELECT COUNT(*) FROM tags) as total_tags,
    (SELECT AVG(quality_score) FROM activities) as avg_quality_score,
    (SELECT AVG(view_count) FROM activities) as avg_view_count;

-- 顯示各地區活動數量
SELECT '=== 各地區活動分布 ===' as info;
SELECT region, COUNT(*) as count 
FROM locations 
GROUP BY region 
ORDER BY count DESC;

-- 顯示熱門活動
SELECT '=== 熱門活動 TOP 5 ===' as info;
SELECT name, view_count, favorite_count, popularity_score 
FROM activities 
ORDER BY popularity_score DESC 
LIMIT 5;

COMMIT;

SELECT '✅ 資料庫更新完成！' as status;