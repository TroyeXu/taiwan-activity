#!/bin/bash

# 清理不必要的 API endpoints

echo "🧹 開始清理不必要的 API endpoints..."

# 1. 移除重複的搜尋 API（保留 unified-search）
echo "移除重複的搜尋 API..."
rm -f server/api/activities/advanced-search.post.ts
rm -f server/api/activities/fulltext-search.post.ts
rm -f server/api/activities/spatial-search.post.ts

# 2. 移除資料庫相關的管理功能
echo "移除管理功能..."
rm -rf server/api/admin/
rm -rf server/api/analytics/
rm -rf server/api/validation/
rm -rf server/api/crawler/
rm -rf server/api/scheduler/
rm -rf server/api/stats/

# 3. 移除其他不必要的功能
echo "移除其他不必要的功能..."
rm -f server/api/activities/export.get.ts
rm -rf server/api/favorites/
rm -f server/api/health.get.ts
rm -f server/api/test.get.ts

# 4. 移除資料庫相關工具
echo "移除資料庫相關工具..."
rm -f server/utils/database-optimization.ts

echo "✅ 清理完成！"
echo ""
echo "保留的 API endpoints："
echo "- /api/activities - 活動列表"
echo "- /api/activities/[id] - 活動詳情"
echo "- /api/activities/search - 簡單搜尋"
echo "- /api/activities/unified-search - 統一搜尋"
echo "- /api/activities/nearby - 附近活動"
echo "- /api/activities/popular - 熱門活動"
echo "- /api/activities/recommend - 推薦活動"
echo "- /api/activities/calendar - 日曆活動"
echo "- /api/categories - 分類列表"