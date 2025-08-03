import { getDatabase } from '~/server/utils/database';
import { activities, locations, activityTimes, categories, activityCategories, userFavorites } from '~/db/schema';
import { eq, and, or, desc, sql, inArray, ne } from 'drizzle-orm';
import type { ApiResponse, Activity } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const db = getDatabase();
    const query = getQuery(event);
    const userId = query.userId as string;
    const activityId = query.activityId as string;
    const lat = parseFloat(query.lat as string);
    const lng = parseFloat(query.lng as string);
    const limit = parseInt(query.limit as string) || 10;

    let recommendations: Activity[] = [];

    // 根據不同策略獲取推薦
    if (userId) {
      // 基於使用者收藏的推薦
      recommendations = await getUserBasedRecommendations(userId, limit);
    } else if (activityId) {
      // 基於特定活動的相似推薦
      recommendations = await getActivityBasedRecommendations(activityId, limit);
    } else if (lat && lng) {
      // 基於位置的熱門推薦
      recommendations = await getLocationBasedRecommendations(lat, lng, limit);
    } else {
      // 一般熱門推薦
      recommendations = await getPopularRecommendations(limit);
    }

    return {
      success: true,
      data: recommendations,
      meta: {
        strategy: userId ? 'user-based' : 
                 activityId ? 'activity-based' : 
                 (lat && lng) ? 'location-based' : 'popular'
      }
    };

  } catch (error) {
    console.error('Get recommendations failed:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '取得推薦活動失敗'
    });
  }
});

