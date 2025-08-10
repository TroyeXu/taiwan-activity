-- 新增更多實用的標籤到資料庫

-- 特色標籤 (feature)
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count, created_at, updated_at) VALUES
('tag-romantic', '浪漫約會', 'romantic', 'feature', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-instagram', '網美打卡', 'instagram', 'feature', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-educational', '教育學習', 'educational', 'feature', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-group', '團體活動', 'group', 'feature', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-solo', '獨自體驗', 'solo', 'feature', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-reservation', '需預約', 'reservation', 'feature', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-walkin', '免預約', 'walkin', 'feature', 0, strftime('%s', 'now'), strftime('%s', 'now'));

-- 交通標籤 (transport)
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count, created_at, updated_at) VALUES
('tag-parking', '有停車場', 'parking', 'transport', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-mrt', '捷運可達', 'mrt', 'transport', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-bus', '公車可達', 'bus', 'transport', 0, strftime('%s', 'now'), strftime('%s', 'now'));

-- 季節標籤 (season)
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count, created_at, updated_at) VALUES
('tag-spring', '春季限定', 'spring', 'season', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-summer', '夏季限定', 'summer', 'season', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-autumn', '秋季限定', 'autumn', 'season', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-winter', '冬季限定', 'winter', 'season', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-rainy', '雨天備案', 'rainy', 'season', 0, strftime('%s', 'now'), strftime('%s', 'now'));

-- 年齡標籤 (age)
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count, created_at, updated_at) VALUES
('tag-kids', '幼兒適合', 'kids', 'age', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-teens', '青少年', 'teens', 'age', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-adults', '成人限定', 'adults', 'age', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-seniors', '銀髮友善', 'seniors', 'age', 0, strftime('%s', 'now'), strftime('%s', 'now'));

-- 時長標籤 (duration)
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count, created_at, updated_at) VALUES
('tag-quick', '快速體驗', 'quick', 'duration', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-halfday', '半日遊', 'halfday', 'duration', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-fullday', '全日遊', 'fullday', 'duration', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-multiday', '多日行程', 'multiday', 'duration', 0, strftime('%s', 'now'), strftime('%s', 'now'));

-- 熱門標籤 (trending)
INSERT OR IGNORE INTO tags (id, name, slug, category, usage_count, created_at, updated_at) VALUES
('tag-new', '最新活動', 'new', 'trending', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-hot', '熱門推薦', 'hot', 'trending', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-discount', '優惠活動', 'discount', 'trending', 0, strftime('%s', 'now'), strftime('%s', 'now')),
('tag-limited', '限量名額', 'limited', 'trending', 0, strftime('%s', 'now'), strftime('%s', 'now'));