import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
  requestId?: string;
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO;
  private logDir = './logs';
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private maxLogFiles = 5;

  constructor() {
    // 確保日誌目錄存在
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    // 設定日誌級別
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && envLogLevel in LogLevel) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, data, source, userId, requestId } = entry;

    const parts = [
      `[${timestamp}]`,
      `[${level}]`,
      source ? `[${source}]` : '',
      userId ? `[User:${userId}]` : '',
      requestId ? `[Req:${requestId}]` : '',
      message,
    ].filter(Boolean);

    let logLine = parts.join(' ');

    if (data) {
      logLine += ` | Data: ${JSON.stringify(data)}`;
    }

    return logLine;
  }

  private writeToFile(entry: LogEntry, filename: string): void {
    try {
      const logPath = join(this.logDir, filename);
      const logLine = this.formatLogEntry(entry) + '\n';

      appendFileSync(logPath, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private getLogFilename(level: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `${level.toLowerCase()}-${date}.log`;
  }

  debug(
    message: string,
    data?: any,
    context?: { source?: string; userId?: string; requestId?: string }
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      data,
      ...context,
    };

    console.debug(`🐛 ${this.formatLogEntry(entry)}`);
    this.writeToFile(entry, this.getLogFilename('debug'));
  }

  info(
    message: string,
    data?: any,
    context?: { source?: string; userId?: string; requestId?: string }
  ): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data,
      ...context,
    };

    console.info(`ℹ️ ${this.formatLogEntry(entry)}`);
    this.writeToFile(entry, this.getLogFilename('info'));
  }

  warn(
    message: string,
    data?: any,
    context?: { source?: string; userId?: string; requestId?: string }
  ): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data,
      ...context,
    };

    console.warn(`⚠️ ${this.formatLogEntry(entry)}`);
    this.writeToFile(entry, this.getLogFilename('warn'));
  }

  error(
    message: string,
    error?: Error | any,
    context?: { source?: string; userId?: string; requestId?: string }
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      data:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      ...context,
    };

    console.error(`❌ ${this.formatLogEntry(entry)}`);
    this.writeToFile(entry, this.getLogFilename('error'));
  }

  // API 請求日誌
  apiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: { userId?: string; requestId?: string; userAgent?: string; ip?: string }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `${method} ${url} ${statusCode} ${duration}ms`,
      data: {
        method,
        url,
        statusCode,
        duration,
        userAgent: context?.userAgent,
        ip: context?.ip,
      },
      source: 'API',
      ...context,
    };

    if (statusCode >= 400) {
      console.warn(`⚠️ ${this.formatLogEntry(entry)}`);
      this.writeToFile(entry, this.getLogFilename('api-error'));
    } else {
      console.info(`📡 ${this.formatLogEntry(entry)}`);
      this.writeToFile(entry, this.getLogFilename('api'));
    }
  }

  // 資料庫查詢日誌
  dbQuery(query: string, duration: number, params?: any, context?: { source?: string }): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: duration > 1000 ? 'WARN' : 'DEBUG',
      message: `DB Query: ${duration}ms`,
      data: {
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration,
        params,
      },
      source: 'DATABASE',
      ...context,
    };

    if (duration > 1000) {
      console.warn(`🐌 ${this.formatLogEntry(entry)}`);
      this.writeToFile(entry, this.getLogFilename('slow-query'));
    } else if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`💾 ${this.formatLogEntry(entry)}`);
      this.writeToFile(entry, this.getLogFilename('database'));
    }
  }

  // 爬蟲活動日誌
  crawlerActivity(spider: string, action: string, data?: any, context?: { source?: string }): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `Crawler ${spider}: ${action}`,
      data,
      source: 'CRAWLER',
      ...context,
    };

    console.info(`🕷️ ${this.formatLogEntry(entry)}`);
    this.writeToFile(entry, this.getLogFilename('crawler'));
  }

  // 驗證活動日誌
  validationActivity(
    activityId: string,
    result: 'passed' | 'failed',
    score?: number,
    issues?: any[],
    context?: { source?: string }
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: result === 'failed' ? 'WARN' : 'INFO',
      message: `Validation ${result} for activity ${activityId}`,
      data: {
        activityId,
        result,
        score,
        issueCount: issues?.length || 0,
        issues: issues?.slice(0, 3), // 只記錄前3個問題
      },
      source: 'VALIDATION',
      ...context,
    };

    const emoji = result === 'passed' ? '✅' : '❌';
    console.info(`${emoji} ${this.formatLogEntry(entry)}`);
    this.writeToFile(entry, this.getLogFilename('validation'));
  }

  // 效能監控日誌
  performance(
    operation: string,
    duration: number,
    data?: any,
    context?: { source?: string }
  ): void {
    const level = duration > 5000 ? 'WARN' : duration > 1000 ? 'INFO' : 'DEBUG';

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message: `Performance: ${operation} took ${duration}ms`,
      data: {
        operation,
        duration,
        ...data,
      },
      source: 'PERFORMANCE',
      ...context,
    };

    const emoji = duration > 5000 ? '🐌' : duration > 1000 ? '⏱️' : '⚡';

    if (level === 'WARN') {
      console.warn(`${emoji} ${this.formatLogEntry(entry)}`);
      this.writeToFile(entry, this.getLogFilename('performance'));
    } else if (level === 'INFO') {
      console.info(`${emoji} ${this.formatLogEntry(entry)}`);
      this.writeToFile(entry, this.getLogFilename('performance'));
    } else if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`${emoji} ${this.formatLogEntry(entry)}`);
    }
  }

  // 清理舊日誌檔案
  cleanup(): void {
    try {
      // 這裡可以實作日誌檔案輪轉邏輯
      // 簡化版本：只記錄清理動作
      this.info('Log cleanup initiated', { logDir: this.logDir }, { source: 'SYSTEM' });
    } catch (error) {
      this.error('Log cleanup failed', error, { source: 'SYSTEM' });
    }
  }
}

// 全域日誌實例
export const logger = new Logger();

// 日誌中間件輔助函數
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

// 效能監控裝飾器
export function logPerformance(operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        logger.performance(operationName, duration);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.performance(operationName, duration, { error: true });
        logger.error(`${operationName} failed`, error);

        throw error;
      }
    };

    return descriptor;
  };
}