async function getUserBasedRecommendations(userId: string, limit: number): Promise<Activity[]> {
  try {
    const db = getDatabase();
    // 獲取使用者收藏的活動分類
    const userCategories = await db
      .select({
        categoryId: categories.id,
        categorySlug: categories.slug,
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(userFavorites)
      .innerJoin(activities, eq(userFavorites.activityId, activities.id))
      .innerJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .innerJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(eq(userFavorites.userId, userId))
      .groupBy(categories.id)
      .orderBy(desc(sql`count`))
      .limit(3);

    if (userCategories.length === 0) {
      return await getPopularRecommendations(limit);
    }

    // 獲取使用者尚未收藏的相似分類活動
    const categoryIds = userCategories.map(c => c.categoryId);
    
    const result = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`,
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`,
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`,
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`,
        matchScore: sql<number>`
          CASE 
            WHEN ${activityCategories.categoryId} IN (${categoryIds.join(',')}) 
            THEN 10 
            ELSE 0 
          END + ${activities.popularityScore}
        `.as('match_score')
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .leftJoin(
        userFavorites,
        and(
          eq(userFavorites.activityId, activities.id),
          eq(userFavorites.userId, userId)
        )
      )
      .where(
        and(
          eq(activities.status, 'active'),
          sql`${userFavorites.id} IS NULL` // 排除已收藏的
        )
      )
      .groupBy(activities.id)
      .orderBy(desc(sql`match_score`))
      .limit(limit);

    return formatActivities(result);

  } catch (error) {
    console.error('User-based recommendations failed:', error);
    return await getPopularRecommendations(limit);
  }
}

async function getActivityBasedRecommendations(activityId: string, limit: number): Promise<Activity[]> {
  try {
    const db = getDatabase();
    // 獲取目標活動的資訊
    const targetActivity = await db
      .select({
        categoryIds: sql<string>`GROUP_CONCAT(${activityCategories.categoryId})`,
        city: locations.city,
        region: locations.region
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .where(eq(activities.id, activityId))
      .groupBy(activities.id)
      .limit(1);

    if (!targetActivity.length) {
      return await getPopularRecommendations(limit);
    }

    const target = targetActivity[0];
    if (!target) {
      throw createError({
        statusCode: 404,
        statusMessage: '找不到指定的活動'
      });
    }
    const categoryIds = target.categoryIds ? target.categoryIds.split(',') : [];

    // 尋找相似活動
    const result = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`,
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`,
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`,
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`,
        similarityScore: sql<number>`
          (CASE WHEN ${locations.city} = ${target.city} THEN 5 ELSE 0 END) +
          (CASE WHEN ${locations.region} = ${target.region} THEN 3 ELSE 0 END) +
          (CASE WHEN ${activityCategories.categoryId} IN (${categoryIds.length ? categoryIds.join(',') : '0'}) THEN 10 ELSE 0 END) +
          ${activities.qualityScore} * 0.1
        `.as('similarity_score')
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(
        and(
          eq(activities.status, 'active'),
          ne(activities.id, activityId)
        )
      )
      .groupBy(activities.id)
      .orderBy(desc(sql`similarity_score`))
      .limit(limit);

    return formatActivities(result);

  } catch (error) {
    console.error('Activity-based recommendations failed:', error);
    return await getPopularRecommendations(limit);
  }
}

async function getLocationBasedRecommendations(lat: number, lng: number, limit: number): Promise<Activity[]> {
  try {
    const db = getDatabase();
    const result = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`,
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`,
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`,
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`,
        distance: sql<number>`
          6371 * acos(
            cos(radians(${lat})) * 
            cos(radians(${locations.latitude})) * 
            cos(radians(${locations.longitude}) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(${locations.latitude}))
          )
        `.as('distance')
      })
      .from(activities)
      .innerJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(
        and(
          eq(activities.status, 'active'),
          sql`${locations.latitude} IS NOT NULL`,
          sql`${locations.longitude} IS NOT NULL`
        )
      )
      .groupBy(activities.id)
      .having(sql`distance <= 50`) // 50公里內
      .orderBy(
        desc(activities.popularityScore),
        sql`distance`
      )
      .limit(limit);

    return formatActivities(result);

  } catch (error) {
    console.error('Location-based recommendations failed:', error);
    return await getPopularRecommendations(limit);
  }
}

async function getPopularRecommendations(limit: number): Promise<Activity[]> {
  try {
    const db = getDatabase();
    const result = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`,
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`,
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`,
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(eq(activities.status, 'active'))
      .groupBy(activities.id)
      .orderBy(
        desc(activities.popularityScore),
        desc(activities.qualityScore)
      )
      .limit(limit);

    return formatActivities(result);

  } catch (error) {
    console.error('Popular recommendations failed:', error);
    return [];
  }
}

function formatActivities(rows: any[]): Activity[] {
  return rows.map(row => ({
    id: row.activity.id,
    name: row.activity.name,
    description: row.activity.description || undefined,
    summary: row.activity.summary || undefined,
    status: row.activity.status as any,
    qualityScore: row.activity.qualityScore,
    popularityScore: row.activity.popularityScore || 0,
    price: row.activity.price || 0,
    priceType: row.activity.priceType as any,
    viewCount: row.activity.viewCount || 0,
    favoriteCount: row.activity.favoriteCount || 0,
    createdAt: row.activity.createdAt,
    updatedAt: row.activity.updatedAt,
    location: row.location ? {
      id: row.location.id,
      activityId: row.location.activityId,
      address: row.location.address,
      district: row.location.district || undefined,
      city: row.location.city,
      region: row.location.region as any,
      latitude: row.location.latitude,
      longitude: row.location.longitude,
      venue: row.location.venue || undefined,
      landmarks: row.location.landmarks ? JSON.parse(row.location.landmarks) : []
    } : undefined,
    time: row.time ? {
      id: row.time.id,
      activityId: row.time.activityId,
      startDate: row.time.startDate,
      endDate: row.time.endDate,
      startTime: row.time.startTime,
      endTime: row.time.endTime,
      timezone: row.time.timezone,
      isRecurring: row.time.isRecurring
    } : undefined,
    categories: row.categoryNames ? 
      row.categoryNames.split(',').map((name: string, index: number) => ({
        id: '',
        name: name.trim(),
        slug: row.categorySlugs?.split(',')[index]?.trim() || '',
        colorCode: row.categoryColors?.split(',')[index]?.trim() || '',
        icon: row.categoryIcons?.split(',')[index]?.trim() || ''
      })).filter((cat: any) => cat.name) : [],
    ...(row.distance !== undefined && { distance: Math.round(row.distance * 100) / 100 })
  }));
}