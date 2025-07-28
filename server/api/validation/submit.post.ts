import { ClaudeValidationService } from '~/server/utils/claude-validation';
import { db } from '~/db';
import { activities, validationLogs } from '~/db/schema';
import { nanoid } from 'nanoid';
import type { ApiResponse } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  try {
    const body = await readBody(event);
    const { activities: activityData, source = 'manual', autoProcess = false } = body;

    if (!activityData) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少活動資料'
      });
    }

    const validationService = new ClaudeValidationService();
    const results = [];

    // 處理批次或單一活動
    const activitiesToValidate = Array.isArray(activityData) ? activityData : [activityData];

    for (const activity of activitiesToValidate) {
      try {
        // 執行驗證
        const validationResult = await validationService.validateActivity(activity);
        
        // 記錄驗證結果
        await db.insert(validationLogs).values({
          id: nanoid(),
          activityId: activity.id || nanoid(),
          originalData: JSON.stringify(activity),
          validatedData: validationResult.validatedData ? 
            JSON.stringify(validationResult.validatedData) : null,
          qualityScore: validationResult.qualityScore,
          issues: JSON.stringify(validationResult.issues),
          suggestions: JSON.stringify(validationResult.suggestions),
          validatedAt: new Date(),
          validator: `claude-${source}`
        });

        // 如果啟用自動處理且驗證通過，直接儲存活動
        if (autoProcess && validationResult.isValid && validationResult.validatedData) {
          const activityId = await this.saveValidatedActivity(validationResult.validatedData);
          validationResult.activityId = activityId;
        }

        results.push({
          originalId: activity.id,
          validationId: validationResult.id,
          isValid: validationResult.isValid,
          qualityScore: validationResult.qualityScore,
          issues: validationResult.issues,
          suggestions: validationResult.suggestions,
          ...(validationResult.activityId && { activityId: validationResult.activityId })
        });

      } catch (error) {
        console.error(`Validation failed for activity:`, error);
        results.push({
          originalId: activity.id,
          validationId: null,
          isValid: false,
          qualityScore: 0,
          issues: [{
            field: 'general',
            type: 'system_error',
            severity: 'error' as const,
            message: '驗證過程發生錯誤'
          }],
          suggestions: []
        });
      }
    }

    // 統計結果
    const summary = {
      total: results.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
      averageQuality: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
      processed: results.filter(r => r.activityId).length
    };

    return {
      success: true,
      data: {
        results,
        summary,
        source,
        timestamp: new Date().toISOString()
      },
      message: `已驗證 ${results.length} 個活動，${summary.valid} 個通過驗證`
    };

  } catch (error) {
    console.error('Validation submission failed:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: '驗證提交失敗'
    });
  }
});

// 儲存已驗證的活動
async function saveValidatedActivity(validatedData: any): Promise<string> {
  const activityId = validatedData.id || nanoid();
  
  try {
    // 插入活動主資料
    await db.insert(activities).values({
      id: activityId,
      name: validatedData.name,
      description: validatedData.description,
      summary: validatedData.summary,
      status: 'active',
      qualityScore: validatedData.qualityScore || 70,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    });

    // 插入地點資料
    if (validatedData.location) {
      const { locations } = await import('~/db/schema');
      await db.insert(locations).values({
        id: nanoid(),
        activityId,
        address: validatedData.location.address,
        district: validatedData.location.district,
        city: validatedData.location.city,
        region: validatedData.location.region,
        latitude: validatedData.location.latitude,
        longitude: validatedData.location.longitude,
        venue: validatedData.location.venue,
        landmarks: validatedData.location.landmarks ? 
          JSON.stringify(validatedData.location.landmarks) : null
      });
    }

    // 插入時間資料
    if (validatedData.time) {
      const { activityTimes } = await import('~/db/schema');
      await db.insert(activityTimes).values({
        id: nanoid(),
        activityId,
        startDate: validatedData.time.startDate,
        endDate: validatedData.time.endDate,
        startTime: validatedData.time.startTime,
        endTime: validatedData.time.endTime,
        timezone: validatedData.time.timezone || 'Asia/Taipei',
        isRecurring: validatedData.time.isRecurring || false,
        recurrenceRule: validatedData.time.recurrenceRule ? 
          JSON.stringify(validatedData.time.recurrenceRule) : null
      });
    }

    // 插入分類關聯
    if (validatedData.categories?.length) {
      const { categories, activityCategories } = await import('~/db/schema');
      
      for (const category of validatedData.categories) {
        // 確保分類存在
        const existingCategory = await db.select()
          .from(categories)
          .where(eq(categories.slug, category.slug))
          .limit(1);

        let categoryId;
        if (existingCategory.length === 0) {
          categoryId = nanoid();
          await db.insert(categories).values({
            id: categoryId,
            name: category.name,
            slug: category.slug,
            colorCode: category.colorCode,
            icon: category.icon
          });
        } else {
          categoryId = existingCategory[0].id;
        }

        // 建立關聯
        await db.insert(activityCategories).values({
          activityId,
          categoryId
        });
      }
    }

    return activityId;

  } catch (error) {
    console.error('Failed to save validated activity:', error);
    throw error;
  }
}