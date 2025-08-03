import { getCrawlerStatus } from './trigger.post';
import type { ApiResponse } from '~/types';

export default defineEventHandler(async (event): Promise<ApiResponse<any>> => {
  try {
    const query = getQuery(event);
    const spider = query.spider as string;

    if (spider) {
      // 取得特定爬蟲狀態
      const status = getCrawlerStatus(spider);

      if (!status) {
        return {
          success: true,
          data: {
            spider,
            status: 'idle',
            message: '爬蟲目前未運行',
          },
        };
      }

      return {
        success: true,
        data: status,
      };
    } else {
      // 取得所有爬蟲狀態
      const allStatus = getCrawlerStatus();

      // 加入可用的爬蟲列表
      const availableSpiders = [
        'tourism_bureau',
        'local_government',
        'event_platforms',
        'cultural_centers',
      ];

      const crawlerInfo = availableSpiders.map((spiderName) => {
        const status = allStatus ? (allStatus as any)[spiderName] : null;
        return {
          name: spiderName,
          status: status ? status.status : 'idle',
          lastRun: status ? status.startTime : null,
          duration: status ? status.duration : null,
          description: getCrawlerDescription(spiderName),
        };
      });

      return {
        success: true,
        data: {
          crawlers: crawlerInfo,
          running: allStatus
            ? Object.keys(allStatus).filter((name) => (allStatus as any)[name].status === 'started')
            : [],
          summary: {
            total: availableSpiders.length,
            running: allStatus
              ? Object.values(allStatus).filter((s: any) => s.status === 'started').length
              : 0,
            idle: availableSpiders.length - (allStatus ? Object.keys(allStatus).length : 0),
          },
        },
      };
    }
  } catch (error) {
    console.error('Get crawler status failed:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '取得爬蟲狀態失敗',
    });
  }
});

function getCrawlerDescription(spider: string): string {
  const descriptions: { [key: string]: string } = {
    tourism_bureau: '台灣觀光局官方活動資料',
    local_government: '地方政府活動公告',
    event_platforms: '活動平台與售票網站',
    cultural_centers: '文化中心與藝文場館',
  };

  return descriptions[spider] || '未知爬蟲';
}
