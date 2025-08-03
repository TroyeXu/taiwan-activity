import { mockActivities } from '../../utils/mock-data';
import type { ApiResponse, Activity } from '../../../app/types';

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  try {
    const query = getQuery(event);
    const { limit = 10 } = query;

    // 按品質分數排序取得熱門活動
    const popularActivities = [...mockActivities]
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, parseInt(limit as string));

    return {
      success: true,
      data: popularActivities,
      message: `取得前 ${popularActivities.length} 個熱門活動`,
    };
  } catch (error) {
    console.error('取得熱門活動失敗:', error);
    return {
      success: false,
      message: '取得熱門活動時發生錯誤',
      data: [],
    };
  }
});
