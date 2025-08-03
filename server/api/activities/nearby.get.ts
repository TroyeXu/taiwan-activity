import { filterActivities } from '~/server/utils/mock-data';
import type { ApiResponse, Activity } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const query = getQuery(event);
    const {
      lat,
      lng,
      radius = 10, // 預設 10 公里
      limit = 10,
    } = query;

    if (!lat || !lng) {
      throw createError({
        statusCode: 400,
        statusMessage: '請提供經緯度',
      });
    }

    // 使用篩選功能找出附近的活動
    const nearbyActivities = filterActivities({
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
      radius: parseFloat(radius as string),
    });

    // 按距離排序
    nearbyActivities.sort((a, b) => {
      if (!a.location || !b.location) return 0;
      if (
        a.location.latitude == null ||
        a.location.longitude == null ||
        b.location.latitude == null ||
        b.location.longitude == null
      )
        return 0;

      const latNum = parseFloat(lat as string);
      const lngNum = parseFloat(lng as string);

      const distA = Math.sqrt(
        Math.pow(a.location.latitude - latNum, 2) + Math.pow(a.location.longitude - lngNum, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.location.latitude - latNum, 2) + Math.pow(b.location.longitude - lngNum, 2)
      );

      return distA - distB;
    });

    // 限制數量
    const limitedResults = nearbyActivities.slice(0, parseInt(limit as string));

    return {
      success: true,
      data: limitedResults,
      message: `找到 ${limitedResults.length} 個附近的活動`,
    };
  } catch (error) {
    console.error('取得附近活動失敗:', error);

    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '取得附近活動失敗',
    });
  }
});
