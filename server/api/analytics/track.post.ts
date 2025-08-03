import { getDatabase } from '../../utils/database';
import { activities } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import type { ApiResponse } from '../../../app/types';

interface TrackingEvent {
  type: 'view' | 'click' | 'favorite' | 'search';
  activityId?: string;
  userId?: string;
  data?: any;
}

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  try {
    const body = (await readBody(event)) as TrackingEvent;
    const { type, activityId, userId, data } = body;

    if (!type) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少事件類型',
      });
    }

    const clientIP = getClientIP(event) || 'unknown';
    const userAgent = getHeader(event, 'user-agent') || '';

    switch (type) {
      case 'view':
        if (activityId) {
          await trackActivityView(activityId, userId, clientIP, userAgent);
        }
        break;

      case 'click':
        if (activityId) {
          await trackActivityClick(activityId, userId, clientIP, userAgent);
        }
        break;

      case 'search':
        await trackSearch(data, userId, clientIP, userAgent);
        break;

      default:
        throw createError({
          statusCode: 400,
          statusMessage: '無效的事件類型',
        });
    }

    return {
      success: true,
      data: { tracked: true },
      message: '事件追蹤成功',
    };
  } catch (error) {
    console.error('Analytics tracking failed:', error);

    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '事件追蹤失敗',
    });
  }
});

async function trackActivityView(
  activityId: string,
  userId?: string,
  clientIP?: string,
  userAgent?: string
) {
  try {
    const db = getDatabase();
    // 更新活動瀏覽數
    await db
      .update(activities)
      .set({
        viewCount: sql`${activities.viewCount} + 1`,
        popularityScore: sql`
          ((${activities.viewCount} + 1) * 0.1 + 
           ${activities.favoriteCount} * 0.5 + 
           ${activities.clickCount} * 0.3 +
           ${activities.qualityScore} * 0.1) / 100.0
        `,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId));

    // 記錄詳細的瀏覽記錄（可選）
    await logAnalyticsEvent({
      type: 'view',
      activityId,
      userId,
      clientIP,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to track activity view:', error);
  }
}

async function trackActivityClick(
  activityId: string,
  userId?: string,
  clientIP?: string,
  userAgent?: string
) {
  try {
    const db = getDatabase();
    // 更新活動點擊數
    await db
      .update(activities)
      .set({
        clickCount: sql`${activities.clickCount} + 1`,
        popularityScore: sql`
          (${activities.viewCount} * 0.1 + 
           ${activities.favoriteCount} * 0.5 + 
           (${activities.clickCount} + 1) * 0.3 +
           ${activities.qualityScore} * 0.1) / 100.0
        `,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, activityId));

    // 記錄詳細的點擊記錄
    await logAnalyticsEvent({
      type: 'click',
      activityId,
      userId,
      clientIP,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to track activity click:', error);
  }
}

async function trackSearch(
  searchData: any,
  userId?: string,
  clientIP?: string,
  userAgent?: string
) {
  try {
    const db = getDatabase();
    // 檢查搜尋記錄表是否存在
    const tableExists = await db.all(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='search_logs'
    `);

    if (tableExists.length > 0) {
      // 記錄搜尋事件
      await db.run(sql`
        INSERT INTO search_logs (
          id, user_id, query, filters, result_count, 
          searched_at, ip_address, user_agent
        ) VALUES (
          ${generateId()}, ${userId || null}, ${searchData.query || ''}, 
          ${JSON.stringify(searchData.filters || {})}, ${searchData.resultCount || 0},
          ${Date.now()}, ${clientIP || ''}, ${userAgent || ''}
        )
      `);
    }
  } catch (error) {
    console.error('Failed to track search:', error);
  }
}

async function logAnalyticsEvent(event: {
  type: string;
  activityId?: string;
  userId?: string;
  clientIP?: string;
  userAgent?: string;
  timestamp: Date;
  data?: any;
}) {
  try {
    // 這裡可以擴展為更完整的分析事件記錄
    // 暫時使用簡單的日誌記錄
    console.log('Analytics Event:', {
      type: event.type,
      activityId: event.activityId,
      userId: event.userId,
      timestamp: event.timestamp.toISOString(),
    });

    // 未來可以整合到專門的分析資料庫或服務
    // 例如：Google Analytics, Mixpanel, 自定義分析表等
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
}

function generateId(): string {
  return 'evt_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getClientIP(event: any): string | null {
  const forwarded = getHeader(event, 'x-forwarded-for');
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return getHeader(event, 'x-real-ip') || null;
}
