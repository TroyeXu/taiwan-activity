/**
 * SQLite 效能監控工具
 * 用於監控資料庫在 GitHub Pages 環境的效能表現
 */

interface PerformanceMetrics {
  databaseSize: number;
  loadTime: number;
  queryTimes: { query: string; time: number }[];
  memoryUsage: number;
  cacheHitRate: number;
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics = {
    databaseSize: 0,
    loadTime: 0,
    queryTimes: [],
    memoryUsage: 0,
    cacheHitRate: 0
  };

  private static queryCache = new Map<string, { result: any; timestamp: number }>();
  private static cacheHits = 0;
  private static cacheMisses = 0;

  /**
   * 監控資料庫載入
   */
  static async monitorDatabaseLoad() {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    try {
      // 取得資料庫檔案大小
      const response = await fetch('/tourism.sqlite', { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        this.metrics.databaseSize = parseInt(contentLength);
      }

      // 執行實際載入
      const { initDatabase } = useSqlite();
      await initDatabase();

      // 記錄載入時間
      this.metrics.loadTime = performance.now() - startTime;
      
      // 記錄記憶體使用
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      this.metrics.memoryUsage = endMemory - startMemory;

      console.log('📊 資料庫載入效能:');
      console.log(`- 檔案大小: ${(this.metrics.databaseSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- 載入時間: ${this.metrics.loadTime.toFixed(2)} ms`);
      console.log(`- 記憶體使用: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`);

      return this.metrics;
    } catch (error) {
      console.error('資料庫載入失敗:', error);
      throw error;
    }
  }

  /**
   * 監控查詢效能
   */
  static async monitorQuery(sql: string, params: any[] = []) {
    const startTime = performance.now();
    const cacheKey = `${sql}-${JSON.stringify(params)}`;

    try {
      // 檢查快取
      const cached = this.queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 60000) { // 1分鐘快取
        this.cacheHits++;
        console.log('🚀 快取命中:', sql.substring(0, 50) + '...');
        return cached.result;
      }

      this.cacheMisses++;

      // 執行查詢
      const { query } = useSqlite();
      const result = await query(sql, params);

      // 記錄查詢時間
      const queryTime = performance.now() - startTime;
      this.metrics.queryTimes.push({
        query: sql.substring(0, 100),
        time: queryTime
      });

      // 更新快取
      this.queryCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      // 限制查詢記錄數量
      if (this.metrics.queryTimes.length > 100) {
        this.metrics.queryTimes = this.metrics.queryTimes.slice(-50);
      }

      console.log(`⏱️ 查詢時間: ${queryTime.toFixed(2)}ms - ${sql.substring(0, 50)}...`);

      return result;
    } catch (error) {
      console.error('查詢失敗:', error);
      throw error;
    }
  }

  /**
   * 取得效能報告
   */
  static getPerformanceReport() {
    const totalQueries = this.metrics.queryTimes.length;
    const avgQueryTime = totalQueries > 0
      ? this.metrics.queryTimes.reduce((sum, q) => sum + q.time, 0) / totalQueries
      : 0;

    const slowQueries = this.metrics.queryTimes
      .filter(q => q.time > 100)
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    this.metrics.cacheHitRate = this.cacheHits + this.cacheMisses > 0
      ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
      : 0;

    const report = {
      資料庫資訊: {
        檔案大小: `${(this.metrics.databaseSize / 1024).toFixed(2)} KB`,
        載入時間: `${this.metrics.loadTime.toFixed(2)} ms`,
        記憶體使用: `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`
      },
      查詢效能: {
        總查詢數: totalQueries,
        平均查詢時間: `${avgQueryTime.toFixed(2)} ms`,
        快取命中率: `${this.metrics.cacheHitRate.toFixed(2)}%`
      },
      慢查詢TOP5: slowQueries.map(q => ({
        查詢: q.query,
        時間: `${q.time.toFixed(2)} ms`
      }))
    };

    console.log('\n📊 效能報告');
    console.log('============');
    Object.entries(report).forEach(([section, data]) => {
      console.log(`\n${section}:`);
      console.table(data);
    });

    return report;
  }

