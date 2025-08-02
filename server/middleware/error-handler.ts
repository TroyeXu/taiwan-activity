export default defineEventHandler(async (event) => {
  try {
    // 繼續處理請求
    return;
  } catch (error) {
    console.error('API Error:', error);
    
    // 記錄錯誤
    const errorInfo = {
      url: event.node.req.url,
      method: event.node.req.method,
      userAgent: getHeader(event, 'user-agent'),
      ip: getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
    
    // 這裡可以發送到錯誤追蹤服務
    console.error('Error details:', errorInfo);
    
    // 回傳標準化錯誤回應
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    });
  }
});