import { db } from '~/db';
import { sql } from 'drizzle-orm';
import { monitorQuery } from '~/server/utils/database-optimization';
import type { ApiResponse, Activity } from '~/types';

interface FullTextSearchParams {
  query: string;
  location?: { lat: number; lng: number };
  radius?: number;
  filters?: {
    categories?: string[];
    regions?: string[];
    cities?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    minQuality?: number;
  };
  sorting?: 'relevance' | 'distance' | 'popularity' | 'quality' | 'date';
  page?: number;
  limit?: number;
  highlight?: boolean;
}

interface SearchResult {
  activities: Activity[];
  total: number;
  suggestions?: string[];
  queryInfo: {
    originalQuery: string;
    processedQuery: string;
    searchTerms: string[];
    hasLocationFilter: boolean;
  };
}

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  const startTime = Date.now();

  try {
    const body = await readBody(event) as FullTextSearchParams;
    const {
      query,
      location,
      radius = 50,
      filters = {},
      sorting = 'relevance',
      page = 1,
      limit = 20,
      highlight = false
    } = body;

    // 驗證參數
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '搜尋關鍵字不能為空'
      });
    }

    if (query.length > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: '搜尋關鍵字過長'
      });
    }

    const result = await performFullTextSearch({
      query: query.trim(),
      location,
      radius,
      filters,
      sorting,
      page,
      limit,
      highlight
    });

    const executionTime = Date.now() - startTime;

    // 記錄搜尋日誌 (異步)
    logSearchQuery(query, filters, result.total, executionTime, event).catch(
      error => console.warn('Failed to log search:', error)
    );

    return {
      success: true,
      data: result.activities,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      },
      meta: {
        queryInfo: result.queryInfo,
        suggestions: result.suggestions,
        executionTime,
        hasMore: result.total > page * limit
      }
    };

  } catch (error) {
    console.error('全文搜尋失敗:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '搜尋失敗'
    });
  }
});

@monitorQuery('fulltext-search')
async function performFullTextSearch(params: FullTextSearchParams): Promise<SearchResult> {
  const { query, location, radius, filters, sorting, page, limit, highlight } = params;

  try {
    // 處理搜尋關鍵字
    const processedQuery = preprocessSearchQuery(query);
    const searchTerms = extractSearchTerms(query);

    console.log('Processing search:', { 
      original: query, 
      processed: processedQuery, 
      terms: searchTerms 
    });

    // 嘗試使用 FTS5 全文搜尋
    const useFTS = await checkFTSAvailability();
    
    let searchResult: SearchResult;
    
    if (useFTS) {
      searchResult = await performFTSSearch(params, processedQuery, searchTerms);
    } else {
      searchResult = await performLikeSearch(params, processedQuery, searchTerms);
    }

    // 生成搜尋建議
    if (searchResult.total === 0) {
      searchResult.suggestions = await generateSearchSuggestions(query);
    }

    return searchResult;

  } catch (error) {
    console.error('Full-text search error:', error);
    throw error;
  }
}

