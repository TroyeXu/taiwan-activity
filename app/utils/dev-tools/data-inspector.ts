/**
 * 資料檢查工具
 * 用於即時檢查前端與資料庫的資料狀況
 */

export class DataInspector {
  /**
   * 檢查並顯示當前資料狀況
   */
  static async inspectCurrentData() {
    console.log('🔍 開始檢查資料狀況...\n');
    
    try {
      // 1. 檢查資料庫連接
      await this.checkDatabaseConnection();
      
      // 2. 檢查活動資料
      await this.checkActivitiesData();
      
      // 3. 檢查城市資料
      await this.checkCityData();
      
      // 4. 檢查分類資料
      await this.checkCategoryData();
      
      // 5. 檢查標籤資料
      await this.checkTagData();
      
      // 6. 檢查當前篩選狀態
      this.checkCurrentFilters();
      
      console.log('\n✅ 資料檢查完成');
    } catch (error) {
      console.error('❌ 資料檢查失敗:', error);
    }
  }

  /**
   * 檢查資料庫連接
   */
  static async checkDatabaseConnection() {
    console.log('=== 資料庫連接狀態 ===');
    const { checkHealth } = useSqlite();
    
    try {
      const health = await checkHealth();
      console.log('狀態:', health.status);
      console.log('訊息:', health.message || '連接正常');
    } catch (error) {
      console.error('連接失敗:', error);
    }
  }

  /**
   * 檢查活動資料
   */
  static async checkActivitiesData() {
    console.log('\n=== 活動資料統計 ===');
    const { query } = useSqlite();
    
    // 總活動數
    const totalCount = await query('SELECT COUNT(*) as total FROM activities');
    console.log(`總活動數: ${totalCount[0].total}`);
    
    // 檢查資料完整性
    const incomplete = await query(`
      SELECT COUNT(*) as count FROM activities 
      WHERE name IS NULL OR name = ''
         OR description IS NULL OR description = ''
    `);
    console.log(`不完整資料: ${incomplete[0].count}`);
    
    // 顯示範例資料
    const sample = await query('SELECT * FROM activities LIMIT 1');
    if (sample.length > 0) {
      console.log('\n範例活動資料:');
      console.table(sample[0]);
    }
  }

