import { db } from '~/db';
import { sql } from 'drizzle-orm';

interface QueryPerformance {
  id: string;
  queryType: string;
  executionTimeMs: number;
  parameters?: any;
  executedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

interface DatabaseStats {
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    sizeKB: number;
  }>;
  indexStats: Array<{
    tableName: string;
    indexName: string;
    isUsed: boolean;
    lastUsed?: Date;
  }>;
  performance: {
    slowQueries: QueryPerformance[];
    averageQueryTime: number;
    queryCount: number;
  };
}

export class DatabaseOptimizationService {
  private slowQueryThreshold = 1000; // 1 秒

  constructor(options: { slowQueryThreshold?: number } = {}) {
    this.slowQueryThreshold = options.slowQueryThreshold || 1000;
  }

  /**
   * 記錄查詢效能
   */
  async logQueryPerformance(
    queryType: string,
    executionTime: number,
    parameters?: any,
    userAgent?: string,
    ipAddress?: string
  ) {
    try {
      // 只記錄慢查詢或取樣記錄
      if (executionTime > this.slowQueryThreshold || Math.random() < 0.01) {
        await db.run(sql`
          INSERT INTO query_performance (
            id, query_type, execution_time_ms, parameters, 
            executed_at, user_agent, ip_address
          ) VALUES (
            ${this.generateId()}, ${queryType}, ${executionTime}, 
            ${parameters ? JSON.stringify(parameters) : null},
            ${Date.now()}, ${userAgent || null}, ${ipAddress || null}
          )
        `);
      }
    } catch (error) {
      console.warn('Failed to log query performance:', error);
    }
  }