async function performFTSSearch(
  params: FullTextSearchParams, 
  processedQuery: string, 
  searchTerms: string[]
): Promise<SearchResult> {
  const { location, radius, filters, sorting, page, limit, highlight } = params;

  try {
    // 構建 FTS5 查詢
    let baseQuery = `
      SELECT 
        a.id, a.name, a.description, a.summary, a.status,
        a.quality_score, a.popularity_score, a.price, a.price_type,
        a.view_count, a.favorite_count, a.created_at, a.updated_at,
        l.address, l.district, l.city, l.region,
        l.latitude, l.longitude, l.venue, l.landmarks,
        t.start_date, t.end_date, t.start_time, t.end_time, t.is_recurring,
        GROUP_CONCAT(DISTINCT c.name) AS category_names,
        GROUP_CONCAT(DISTINCT c.slug) AS category_slugs,
        GROUP_CONCAT(DISTINCT c.color_code) AS category_colors,
        GROUP_CONCAT(DISTINCT c.icon) AS category_icons,
        fts.rank,
        -- 計算距離 (如果有位置篩選)
        ${location ? `
          (6371 * acos(
            cos(radians(${location.lat})) * 
            cos(radians(l.latitude)) * 
            cos(radians(l.longitude) - radians(${location.lng})) + 
            sin(radians(${location.lat})) * 
            sin(radians(l.latitude))
          )) AS distance_km
        ` : 'NULL AS distance_km'}
      FROM activities_fts fts
      INNER JOIN activities_with_details a ON fts.id = a.id
      INNER JOIN locations l ON a.id = l.activity_id
      LEFT JOIN activity_times t ON a.id = t.activity_id
      LEFT JOIN activity_categories ac ON a.id = ac.activity_id
      LEFT JOIN categories c ON ac.category_id = c.id
      WHERE activities_fts MATCH ?
        AND a.status = 'active'
    `;

    const queryParams: any[] = [processedQuery];

    // 地理篩選
    if (location && radius) {
      baseQuery += ` AND (6371 * acos(
        cos(radians(?)) * 
        cos(radians(l.latitude)) * 
        cos(radians(l.longitude) - radians(?)) + 
        sin(radians(?)) * 
        sin(radians(l.latitude))
      )) <= ?`;
      queryParams.push(location.lat, location.lng, location.lat, radius);
    }

    // 其他篩選條件
    baseQuery += buildFilterConditions(filters, queryParams);

    // 分組
    baseQuery += ` GROUP BY a.id`;

    // 再次檢查距離 (如果需要)
    if (location && radius) {
      baseQuery += ` HAVING distance_km <= ?`;
      queryParams.push(radius);
    }

    // 排序
    baseQuery += buildOrderByClause(sorting, !!location);

    // 執行計數查詢
    const countQuery = baseQuery
      .replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT a.id) as total FROM')
      .replace(/ORDER BY[\s\S]*$/, '');
    
    const countResult = await db.execute(sql.raw(countQuery, queryParams));
    const total = countResult.rows[0]?.total as number || 0;

    // 執行分頁查詢
    baseQuery += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, (page - 1) * limit);

    const result = await db.execute(sql.raw(baseQuery, queryParams));
    const activities = formatSearchResults(result.rows, highlight ? searchTerms : []);

    return {
      activities,
      total,
      queryInfo: {
        originalQuery: params.query,
        processedQuery,
        searchTerms,
        hasLocationFilter: !!location
      }
    };

  } catch (error) {
    console.warn('FTS search failed, falling back to LIKE search:', error);
    return await performLikeSearch(params, processedQuery, searchTerms);
  }
}

