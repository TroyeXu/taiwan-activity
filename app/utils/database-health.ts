// 資料庫健康檢查工具
export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  timestamp: Date;
  details?: {
    connectionTime?: number;
    queryTime?: number;
    errorCount?: number;
    lastError?: string;
  };
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private errorCount = 0;
  private lastError: string | null = null;
  private lastCheckTime: Date | null = null;
  private isHealthy = true;

  private constructor() {}

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  recordError(error: Error): void {
    this.errorCount++;
    this.lastError = error.message;

    // 如果短時間內錯誤過多，標記為不健康
    if (this.errorCount > 5) {
      this.isHealthy = false;
    }
  }

  recordSuccess(): void {
    // 成功後重置錯誤計數
    if (this.errorCount > 0) {
      this.errorCount = Math.max(0, this.errorCount - 1);
    }

    if (this.errorCount === 0) {
      this.isHealthy = true;
      this.lastError = null;
    }
  }

  async performHealthCheck(testQuery: () => Promise<any>): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();
    this.lastCheckTime = new Date();

    try {
      // 測試基本查詢
      await testQuery();
      const queryTime = Date.now() - startTime;

      this.recordSuccess();

      return {
        status: this.isHealthy ? 'healthy' : 'degraded',
        message: this.isHealthy ? '資料庫連接正常' : '資料庫狀態恢復中',
        timestamp: new Date(),
        details: {
          queryTime,
          errorCount: this.errorCount,
          lastError: this.lastError || undefined,
        },
      };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.recordError(error as Error);

      return {
        status: 'unhealthy',
        message: `資料庫健康檢查失敗: ${(error as Error).message}`,
        timestamp: new Date(),
        details: {
          queryTime,
          errorCount: this.errorCount,
          lastError: (error as Error).message,
        },
      };
    }
  }

  getStatus(): DatabaseHealthCheck {
    return {
      status: this.isHealthy ? 'healthy' : this.errorCount > 10 ? 'unhealthy' : 'degraded',
      message: this.isHealthy
        ? '資料庫狀態正常'
        : this.errorCount > 10
          ? '資料庫連接異常，請檢查'
          : '資料庫狀態降級，監控中',
      timestamp: this.lastCheckTime || new Date(),
      details: {
        errorCount: this.errorCount,
        lastError: this.lastError || undefined,
      },
    };
  }

  reset(): void {
    this.errorCount = 0;
    this.lastError = null;
    this.isHealthy = true;
  }
}

// 資料庫錯誤分類
export enum DatabaseErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  TIMEOUT = 'TIMEOUT',
  INVALID_DATA = 'INVALID_DATA',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN = 'UNKNOWN',
}

export class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  static fromError(error: Error): DatabaseError {
    // 分析錯誤類型
    const message = error.message.toLowerCase();

    if (message.includes('無法載入資料庫') || message.includes('fetch')) {
      return new DatabaseError(DatabaseErrorType.CONNECTION_FAILED, '資料庫檔案載入失敗', error);
    }

    if (message.includes('syntax') || message.includes('sql')) {
      return new DatabaseError(DatabaseErrorType.QUERY_FAILED, 'SQL 查詢錯誤', error);
    }

    if (message.includes('timeout')) {
      return new DatabaseError(DatabaseErrorType.TIMEOUT, '資料庫操作超時', error);
    }

    if (message.includes('permission') || message.includes('denied')) {
      return new DatabaseError(DatabaseErrorType.PERMISSION_DENIED, '權限不足', error);
    }

    return new DatabaseError(DatabaseErrorType.UNKNOWN, error.message, error);
  }
}

// 重試策略
export interface RetryStrategy {
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
}

export const defaultRetryStrategy: RetryStrategy = {
  maxAttempts: 3,
  delay: 1000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  strategy: RetryStrategy = defaultRetryStrategy
): Promise<T> {
  let lastError: Error | null = null;
  let delay = strategy.delay;

  for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < strategy.maxAttempts) {
        console.warn(`操作失敗 (嘗試 ${attempt}/${strategy.maxAttempts})，${delay}ms 後重試...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= strategy.backoffMultiplier;
      }
    }
  }

  throw lastError;
}
