import { ClaudeValidationService } from '../../utils/claude-validation';
import { getDatabase } from '../../utils/database';
import { activities, validationLogs } from '../../../db/schema';
import { eq, or, lt, sql } from 'drizzle-orm';
import type { ApiResponse } from '../../../app/types';

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  try {
    const body = await readBody(event);
    const { source = 'batch', batchSize = 50, autoProcess = true, qualityThreshold = 60 } = body;

    // 查找需要驗證的活動
    const unvalidatedActivities = await findActivitiesForValidation(batchSize);

    if (unvalidatedActivities.length === 0) {
      return {
        success: true,
        data: {
          message: '沒有需要驗證的活動',
          processed: 0,
        },
      };
    }

    const validationService = new ClaudeValidationService();
    const results = [];
    let processed = 0;
    let validated = 0;
    let saved = 0;

    console.log(`開始批次驗證 ${unvalidatedActivities.length} 個活動...`);

    for (const activity of unvalidatedActivities) {
      try {
        // 構建活動資料
        const activityData = {
          id: activity.id,
          name: activity.name,
          description: activity.description,
          summary: activity.summary,
          location: activity.location,
          time: activity.time,
          categories: activity.categories,
        };

        // 執行驗證
        const validationResult = await validationService.validateActivity(activityData);

        // 記錄驗證結果
        const db = getDatabase();
        await db.insert(validationLogs).values({
          id: validationResult.id || 'val_' + Date.now(),
          activityId: activity.id,
          originalData: JSON.stringify(activityData),
          validatedData: validationResult.validatedData
            ? JSON.stringify(validationResult.validatedData)
            : null,
          qualityScore: validationResult.qualityScore,
          issues: JSON.stringify(validationResult.issues),
          suggestions: JSON.stringify(validationResult.suggestions),
          validatedAt: new Date(),
          validator: `claude-${source}`,
        });

        // 更新活動品質分數
        await db
          .update(activities)
          .set({
            qualityScore: validationResult.qualityScore,
            updatedAt: new Date(),
          })
          .where(eq(activities.id, activity.id));

        // 如果啟用自動處理且品質達標，更新狀態
        if (
          autoProcess &&
          validationResult.isValid &&
          (validationResult.qualityScore || 0) >= qualityThreshold
        ) {
          await db
            .update(activities)
            .set({
              status: 'active',
              updatedAt: new Date(),
            })
            .where(eq(activities.id, activity.id));

          saved++;
        }

        results.push({
          activityId: activity.id,
          name: activity.name,
          isValid: validationResult.isValid,
          qualityScore: validationResult.qualityScore,
          issueCount: validationResult.issues?.length || 0,
          processed: autoProcess && (validationResult.qualityScore || 0) >= qualityThreshold,
        });

        if (validationResult.isValid) validated++;
        processed++;

        // 避免過載，每處理 10 個活動暫停 1 秒
        if (processed % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`批次驗證失敗 - 活動 ${activity.id}:`, error);
        results.push({
          activityId: activity.id,
          name: activity.name,
          isValid: false,
          qualityScore: 0,
          issueCount: 1,
          processed: false,
          error: error instanceof Error ? error.message : String(error),
        });
        processed++;
      }
    }

    // 統計結果
    const summary = {
      total: unvalidatedActivities.length,
      processed,
      validated,
      saved,
      averageQuality: results.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / results.length,
      qualityThreshold,
      source,
    };

    console.log(`批次驗證完成:`, summary);

    return {
      success: true,
      data: {
        summary,
        results: results.slice(0, 20), // 只回傳前 20 筆詳細結果
        timestamp: new Date().toISOString(),
      },
      message: `批次驗證完成：處理 ${processed} 個活動，${validated} 個通過驗證，${saved} 個已啟用`,
    };
  } catch (error) {
    console.error('批次驗證失敗:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '批次驗證失敗',
    });
  }
});

// 查找需要驗證的活動
async function findActivitiesForValidation(limit: number = 50) {
  try {
    const db = getDatabase();
    const { locations, activityTimes, categories, activityCategories } = await import(
      '../../../db/schema'
    );

    // 查找品質分數過低或未驗證的活動
    const activitiesNeedValidation = await db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`.as('category_names'),
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`.as('category_slugs'),
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(
        or(
          lt(activities.qualityScore, 60), // 品質分數過低
          eq(activities.qualityScore, 0), // 未評分
          eq(activities.status, 'pending') // 待審核狀態
        )
      )
      .groupBy(activities.id)
      .limit(limit);

    // 格式化資料
    return activitiesNeedValidation.map((row) => ({
      id: row.activity.id,
      name: row.activity.name,
      description: row.activity.description,
      summary: row.activity.summary,
      qualityScore: row.activity.qualityScore,
      location: row.location
        ? {
            address: row.location.address,
            city: row.location.city,
            region: row.location.region,
            latitude: row.location.latitude,
            longitude: row.location.longitude,
          }
        : null,
      time: row.time
        ? {
            startDate: row.time.startDate,
            endDate: row.time.endDate,
            startTime: row.time.startTime,
            endTime: row.time.endTime,
          }
        : null,
      categories: row.categoryNames
        ? row.categoryNames.split(',').map((name, index) => ({
            name: name.trim(),
            slug: row.categorySlugs?.split(',')[index]?.trim() || '',
          }))
        : [],
    }));
  } catch (error) {
    console.error('查找待驗證活動失敗:', error);
    return [];
  }
}