async function performLikeSearch(
  params: FullTextSearchParams, 
  processedQuery: string, 
  searchTerms: string[]
): Promise<SearchResult> {
  const { location, radius, filters, sorting, page, limit, highlight } = params;

  try {
    let baseQuery = `
      SELECT 
        a.id, a.name, a.description, a.summary, a.status,
        a.quality_score, a.popularity_score, a.price, a.price_type,
        a.view_count, a.favorite_count, a.created_at, a.updated_at,
        l.address, l.district, l.city, l.region,
        l.latitude, l.longitude, l.venue, l.landmarks,
        t.start_date, t.end_date, t.start_time, t.end_time, t.is_recurring,
        GROUP_CONCAT(DISTINCT c.name) AS category_names,
        GROUP_CONCAT(DISTINCT c.slug) AS category_slugs,
        GROUP_CONCAT(DISTINCT c.color_code) AS category_colors,
        GROUP_CONCAT(DISTINCT c.icon) AS category_icons,
        -- 計算相關性分數
        (
          CASE WHEN a.name LIKE ? THEN 10 ELSE 0 END +
          CASE WHEN a.description LIKE ? THEN 5 ELSE 0 END +
          CASE WHEN a.summary LIKE ? THEN 3 ELSE 0 END +
          CASE WHEN l.address LIKE ? THEN 2 ELSE 0 END +
          CASE WHEN l.venue LIKE ? THEN 2 ELSE 0 END
        ) AS relevance_score,
        -- 計算距離 (如果有位置篩選)
        ${location ? `
          (6371 * acos(
            cos(radians(${location.lat})) * 
            cos(radians(l.latitude)) * 
            cos(radians(l.longitude) - radians(${location.lng})) + 
            sin(radians(${location.lat})) * 
            sin(radians(l.latitude))
          )) AS distance_km
        ` : 'NULL AS distance_km'}
      FROM activities a
      INNER JOIN locations l ON a.id = l.activity_id
      LEFT JOIN activity_times t ON a.id = t.activity_id
      LEFT JOIN activity_categories ac ON a.id = ac.activity_id
      LEFT JOIN categories c ON ac.category_id = c.id
      WHERE a.status = 'active'
        AND (
          a.name LIKE ? OR
          a.description LIKE ? OR
          a.summary LIKE ? OR
          l.address LIKE ? OR
          l.venue LIKE ? OR
          c.name LIKE ?
        )
    `;

    const searchPattern = `%${processedQuery}%`;
    const queryParams: any[] = [
      // 相關性計算參數
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
      // WHERE 條件參數
      searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern
    ];

    // 地理篩選
    if (location && radius) {
      baseQuery += ` AND (6371 * acos(
        cos(radians(?)) * 
        cos(radians(l.latitude)) * 
        cos(radians(l.longitude) - radians(?)) + 
        sin(radians(?)) * 
        sin(radians(l.latitude))
      )) <= ?`;
      queryParams.push(location.lat, location.lng, location.lat, radius);
    }

    // 其他篩選條件
    baseQuery += buildFilterConditions(filters, queryParams);

    // 分組和相關性篩選
    baseQuery += ` GROUP BY a.id HAVING relevance_score > 0`;

    // 執行計數查詢
    const countQuery = baseQuery
      .replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT a.id) as total FROM')
      .replace(/ORDER BY[\s\S]*$/, '');
    
    const countResult = await db.execute(sql.raw(countQuery, queryParams));
    const total = countResult.rows[0]?.total as number || 0;

    // 排序
    baseQuery += buildOrderByClause(sorting, !!location, true);

    // 分頁
    baseQuery += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, (page - 1) * limit);

    const result = await db.execute(sql.raw(baseQuery, queryParams));
    const activities = formatSearchResults(result.rows, highlight ? searchTerms : []);

    return {
      activities,
      total,
      queryInfo: {
        originalQuery: params.query,
        processedQuery,
        searchTerms,
        hasLocationFilter: !!location
      }
    };

  } catch (error) {
    console.error('LIKE search failed:', error);
    throw error;
  }
}

// 輔助函數

function preprocessSearchQuery(query: string): string {
  // 移除特殊字元，保留中文、英文、數字和空格
  return query
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSearchTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .filter(term => term.length > 0)
    .slice(0, 10); // 限制最多 10 個搜尋詞
}

function buildFilterConditions(filters: any, queryParams: any[]): string {
  let conditions = '';

  if (filters.minQuality) {
    conditions += ` AND a.quality_score >= ?`;
    queryParams.push(filters.minQuality);
  }

  if (filters.categories?.length) {
    const placeholders = filters.categories.map(() => '?').join(',');
    conditions += ` AND c.slug IN (${placeholders})`;
    queryParams.push(...filters.categories);
  }

  if (filters.regions?.length) {
    const placeholders = filters.regions.map(() => '?').join(',');
    conditions += ` AND l.region IN (${placeholders})`;
    queryParams.push(...filters.regions);
  }

  if (filters.cities?.length) {
    const placeholders = filters.cities.map(() => '?').join(',');
    conditions += ` AND l.city IN (${placeholders})`;
    queryParams.push(...filters.cities);
  }

  if (filters.dateRange) {
    conditions += ` AND (
      (t.start_date <= ? AND (t.end_date >= ? OR t.end_date IS NULL))
      OR (t.start_date >= ? AND t.start_date <= ?)
    )`;
    queryParams.push(
      filters.dateRange.end, filters.dateRange.start,
      filters.dateRange.start, filters.dateRange.end
    );
  }

  return conditions;
}

function buildOrderByClause(
  sorting: string, 
  hasLocation: boolean, 
  hasRelevance: boolean = false
): string {
  switch (sorting) {
    case 'relevance':
      if (hasRelevance) {
        return ` ORDER BY relevance_score DESC, a.quality_score DESC`;
      } else {
        return ` ORDER BY fts.rank, a.quality_score DESC`;
      }
    case 'distance':
      return hasLocation 
        ? ` ORDER BY distance_km ASC, a.quality_score DESC`
        : ` ORDER BY a.quality_score DESC`;
    case 'popularity':
      return ` ORDER BY a.popularity_score DESC, a.quality_score DESC`;
    case 'quality':
      return ` ORDER BY a.quality_score DESC, a.popularity_score DESC`;
    case 'date':
      return ` ORDER BY t.start_date ASC, a.quality_score DESC`;
    default:
      return ` ORDER BY a.quality_score DESC`;
  }
}

