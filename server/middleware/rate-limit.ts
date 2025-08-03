// 簡單的記憶體型速率限制
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // 每分鐘請求數限制
const WINDOW_MS = 60 * 1000; // 1分鐘視窗

export default defineEventHandler(async (event) => {
  const clientIP =
    getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown';
  const now = Date.now();

  // 清理過期記錄
  const current = requestCounts.get(clientIP);
  if (!current || now > current.resetTime) {
    requestCounts.set(clientIP, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return;
  }

  // 檢查是否超過限制
  if (current.count >= RATE_LIMIT) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    });
  }

  // 增加計數
  current.count++;
});
