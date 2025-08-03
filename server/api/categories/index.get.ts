import { getDatabase } from '../../utils/database';
import { categories, activityCategories } from '../../../db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import type { ApiResponse, Category } from '../../../app/types';

export default defineEventHandler(async (_event): Promise<ApiResponse<Category[]>> => {
  try {
    const db = getDatabase();

    // 查詢所有分類，包含活動數量統計
    const results = await db
      .select({
        category: categories,
        activityCount: sql<number>`COUNT(${activityCategories.activityId})`.as('activity_count'),
      })
      .from(categories)
      .leftJoin(activityCategories, eq(categories.id, activityCategories.categoryId))
      .groupBy(categories.id)
      .orderBy(desc(sql`activity_count`), categories.name);

    // 格式化結果
    const formattedResults: (Category & { activityCount: number })[] = results.map((row) => ({
      id: row.category.id,
      name: row.category.name,
      slug: row.category.slug,
      colorCode: row.category.colorCode || undefined,
      icon: row.category.icon || undefined,
      activityCount: row.activityCount || 0,
    }));

    return {
      success: true,
      data: formattedResults,
      message: `取得 ${formattedResults.length} 個分類`,
    };
  } catch (error) {
    console.error('取得分類列表失敗:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '取得分類列表失敗',
    });
  }
});
