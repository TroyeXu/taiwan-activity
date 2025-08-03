import { filterActivities, searchActivities } from '~/server/utils/mock-data';
import type { ApiResponse, Activity } from '~/types';

interface UnifiedSearchParams {
  // 文字搜尋
  keyword?: string;

  // 篩選條件
  filters?: {
    categories?: string[];
    regions?: string[];
    cities?: string[];
    startDate?: string;
    endDate?: string;
  };

  // 位置搜尋
  location?: {
    lat: number;
    lng: number;
    radius?: number; // 公里
  };

  // 排序
  sortBy?: 'relevance' | 'distance' | 'popularity' | 'date';

  // 分頁
  page?: number;
  limit?: number;
}

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const body = (await readBody(event)) as UnifiedSearchParams;
    const { keyword, filters = {}, location, sortBy = 'relevance', page = 1, limit = 20 } = body;

    let results: Activity[] = [];

    // 如果有關鍵字，先進行文字搜尋
    if (keyword) {
      results = searchActivities(keyword);
    } else {
      // 否則使用所有活動作為基礎
      results = filterActivities({});
    }

    // 應用篩選條件
    if (Object.keys(filters).length > 0 || location) {
      results = filterActivities({
        categories: filters.categories,
        regions: filters.regions,
        cities: filters.cities,
        startDate: filters.startDate,
        endDate: filters.endDate,
        lat: location?.lat,
        lng: location?.lng,
        radius: location?.radius || 10,
      }).filter(
        (activity) =>
          // 如果有關鍵字搜尋，只保留搜尋結果中的活動
          !keyword || results.some((r) => r.id === activity.id)
      );
    }

    // 排序
    switch (sortBy) {
      case 'distance':
        if (location) {
          results.sort((a, b) => {
            if (!a.location || !b.location) return 0;
            if (
              a.location.latitude == null ||
              a.location.longitude == null ||
              b.location.latitude == null ||
              b.location.longitude == null
            )
              return 0;
            const distA = Math.sqrt(
              Math.pow(a.location.latitude! - location.lat, 2) +
                Math.pow(a.location.longitude! - location.lng, 2)
            );
            const distB = Math.sqrt(
              Math.pow(b.location.latitude! - location.lat, 2) +
                Math.pow(b.location.longitude! - location.lng, 2)
            );
            return distA - distB;
          });
        }
        break;
      case 'popularity':
        results.sort((a, b) => b.qualityScore - a.qualityScore);
        break;
      case 'date':
        results.sort((a, b) => {
          if (!a.time?.startDate || !b.time?.startDate) return 0;
          return new Date(a.time.startDate).getTime() - new Date(b.time.startDate).getTime();
        });
        break;
      default:
        // 相關性排序（品質分數）
        results.sort((a, b) => b.qualityScore - a.qualityScore);
    }

    // 分頁
    const startIndex = (page - 1) * limit;
    const paginatedResults = results.slice(startIndex, startIndex + limit);

    return {
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: results.length,
        totalPages: Math.ceil(results.length / limit),
      },
    };
  } catch (error: any) {
    console.error('統一搜尋失敗:', error);

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || '搜尋失敗',
    });
  }
});