  /**
   * 檢查城市資料
   */
  static async checkCityData() {
    console.log('\n=== 城市資料分布 ===');
    const { query } = useSqlite();
    
    const cityStats = await query(`
      SELECT city, COUNT(*) as count 
      FROM locations 
      GROUP BY city 
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.table(cityStats);
    
    // 檢查非標準城市名稱
    const invalidCities = await query(`
      SELECT DISTINCT city FROM locations 
      WHERE city NOT IN (
        '台北市','新北市','桃園市','台中市','台南市','高雄市',
        '基隆市','新竹市','新竹縣','苗栗縣','彰化縣','南投縣',
        '雲林縣','嘉義市','嘉義縣','屏東縣','宜蘭縣','花蓮縣',
        '台東縣','澎湖縣','金門縣','連江縣'
      )
    `);
    
    if (invalidCities.length > 0) {
      console.warn('⚠️ 發現非標準城市名稱:');
      console.table(invalidCities);
    }
  }

  /**
   * 檢查分類資料
   */
  static async checkCategoryData() {
    console.log('\n=== 分類資料統計 ===');
    const { query } = useSqlite();
    
    const categoryStats = await query(`
      SELECT 
        c.name, 
        c.slug, 
        COUNT(ac.activity_id) as activity_count
      FROM categories c
      LEFT JOIN activity_categories ac ON c.id = ac.category_id
      GROUP BY c.id
      ORDER BY activity_count DESC
    `);
    
    console.table(categoryStats);
    
    // 檢查分類 slug 格式
    const invalidSlugs = await query(`
      SELECT * FROM categories 
      WHERE slug GLOB '*[^a-z-]*'
    `);
    
    if (invalidSlugs.length > 0) {
      console.warn('⚠️ 發現非標準分類 slug:');
      console.table(invalidSlugs);
    }
  }

  /**
   * 檢查標籤資料
   */
  static async checkTagData() {
    console.log('\n=== 標籤資料統計 ===');
    const { query } = useSqlite();
    
    const tagStats = await query(`
      SELECT name, slug, usage_count 
      FROM tags 
      ORDER BY usage_count DESC 
      LIMIT 10
    `);
    
    console.table(tagStats);
  }

  /**
   * 檢查當前篩選狀態
   */
  static checkCurrentFilters() {
    console.log('\n=== 當前篩選狀態 ===');
    
    try {
      const { filters } = useFilters();
      const currentFilters = filters.value;
      
      const activeFilters: Record<string, any> = {};
      
      if (currentFilters.categories?.length) {
        activeFilters.分類 = currentFilters.categories;
      }
      if (currentFilters.cities?.length) {
        activeFilters.城市 = currentFilters.cities;
      }
      if (currentFilters.regions?.length) {
        activeFilters.地區 = currentFilters.regions;
      }
      if (currentFilters.tags?.length) {
        activeFilters.標籤 = currentFilters.tags;
      }
      if (currentFilters.dateRange?.start || currentFilters.dateRange?.end) {
        activeFilters.日期範圍 = currentFilters.dateRange;
      }
      if (currentFilters.priceRange?.min !== undefined || currentFilters.priceRange?.max !== undefined) {
        activeFilters.價格範圍 = currentFilters.priceRange;
      }
      
      if (Object.keys(activeFilters).length > 0) {
        console.log('已啟用的篩選條件:');
        console.table(activeFilters);
      } else {
        console.log('目前沒有啟用任何篩選條件');
      }
    } catch (error) {
      console.log('無法取得篩選狀態（可能尚未初始化）');
    }
  }

  /**
   * 檢查特定活動的完整資料
   */
  static async inspectActivity(activityId: string) {
    console.log(`\n🔍 檢查活動 ID: ${activityId}`);
    const { query } = useSqlite();
    
    // 基本資料
    const activity = await query('SELECT * FROM activities WHERE id = ?', [activityId]);
    if (activity.length === 0) {
      console.error('找不到此活動');
      return;
    }
    
    console.log('\n基本資料:');
    console.table(activity[0]);
    
    // 位置資料
    const location = await query('SELECT * FROM locations WHERE activity_id = ?', [activityId]);
    if (location.length > 0) {
      console.log('\n位置資料:');
      console.table(location[0]);
    }
    
    // 時間資料
    const time = await query('SELECT * FROM activity_times WHERE activity_id = ?', [activityId]);
    if (time.length > 0) {
      console.log('\n時間資料:');
      console.table(time[0]);
    }
    
    // 分類資料
    const categories = await query(`
      SELECT c.* FROM categories c
      JOIN activity_categories ac ON c.id = ac.category_id
      WHERE ac.activity_id = ?
    `, [activityId]);
    if (categories.length > 0) {
      console.log('\n分類:');
      console.table(categories);
    }
    
    // 標籤資料
    const tags = await query(`
      SELECT t.* FROM tags t
      JOIN activity_tags at ON t.id = at.tag_id
      WHERE at.activity_id = ?
    `, [activityId]);
    if (tags.length > 0) {
      console.log('\n標籤:');
      console.table(tags);
    }
  }

  /**
   * 測試篩選查詢
   */
  static async testFilterQuery(filters: any) {
    console.log('\n🧪 測試篩選查詢');
    console.log('篩選條件:', filters);
    
    const { searchActivities, activities } = useActivitiesClient();
    
    console.time('查詢執行時間');
    await searchActivities({ filters });
    console.timeEnd('查詢執行時間');
    
    console.log(`查詢結果: ${activities.value.length} 筆`);
    
    if (activities.value.length > 0) {
      console.log('\n第一筆結果:');
      const first = activities.value[0];
      console.log('ID:', first.id);
      console.log('名稱:', first.name);
      console.log('城市:', first.location?.city);
      console.log('分類:', first.categories?.map(c => c.name).join(', '));
      console.log('標籤:', first.tags?.map(t => t.name).join(', '));
    }
  }

  /**
   * 產生資料報告
   */
  static async generateDataReport() {
    const { query } = useSqlite();
    
    const report: Record<string, any> = {};
    
    // 基本統計
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM activities) as total_activities,
        (SELECT COUNT(DISTINCT city) FROM locations) as total_cities,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM tags) as total_tags
    `);
    
    report.基本統計 = stats[0];
    
    // 資料品質
    const quality = await query(`
      SELECT 
        (SELECT COUNT(*) FROM activities WHERE description IS NULL OR description = '') as no_description,
        (SELECT COUNT(*) FROM activities a LEFT JOIN locations l ON a.id = l.activity_id WHERE l.id IS NULL) as no_location,
        (SELECT COUNT(*) FROM activities a LEFT JOIN activity_times t ON a.id = t.activity_id WHERE t.id IS NULL) as no_time
    `);
    
    report.資料品質問題 = quality[0];
    
    // 最活躍城市
    const topCities = await query(`
      SELECT city, COUNT(*) as count 
      FROM locations 
      GROUP BY city 
      ORDER BY count DESC 
      LIMIT 5
    `);
    
    report.最活躍城市 = topCities;
    
    console.log('\n📊 資料狀況報告');
    console.log('================');
    Object.entries(report).forEach(([key, value]) => {
      console.log(`\n${key}:`);
      console.table(value);
    });
    
    return report;
  }
}

/**
 * 快捷命令
 */
export function setupDataInspector() {
  if (typeof window !== 'undefined') {
    // 掛載到全域
    (window as any).DataInspector = DataInspector;
    
    // 快捷命令
    (window as any).inspectData = () => DataInspector.inspectCurrentData();
    (window as any).inspectActivity = (id: string) => DataInspector.inspectActivity(id);
    (window as any).testFilter = (filters: any) => DataInspector.testFilterQuery(filters);
    (window as any).dataReport = () => DataInspector.generateDataReport();
    
    console.log('📊 資料檢查工具已載入');
    console.log('可用命令:');
    console.log('- inspectData() - 檢查當前資料狀況');
    console.log('- inspectActivity(id) - 檢查特定活動');
    console.log('- testFilter(filters) - 測試篩選查詢');
    console.log('- dataReport() - 產生資料報告');
  }
}