  /**
   * 獲取資料庫統計資訊
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      // 獲取表格統計
      const tableStats = await this.getTableStats();
      
      // 獲取索引統計  
      const indexStats = await this.getIndexStats();
      
      // 獲取效能統計
      const performance = await this.getPerformanceStats();

      return {
        tableStats,
        indexStats,
        performance
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * 執行資料庫最佳化
   */
  async optimizeDatabase(): Promise<{
    vacuum: boolean;
    analyze: boolean;
    reindex: boolean;
    cleanupOldLogs: number;
  }> {
    const results = {
      vacuum: false,
      analyze: false,
      reindex: false,
      cleanupOldLogs: 0
    };

    try {
      // 1. 清理舊的查詢效能記錄 (保留 30 天)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const cleanupResult = await db.run(sql`
        DELETE FROM query_performance 
        WHERE executed_at < ${thirtyDaysAgo}
      `);
      results.cleanupOldLogs = cleanupResult.changes || 0;

      // 2. 分析表格統計以優化查詢計劃
      await db.run(sql`ANALYZE`);
      results.analyze = true;

      // 3. 重建索引 (如果需要)
      await this.reindexIfNeeded();
      results.reindex = true;

      // 4. 執行 VACUUM 來回收空間 (謹慎使用，會鎖定資料庫)
      const stats = await this.getTableStats();
      const totalSize = stats.reduce((sum, table) => sum + table.sizeKB, 0);
      
      // 只有當資料庫大於 100MB 且有明顯碎片時才執行 VACUUM
      if (totalSize > 100 * 1024) {
        await db.run(sql`VACUUM`);
        results.vacuum = true;
      }

      console.log('Database optimization completed:', results);
      return results;

    } catch (error) {
      console.error('Database optimization failed:', error);
      throw error;
    }
  }

  /**
   * 獲取慢查詢報告
   */
  async getSlowQueryReport(limit = 50): Promise<QueryPerformance[]> {
    try {
      const result = await db.all(sql`
        SELECT 
          id, query_type, execution_time_ms, parameters,
          executed_at, user_agent, ip_address
        FROM query_performance 
        WHERE execution_time_ms > ${this.slowQueryThreshold}
        ORDER BY execution_time_ms DESC 
        LIMIT ${limit}
      `);

      return result.map((row: any) => ({
        id: row.id as string,
        queryType: row.query_type as string,
        executionTimeMs: row.execution_time_ms as number,
        parameters: row.parameters ? JSON.parse(row.parameters as string) : null,
        executedAt: new Date(row.executed_at as number),
        userAgent: row.user_agent as string,
        ipAddress: row.ip_address as string
      }));
    } catch (error) {
      console.error('Failed to get slow query report:', error);
      return [];
    }
  }

  /**
   * 建議查詢最佳化
   */
  async getOptimizationSuggestions(): Promise<Array<{
    type: 'index' | 'query' | 'schema';
    priority: 'high' | 'medium' | 'low';
    description: string;
    solution: string;
  }>> {
    const suggestions = [];

    try {
      // 分析慢查詢模式
      const slowQueries = await this.getSlowQueryReport(20);
      const queryTypeStats = this.analyzeQueryTypes(slowQueries);

      // 檢查缺失的索引
      for (const [queryType, stats] of Object.entries(queryTypeStats)) {
        if (stats.count > 10 && stats.avgTime > 2000) {
          suggestions.push({
            type: 'index' as const,
            priority: 'high' as const,
            description: `${queryType} 查詢頻繁且緩慢 (${stats.count} 次, 平均 ${stats.avgTime}ms)`,
            solution: '考慮添加相關索引或優化查詢邏輯'
          });
        }
      }

      // 檢查表格大小
      const tableStats = await this.getTableStats();
      for (const table of tableStats) {
        if (table.rowCount > 100000 && table.sizeKB > 50 * 1024) {
          suggestions.push({
            type: 'schema' as const,
            priority: 'medium' as const,
            description: `表格 ${table.tableName} 過大 (${table.rowCount} 行, ${table.sizeKB}KB)`,
            solution: '考慮資料分割、歸檔舊資料或優化資料結構'
          });
        }
      }

      // 檢查空間索引使用情況
      const spatialQueries = slowQueries.filter(q => 
        q.queryType.includes('spatial') || q.queryType.includes('nearby')
      );
      if (spatialQueries.length > 5) {
        suggestions.push({
          type: 'index' as const,
          priority: 'high' as const,
          description: `地理空間查詢效能不佳 (${spatialQueries.length} 個慢查詢)`,
          solution: '確保 SpatiaLite 空間索引已正確建立並使用'
        });
      }

      return suggestions;

    } catch (error) {
      console.error('Failed to generate optimization suggestions:', error);
      return [];
    }
  }

  /**
   * 執行空間索引最佳化
   */
  async optimizeSpatialIndexes(): Promise<boolean> {
    try {
      // 檢查 SpatiaLite 是否可用
      const spatialiteCheck = await db.get(sql`
        SELECT load_extension('mod_spatialite')
      `);

      // 重建空間索引
      await db.run(sql`
        SELECT DisableSpatialIndex('locations', 'geom')
      `);
      
      await db.run(sql`
        SELECT CreateSpatialIndex('locations', 'geom')
      `);

      console.log('Spatial indexes optimized successfully');
      return true;

    } catch (error) {
      console.error('Failed to optimize spatial indexes:', error);
      return false;
    }
  }

  /**
   * 獲取快取統計
   */
  async getCacheStats(): Promise<{
    hitRate: number;
    totalQueries: number;
    cacheSize: number;
  }> {
    try {
      // SQLite 快取統計
      const pragmaResult = await db.get(sql`PRAGMA cache_size`);
      const cacheSize = (pragmaResult as any)?.cache_size as number || 0;

      // 從查詢記錄分析快取命中率
      const recentQueries = await db.all(sql`
        SELECT query_type, COUNT(*) as count, AVG(execution_time_ms) as avg_time
        FROM query_performance 
        WHERE executed_at > ${Date.now() - 3600000}
        GROUP BY query_type
      `);

      const totalQueries: number = recentQueries.reduce(
        (sum: number, row: any) => sum + (row.count as number), 0
      );

      // 簡化的快取命中率計算 (基於查詢時間)
      const fastQueries: number = recentQueries.filter(
        (row: any) => (row.avg_time as number) < 100
      ).reduce((sum: number, row: any) => sum + (row.count as number), 0);

      const hitRate = totalQueries > 0 ? fastQueries / totalQueries : 0;

      return {
        hitRate,
        totalQueries,
        cacheSize
      };

    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { hitRate: 0, totalQueries: 0, cacheSize: 0 };
    }
  }

  // 私有方法

  private async getTableStats() {
    const tables = [
      'activities', 'locations', 'categories', 'activity_categories',
      'activity_times', 'data_sources', 'validation_logs', 'users',
      'user_favorites', 'search_logs', 'tags', 'activity_tags'
    ];

    const stats = [];
    for (const table of tables) {
      try {
        const countResult = await db.get(sql`
          SELECT COUNT(*) as count FROM ${sql.identifier(table)}
        `);
        
        const sizeResult = await db.get(sql`
          SELECT page_count * page_size as size 
          FROM pragma_page_count('${sql.identifier(table)}'), pragma_page_size
        `);

        stats.push({
          tableName: table,
          rowCount: (countResult as any)?.count as number || 0,
          sizeKB: Math.round(((sizeResult as any)?.size as number || 0) / 1024)
        });
      } catch (error) {
        console.warn(`Failed to get stats for table ${table}:`, error);
      }
    }

    return stats;
  }

  private async getIndexStats() {
    try {
      const result = await db.all(sql`
        SELECT name, tbl_name, sql 
        FROM sqlite_master 
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
      `);

      return result.map((row: any) => ({
        tableName: row.tbl_name as string,
        indexName: row.name as string,
        isUsed: true, // SQLite 沒有直接的索引使用統計
        lastUsed: undefined
      }));
    } catch (error) {
      console.error('Failed to get index stats:', error);
      return [];
    }
  }

  private async getPerformanceStats() {
    try {
      const result = await db.all(sql`
        SELECT 
          COUNT(*) as query_count,
          AVG(execution_time_ms) as avg_time,
          MAX(execution_time_ms) as max_time
        FROM query_performance 
        WHERE executed_at > ${Date.now() - 86400000}
      `);

      const slowQueries = await this.getSlowQueryReport(10);

      return {
        slowQueries,
        averageQueryTime: Math.round((result as any)[0]?.avg_time as number || 0),
        queryCount: (result as any)[0]?.query_count as number || 0
      };
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      return {
        slowQueries: [],
        averageQueryTime: 0,
        queryCount: 0
      };
    }
  }

  private analyzeQueryTypes(queries: QueryPerformance[]) {
    const stats: Record<string, { count: number; avgTime: number; totalTime: number }> = {};

    for (const query of queries) {
      if (!stats[query.queryType]) {
        stats[query.queryType] = { count: 0, avgTime: 0, totalTime: 0 };
      }
      
      stats[query.queryType].count++;
      stats[query.queryType].totalTime += query.executionTimeMs;
    }

    // 計算平均時間
    for (const queryType in stats) {
      stats[queryType].avgTime = Math.round(
        stats[queryType].totalTime / stats[queryType].count
      );
    }

    return stats;
  }

  private async reindexIfNeeded() {
    try {
      // 檢查是否需要重建索引 (簡化版本)
      await db.run(sql`REINDEX`);
    } catch (error) {
      console.warn('Reindex operation failed:', error);
    }
  }

  private generateId(): string {
    return 'perf_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// 查詢效能監控裝飾器
export function monitorQuery(queryType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const optimizer = new DatabaseOptimizationService();

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const executionTime = Date.now() - startTime;
        
        // 異步記錄效能，不影響查詢回應時間
        optimizer.logQueryPerformance(queryType, executionTime, args).catch(
          error => console.warn('Failed to log query performance:', error)
        );
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        optimizer.logQueryPerformance(
          `${queryType}_error`, executionTime, { args, error: (error as Error).message }
        ).catch(err => console.warn('Failed to log error performance:', err));
        
        throw error;
      }
    };

    return descriptor;
  };
}