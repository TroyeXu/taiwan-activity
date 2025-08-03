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

// 計算熱門度分數
function calculatePopularityScore(activity: any): number {
  const viewWeight = 0.3;
  const favoriteWeight = 0.5;
  const qualityWeight = 0.2;

  const viewScore = Math.log10((activity.viewCount || 0) + 1) * viewWeight;
  const favoriteScore = (activity.favoriteCount || 0) * favoriteWeight;
  const qualityScore = (activity.qualityScore || 0) * qualityWeight;

  // 時間衰減因子（越新的活動分數越高）
  const daysOld = Math.floor(
    (Date.now() - new Date(activity.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeFactor = Math.max(0.5, 1 - daysOld / 365); // 一年後降到 0.5

  return (viewScore + favoriteScore + qualityScore) * timeFactor;
}
