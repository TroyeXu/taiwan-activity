/**
 * 資料驗證與測試工具
 * 用於驗證前後端資料格式一致性
 */

import type { Activity, SearchFilters, Location, Category, Tag } from '~/types';

export class DataValidator {
  /**
   * 驗證活動資料格式
   */
  static validateActivity(activity: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 必要欄位檢查
    if (!activity.id) errors.push('缺少活動 ID');
    if (!activity.name) errors.push('缺少活動名稱');

    // 位置資料驗證
    if (activity.location) {
      const locationErrors = this.validateLocation(activity.location);
      errors.push(...locationErrors);
    }

    // 分類資料驗證
    if (activity.categories && Array.isArray(activity.categories)) {
      activity.categories.forEach((cat: any, index: number) => {
        if (!cat.slug) errors.push(`分類 ${index} 缺少 slug`);
        if (!cat.name) errors.push(`分類 ${index} 缺少名稱`);
      });
    }

    // 標籤資料驗證
    if (activity.tags && Array.isArray(activity.tags)) {
      activity.tags.forEach((tag: any, index: number) => {
        if (!tag.slug) errors.push(`標籤 ${index} 缺少 slug`);
        if (!tag.name) errors.push(`標籤 ${index} 缺少名稱`);
      });
    }

    // 時間資料驗證
    if (activity.time) {
      if (activity.time.startDate && !this.isValidDate(activity.time.startDate)) {
        errors.push('開始日期格式錯誤');
      }
      if (activity.time.endDate && !this.isValidDate(activity.time.endDate)) {
        errors.push('結束日期格式錯誤');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 驗證位置資料
   */
  static validateLocation(location: any): string[] {
    const errors: string[] = [];
    const validCities = [
      '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
      '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣',
      '雲林縣', '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
      '台東縣', '澎湖縣', '金門縣', '連江縣'
    ];

    const validRegions = ['north', 'central', 'south', 'east', 'islands'];

    if (!location.address) errors.push('缺少地址');
    if (!location.city) {
      errors.push('缺少城市');
    } else if (!validCities.includes(location.city)) {
      errors.push(`無效的城市名稱: ${location.city}`);
    }

    if (location.region && !validRegions.includes(location.region)) {
      errors.push(`無效的地區代碼: ${location.region}`);
    }

    if (location.latitude !== undefined && location.latitude !== null) {
      if (typeof location.latitude !== 'number' || location.latitude < -90 || location.latitude > 90) {
        errors.push('緯度值無效');
      }
    }

    if (location.longitude !== undefined && location.longitude !== null) {
      if (typeof location.longitude !== 'number' || location.longitude < -180 || location.longitude > 180) {
        errors.push('經度值無效');
      }
    }

    return errors;
  }

  /**
   * 驗證搜尋篩選條件
   */
  static validateSearchFilters(filters: SearchFilters): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 驗證城市
    if (filters.cities?.length) {
      const validCities = [
        '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
        '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣',
        '雲林縣', '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
        '台東縣', '澎湖縣', '金門縣', '連江縣'
      ];
      
      filters.cities.forEach(city => {
        if (!validCities.includes(city)) {
          errors.push(`無效的城市篩選: ${city}`);
        }
      });
    }

    // 驗證地區
    if (filters.regions?.length) {
      const validRegions = ['north', 'central', 'south', 'east', 'islands'];
      filters.regions.forEach(region => {
        if (!validRegions.includes(region)) {
          errors.push(`無效的地區篩選: ${region}`);
        }
      });
    }

    // 驗證日期範圍
    if (filters.dateRange) {
      if (filters.dateRange.start && !this.isValidDate(filters.dateRange.start)) {
        errors.push('開始日期格式錯誤');
      }
      if (filters.dateRange.end && !this.isValidDate(filters.dateRange.end)) {
        errors.push('結束日期格式錯誤');
      }
      if (filters.dateRange.start && filters.dateRange.end) {
        const start = new Date(filters.dateRange.start);
        const end = new Date(filters.dateRange.end);
        if (start > end) {
          errors.push('開始日期不能晚於結束日期');
        }
      }
    }

    // 驗證價格範圍
    if (filters.priceRange) {
      if (filters.priceRange.min !== undefined && filters.priceRange.min < 0) {
        errors.push('最低價格不能為負數');
      }
      if (filters.priceRange.max !== undefined && filters.priceRange.max < 0) {
        errors.push('最高價格不能為負數');
      }
      if (
        filters.priceRange.min !== undefined && 
        filters.priceRange.max !== undefined && 
        filters.priceRange.min > filters.priceRange.max
      ) {
        errors.push('最低價格不能高於最高價格');
      }
    }

    // 驗證位置與半徑
    if (filters.location) {
      if (typeof filters.location.lat !== 'number' || filters.location.lat < -90 || filters.location.lat > 90) {
        errors.push('緯度值無效');
      }
      if (typeof filters.location.lng !== 'number' || filters.location.lng < -180 || filters.location.lng > 180) {
        errors.push('經度值無效');
      }
    }

    if (filters.radius !== undefined) {
      if (typeof filters.radius !== 'number' || filters.radius <= 0) {
        errors.push('搜尋半徑必須為正數');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 驗證日期格式 (YYYY-MM-DD)
   */
  static isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * 驗證 SQL 查詢參數安全性
   */
  static validateSQLParams(params: Record<string, any>): { safe: boolean; issues: string[] } {
    const issues: string[] = [];
    const sqlKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'EXEC', 'UNION'];

    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // 檢查 SQL 注入風險
        const upperValue = value.toUpperCase();
        sqlKeywords.forEach(keyword => {
          if (upperValue.includes(keyword)) {
            issues.push(`參數 ${key} 包含潛在危險關鍵字: ${keyword}`);
          }
        });

        // 檢查特殊字符
        if (value.includes(';') || value.includes('--')) {
          issues.push(`參數 ${key} 包含潛在危險字符`);
        }
      }
    });

    return {
      safe: issues.length === 0,
      issues
    };
  }

  /**
   * 產生測試報告
   */
  static generateTestReport(testResults: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>): string {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    let report = `# 資料驗證測試報告\n\n`;
    report += `測試時間: ${new Date().toISOString()}\n\n`;
    report += `## 測試摘要\n`;
    report += `- 總測試數: ${totalTests}\n`;
    report += `- 通過: ${passedTests} ✅\n`;
    report += `- 失敗: ${failedTests} ❌\n`;
    report += `- 通過率: ${((passedTests / totalTests) * 100).toFixed(2)}%\n\n`;

    report += `## 詳細結果\n\n`;
    testResults.forEach((result, index) => {
      report += `### ${index + 1}. ${result.name}\n`;
      report += `狀態: ${result.passed ? '✅ 通過' : '❌ 失敗'}\n`;
      if (result.error) {
        report += `錯誤: ${result.error}\n`;
      }
      report += '\n';
    });

    return report;
  }
}

/**
 * 測試資料生成器
 */
export class TestDataGenerator {
  /**
   * 生成測試活動資料
   */
  static generateTestActivity(overrides: Partial<Activity> = {}): Activity {
    const defaultActivity: Activity = {
      id: `test-${Date.now()}`,
      name: '測試活動',
      description: '這是一個測試活動',
      status: 'active' as any,
      qualityScore: 0.8,
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        id: 'loc-1',
        activityId: 'test-1',
        address: '台北市信義區測試路1號',
        city: '台北市',
        district: '信義區',
        region: 'north' as any,
        latitude: 25.0330,
        longitude: 121.5654
      },
      categories: [{
        id: 'cat-1',
        name: '音樂表演',
        slug: 'music',
        colorCode: '#FF6B6B',
        icon: '🎵'
      }],
      tags: [{
        id: 'tag-1',
        name: '室內活動',
        slug: 'indoor',
        usageCount: 10
      }]
    };

