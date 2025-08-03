import { getDatabase } from '~/server/utils/database';
import {
  activities,
  locations,
  categories,
  activityCategories,
  activityTimes,
  dataSources,
  validationLogs,
} from '~/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { ApiResponse, Activity } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity>> => {
  try {
    const db = getDatabase();
    const activityId = getRouterParam(event, 'id');

    if (!activityId) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少活動 ID',
      });
    }

    // 查詢活動詳細資訊
    const result = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        source: dataSources,
        validation: validationLogs,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`.as('category_names'),
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`.as('category_slugs'),
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`.as('category_icons'),
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`.as('category_colors'),
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(dataSources, eq(activities.id, dataSources.activityId))
      .leftJoin(validationLogs, eq(activities.id, validationLogs.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(eq(activities.id, activityId))
      .groupBy(activities.id, locations.id, activityTimes.id, dataSources.id, validationLogs.id);

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: '找不到指定的活動',
      });
    }

    const row = result[0];
    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Activity not found',
      });
    }

    // 格式化回應資料
    const activity: Activity = {
      id: row.activity.id,
      name: row.activity.name,
      description: row.activity.description || undefined,
      summary: row.activity.summary || undefined,
      status: row.activity.status as any,
      qualityScore: row.activity.qualityScore,
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
            latitude: row.location.latitude,
            longitude: row.location.longitude,
            venue: row.location.venue || undefined,
            landmarks: row.location.landmarks ? JSON.parse(row.location.landmarks) : [],
          }
        : undefined,
      time: row.time
        ? {
            id: row.time.id,
            activityId: row.time.activityId,
            startDate: row.time.startDate,
            endDate: row.time.endDate || undefined,
            startTime: row.time.startTime || undefined,
            endTime: row.time.endTime || undefined,
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
    };

    return {
      success: true,
      data: activity,
    };
  } catch (error) {
    console.error('取得活動詳情失敗:', error);

    if ((error as any).statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '取得活動詳情失敗',
    });
  }
});
