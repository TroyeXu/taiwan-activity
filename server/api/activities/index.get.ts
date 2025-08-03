import { getDatabase } from '../../utils/database';
import { activities, locations, categories, activityCategories, activityTimes } from '../../../db/schema';
import { eq, and, or, like, inArray, sql, desc, asc } from 'drizzle-orm';
import type { ApiResponse, Activity } from '../../../app/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const db = getDatabase();
    const query = getQuery(event);
    const {
      categories: categoryFilter,
      regions,
      cities,
      startDate,
      endDate,
      timeFilter,
      features,
      sorting = 'relevance',
      page = 1,
      limit = 20,
      lat,
      lng,
      radius = 10,
    } = query;

    // 建立基礎條件
    const whereConditions = [eq(activities.status, 'active')];

    // 地區篩選
    if (regions) {
      const regionList = Array.isArray(regions) ? regions : [regions];
      whereConditions.push(inArray(locations.region, regionList));
    }

    // 城市篩選
    if (cities) {
      const cityList = Array.isArray(cities) ? cities : [cities];
      whereConditions.push(inArray(locations.city, cityList));
    }

    // 建立基礎查詢
    let queryBuilder = db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`.as('category_names'),
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`.as('category_slugs'),
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`.as('category_icons'),
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`.as('category_colors'),
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .groupBy(activities.id, locations.id, activityTimes.id);

    // 時間篩選
    if (startDate || endDate || timeFilter) {
      const now = new Date();
      let dateConditions: any[] = [];

      if (timeFilter) {
        // 快速時間選項
        switch (timeFilter) {
          case 'today':
            const today = new Date().toISOString().split('T')[0];
            dateConditions.push(
              and(
                sql`${activityTimes.startDate} <= ${today}`,
                or(sql`${activityTimes.endDate} >= ${today}`, sql`${activityTimes.endDate} IS NULL`)
              )
            );
            break;
          case 'tomorrow':
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            dateConditions.push(
              and(
                sql`${activityTimes.startDate} <= ${tomorrowStr}`,
                or(
                  sql`${activityTimes.endDate} >= ${tomorrowStr}`,
                  sql`${activityTimes.endDate} IS NULL`
                )
              )
            );
            break;
          case 'this_week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            dateConditions.push(
              and(
                sql`${activityTimes.startDate} <= ${weekEnd.toISOString().split('T')[0]}`,
                or(
                  sql`${activityTimes.endDate} >= ${weekStart.toISOString().split('T')[0]}`,
                  sql`${activityTimes.endDate} IS NULL`
                )
              )
            );
            break;
          case 'this_month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            dateConditions.push(
              and(
                sql`${activityTimes.startDate} <= ${monthEnd.toISOString().split('T')[0]}`,
                or(
                  sql`${activityTimes.endDate} >= ${monthStart.toISOString().split('T')[0]}`,
                  sql`${activityTimes.endDate} IS NULL`
                )
              )
            );
            break;
        }
      }

      if (startDate) {
        dateConditions.push(
          or(sql`${activityTimes.endDate} >= ${startDate}`, sql`${activityTimes.endDate} IS NULL`)
        );
      }

      if (endDate) {
        dateConditions.push(sql`${activityTimes.startDate} <= ${endDate}`);
      }

      if (dateConditions.length > 0) {
        whereConditions.push(...dateConditions);
      }
    }

    // 地理位置篩選
    if (lat && lng && radius) {
      const latNum = parseFloat(lat as string);
      const lngNum = parseFloat(lng as string);
      const radiusNum = parseFloat(radius as string) * 1000; // 轉換為公尺

      // 使用 Haversine 公式計算距離
      whereConditions.push(
        sql`(
          6371000 * acos(
            cos(radians(${latNum})) * 
            cos(radians(${locations.latitude})) * 
            cos(radians(${locations.longitude}) - radians(${lngNum})) + 
            sin(radians(${latNum})) * 
            sin(radians(${locations.latitude}))
          )
        ) <= ${radiusNum}`
      );
    }

    // 應用所有 WHERE 條件
    if (whereConditions.length > 0) {
      queryBuilder = (queryBuilder as any).where(and(...whereConditions));
    }

    // 分類篩選 (使用 HAVING)
    if (categoryFilter) {
      const categoryList = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
      queryBuilder = (queryBuilder as any).having(
        or(...categoryList.map((cat) => sql`GROUP_CONCAT(${categories.slug}) LIKE '%${cat}%'`))
      );
    }

    // 分頁
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    // 應用排序和分頁
    switch (sorting) {
      case 'distance':
        if (lat && lng) {
          const latNum = parseFloat(lat as string);
          const lngNum = parseFloat(lng as string);
          queryBuilder = (queryBuilder as any)
            .orderBy(
              sql`(
                6371000 * acos(
                  cos(radians(${latNum})) * 
                  cos(radians(${locations.latitude})) * 
                  cos(radians(${locations.longitude}) - radians(${lngNum})) + 
                  sin(radians(${latNum})) * 
                  sin(radians(${locations.latitude}))
                )
              )`
            )
            .limit(limitNum)
            .offset(offset);
        } else {
          queryBuilder = (queryBuilder as any)
            .orderBy(desc(activities.createdAt))
            .limit(limitNum)
            .offset(offset);
        }
        break;
      case 'popularity':
        queryBuilder = (queryBuilder as any)
          .orderBy(desc(activities.qualityScore))
          .limit(limitNum)
          .offset(offset);
        break;
      case 'date':
        queryBuilder = (queryBuilder as any)
          .orderBy(asc(activityTimes.startDate))
          .limit(limitNum)
          .offset(offset);
        break;
      default:
        // 相關性排序 (品質分數 + 創建時間)
        queryBuilder = (queryBuilder as any)
          .orderBy(desc(activities.qualityScore), desc(activities.createdAt))
          .limit(limitNum)
          .offset(offset);
    }

    // 執行查詢
    const results = await queryBuilder;

    // 轉換結果格式
    const formattedResults: Activity[] = results.map((row) => ({
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
    }));

    // 計算總數 (簡化版本，實際應用中可能需要單獨查詢)
    const totalCount =
      results.length < limitNum
        ? offset + results.length
        : Math.ceil((offset + results.length) * 1.5); // 估算值

    return {
      success: true,
      data: formattedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    };
  } catch (error) {
    console.error('取得活動列表失敗:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '取得活動列表失敗',
    });
  }
});
