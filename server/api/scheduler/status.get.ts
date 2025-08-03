import type { ApiResponse } from '../../../app/types';

// 排程器實例 (單例模式)
let schedulerInstance: any = null;

export default defineEventHandler(async (_event): Promise<ApiResponse<any>> => {
  try {
    // 如果排程器未初始化，返回基礎狀態
    if (!schedulerInstance) {
      return {
        success: true,
        data: {
          status: 'not_initialized',
          message: '排程器尚未初始化',
          jobs: {},
          systemInfo: {
            platform: process.platform,
            nodeVersion: process.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
          },
        },
      };
    }

    // 獲取排程器狀態
    const jobStatus = schedulerInstance.getStatus();

    // 獲取系統資訊
    const systemInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    // 計算總體健康狀態
    const healthStatus = calculateHealthStatus(jobStatus);

    return {
      success: true,
      data: {
        status: 'running',
        health: healthStatus,
        jobs: jobStatus,
        systemInfo,
        summary: {
          totalJobs: Object.keys(jobStatus).length,
          runningJobs: Object.values(jobStatus).filter((job: any) => job.running).length,
          errorJobs: Object.values(jobStatus).filter((job: any) => job.lastResult === 'error')
            .length,
          successJobs: Object.values(jobStatus).filter((job: any) => job.lastResult === 'success')
            .length,
        },
      },
    };
  } catch (error) {
    console.error('獲取排程器狀態失敗:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '獲取排程器狀態失敗',
    });
  }
});

function calculateHealthStatus(jobStatus: Record<string, any>): string {
  const jobs = Object.values(jobStatus);

  if (jobs.length === 0) {
    return 'unknown';
  }

  const errorJobs = jobs.filter((job: any) => job.lastResult === 'error').length;
  const runningJobs = jobs.filter((job: any) => job.running).length;

  // 如果有超過一半的任務失敗
  if (errorJobs > jobs.length / 2) {
    return 'critical';
  }

  // 如果有錯誤但不超過一半
  if (errorJobs > 0) {
    return 'warning';
  }

  // 如果有任務正在運行或所有任務都成功
  if (runningJobs > 0 || jobs.some((job: any) => job.lastResult === 'success')) {
    return 'healthy';
  }

  return 'unknown';
}

// 設置排程器實例的輔助函數
export function setSchedulerInstance(instance: any) {
  schedulerInstance = instance;
}
