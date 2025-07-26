-- 新增價格相關欄位
ALTER TABLE activities ADD COLUMN price INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN price_type TEXT DEFAULT 'free' CHECK(price_type IN ('free', 'paid', 'donation'));
ALTER TABLE activities ADD COLUMN currency TEXT DEFAULT 'TWD';

-- 新增熱門度相關欄位
ALTER TABLE activities ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN favorite_count INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN click_count INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN popularity_score REAL DEFAULT 0.0;

-- 新增標籤表
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 活動標籤關聯表
CREATE TABLE IF NOT EXISTS activity_tags (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(activity_id, tag_id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_activities_price ON activities(price);
CREATE INDEX IF NOT EXISTS idx_activities_popularity ON activities(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_activities_view_count ON activities(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_activity_tags_activity ON activity_tags(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_tags_tag ON activity_tags(tag_id);