  /**
   * 優化建議
   */
  static getOptimizationSuggestions() {
    const suggestions = [];

    // 檔案大小建議
    if (this.metrics.databaseSize > 1024 * 1024) { // > 1MB
      suggestions.push({
        問題: '資料庫檔案過大',
        建議: '考慮移除不必要的資料或使用 VACUUM 壓縮',
        影響: '高'
      });
    }

    // 載入時間建議
    if (this.metrics.loadTime > 3000) { // > 3秒
      suggestions.push({
        問題: '載入時間過長',
        建議: '考慮實作漸進式載入或使用 Service Worker 快取',
        影響: '高'
      });
    }

    // 查詢效能建議
    const slowQueries = this.metrics.queryTimes.filter(q => q.time > 100);
    if (slowQueries.length > 0) {
      suggestions.push({
        問題: `發現 ${slowQueries.length} 個慢查詢`,
        建議: '檢查是否需要建立索引或優化查詢語句',
        影響: '中'
      });
    }

    // 快取建議
    if (this.metrics.cacheHitRate < 50 && this.cacheHits + this.cacheMisses > 10) {
      suggestions.push({
        問題: '快取命中率偏低',
        建議: '考慮增加快取時間或預載入常用資料',
        影響: '低'
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        問題: '無',
        建議: '效能表現良好',
        影響: '-'
      });
    }

    console.log('\n💡 優化建議');
    console.table(suggestions);

    return suggestions;
  }

  /**
   * 測試多表格 JOIN 效能
   */
  static async testJoinPerformance() {
    console.log('\n🧪 測試多表格 JOIN 效能...');

    const testQueries = [
      {
        name: '簡單查詢（單表）',
        sql: 'SELECT * FROM activities LIMIT 10'
      },
      {
        name: '單一 JOIN',
        sql: `SELECT a.*, l.city 
              FROM activities a 
              LEFT JOIN locations l ON a.id = l.activity_id 
              LIMIT 10`
      },
      {
        name: '多重 JOIN',
        sql: `SELECT a.*, l.city, GROUP_CONCAT(c.name) as categories
              FROM activities a
              LEFT JOIN locations l ON a.id = l.activity_id
              LEFT JOIN activity_categories ac ON a.id = ac.activity_id
              LEFT JOIN categories c ON ac.category_id = c.id
              GROUP BY a.id
              LIMIT 10`
      },
      {
        name: '複雜查詢（含篩選）',
        sql: `SELECT DISTINCT a.*, l.city
              FROM activities a
              LEFT JOIN locations l ON a.id = l.activity_id
              LEFT JOIN activity_categories ac ON a.id = ac.activity_id
              LEFT JOIN categories c ON ac.category_id = c.id
              WHERE l.city = '台北市' 
              AND c.slug = 'music'
              LIMIT 10`
      }
    ];

    const results = [];

    for (const test of testQueries) {
      const startTime = performance.now();
      
      try {
        await this.monitorQuery(test.sql);
        const endTime = performance.now();
        
        results.push({
          測試項目: test.name,
          執行時間: `${(endTime - startTime).toFixed(2)} ms`,
          狀態: '✅ 成功'
        });
      } catch (error) {
        results.push({
          測試項目: test.name,
          執行時間: '-',
          狀態: '❌ 失敗'
        });
      }
    }

    console.table(results);
    return results;
  }

  /**
   * 清除快取
   */
  static clearCache() {
    this.queryCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('✅ 查詢快取已清除');
  }

  /**
   * 重置所有指標
   */
  static reset() {
    this.metrics = {
      databaseSize: 0,
      loadTime: 0,
      queryTimes: [],
      memoryUsage: 0,
      cacheHitRate: 0
    };
    this.clearCache();
    console.log('✅ 效能指標已重置');
  }
}

/**
 * 設定效能監控
 */
export function setupPerformanceMonitor() {
  if (typeof window !== 'undefined') {
    (window as any).PerformanceMonitor = PerformanceMonitor;
    
    // 快捷命令
    (window as any).perfReport = () => PerformanceMonitor.getPerformanceReport();
    (window as any).perfSuggestions = () => PerformanceMonitor.getOptimizationSuggestions();
    (window as any).testJoinPerf = () => PerformanceMonitor.testJoinPerformance();
    (window as any).clearPerfCache = () => PerformanceMonitor.clearCache();
    
    console.log('📊 效能監控工具已載入');
    console.log('可用命令:');
    console.log('- perfReport() - 查看效能報告');
    console.log('- perfSuggestions() - 取得優化建議');
    console.log('- testJoinPerf() - 測試 JOIN 效能');
    console.log('- clearPerfCache() - 清除查詢快取');
  }
}