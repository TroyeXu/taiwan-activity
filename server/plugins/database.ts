export default defineNitroPlugin(async (_nitroApp) => {
  console.log('🚀 Database ready at ./database/tourism.sqlite');

  // 檢查資料庫檔案是否存在
  const fs = await import('fs');
  const path = await import('path');

  const dbPath = path.join(process.cwd(), 'database', 'tourism.sqlite');

  if (!fs.existsSync(dbPath)) {
    console.warn('⚠️ Database file not found! Run `npm run db:init` to create it.');
  } else {
    const stats = fs.statSync(dbPath);
    console.log(`📊 Database size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }
});
