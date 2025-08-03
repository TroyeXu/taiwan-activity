import { defineEventHandler, readBody } from 'h3';
import { getDatabase } from '~/server/utils/database';
import {
  activities,
  locations,
  activityCategories,
  categories,
  activityTimes,
  activityTags,
  tags,
} from '~/db/schema';
import { eq, and, or, gte, lte, like, desc, asc, sql, inArray } from 'drizzle-orm';
import type { SearchFilters } from '~/types';

interface AdvancedSearchRequest extends SearchFilters {
  page?: number;
  limit?: number;
  sort?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const db = getDatabase();
    const body = await readBody<AdvancedSearchRequest>(event);
    const {
      query,
      categories: categoryFilters,
      regions,
      cities,
      tags: tagFilters,
      priceRange,
      startDate,
      endDate,
      location,
      radius = 10,
      sort = 'relevance',
      page = 1,
      limit = 20,
    } = body;

    // 建立查詢條件
    const conditions = [];

    // 文字搜尋（名稱、描述、摘要）
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          like(activities.name, searchPattern),
          like(activities.description, searchPattern),
          like(activities.summary, searchPattern)
        )
      );
    }

    // 價格範圍篩選
    if (priceRange) {
      if (priceRange.min !== undefined) {
        conditions.push(gte(activities.price, priceRange.min));
      }
      if (priceRange.max !== undefined) {
        conditions.push(lte(activities.price, priceRange.max));
      }
    }

    // 日期範圍篩選
    if (startDate || endDate) {
      const dateConditions = [];
      if (startDate) {
        dateConditions.push(gte(activityTimes.startDate, startDate));
      }
      if (endDate) {
        dateConditions.push(lte(activityTimes.endDate, endDate));
      }
      if (dateConditions.length > 0) {
        conditions.push(and(...dateConditions));
      }
    }

    // 狀態篩選（只顯示進行中的活動）
    conditions.push(eq(activities.status, 'active'));

    // 地區和城市篩選
    if (regions && regions.length > 0) {
      conditions.push(inArray(locations.region, regions));
    }
    if (cities && cities.length > 0) {
      conditions.push(inArray(locations.city, cities));
    }

    // 基礎查詢
    let baseQuery = db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        // 計算距離（如果有提供位置）
        distance: location
          ? sql<number>`
            6371 * acos(
              cos(radians(${location.lat})) * cos(radians(${locations.latitude})) *
              cos(radians(${locations.longitude}) - radians(${location.lng})) +
              sin(radians(${location.lat})) * sin(radians(${locations.latitude}))
            )
          `.as('distance')
          : sql<number>`0`.as('distance'),
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 距離篩選 - 需要用 having 因為 distance 是計算欄位
    if (location && radius) {
      baseQuery = (baseQuery as any).having(sql`distance <= ${radius}`);
    }

    // 取得符合條件的活動 ID
    const filteredResults = await baseQuery;
    const activityIds = filteredResults.map((r) => r.activity.id);

    // 如果沒有結果，直接返回
    if (activityIds.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // 類別篩選
    if (categoryFilters && categoryFilters.length > 0) {
      const categorizedActivities = await db
        .select({ activityId: activityCategories.activityId })
        .from(activityCategories)
        .innerJoin(categories, eq(activityCategories.categoryId, categories.id))
        .where(
          and(
            inArray(activityCategories.activityId, activityIds),
            inArray(categories.slug, categoryFilters)
          )
        );

      const categorizedIds = categorizedActivities.map((a) => a.activityId);
      filteredResults.filter((r) => categorizedIds.includes(r.activity.id));
    }

    // 標籤篩選
    if (tagFilters && tagFilters.length > 0) {
      const taggedActivities = await db
        .select({ activityId: activityTags.activityId })
        .from(activityTags)
        .innerJoin(tags, eq(activityTags.tagId, tags.id))
        .where(and(inArray(activityTags.activityId, activityIds), inArray(tags.slug, tagFilters)));

      const taggedIds = taggedActivities.map((a) => a.activityId);
      filteredResults.filter((r) => taggedIds.includes(r.activity.id));
    }

    // 排序
    let sortedResults = [...filteredResults];
    switch (sort) {
      case 'distance':
        if (location) {
          sortedResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        break;
      case 'popularity':
        sortedResults.sort(
          (a, b) => (b.activity.popularityScore || 0) - (a.activity.popularityScore || 0)
        );
        break;
      case 'date':
        sortedResults.sort((a, b) => {
          const dateA = new Date(a.time?.startDate || 0).getTime();
          const dateB = new Date(b.time?.startDate || 0).getTime();
          return dateA - dateB;
        });
        break;
      case 'price':
        sortedResults.sort((a, b) => (a.activity.price || 0) - (b.activity.price || 0));
        break;
      case 'relevance':
      default:
        // 相關性排序：結合熱門度和搜尋匹配度
        if (query) {
          sortedResults.sort((a, b) => {
            const scoreA = calculateRelevanceScore(a.activity, query);
            const scoreB = calculateRelevanceScore(b.activity, query);
            return scoreB - scoreA;
          });
        }
        break;
    }

    // 分頁
    const total = sortedResults.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = sortedResults.slice(startIndex, endIndex);

    // 載入關聯資料
    const finalActivities = await Promise.all(
      paginatedResults.map(async (result) => {
        // 載入分類
        const categoryData = await db
          .select({ category: categories })
          .from(categories)
          .innerJoin(activityCategories, eq(categories.id, activityCategories.categoryId))
          .where(eq(activityCategories.activityId, result.activity.id));

        // 載入標籤
        const tagData = await db
          .select({ tag: tags })
          .from(tags)
          .innerJoin(activityTags, eq(tags.id, activityTags.tagId))
          .where(eq(activityTags.activityId, result.activity.id));

        // 更新瀏覽次數
        await db
          .update(activities)
          .set({
            viewCount: sql`${activities.viewCount} + 1`,
          })
          .where(eq(activities.id, result.activity.id));

        return {
          ...result.activity,
          location: result.location,
          time: result.time,
          categories: categoryData.map((ac) => ac.category),
          tags: tagData.map((at) => at.tag),
          distance: result.distance,
        };
      })
    );

    return {
      success: true,
      data: finalActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error('進階搜尋失敗:', error);
    return {
      success: false,
      message: '搜尋活動時發生錯誤',
      data: [],
    };
  }
});

// 計算相關性分數
function calculateRelevanceScore(activity: any, query: string): number {
  let score = activity.popularityScore || 0;
  const lowerQuery = query.toLowerCase();

  // 標題匹配得分最高
  if (activity.name.toLowerCase().includes(lowerQuery)) {
    score += 10;
  }

  // 描述匹配
  if (activity.description?.toLowerCase().includes(lowerQuery)) {
    score += 5;
  }

  // 摘要匹配
  if (activity.summary?.toLowerCase().includes(lowerQuery)) {
    score += 3;
  }

  return score;
}