    return { ...defaultActivity, ...overrides };
  }

  /**
   * 生成測試篩選條件
   */
  static generateTestFilters(overrides: Partial<SearchFilters> = {}): SearchFilters {
    const defaultFilters: SearchFilters = {
      categories: ['music'],
      cities: ['台北市'],
      tags: ['indoor'],
      priceRange: {
        min: 0,
        max: 1000,
        includeFreeze: true
      },
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };

    return { ...defaultFilters, ...overrides };
  }
}

/**
 * 控制台除錯工具
 */
export function setupDebugTools() {
  if (typeof window !== 'undefined') {
    // 掛載到全域 window 物件供控制台使用
    (window as any).DataValidator = DataValidator;
    (window as any).TestDataGenerator = TestDataGenerator;
    
    // 添加快捷測試函數
    (window as any).testFilters = async (filters: SearchFilters) => {
      console.log('🔍 測試篩選條件:', filters);
      const validation = DataValidator.validateSearchFilters(filters);
      if (!validation.valid) {
        console.error('❌ 篩選條件驗證失敗:', validation.errors);
        return;
      }
      console.log('✅ 篩選條件驗證通過');
      
      // 執行實際篩選
      const { searchActivities } = useActivitiesClient();
      console.time('篩選執行時間');
      await searchActivities({ filters });
      console.timeEnd('篩選執行時間');
    };

    console.log('🛠️ 資料驗證工具已載入');
    console.log('可用命令:');
    console.log('- DataValidator.validateActivity(activity)');
    console.log('- DataValidator.validateSearchFilters(filters)');
    console.log('- TestDataGenerator.generateTestActivity()');
    console.log('- TestDataGenerator.generateTestFilters()');
    console.log('- testFilters(filters) - 快速測試篩選條件');
  }
}