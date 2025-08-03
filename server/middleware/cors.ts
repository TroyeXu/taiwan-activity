export default defineEventHandler(async (event) => {
  // 設定 CORS 標頭
  setHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  });

  // 處理 OPTIONS 預檢請求
  if (event.method === 'OPTIONS') {
    event.node.res.statusCode = 204;
    return '';
  }
});
