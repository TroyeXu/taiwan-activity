import type { ApiResponse } from '~/types';

// 排程器實例引用
let schedulerInstance: any = null;

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  try {
    const body = await readBody(event);
    const { job, force = false } = body;

    if (!job) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少任務名稱',
      });
    }

    if (!schedulerInstance) {
      throw createError({
        statusCode: 503,
        statusMessage: '排程器尚未初始化',
      });
    }

    // 檢查任務是否存在
    const status = schedulerInstance.getStatus();
    if (!(job in status)) {
      throw createError({
        statusCode: 404,
        statusMessage: `未找到任務: ${job}`,
      });
    }

    // 檢查任務是否正在運行
    if (status[job].running && !force) {
      throw createError({
        statusCode: 409,
        statusMessage: `任務 ${job} 正在運行中，使用 force=true 強制執行`,
      });
    }

    console.log(`🚀 手動觸發任務: ${job}${force ? ' (強制執行)' : ''}`);

    // 異步執行任務
    schedulerInstance.triggerJob(job).catch((error: any) => {
      console.error(`任務 ${job} 執行失敗:`, error);
    });

    return {
      success: true,
      data: {
        job,
        triggered: true,
        force,
        timestamp: new Date().toISOString(),
      },
      message: `任務 ${job} 已觸發執行`,
    };
  } catch (error) {
    console.error('觸發任務失敗:', error);

    // 如果是已知錯誤，直接拋出
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '觸發任務失敗',
    });
  }
});

// 設置排程器實例
export function setSchedulerInstance(instance: any) {
  schedulerInstance = instance;
}
