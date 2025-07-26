import { defineEventHandler, getQuery } from 'h3';
import { db } from '~/db';
import { activities, locations, activityCategories, categories, activityTimes } from '~/db/schema';
import { eq, desc, gte, sql, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const limit = parseInt(query.limit as string) || 10;
    const type = query.type as 'popular' | 'trending' | 'recommended' || 'popular';

    let orderBy;
    let whereConditions = [eq(activities.status, 'active')];

    switch (type) {
      case 'trending':
        // 最近 7 天內瀏覽次數成長最快的活動
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        orderBy = desc(activities.viewCount);
        whereConditions.push(gte(activities.updatedAt, sevenDaysAgo));
        break;

      case 'recommended':
        // 基於品質分數和受歡迎程度的推薦
        orderBy = desc(sql`${activities.qualityScore} * 0.3 + ${activities.popularityScore} * 0.7`);
        break;

      case 'popular':
      default:
        // 基於綜合熱門度分數
        orderBy = desc(activities.popularityScore);
        break;
    }

    // 查詢熱門活動
    const popularActivities = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy)
      .limit(limit);

    // 載入關聯資料
    const results = await Promise.all(
      popularActivities.map(async (row) => {
        // 載入分類
        const activityCategories = await db
          .select({ category: categories })
          .from(categories)
          .innerJoin(activityCategories, eq(categories.id, activityCategories.categoryId))
          .where(eq(activityCategories.activityId, row.activity.id));

        // 更新熱門度分數（基於瀏覽次數、收藏次數等）
        const newPopularityScore = calculatePopularityScore(row.activity);
        if (newPopularityScore !== row.activity.popularityScore) {
          await db
            .update(activities)
            .set({ popularityScore: newPopularityScore })
            .where(eq(activities.id, row.activity.id));
        }

        return {
          ...row.activity,
          location: row.location,
          time: row.time,
          categories: activityCategories.map(ac => ac.category),
          stats: {
            viewCount: row.activity.viewCount || 0,
            favoriteCount: row.activity.favoriteCount || 0,
            popularityScore: newPopularityScore
          }
        };
      })
    );

    return {
      success: true,
      data: results,
      type
    };

  } catch (error) {
    console.error('取得熱門活動失敗:', error);
    return {
      success: false,
      message: '取得熱門活動時發生錯誤',
      data: []
    };
  }
});

// 計算熱門度分數
function calculatePopularityScore(activity: any): number {
  const viewWeight = 0.3;
  const favoriteWeight = 0.5;
  const qualityWeight = 0.2;
  
  const viewScore = Math.log10((activity.viewCount || 0) + 1) * viewWeight;
  const favoriteScore = (activity.favoriteCount || 0) * favoriteWeight;
  const qualityScore = (activity.qualityScore || 0) * qualityWeight;
  
  // 時間衰減因子（越新的活動分數越高）
  const daysOld = Math.floor((Date.now() - new Date(activity.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const timeFactor = Math.max(0.5, 1 - (daysOld / 365)); // 一年後降到 0.5
  
  return (viewScore + favoriteScore + qualityScore) * timeFactor;
}