import { getDatabase } from '../../utils/database';
import { sql } from 'drizzle-orm';
import type { ApiResponse } from '../../../app/types';

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  try {
    // 取得活動統計
    const activityStats = await getActivityStats();

    // 取得分類統計
    const categoryStats = await getCategoryStats();

    // 取得地區統計
    const regionStats = await getRegionStats();

    // 取得品質統計
    const qualityStats = await getQualityStats();

    // 取得搜尋統計 (如果有搜尋記錄表)
    const searchStats = await getSearchStats();

    return {
      success: true,
      data: {
        activities: activityStats,
        categories: categoryStats,
        regions: regionStats,
        quality: qualityStats,
        searches: searchStats,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Get system stats failed:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '取得系統統計失敗',
    });
  }
});

async function getActivityStats() {
  try {
    const result = await getDatabase().get(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended,
        AVG(quality_score) as average_quality,
        SUM(view_count) as total_views,
        SUM(favorite_count) as total_favorites
      FROM activities
    `);

    return (result as any).rows?.[0] || {};
  } catch (error) {
    console.error('Failed to get activity stats:', error);
    return {};
  }
}

async function getCategoryStats() {
  try {
    const result = await getDatabase().get(sql`
      SELECT 
        c.name,
        c.slug,
        COUNT(ac.activity_id) as activity_count,
        AVG(a.quality_score) as average_quality
      FROM categories c
      LEFT JOIN activity_categories ac ON c.id = ac.category_id
      LEFT JOIN activities a ON ac.activity_id = a.id AND a.status = 'active'
      GROUP BY c.id, c.name, c.slug
      ORDER BY activity_count DESC
      LIMIT 10
    `);

    return (result as any).rows || [];
  } catch (error) {
    console.error('Failed to get category stats:', error);
    return [];
  }
}

async function getRegionStats() {
  try {
    const result = await getDatabase().get(sql`
      SELECT 
        l.region,
        COUNT(*) as activity_count,
        COUNT(DISTINCT l.city) as city_count,
        AVG(a.quality_score) as average_quality
      FROM locations l
      JOIN activities a ON l.activity_id = a.id
      WHERE a.status = 'active'
      GROUP BY l.region
      ORDER BY activity_count DESC
    `);

    return (result as any).rows || [];
  } catch (error) {
    console.error('Failed to get region stats:', error);
    return [];
  }
}

async function getQualityStats() {
  try {
    const result = await getDatabase().get(sql`
      SELECT 
        COUNT(CASE WHEN quality_score >= 80 THEN 1 END) as high_quality,
        COUNT(CASE WHEN quality_score >= 60 AND quality_score < 80 THEN 1 END) as medium_quality,
        COUNT(CASE WHEN quality_score < 60 THEN 1 END) as low_quality,
        AVG(quality_score) as average_score,
        MIN(quality_score) as min_score,
        MAX(quality_score) as max_score
      FROM activities
      WHERE status = 'active'
    `);

    return (result as any).rows?.[0] || {};
  } catch (error) {
    console.error('Failed to get quality stats:', error);
    return {};
  }
}

async function getSearchStats() {
  try {
    // 檢查是否有搜尋記錄表
    const tableExists = await getDatabase().get(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='search_logs'
    `);

    if (!(tableExists as any).rows?.length) {
      return { enabled: false };
    }

    const result = await getDatabase().get(sql`
      SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT query) as unique_queries,
        AVG(result_count) as average_results,
        COUNT(*) as searches_today
      FROM search_logs
      WHERE searched_at > ${Date.now() - 24 * 60 * 60 * 1000}
    `);

    return {
      enabled: true,
      ...(result as any).rows?.[0],
    };
  } catch (error) {
    console.warn('Failed to get search stats:', error);
    return { enabled: false };
  }
}