function formatSearchResults(rows: any[], highlightTerms: string[]): Activity[] {
  return rows.map(row => {
    let activity: Activity = {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string || undefined,
      summary: row.summary as string || undefined,
      status: row.status as any,
      qualityScore: row.quality_score as number,
      popularityScore: row.popularity_score as number,
      price: row.price as number,
      priceType: row.price_type as any,
      viewCount: row.view_count as number,
      favoriteCount: row.favorite_count as number,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      location: {
        id: '',
        activityId: row.id as string,
        address: row.address as string,
        district: row.district as string || undefined,
        city: row.city as string,
        region: row.region as any,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        venue: row.venue as string || undefined,
        landmarks: row.landmarks ? JSON.parse(row.landmarks as string) : []
      },
      time: row.start_date ? {
        id: '',
        activityId: row.id as string,
        startDate: row.start_date as string,
        endDate: row.end_date as string || undefined,
        startTime: row.start_time as string || undefined,
        endTime: row.end_time as string || undefined,
        timezone: 'Asia/Taipei',
        isRecurring: Boolean(row.is_recurring)
      } : undefined,
      categories: row.category_names ? 
        (row.category_names as string).split(',').map((name, index) => ({
          id: '',
          name: name.trim(),
          slug: ((row.category_slugs as string)?.split(',')[index] || '').trim(),
          colorCode: ((row.category_colors as string)?.split(',')[index] || '').trim(),
          icon: ((row.category_icons as string)?.split(',')[index] || '').trim()
        })).filter(cat => cat.name) : []
    };

    // 添加距離資訊
    if (row.distance_km !== null && row.distance_km !== undefined) {
      activity.distance = Math.round((row.distance_km as number) * 100) / 100;
    }

    // 應用高亮
    if (highlightTerms.length > 0) {
      activity = applyHighlight(activity, highlightTerms);
    }

    return activity;
  });
}

function applyHighlight(activity: Activity, terms: string[]): Activity {
  const highlightText = (text: string): string => {
    if (!text) return text;
    
    let highlighted = text;
    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
    return highlighted;
  };

  return {
    ...activity,
    name: highlightText(activity.name),
    description: activity.description ? highlightText(activity.description) : undefined,
    summary: activity.summary ? highlightText(activity.summary) : undefined
  };
}

async function checkFTSAvailability(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT * FROM activities_fts LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
}

async function generateSearchSuggestions(query: string): Promise<string[]> {
  try {
    // 簡單的建議生成 - 尋找相似的活動名稱或分類
    const result = await db.execute(sql`
      SELECT DISTINCT name 
      FROM activities 
      WHERE name LIKE ${'%' + query + '%'} 
        AND status = 'active'
      LIMIT 5
    `);

    const suggestions = result.rows.map(row => row.name as string);

    // 如果沒有活動名稱建議，嘗試分類建議
    if (suggestions.length === 0) {
      const categoryResult = await db.execute(sql`
        SELECT DISTINCT name 
        FROM categories 
        WHERE name LIKE ${'%' + query + '%'}
        LIMIT 3
      `);
      
      suggestions.push(...categoryResult.rows.map(row => row.name as string));
    }

    return suggestions;
  } catch (error) {
    console.warn('Failed to generate suggestions:', error);
    return [];
  }
}

async function logSearchQuery(
  query: string,
  filters: any,
  resultCount: number,
  executionTime: number,
  event: any
): Promise<void> {
  try {
    const userAgent = getHeader(event, 'user-agent') || '';
    const ipAddress = getClientIP(event) || '';

    await db.execute(sql`
      INSERT INTO search_logs (
        id, query, filters, result_count, searched_at, 
        user_agent, ip_address
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?
      )
    `, [
      'search_' + Date.now() + '_' + Math.random().toString(36).substring(2),
      query,
      JSON.stringify(filters),
      resultCount,
      Date.now(),
      userAgent,
      ipAddress
    ]);
  } catch (error) {
    console.warn('Failed to log search query:', error);
  }
}