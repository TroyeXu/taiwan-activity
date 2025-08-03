import { getDatabase } from '../../utils/database';
import { activities, locations, validationLogs, userFavorites } from '../../../db/schema';
import { sql, eq, gte, desc } from 'drizzle-orm';
import { CacheManager } from '../../utils/cache';
import { logger } from '../../utils/logger';
import type { ApiResponse } from '../../../app/types';

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  const startTime = Date.now();

  try {
    // 生成快取鍵
    const cacheKey = CacheManager.generateKey('admin', 'dashboard', 'summary');

    // 嘗試從快取取得資料
    const cachedData = await CacheManager.getOrSet(
      cacheKey,
      async () => {
        // 並行取得各種統計資料
        const [
          overviewStats,
          qualityStats,
          regionStats,
          recentActivities,
          validationSummary,
          popularActivities,
          systemHealth,
        ] = await Promise.all([
          getOverviewStats(),
          getQualityStats(),
          getRegionStats(),
          getRecentActivities(),
          getValidationSummary(),
          getPopularActivities(),
          getSystemHealth(),
        ]);

        return {
          overview: overviewStats,
          quality: qualityStats,
          regions: regionStats,
          recent: recentActivities,
          validation: validationSummary,
          popular: popularActivities,
          system: systemHealth,
          lastUpdated: new Date().toISOString(),
        };
      },
      2 * 60 * 1000 // 快取 2 分鐘
    );

    const duration = Date.now() - startTime;

    // 記錄效能日誌
    logger.performance('admin-dashboard', duration, {
      cached: !!cachedData,
      dataSize: JSON.stringify(cachedData).length,
    });

    return {
      success: true,
      data: {
        ...cachedData,
        responseTime: duration,
        cached: true,
      },
    };
  } catch (error) {
    logger.error('Admin dashboard failed', error, { source: 'ADMIN' });

    throw createError({
      statusCode: 500,
      statusMessage: '取得管理面板資料失敗',
    });
  }
});

async function getOverviewStats() {
  try {
    const db = getDatabase();
    const result = await db.get(sql`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_activities,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_activities,
        COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_activities,
        SUM(view_count) as total_views,
        SUM(favorite_count) as total_favorites,
        AVG(quality_score) as average_quality,
        COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_this_week
      FROM activities
    `);

    return (result as any).rows?.[0] || {};
  } catch (error) {
    logger.error('Failed to get overview stats', error);
    return {};
  }
}

async function getQualityStats() {
  try {
    const db = getDatabase();
    const result = await db.get(sql`
      SELECT 
        COUNT(CASE WHEN quality_score >= 90 THEN 1 END) as excellent,
        COUNT(CASE WHEN quality_score >= 70 AND quality_score < 90 THEN 1 END) as good,
        COUNT(CASE WHEN quality_score >= 50 AND quality_score < 70 THEN 1 END) as fair,
        COUNT(CASE WHEN quality_score < 50 THEN 1 END) as poor,
        AVG(quality_score) as average_score,
        MIN(quality_score) as min_score,
        MAX(quality_score) as max_score
      FROM activities 
      WHERE status = 'active'
    `);

    const stats = (result as any).rows?.[0] || {};

    // 計算分佈百分比
    const total =
      (stats.excellent || 0) + (stats.good || 0) + (stats.fair || 0) + (stats.poor || 0);

    if (total > 0) {
      return {
        ...stats,
        distribution: {
          excellent: Math.round((stats.excellent / total) * 100),
          good: Math.round((stats.good / total) * 100),
          fair: Math.round((stats.fair / total) * 100),
          poor: Math.round((stats.poor / total) * 100),
        },
      };
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get quality stats', error);
    return {};
  }
}

async function getRegionStats() {
  try {
    const db = getDatabase();
    const result = await db.get(sql`
      SELECT 
        l.region,
        COUNT(*) as activity_count,
        COUNT(DISTINCT l.city) as city_count,
        AVG(a.quality_score) as average_quality,
        SUM(a.view_count) as total_views,
        SUM(a.favorite_count) as total_favorites
      FROM locations l
      JOIN activities a ON l.activity_id = a.id
      WHERE a.status = 'active'
      GROUP BY l.region
      ORDER BY activity_count DESC
    `);

    return (result as any).rows || [];
  } catch (error) {
    logger.error('Failed to get region stats', error);
    return [];
  }
}

async function getRecentActivities() {
  try {
    const db = getDatabase();
    const result = await db.get(sql`
      SELECT 
        a.id,
        a.name,
        a.status,
        a.quality_score,
        a.created_at,
        l.city,
        l.region
      FROM activities a
      LEFT JOIN locations l ON a.id = l.activity_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    return (result as any).rows || [];
  } catch (error) {
    logger.error('Failed to get recent activities', error);
    return [];
  }
}

async function getValidationSummary() {
  try {
    const db = getDatabase();
    // 檢查驗證記錄表是否存在
    const tableExists = await db.get(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='validation_logs'
    `);

    if (!(tableExists as any).rows?.length) {
      return { enabled: false };
    }

    const result = await db.get(sql`
      SELECT 
        COUNT(*) as total_validations,
        COUNT(CASE WHEN quality_score >= 60 THEN 1 END) as passed,
        COUNT(CASE WHEN quality_score < 60 THEN 1 END) as failed,
        AVG(quality_score) as average_score,
        COUNT(CASE WHEN validated_at >= datetime('now', '-24 hours') THEN 1 END) as today
      FROM validation_logs
      WHERE validated_at >= datetime('now', '-7 days')
    `);

    const stats = (result as any).rows?.[0] || {};

    return {
      enabled: true,
      ...stats,
      success_rate:
        stats.total_validations > 0
          ? Math.round((stats.passed / stats.total_validations) * 100)
          : 0,
    };
  } catch (error) {
    logger.error('Failed to get validation summary', error);
    return { enabled: false };
  }
}

async function getPopularActivities() {
  try {
    const db = getDatabase();
    const result = await db.get(sql`
      SELECT 
        a.id,
        a.name,
        a.view_count,
        a.favorite_count,
        a.popularity_score,
        l.city
      FROM activities a
      LEFT JOIN locations l ON a.id = l.activity_id
      WHERE a.status = 'active'
      ORDER BY a.popularity_score DESC
      LIMIT 5
    `);

    return (result as any).rows || [];
  } catch (error) {
    logger.error('Failed to get popular activities', error);
    return [];
  }
}

async function getSystemHealth() {
  try {
    const dbHealth = await checkDatabaseHealth();
    const cacheStats = CacheManager.getStats();

    return {
      database: dbHealth,
      cache: cacheStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get system health', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkDatabaseHealth() {
  const startTime = Date.now();

  try {
    const db = getDatabase();
    await db.get(sql`SELECT 1`);
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    };
  }
}
