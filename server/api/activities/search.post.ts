import { db } from '~/db';
import { activities, locations, categories, activityCategories, activityTimes } from '~/db/schema';
import { eq, and, or, like, inArray, sql, desc, asc } from 'drizzle-orm';
import type { ApiResponse, Activity, SearchParams } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const body = await readBody(event) as SearchParams;
    const {
      query: searchQuery,
      filters = {},
      location,
      radius = 10,
      page = 1,
      limit = 20
    } = body;

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
        // 如果有位置資訊，計算距離
        distance: location ? sql<number>`
          6371000 * acos(
            cos(radians(${location.lat})) * 
            cos(radians(${locations.latitude})) * 
            cos(radians(${locations.longitude}) - radians(${location.lng})) + 
            sin(radians(${location.lat})) * 
            sin(radians(${locations.latitude}))
          )
        `.as('distance') : sql<null>`NULL`.as('distance')
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(eq(activities.status, 'active'))
      .groupBy(activities.id, locations.id, activityTimes.id);

    const conditions: any[] = [eq(activities.status, 'active')];

    // 文字搜尋
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      conditions.push(
        or(
          like(activities.name, searchTerm),
          like(activities.description, searchTerm),
          like(activities.summary, searchTerm),
          like(locations.address, searchTerm),
          like(locations.venue, searchTerm)
        )
      );
    }

    // 分類篩選
    if (filters.categories && filters.categories.length > 0) {
      queryBuilder = (queryBuilder as any).having(
        or(
          ...filters.categories.map(cat => 
            sql`GROUP_CONCAT(${categories.slug}) LIKE '%${cat}%'`
          )
        )
      );
    }

    // 地區篩選
    if (filters.regions && filters.regions.length > 0) {
      conditions.push(inArray(locations.region, filters.regions));
    }

    // 城市篩選
    if (filters.cities && filters.cities.length > 0) {
      conditions.push(inArray(locations.city, filters.cities));
    }

    // 時間篩選
    if (filters.dateRange) {
      const dateRange = filters.dateRange;
      const now = new Date();

      if (dateRange.type === 'quick' && dateRange.quickOption) {
        switch (dateRange.quickOption) {
          case 'today':
            const today = new Date().toISOString().split('T')[0];
            conditions.push(
              and(
                sql`${activityTimes.startDate} <= ${today}`,
                or(
                  sql`${activityTimes.endDate} >= ${today}`,
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
            conditions.push(
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
            conditions.push(
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
      } else if (dateRange.type === 'custom') {
        if (dateRange.startDate) {
          conditions.push(
            or(
              sql`${activityTimes.endDate} >= ${dateRange.startDate.toISOString().split('T')[0]}`,
              sql`${activityTimes.endDate} IS NULL`
            )
          );
        }

        if (dateRange.endDate) {
          conditions.push(
            sql`${activityTimes.startDate} <= ${dateRange.endDate.toISOString().split('T')[0]}`
          );
        }
      }
    }

    // 地理位置篩選
    if (location && radius) {
      const radiusMeters = radius * 1000; // 轉換為公尺
      conditions.push(
        sql`(
          6371000 * acos(
            cos(radians(${location.lat})) * 
            cos(radians(${locations.latitude})) * 
            cos(radians(${locations.longitude}) - radians(${location.lng})) + 
            sin(radians(${location.lat})) * 
            sin(radians(${locations.latitude}))
          )
        ) <= ${radiusMeters}`
      );
    }

    // 特性篩選
    if (filters.features && filters.features.length > 0) {
      // TODO: 實作特性篩選邏輯
      // 這需要額外的資料表來儲存活動特性資訊
    }

    // 應用所有條件
    if (conditions.length > 0) {
      queryBuilder = (queryBuilder as any).where(and(...conditions));
    }

    // 排序
    const sorting = filters.sorting || 'relevance';
    switch (sorting) {
      case 'distance':
        if (location) {
          queryBuilder = (queryBuilder as any).orderBy(sql`distance`);
        } else {
          queryBuilder = (queryBuilder as any).orderBy(desc(activities.createdAt));
        }
        break;
      case 'popularity':
        queryBuilder = (queryBuilder as any).orderBy(desc(activities.qualityScore));
        break;
      case 'date':
        queryBuilder = (queryBuilder as any).orderBy(asc(activityTimes.startDate));
        break;
      default:
        // 相關性排序
        if (searchQuery) {
          // 如果有搜尋關鍵字，按相關性排序
          queryBuilder = (queryBuilder as any).orderBy(
            desc(activities.qualityScore),
            desc(activities.createdAt)
          );
        } else {
          // 否則按品質分數和創建時間排序
          queryBuilder = (queryBuilder as any).orderBy(
            desc(activities.qualityScore),
            desc(activities.createdAt)
          );
        }
    }

    // 分頁
    const offset = (page - 1) * limit;
    queryBuilder = (queryBuilder as any).limit(limit).offset(offset);

    // 執行查詢
    const results = await queryBuilder;

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
      location: row.location ? {
        id: row.location.id,
        activityId: row.location.activityId,
        address: row.location.address,
        district: row.location.district || undefined, // 轉換 null 為 undefined
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
      // 添加距離資訊 (如果有位置查詢)
      ...(row.distance && { distance: Math.round(row.distance) })
    }));

    // 統計搜尋結果
    const totalCount = results.length < limit ? 
      offset + results.length : 
      Math.ceil((offset + results.length) * 1.5); // 估算值

    return {
      success: true,
      data: formattedResults,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };

  } catch (error) {
    console.error('搜尋活動失敗:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '搜尋活動失敗'
    });
  }
});