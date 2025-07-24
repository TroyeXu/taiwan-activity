import { db } from '~/db';
import { activities, locations, categories, activityCategories, activityTimes } from '~/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { ApiResponse, Activity } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const query = getQuery(event);
    const { lat, lng, radius = 10, limit = 50 } = query;

    if (!lat || !lng) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少位置參數 (lat, lng)'
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusKm = parseFloat(radius as string);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      throw createError({
        statusCode: 400,
        statusMessage: '位置參數格式錯誤'
      });
    }

    // 查詢附近的活動
    const results = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`.as('category_names'),
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`.as('category_slugs'),
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`.as('category_icons'),
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`.as('category_colors'),
        distance: sql<number>`
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(${locations.latitude})) * 
            cos(radians(${locations.longitude}) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
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
          // 使用地理距離篩選
          sql`(
            6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(${locations.latitude})) * 
              cos(radians(${locations.longitude}) - radians(${longitude})) + 
              sin(radians(${latitude})) * 
              sin(radians(${locations.latitude}))
            )
          ) <= ${radiusKm}`
        )
      )
      .groupBy(activities.id, locations.id, activityTimes.id)
      .orderBy(sql`distance`)
      .limit(limitNum);

    // 格式化結果
    const formattedResults: Activity[] = results.map(row => ({
      id: row.activity.id,
      name: row.activity.name,
      description: row.activity.description || undefined,
      summary: row.activity.summary || undefined,
      status: row.activity.status as any,
      qualityScore: row.activity.qualityScore,
      createdAt: row.activity.createdAt,
      updatedAt: row.activity.updatedAt,
      location: {
        id: row.location.id,
        activityId: row.location.activityId,
        address: row.location.address,
        district: row.location.district,
        city: row.location.city,
        region: row.location.region as any,
        latitude: row.location.latitude,
        longitude: row.location.longitude,
        venue: row.location.venue,
        landmarks: row.location.landmarks ? JSON.parse(row.location.landmarks) : []
      },
      time: row.time ? {
        id: row.time.id,
        activityId: row.time.activityId,
        startDate: row.time.startDate,
        endDate: row.time.endDate,
        startTime: row.time.startTime,
        endTime: row.time.endTime,
        timezone: row.time.timezone,
        isRecurring: row.time.isRecurring,
        recurrenceRule: row.time.recurrenceRule ? JSON.parse(row.time.recurrenceRule) : undefined
      } : undefined,
      categories: row.categoryNames ? 
        row.categoryNames.split(',').map((name, index) => ({
          id: '',
          name: name.trim(),
          slug: row.categorySlugs?.split(',')[index]?.trim() || '',
          colorCode: row.categoryColors?.split(',')[index]?.trim() || '',
          icon: row.categoryIcons?.split(',')[index]?.trim() || ''
        })).filter(cat => cat.name) : [],
      distance: Math.round(row.distance * 1000) // 轉換為公尺並四捨五入
    }));

    return {
      success: true,
      data: formattedResults,
      message: `找到 ${formattedResults.length} 個附近的活動`
    };

  } catch (error) {
    console.error('取得附近活動失敗:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '取得附近活動失敗'
    });
  }
});