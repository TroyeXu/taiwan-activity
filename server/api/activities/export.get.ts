import { db } from '~/db';
import { activities, locations, activityTimes, categories, activityCategories } from '~/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import type { ApiResponse } from '~/types';

export default defineEventHandler(async (event): Promise<any> => {
  try {
    const query = getQuery(event);
    const format = (query.format as string) || 'json';
    const ids = query.ids as string | string[];
    const categoryFilter = query.category as string;
    const regionFilter = query.region as string;
    const limit = parseInt(query.limit as string) || 100;

    // 建構查詢
    let queryBuilder = db
      .select({
        activity: activities,
        location: locations,
        time: activityTimes,
        categoryNames: sql<string>`GROUP_CONCAT(${categories.name})`,
        categorySlugs: sql<string>`GROUP_CONCAT(${categories.slug})`,
        categoryColors: sql<string>`GROUP_CONCAT(${categories.colorCode})`
      })
      .from(activities)
      .leftJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityTimes, eq(activities.id, activityTimes.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(eq(activities.status, 'active'))
      .groupBy(activities.id)
      .limit(limit);

    // ID 篩選
    if (ids) {
      const idArray = Array.isArray(ids) ? ids : [ids];
      queryBuilder = (queryBuilder as any).where(inArray(activities.id, idArray));
    }

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

    // 格式化資料
    const exportData = results.map(row => ({
      id: row.activity.id,
      name: row.activity.name,
      description: row.activity.description,
      summary: row.activity.summary,
      status: row.activity.status,
      qualityScore: row.activity.qualityScore,
      price: row.activity.price,
      priceType: row.activity.priceType,
      location: row.location ? {
        address: row.location.address,
        city: row.location.city,
        region: row.location.region,
        latitude: row.location.latitude,
        longitude: row.location.longitude,
        venue: row.location.venue
      } : null,
      time: row.time ? {
        startDate: row.time.startDate,
        endDate: row.time.endDate,
        startTime: row.time.startTime,
        endTime: row.time.endTime,
        isRecurring: row.time.isRecurring
      } : null,
      categories: row.categoryNames ? 
        row.categoryNames.split(',').map(name => name.trim()) : [],
      createdAt: row.activity.createdAt,
      updatedAt: row.activity.updatedAt
    }));

    // 根據格式回傳資料
    switch (format.toLowerCase()) {
      case 'csv':
        return exportAsCSV(exportData, event);
        
      case 'xml':
        return exportAsXML(exportData, event);
        
      case 'ical':
        return exportAsICal(exportData, event);
        
      case 'json':
      default:
        setHeader(event, 'Content-Type', 'application/json');
        setHeader(event, 'Content-Disposition', 'attachment; filename="activities.json"');
        return {
          success: true,
          data: exportData,
          meta: {
            total: exportData.length,
            format: 'json',
            exportedAt: new Date().toISOString()
          }
        };
    }

  } catch (error) {
    console.error('Export activities failed:', error);

    throw createError({
      statusCode: 500,
      statusMessage: '匯出活動失敗'
    });
  }
});

function exportAsCSV(data: any[], event: any): string {
  // 設定 CSV 標頭
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8');
  setHeader(event, 'Content-Disposition', 'attachment; filename="activities.csv"');

  if (data.length === 0) {
    return '';
  }

  // CSV 標題行
  const headers = [
    'ID', '活動名稱', '描述', '摘要', '狀態', '品質分數', '價格', '價格類型',
    '地址', '城市', '地區', '緯度', '經度', '場地',
    '開始日期', '結束日期', '開始時間', '結束時間', '重複性',
    '分類', '建立時間', '更新時間'
  ];

  // 轉換資料為 CSV 行
  const csvRows = [
    headers.join(','),
    ...data.map(item => [
      escapeCSV(item.id),
      escapeCSV(item.name),
      escapeCSV(item.description),
      escapeCSV(item.summary),
      escapeCSV(item.status),
      item.qualityScore || 0,
      item.price || 0,
      escapeCSV(item.priceType),
      escapeCSV(item.location?.address),
      escapeCSV(item.location?.city),
      escapeCSV(item.location?.region),
      item.location?.latitude || '',
      item.location?.longitude || '',
      escapeCSV(item.location?.venue),
      escapeCSV(item.time?.startDate),
      escapeCSV(item.time?.endDate),
      escapeCSV(item.time?.startTime),
      escapeCSV(item.time?.endTime),
      item.time?.isRecurring ? '是' : '否',
      escapeCSV(item.categories?.join('; ')),
      escapeCSV(item.createdAt),
      escapeCSV(item.updatedAt)
    ].join(','))
  ];

  return csvRows.join('\n');
}

function exportAsXML(data: any[], event: any): string {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setHeader(event, 'Content-Disposition', 'attachment; filename="activities.xml"');

  const xmlItems = data.map(item => `
    <activity>
      <id>${escapeXML(item.id)}</id>
      <name>${escapeXML(item.name)}</name>
      <description>${escapeXML(item.description || '')}</description>
      <summary>${escapeXML(item.summary || '')}</summary>
      <status>${escapeXML(item.status)}</status>
      <qualityScore>${item.qualityScore || 0}</qualityScore>
      <price>${item.price || 0}</price>
      <priceType>${escapeXML(item.priceType || '')}</priceType>
      ${item.location ? `
      <location>
        <address>${escapeXML(item.location.address || '')}</address>
        <city>${escapeXML(item.location.city || '')}</city>
        <region>${escapeXML(item.location.region || '')}</region>
        <latitude>${item.location.latitude || ''}</latitude>
        <longitude>${item.location.longitude || ''}</longitude>
        <venue>${escapeXML(item.location.venue || '')}</venue>
      </location>
      ` : '<location />'}
      ${item.time ? `
      <time>
        <startDate>${escapeXML(item.time.startDate || '')}</startDate>
        <endDate>${escapeXML(item.time.endDate || '')}</endDate>
        <startTime>${escapeXML(item.time.startTime || '')}</startTime>
        <endTime>${escapeXML(item.time.endTime || '')}</endTime>
        <isRecurring>${item.time.isRecurring ? 'true' : 'false'}</isRecurring>
      </time>
      ` : '<time />'}
      <categories>
        ${item.categories?.map((cat: any) => `<category>${escapeXML(cat)}</category>`).join('') || ''}
      </categories>
      <createdAt>${escapeXML(item.createdAt)}</createdAt>
      <updatedAt>${escapeXML(item.updatedAt)}</updatedAt>
    </activity>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<activities>
  <meta>
    <total>${data.length}</total>
    <exportedAt>${new Date().toISOString()}</exportedAt>
  </meta>
  ${xmlItems}
</activities>`;
}

function exportAsICal(data: any[], event: any): string {
  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8');
  setHeader(event, 'Content-Disposition', 'attachment; filename="activities.ics"');

  const events = data
    .filter(item => item.time?.startDate)
    .map(item => {
      const startDate = new Date(item.time.startDate);
      const endDate = item.time.endDate ? new Date(item.time.endDate) : startDate;
      
      // 格式化為 iCal 日期格式
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      return `BEGIN:VEVENT
UID:${item.id}@taiwan-activity-map.com
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${escapeICal(item.name)}
DESCRIPTION:${escapeICal(item.description || item.summary || '')}
${item.location?.address ? `LOCATION:${escapeICal(item.location.address)}` : ''}
${item.location?.latitude && item.location?.longitude ? 
  `GEO:${item.location.latitude};${item.location.longitude}` : ''}
CATEGORIES:${item.categories?.join(',') || ''}
STATUS:CONFIRMED
CREATED:${formatDate(new Date(item.createdAt))}
LAST-MODIFIED:${formatDate(new Date(item.updatedAt))}
END:VEVENT`;
    }).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Taiwan Activity Map//Activity Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`;
}

// 輔助函數
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXML(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escapeICal(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}