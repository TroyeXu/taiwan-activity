import { db } from '../index';
import { categories, activities, locations, activityTimes, dataSources, activityCategories } from '../schema';
import { seedCategories } from './categories';
import { sampleActivities, getActivityCategoriesRelations } from './sample-activities';

async function seedDatabase() {
  console.log('🌱 開始種子資料建立...');

  try {
    // 清除現有資料 (開發環境使用)
    console.log('🗑️ 清除現有資料...');
    await db.delete(activityCategories);
    await db.delete(dataSources);
    await db.delete(activityTimes);
    await db.delete(locations);
    await db.delete(activities);
    await db.delete(categories);

    // 插入分類資料
    console.log('📂 插入分類資料...');
    await db.insert(categories).values(seedCategories);
    console.log(`✅ 已插入 ${seedCategories.length} 個分類`);

    // 取得分類資料供關聯使用
    const insertedCategories = await db.select().from(categories);

    // 產生範例活動資料
    const sampleData = sampleActivities();
    
    // 插入活動資料
    console.log('🎭 插入活動資料...');
    await db.insert(activities).values(sampleData.activities);
    console.log(`✅ 已插入 ${sampleData.activities.length} 個活動`);

    // 插入地點資料
    console.log('📍 插入地點資料...');
    await db.insert(locations).values(sampleData.locations);
    console.log(`✅ 已插入 ${sampleData.locations.length} 個地點`);

    // 插入時間資料
    console.log('⏰ 插入時間資料...');
    await db.insert(activityTimes).values(sampleData.activityTimes);
    console.log(`✅ 已插入 ${sampleData.activityTimes.length} 個時間記錄`);

    // 插入資料來源
    console.log('🔗 插入資料來源...');
    await db.insert(dataSources).values(sampleData.dataSources);
    console.log(`✅ 已插入 ${sampleData.dataSources.length} 個資料來源`);

    // 插入活動分類關聯
    console.log('🏷️ 插入活動分類關聯...');
    const categoryRelations = getActivityCategoriesRelations(sampleData.activities, insertedCategories);
    await db.insert(activityCategories).values(categoryRelations);
    console.log(`✅ 已插入 ${categoryRelations.length} 個分類關聯`);

    console.log('🎉 種子資料建立完成！');
    
    // 顯示統計資訊
    const stats = {
      categories: await db.select().from(categories),
      activities: await db.select().from(activities),
      locations: await db.select().from(locations),
    };
    
    console.log('\n📊 資料庫統計：');
    console.log(`   分類: ${stats.categories.length} 個`);
    console.log(`   活動: ${stats.activities.length} 個`);
    console.log(`   地點: ${stats.locations.length} 個`);
    
  } catch (error) {
    console.error('❌ 種子資料建立失敗:', error);
    process.exit(1);
  }
}

// 如果直接執行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('✅ 種子資料腳本執行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 種子資料腳本執行失敗:', error);
      process.exit(1);
    });
}

export { seedDatabase };