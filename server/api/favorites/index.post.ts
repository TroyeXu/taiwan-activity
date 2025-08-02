import { db } from '~/db';
import { userFavorites, activities } from '~/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { ApiResponse } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  try {
    const body = await readBody(event);
    const { userId, activityId, action = 'add' } = body;

    // 驗證參數
    if (!userId || !activityId) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少必要參數：userId 和 activityId'
      });
    }

    // 檢查活動是否存在
    const activity = await db.select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!activity.length) {
      throw createError({
        statusCode: 404,
        statusMessage: '活動不存在'
      });
    }

    // 檢查是否已收藏
    const existingFavorite = await db.select()
      .from(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.activityId, activityId)
        )
      )
      .limit(1);

    if (action === 'add') {
      if (existingFavorite.length > 0) {
        return {
          success: true,
          data: { already_favorited: true },
          message: '已在收藏清單中'
        };
      }

      // 新增收藏
      await db.insert(userFavorites).values({
        id: nanoid(),
        userId,
        activityId,
        savedAt: new Date()
      });

      // 更新活動收藏數
      await db.run(sql`
        UPDATE activities 
        SET favorite_count = favorite_count + 1,
            popularity_score = (
              (view_count * 0.1) + 
              ((favorite_count + 1) * 0.5) + 
              (click_count * 0.3) +
              (quality_score * 0.1)
            ) / 100.0
        WHERE id = ${activityId}
      `);

      return {
        success: true,
        data: { favorited: true },
        message: '已加入收藏'
      };

    } else if (action === 'remove') {
      if (existingFavorite.length === 0) {
        return {
          success: true,
          data: { not_favorited: true },
          message: '尚未收藏此活動'
        };
      }

      // 移除收藏
      await db.delete(userFavorites)
        .where(
          and(
            eq(userFavorites.userId, userId),
            eq(userFavorites.activityId, activityId)
          )
        );

      // 更新活動收藏數
      await db.run(sql`
        UPDATE activities 
        SET favorite_count = GREATEST(0, favorite_count - 1),
            popularity_score = (
              (view_count * 0.1) + 
              (GREATEST(0, favorite_count - 1) * 0.5) + 
              (click_count * 0.3) +
              (quality_score * 0.1)
            ) / 100.0
        WHERE id = ${activityId}
      `);

      return {
        success: true,
        data: { favorited: false },
        message: '已移除收藏'
      };

    } else {
      throw createError({
        statusCode: 400,
        statusMessage: '無效的操作：action 必須是 add 或 remove'
      });
    }

  } catch (error) {
    console.error('Favorite operation failed:', error);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '收藏操作失敗'
    });
  }
});