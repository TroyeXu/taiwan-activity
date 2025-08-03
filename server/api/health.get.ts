import { getDatabase } from '~/server/utils/database';
import { sql } from 'drizzle-orm';
import type { ApiResponse } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  const startTime = Date.now();

  try {
    // 檢查資料庫連接
    const dbHealth = await checkDatabaseHealth();

    // 檢查 Claude API (如果設定)
    const claudeHealth = await checkClaudeHealth();

    // 系統資訊
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    };

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime,
        services: {
          database: dbHealth,
          claude: claudeHealth,
        },
        system: systemInfo,
      },
    };
  } catch (error) {
    console.error('Health check failed:', error);

    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
    });
  }
});

async function checkDatabaseHealth(): Promise<{ status: string; responseTime: number }> {
  const start = Date.now();

  try {
    const db = getDatabase();
    await db.get(sql`SELECT 1`);
    return {
      status: 'healthy',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
    };
  }
}

async function checkClaudeHealth(): Promise<{ status: string; configured: boolean }> {
  const config = useRuntimeConfig();
  const apiKey = config.claudeApiKey || process.env.CLAUDE_API_KEY;

  return {
    status: apiKey ? 'configured' : 'not_configured',
    configured: !!apiKey,
  };
}
