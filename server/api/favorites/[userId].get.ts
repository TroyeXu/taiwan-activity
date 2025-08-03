import { getDatabase } from '~/server/utils/database';
import {
  userFavorites,
  activities,
  locations,
  activityTimes,
  categories,
  activityCategories,
} from '~/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { ApiResponse, Activity } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const db = getDatabase();
    const userId = getRouterParam(event, 'userId');
    const query = getQuery(event);

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少使用者 ID',
      });
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // 查詢使用者收藏的活動
    const favorites = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        savedAt: userFavorites.savedAt,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`.as('category_names'),
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`.as('category_slugs'),
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`.as('category_colors'),
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`.as('category_icons'),
      })
      .from(userFavorites)
      .innerJoin(activities, eq(userFavorites.activityId, activities.id))
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(eq(userFavorites.userId, userId))
      .groupBy(activities.id, userFavorites.savedAt)
      .orderBy(desc(userFavorites.savedAt))
      .limit(limit)
      .offset(offset);

    // 取得總數
    const totalResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userFavorites)
      .innerJoin(activities, eq(userFavorites.activityId, activities.id))
      .where(eq(userFavorites.userId, userId));

    const total = totalResult[0]?.count || 0;

    // 格式化結果
    const formattedFavorites: Activity[] = favorites.map((row) => ({
      id: row.activity.id,
      name: row.activity.name,
      description: row.activity.description || undefined,
      summary: row.activity.summary || undefined,
      status: row.activity.status as any,
      qualityScore: row.activity.qualityScore,
      popularityScore: row.activity.popularityScore || 0,
      price: row.activity.price || 0,
      priceType: row.activity.priceType as any,
      currency: row.activity.currency || 'TWD',
      viewCount: row.activity.viewCount || 0,
      favoriteCount: row.activity.favoriteCount || 0,
      clickCount: row.activity.clickCount || 0,
      createdAt: row.activity.createdAt,
      updatedAt: row.activity.updatedAt,
      location: row.location
        ? {
            id: row.location.id,
            activityId: row.location.activityId,
            address: row.location.address,
            district: row.location.district || undefined,
            city: row.location.city,
            region: row.location.region as any,
            latitude: row.location.latitude ?? undefined,
            longitude: row.location.longitude ?? undefined,
            venue: row.location.venue || undefined,
            landmarks: row.location.landmarks ? JSON.parse(row.location.landmarks) : [],
          }
        : undefined,
      time: row.time
        ? {
            id: row.time.id,
            activityId: row.time.activityId,
            startDate: row.time.startDate,
            endDate: row.time.endDate,
            startTime: row.time.startTime,
            endTime: row.time.endTime,
            timezone: row.time.timezone,
            isRecurring: row.time.isRecurring,
            recurrenceRule: row.time.recurrenceRule
              ? JSON.parse(row.time.recurrenceRule)
              : undefined,
          }
        : undefined,
      categories: row.categoryNames
        ? row.categoryNames
            .split(',')
            .map((name, index) => ({
              id: '',
              name: name.trim(),
              slug: row.categorySlugs?.split(',')[index]?.trim() || '',
              colorCode: row.categoryColors?.split(',')[index]?.trim() || '',
              icon: row.categoryIcons?.split(',')[index]?.trim() || '',
            }))
            .filter((cat) => cat.name)
        : [],
      // 額外的收藏資訊
      savedAt: row.savedAt,
    }));

    return {
      success: true,
      data: formattedFavorites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Get user favorites failed:', error);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '取得收藏清單失敗',
    });
  }
});
