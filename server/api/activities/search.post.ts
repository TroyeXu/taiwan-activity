import { searchActivities } from '~/server/utils/mock-data';
import type { ApiResponse, Activity, SearchParams } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const body = await readBody(event) as SearchParams;
    const {
      query: searchQuery
    } = body;

    if (!searchQuery || searchQuery.trim() === '') {
      throw createError({
        statusCode: 400,
        statusMessage: '請提供搜尋關鍵字'
      });
    }

    const activities = searchActivities(searchQuery);

    return {
      success: true,
      data: activities,
      pagination: {
        page: 1,
        limit: activities.length,
        total: activities.length,
        totalPages: 1
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