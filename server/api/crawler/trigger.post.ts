import { exec } from 'child_process';
import { promisify } from 'util';
import type { ApiResponse } from '../../../app/types';

const execAsync = promisify(exec);

interface CrawlerTriggerParams {
  spider: string;
  args?: Record<string, any>;
  async?: boolean;
}

interface CrawlerResult {
  spider: string;
  status: 'started' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  stats?: any;
  output?: string;
  error?: string;
}

// 儲存運行中的爬蟲狀態
const runningCrawlers = new Map<string, CrawlerResult>();

export default defineEventHandler(async (event): Promise<ApiResponse<CrawlerResult>> => {
  try {
    const body = (await readBody(event)) as CrawlerTriggerParams;
    const { spider, args = {}, async = true } = body;

    // 驗證爬蟲名稱
    const availableSpiders = [
      'tourism_bureau',
      'local_government',
      'event_platforms',
      'cultural_centers',
    ];

    if (!spider || !availableSpiders.includes(spider)) {
      throw createError({
        statusCode: 400,
        statusMessage: `無效的爬蟲名稱。可用爬蟲: ${availableSpiders.join(', ')}`,
      });
    }

    // 檢查爬蟲是否已在運行
    const crawlerId = `${spider}_${Date.now()}`;
    if (runningCrawlers.has(spider)) {
      throw createError({
        statusCode: 409,
        statusMessage: `爬蟲 ${spider} 正在運行中`,
      });
    }

    // 建立爬蟲結果物件
    const result: CrawlerResult = {
      spider,
      status: 'started',
      startTime: new Date().toISOString(),
    };

    runningCrawlers.set(spider, result);

    try {
      if (async) {
        // 異步執行爬蟲
        executeCrawlerAsync(spider, args, crawlerId).catch((error) => {
          console.error(`Async crawler ${spider} failed:`, error);
          const result = runningCrawlers.get(spider);
          if (result) {
            result.status = 'failed';
            result.error = error instanceof Error ? error.message : String(error);
            result.endTime = new Date().toISOString();
            result.duration = Date.now() - new Date(result.startTime).getTime();
          }
        });

        return {
          success: true,
          data: result,
          message: `爬蟲 ${spider} 已啟動（異步執行）`,
        };
      } else {
        // 同步執行爬蟲
        const crawlerResult = await executeCrawler(spider, args);

        result.status = 'completed';
        result.endTime = new Date().toISOString();
        result.duration = Date.now() - new Date(result.startTime).getTime();
        result.stats = crawlerResult.stats;
        result.output = crawlerResult.output;

        runningCrawlers.delete(spider);

        return {
          success: true,
          data: result,
          message: `爬蟲 ${spider} 執行完成`,
        };
      }
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      result.endTime = new Date().toISOString();
      result.duration = Date.now() - new Date(result.startTime).getTime();

      runningCrawlers.delete(spider);

      throw createError({
        statusCode: 500,
        statusMessage: `爬蟲執行失敗: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  } catch (error) {
    console.error('Crawler trigger failed:', error);

    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '觸發爬蟲失敗',
    });
  }
});

async function executeCrawler(spider: string, args: Record<string, any> = {}) {
  // 建構爬蟲命令
  const crawlerArgs = Object.entries(args)
    .map(([key, value]) => `-a ${key}=${value}`)
    .join(' ');

  const command = `cd crawler && python -m scrapy crawl ${spider} ${crawlerArgs}`;

  console.log(`Executing crawler command: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30 * 60 * 1000, // 30 分鐘超時
      maxBuffer: 10 * 1024 * 1024, // 10MB 輸出緩衝
    });

    // 解析輸出中的統計資訊
    const stats = parseScrapyStats(stdout);

    return {
      output: stdout,
      error: stderr,
      stats,
    };
  } catch (error) {
    console.error(`Crawler execution failed:`, error);
    throw new Error(`爬蟲執行失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function executeCrawlerAsync(spider: string, args: Record<string, any>, _crawlerId: string) {
  const result = runningCrawlers.get(spider);
  if (!result) return;

  try {
    const crawlerResult = await executeCrawler(spider, args);

    result.status = 'completed';
    result.endTime = new Date().toISOString();
    result.duration = Date.now() - new Date(result.startTime).getTime();
    result.stats = crawlerResult.stats;
    result.output = crawlerResult.output;

    console.log(`Async crawler ${spider} completed successfully`);

    // 觸發資料驗證
    await triggerValidation(spider);
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : String(error);
    result.endTime = new Date().toISOString();
    result.duration = Date.now() - new Date(result.startTime).getTime();

    console.error(`Async crawler ${spider} failed:`, error);
  } finally {
    // 5 分鐘後清理完成的爬蟲記錄
    setTimeout(
      () => {
        runningCrawlers.delete(spider);
      },
      5 * 60 * 1000
    );
  }
}

function parseScrapyStats(output: string): any {
  try {
    // 嘗試解析 Scrapy 統計輸出
    const statsMatch = output.match(
      /INFO: Dumping Scrapy stats:([\s\S]*?)(?=\d{4}-\d{2}-\d{2}|\n\n|$)/
    );

    if (statsMatch) {
      const statsText = statsMatch[1];
      const stats: any = {};

      // 解析各種統計資訊
      const patterns = [
        { key: 'item_scraped_count', pattern: /'item_scraped_count':\s*(\d+)/ },
        { key: 'item_dropped_count', pattern: /'item_dropped_count':\s*(\d+)/ },
        { key: 'response_received_count', pattern: /'response_received_count':\s*(\d+)/ },
        { key: 'request_count', pattern: /'request_count':\s*(\d+)/ },
        { key: 'elapsed_time_seconds', pattern: /'elapsed_time_seconds':\s*([\d.]+)/ },
      ];

      for (const { key, pattern } of patterns) {
        const match = statsText?.match(pattern);
        if (match && match[1]) {
          stats[key] = key === 'elapsed_time_seconds' ? parseFloat(match[1]) : parseInt(match[1]);
        }
      }

      return stats;
    }

    // 如果無法解析標準統計，嘗試解析自定義輸出
    const itemsMatch = output.match(/(\d+)\s+items?\s+scraped/i);
    const timeMatch = output.match(/finished.*in\s+([\d.]+)\s*seconds?/i);

    return {
      item_scraped_count: itemsMatch && itemsMatch[1] ? parseInt(itemsMatch[1]) : 0,
      elapsed_time_seconds: timeMatch && timeMatch[1] ? parseFloat(timeMatch[1]) : 0,
      raw_output: output,
    };
  } catch (error) {
    console.warn('Failed to parse scrapy stats:', error);
    return { raw_output: output };
  }
}

async function triggerValidation(spider: string) {
  try {
    await $fetch('/api/validation/batch', {
      method: 'POST',
      body: {
        source: `crawler-${spider}`,
        batchSize: 50,
        autoProcess: true,
        qualityThreshold: 60,
      },
    });

    console.log(`Validation triggered for crawler: ${spider}`);
  } catch (error) {
    console.error(`Failed to trigger validation for ${spider}:`, error);
  }
}

// 取得爬蟲狀態的輔助函數
export function getCrawlerStatus(spider?: string) {
  if (spider) {
    return runningCrawlers.get(spider);
  }

  return Object.fromEntries(runningCrawlers.entries());
}

// 停止爬蟲的輔助函數
export async function stopCrawler(spider: string) {
  const result = runningCrawlers.get(spider);
  if (!result || result.status !== 'started') {
    throw new Error(`爬蟲 ${spider} 未在運行中`);
  }

  try {
    // 嘗試終止爬蟲進程
    // 注意：這是簡化版本，實際上需要追蹤進程 ID
    await execAsync(`pkill -f "scrapy crawl ${spider}"`);

    result.status = 'failed';
    result.error = 'Manually stopped';
    result.endTime = new Date().toISOString();
    result.duration = Date.now() - new Date(result.startTime).getTime();

    return result;
  } catch (error) {
    throw new Error(`停止爬蟲失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
}
