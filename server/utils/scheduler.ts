import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface SchedulerConfig {
  enableCrawling: boolean;
  enableValidation: boolean;
  enableCleanup: boolean;
  validationBatchSize: number;
  crawlerTimeout: number;
}

interface JobStatus {
  name: string;
  running: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: 'success' | 'error';
  lastError?: string;
}

export class CrawlerScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobStatus: Map<string, JobStatus> = new Map();
  private config: SchedulerConfig;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      enableCrawling: true,
      enableValidation: true,
      enableCleanup: true,
      validationBatchSize: 100,
      crawlerTimeout: 30 * 60 * 1000, // 30 分鐘
      ...config
    };

    this.setupSchedules();
  }

  private setupSchedules() {
    // 每日凌晨 2 點執行完整爬取
    if (this.config.enableCrawling) {
      const dailyCrawl = cron.schedule('0 2 * * *', async () => {
        await this.runDailyCrawl();
      }, { scheduled: false });
      
      this.jobs.set('daily-crawl', dailyCrawl);
      this.initJobStatus('daily-crawl', '每日完整爬取');
    }

    // 每週一深度爬取和清理
    if (this.config.enableCrawling) {
      const weeklyCrawl = cron.schedule('0 1 * * 1', async () => {
        await this.runWeeklyCrawl();
      }, { scheduled: false });
      
      this.jobs.set('weekly-crawl', weeklyCrawl);
      this.initJobStatus('weekly-crawl', '每週深度爬取');
    }

    // 每小時增量爬取
    if (this.config.enableCrawling) {
      const hourlyCrawl = cron.schedule('0 * * * *', async () => {
        await this.runIncrementalCrawl();
      }, { scheduled: false });
      
      this.jobs.set('hourly-crawl', hourlyCrawl);
      this.initJobStatus('hourly-crawl', '每小時增量爬取');
    }

    // 每 4 小時批次驗證
    if (this.config.enableValidation) {
      const batchValidation = cron.schedule('0 */4 * * *', async () => {
        await this.runBatchValidation();
      }, { scheduled: false });
      
      this.jobs.set('batch-validation', batchValidation);
      this.initJobStatus('batch-validation', '批次資料驗證');
    }

    // 每日凌晨 4 點清理過期資料
    if (this.config.enableCleanup) {
      const dailyCleanup = cron.schedule('0 4 * * *', async () => {
        await this.runDailyCleanup();
      }, { scheduled: false });
      
      this.jobs.set('daily-cleanup', dailyCleanup);
      this.initJobStatus('daily-cleanup', '每日資料清理');
    }
  }

  private initJobStatus(jobName: string, displayName: string) {
    this.jobStatus.set(jobName, {
      name: displayName,
      running: false,
      lastResult: undefined
    });
  }

  private updateJobStatus(
    jobName: string, 
    updates: Partial<JobStatus>
  ) {
    const current = this.jobStatus.get(jobName);
    if (current) {
      this.jobStatus.set(jobName, { ...current, ...updates });
    }
  }

  async runDailyCrawl() {
    const jobName = 'daily-crawl';
    
    try {
      this.updateJobStatus(jobName, { 
        running: true, 
        lastRun: new Date() 
      });

      console.log('🕐 開始每日完整爬取...');

      // 執行所有爬蟲
      const crawlers = [
        'tourism_bureau',
        'local_government', 
        'event_platforms',
        'cultural_centers'
      ];

      const results = [];
      
      for (const crawler of crawlers) {
        try {
          console.log(`📡 執行爬蟲: ${crawler}`);
          
          const result = await this.executeCrawler(crawler);
          results.push({ crawler, success: true, ...result });
          
          // 間隔 2 分鐘避免過載
          await this.sleep(120000);
          
        } catch (error) {
          console.error(`❌ 爬蟲 ${crawler} 執行失敗:`, error);
          results.push({ 
            crawler, 
            success: false, 
            error: error.message 
          });
        }
      }

      // 觸發資料驗證
      await this.triggerValidation('daily-crawl');
      
      // 更新搜尋索引
      await this.updateSearchIndex();

      console.log('✅ 每日爬取完成', { results });
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'success' 
      });

    } catch (error) {
      console.error('❌ 每日爬取失敗:', error);
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'error',
        lastError: error.message 
      });
      
      await this.sendAlert('每日爬取失敗', {
        job: jobName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runWeeklyCrawl() {
    const jobName = 'weekly-crawl';
    
    try {
      this.updateJobStatus(jobName, { 
        running: true, 
        lastRun: new Date() 
      });

      console.log('🕐 開始每週深度爬取...');

      // 深度爬取包含歷史資料和特殊源
      await this.executeCrawler('deep_historical', { depth: 'full' });
      await this.executeCrawler('special_events', { lookAhead: 90 });
      
      // 執行資料品質檢查
      await this.runDataQualityCheck();
      
      // 清理重複資料
      await this.deduplicateActivities();

      console.log('✅ 每週深度爬取完成');
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'success' 
      });

    } catch (error) {
      console.error('❌ 每週深度爬取失敗:', error);
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'error',
        lastError: error.message 
      });
    }
  }

  async runIncrementalCrawl() {
    const jobName = 'hourly-crawl';
    
    try {
      this.updateJobStatus(jobName, { 
        running: true, 
        lastRun: new Date() 
      });

      console.log('🕐 開始增量爬取...');

      // 只爬取最新更新的資料
      const result = await this.executeCrawler('incremental', { 
        since: new Date(Date.now() - 3600000) // 過去 1 小時
      });

      if (result.newActivities > 0) {
        // 觸發即時驗證
        await this.triggerValidation('incremental', { 
          batchSize: 20 
        });
      }

      console.log('✅ 增量爬取完成', result);
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'success' 
      });

    } catch (error) {
      console.error('❌ 增量爬取失敗:', error);
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'error',
        lastError: error.message 
      });
    }
  }

  async runBatchValidation() {
    const jobName = 'batch-validation';
    
    try {
      this.updateJobStatus(jobName, { 
        running: true, 
        lastRun: new Date() 
      });

      console.log('🕐 開始批次驗證...');

      const response = await $fetch('/api/validation/batch', {
        method: 'POST',
        body: {
          source: 'scheduler',
          batchSize: this.config.validationBatchSize,
          autoProcess: true,
          qualityThreshold: 60
        }
      });

      console.log('✅ 批次驗證完成:', response.data.summary);
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'success' 
      });

    } catch (error) {
      console.error('❌ 批次驗證失敗:', error);
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'error',
        lastError: error.message 
      });
    }
  }

  async runDailyCleanup() {
    const jobName = 'daily-cleanup';
    
    try {
      this.updateJobStatus(jobName, { 
        running: true, 
        lastRun: new Date() 
      });

      console.log('🕐 開始每日清理...');

      // 清理過期活動
      await this.cleanupExpiredActivities();
      
      // 清理舊驗證記錄
      await this.cleanupOldValidationLogs();
      
      // 壓縮資料庫
      await this.optimizeDatabase();

      console.log('✅ 每日清理完成');
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'success' 
      });

    } catch (error) {
      console.error('❌ 每日清理失敗:', error);
      
      this.updateJobStatus(jobName, { 
        running: false, 
        lastResult: 'error',
        lastError: error.message 
      });
    }
  }

  private async executeCrawler(
    crawlerName: string, 
    options: any = {}
  ): Promise<any> {
    const command = `cd crawler && python -m scrapy crawl ${crawlerName} ${
      Object.entries(options)
        .map(([key, value]) => `-a ${key}=${value}`)
        .join(' ')
    }`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: this.config.crawlerTimeout
    });

    if (stderr && !stderr.includes('INFO')) {
      throw new Error(`Crawler error: ${stderr}`);
    }

    // 解析爬蟲結果
    const resultMatch = stdout.match(/CRAWLER_STATS: ({.*})/);
    if (resultMatch) {
      return JSON.parse(resultMatch[1]);
    }

    return { status: 'completed', stdout };
  }

  private async triggerValidation(
    source: string, 
    options: any = {}
  ) {
    try {
      await $fetch('/api/validation/batch', {
        method: 'POST',
        body: {
          source,
          autoProcess: true,
          ...options
        }
      });
    } catch (error) {
      console.error('觸發驗證失敗:', error);
    }
  }

  private async updateSearchIndex() {
    // TODO: 實作搜尋索引更新
    console.log('📊 更新搜尋索引...');
  }

  private async runDataQualityCheck() {
    // TODO: 實作資料品質檢查
    console.log('🔍 執行資料品質檢查...');
  }

  private async deduplicateActivities() {
    // TODO: 實作去重邏輯
    console.log('🔄 清理重複資料...');
  }

  private async cleanupExpiredActivities() {
    const { db } = await import('~/db');
    const { activities, activityTimes } = await import('~/db/schema');
    const { and, eq, lt } = await import('drizzle-orm');

    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 30); // 30 天前

    const result = await db
      .update(activities)
      .set({ status: 'ended' })
      .where(
        and(
          eq(activities.status, 'active'),
          lt(activityTimes.endDate, expiredDate.toISOString().split('T')[0])
        )
      );

    console.log(`🗑️ 清理過期活動: ${result.changes} 個`);
  }

  private async cleanupOldValidationLogs() {
    const { db } = await import('~/db');
    const { validationLogs } = await import('~/db/schema');
    const { lt } = await import('drizzle-orm');

    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 90); // 90 天前

    const result = await db
      .delete(validationLogs)
      .where(lt(validationLogs.validatedAt, cleanupDate));

    console.log(`🗑️ 清理舊驗證記錄: ${result.changes} 個`);
  }

  private async optimizeDatabase() {
    const { db } = await import('~/db');
    
    try {
      // SQLite VACUUM 指令
      await db.run('VACUUM');
      console.log('📦 資料庫最佳化完成');
    } catch (error) {
      console.warn('資料庫最佳化失敗:', error);
    }
  }

  private async sendAlert(title: string, details: any) {
    // TODO: 實作告警通知 (Email, Slack, Discord 等)
    console.error(`🚨 ALERT: ${title}`, details);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 公開方法
  start() {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`⏰ 排程器 ${name} 已啟動`);
    });
  }

  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏸️ 排程器 ${name} 已停止`);
    });
  }

  getStatus() {
    const status = {};
    this.jobStatus.forEach((jobStatus, name) => {
      const job = this.jobs.get(name);
      status[name] = {
        ...jobStatus,
        scheduled: job ? job.options.scheduled : false,
        nextRun: job ? job.nextDates() : null
      };
    });
    return status;
  }

  async triggerJob(jobName: string) {
    const methods = {
      'daily-crawl': () => this.runDailyCrawl(),
      'weekly-crawl': () => this.runWeeklyCrawl(),
      'hourly-crawl': () => this.runIncrementalCrawl(),
      'batch-validation': () => this.runBatchValidation(),
      'daily-cleanup': () => this.runDailyCleanup()
    };

    const method = methods[jobName];
    if (method) {
      return await method();
    } else {
      throw new Error(`未知的任務: ${jobName}`);
    }
  }
}