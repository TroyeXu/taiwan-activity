import { getDatabase } from '../../utils/database';
import { activities, locations, activityTimes, categories, activityCategories } from '../../../db/schema';
import { eq, and, gte, lte, or, sql } from 'drizzle-orm';
import type { ApiResponse } from '../../../app/types';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color: string;
  extendedProps: {
    activity: any;
  };
}

export default defineEventHandler(async (event): Promise<ApiResponse<CalendarEvent[]>> => {
  try {
    const db = getDatabase();
    const query = getQuery(event);
    const start = query.start as string;
    const end = query.end as string;
    const categoryFilter = query.category as string;
    const regionFilter = query.region as string;

    if (!start || !end) {
      throw createError({
        statusCode: 400,
        statusMessage: '需要提供開始和結束日期',
      });
    }

    // 建構查詢
    let queryBuilder = db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`,
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`,
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`,
        categoryIcons: sql<string>`GROUP_CONCAT(${categories.icon})`,
      })
      .from(activities)
      .innerJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(
        and(
          eq(activities.status, 'active'),
          // 時間範圍篩選
          or(
            // 活動在查詢範圍內開始
            and(gte(activityTimes.startDate, start), lte(activityTimes.startDate, end)),
            // 活動在查詢範圍內結束
            and(gte(activityTimes.endDate, start), lte(activityTimes.endDate, end)),
            // 活動跨越整個查詢範圍
            and(
              lte(activityTimes.startDate, start),
              or(gte(activityTimes.endDate, end), sql`${activityTimes.endDate} IS NULL`)
            )
          )
        )
      )
      .groupBy(activities.id, activityTimes.id);

    // 分類篩選
    if (categoryFilter) {
      queryBuilder = (queryBuilder as any).having(
        sql`GROUP_CONCAT(${categories.slug}) LIKE '%${categoryFilter}%'`
      );
    }

    // 地區篩選
    if (regionFilter) {
      queryBuilder = (queryBuilder as any).where(eq(locations.region, regionFilter));
    }

    const results = await queryBuilder;

    // 轉換為日曆事件格式
    const calendarEvents: CalendarEvent[] = results.map((row) => {
      const activityCategories = row.categoryNames
        ? row.categoryNames
            .split(',')
            .map((name, index) => ({
              name: name.trim(),
              slug: row.categorySlugs?.split(',')[index]?.trim() || '',
              colorCode: row.categoryColors?.split(',')[index]?.trim() || '#6B7280',
              icon: row.categoryIcons?.split(',')[index]?.trim() || '',
            }))
            .filter((cat) => cat.name)
        : [];

      // 取得主要分類的顏色
      const primaryColor = activityCategories[0]?.colorCode || '#3B82F6';

      // 建構事件物件
      const event: CalendarEvent = {
        id: row.activity.id,
        title: row.activity.name,
        start: row.time.startDate,
        allDay: !row.time.startTime,
        color: primaryColor,
        extendedProps: {
          activity: {
            ...row.activity,
            location: row.location,
            time: row.time,
            categories: activityCategories,
          },
        },
      };

      // 處理結束時間
      if (row.time.endDate) {
        event.end = row.time.endDate;
      } else if (row.time.startTime && row.time.endTime) {
        // 如果只有時間沒有結束日期，使用同一天
        event.start = `${row.time.startDate}T${row.time.startTime}`;
        event.end = `${row.time.startDate}T${row.time.endTime}`;
        event.allDay = false;
      }

      // 處理重複事件
      if (row.time.isRecurring && row.time.recurrenceRule) {
        try {
          const rule = JSON.parse(row.time.recurrenceRule);
          // 這裡可以根據重複規則生成多個事件
          // 簡化版本：只顯示第一個實例
          (event.extendedProps as any).isRecurring = true;
          (event.extendedProps as any).recurrenceRule = rule;
        } catch (e) {
          console.warn('Failed to parse recurrence rule:', e);
        }
      }

      return event;
    });

    // 處理重複事件（生成實例）
    const expandedEvents: CalendarEvent[] = [];

    for (const event of calendarEvents) {
      if ((event.extendedProps as any).isRecurring) {
        // 簡化：為週期性活動生成每週實例
        const instances = generateRecurringInstances(event, start, end);
        expandedEvents.push(...instances);
      } else {
        expandedEvents.push(event);
      }
    }

    return {
      success: true,
      data: expandedEvents,
      meta: {
        total: expandedEvents.length,
        dateRange: { start, end },
      },
    };
  } catch (error) {
    console.error('Get calendar events failed:', error);

    if ((error as any).statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '取得日曆活動失敗',
    });
  }
});

function generateRecurringInstances(
  event: CalendarEvent,
  rangeStart: string,
  rangeEnd: string
): CalendarEvent[] {
  const instances: CalendarEvent[] = [];
  const rule = (event.extendedProps as any).recurrenceRule;

  if (!rule) return [event];

  // 簡化的重複事件處理
  const startDate = new Date(event.start);
  const endDate = new Date(rangeEnd);
  const currentDate = new Date(startDate);
  let instanceCount = 0;
  const maxInstances = 52; // 最多生成52個實例（一年）

  while (currentDate <= endDate && instanceCount < maxInstances) {
    if (currentDate >= new Date(rangeStart)) {
      const instance: CalendarEvent = {
        ...event,
        id: `${event.id}_${instanceCount}`,
        start: currentDate.toISOString().split('T')[0] as string,
        end: event.end
          ? new Date(
              currentDate.getTime() +
                (new Date(event.end).getTime() - new Date(event.start).getTime())
            )
              .toISOString()
              .split('T')[0]
          : undefined,
      };

      instances.push(instance);
    }

    // 根據規則類型增加日期
    switch (rule.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (rule.interval || 1));
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7 * (rule.interval || 1));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (rule.interval || 1));
        break;
      default:
        return [event]; // 不支援的規則類型
    }

    instanceCount++;
  }

  return instances.length > 0 ? instances : [event];
}
