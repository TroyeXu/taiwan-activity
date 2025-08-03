// 簡單的內建排程器，不依賴外部套件

interface ScheduledJob {
  name: string;
  pattern: string;
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

interface JobStatus {
  name: string;
  running: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: 'success' | 'error';
  lastError?: string;
}

export class SimpleScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private jobStatus: Map<string, JobStatus> = new Map();

  constructor() {
    this.setupDefaultJobs();
  }

  private setupDefaultJobs() {
    // 每日凌晨 2 點執行完整爬取 (簡化為每小時檢查)
    this.addJob('daily-crawl', '0 */4 * * *', async () => {
      await this.runDailyCrawl();
    });

    // 每小時增量更新
    this.addJob('hourly-update', '0 * * * *', async () => {
      await this.runIncrementalUpdate();
    });

    // 每 4 小時批次驗證
    this.addJob('batch-validation', '0 */4 * * *', async () => {
      await this.runBatchValidation();
    });
  }

  addJob(name: string, pattern: string, handler: () => Promise<void>) {
    const job: ScheduledJob = {
      name,
      pattern,
      handler,
      enabled: true,
    };

    this.jobs.set(name, job);
    this.jobStatus.set(name, {
      name,
      running: false,
    });

    // 簡化的排程：轉換 cron 模式為間隔時間
    const intervalMs = this.cronToInterval(pattern);
    if (intervalMs > 0) {
      const interval = setInterval(async () => {
        await this.executeJob(name);
      }, intervalMs);

      this.intervals.set(name, interval);
    }
  }

  private cronToInterval(pattern: string): number {
    // 簡化的 cron 轉換，只支援基本模式
    const parts = pattern.split(' ');

    // 每小時: 0 * * * *
    if (parts[0] === '0' && parts[1] === '*') {
      return 60 * 60 * 1000; // 1 小時
    }

    // 每 4 小時: 0 */4 * * *
    if (parts[0] === '0' && parts[1] === '*/4') {
      return 4 * 60 * 60 * 1000; // 4 小時
    }

    // 每 6 小時: 0 */6 * * *
    if (parts[0] === '0' && parts[1] === '*/6') {
      return 6 * 60 * 60 * 1000; // 6 小時
    }

    // 預設每小時
    return 60 * 60 * 1000;
  }

  private async executeJob(jobName: string) {
    const job = this.jobs.get(jobName);
    const status = this.jobStatus.get(jobName);

    if (!job || !status || !job.enabled || status.running) {
      return;
    }

    console.log(`🕐 執行排程任務: ${jobName}`);

    status.running = true;
    status.lastRun = new Date();

    try {
      await job.handler();
      status.lastResult = 'success';
      console.log(`✅ 排程任務完成: ${jobName}`);
    } catch (error) {
      status.lastResult = 'error';
      status.lastError = (error as Error).message;
      console.error(`❌ 排程任務失敗: ${jobName}`, error);
    } finally {
      status.running = false;
    }
  }

  async runDailyCrawl() {
    try {
      console.log('🕐 開始每日爬取任務...');

      // 觸發爬蟲 API
      const response = await $fetch('/api/crawler/trigger', {
        method: 'POST',
        body: {
          spider: 'tourism_bureau',
          args: { max_pages: 5 },
          async: true,
        },
      });

      console.log('✅ 每日爬取任務觸發成功:', response);
    } catch (error) {
      console.error('❌ 每日爬取任務失敗:', error);
      throw error;
    }
  }

  async runIncrementalUpdate() {
    try {
      console.log('🕐 開始增量更新任務...');

      // 觸發小量爬取
      const response = await $fetch('/api/crawler/trigger', {
        method: 'POST',
        body: {
          spider: 'tourism_bureau',
          args: { max_pages: 2, incremental: true },
          async: true,
        },
      });

      console.log('✅ 增量更新任務完成:', response);
    } catch (error) {
      console.error('❌ 增量更新任務失敗:', error);
      throw error;
    }
  }

  async runBatchValidation() {
    try {
      console.log('🕐 開始批次驗證任務...');

      const response = await $fetch('/api/validation/batch', {
        method: 'POST',
        body: {
          source: 'scheduler',
          batchSize: 50,
          autoProcess: true,
        },
      });

      console.log('✅ 批次驗證任務完成:', response);
    } catch (error) {
      console.error('❌ 批次驗證任務失敗:', error);
      throw error;
    }
  }

  start() {
    console.log('🚀 啟動簡單排程器');
    // 排程已在 addJob 中啟動
  }

  stop() {
    console.log('⏹️ 停止簡單排程器');
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`⏸️ 停止排程: ${name}`);
    });
    this.intervals.clear();
  }

  getStatus() {
    const status: Record<string, any> = {};
    this.jobStatus.forEach((jobStatus, name) => {
      status[name] = {
        ...jobStatus,
        nextRun: this.calculateNextRun(name),
      };
    });
    return status;
  }

  private calculateNextRun(jobName: string): Date | null {
    const status = this.jobStatus.get(jobName);
    if (!status || !status.lastRun) {
      return new Date(Date.now() + 60 * 60 * 1000); // 1 小時後
    }

    // 簡化：基於最後執行時間 + 間隔
    const interval = this.cronToInterval(this.jobs.get(jobName)?.pattern || '0 * * * *');
    return new Date(status.lastRun.getTime() + interval);
  }

  async triggerJob(jobName: string) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`未知的任務: ${jobName}`);
    }

    console.log(`🚀 手動觸發任務: ${jobName}`);
    await this.executeJob(jobName);
  }

  enableJob(jobName: string) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.enabled = true;
      console.log(`✅ 啟用任務: ${jobName}`);
    }
  }

  disableJob(jobName: string) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.enabled = false;
      console.log(`⏸️ 禁用任務: ${jobName}`);
    }
  }
}

// 全域排程器實例
export const scheduler = new SimpleScheduler();

// 在 Nuxt 伺服器啟動時自動啟動
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  scheduler.start();

  // 優雅關閉
  process.on('SIGINT', () => {
    console.log('正在關閉排程器...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('正在關閉排程器...');
    scheduler.stop();
    process.exit(0);
  });
}
