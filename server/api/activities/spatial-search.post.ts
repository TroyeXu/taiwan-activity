import { getDatabase, getSqlite } from '../../utils/database';
import { sql } from 'drizzle-orm';
// import { monitorQuery } from '../../utils/database-optimization';
import type { ApiResponse, Activity } from '../../../app/types';

interface SpatialSearchParams {
  center: { lat: number; lng: number };
  radius: number; // 公里
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  filters?: {
    categories?: string[];
    regions?: string[];
    cities?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    features?: string[];
    minQuality?: number;
  };
  sorting?: 'distance' | 'popularity' | 'quality' | 'date';
  page?: number;
  limit?: number;
}

export default defineEventHandler(async (event): Promise<ApiResponse<Activity[]>> => {
  const startTime = Date.now();

  try {
    const db = getDatabase();
    const sqlite = getSqlite();
    const body = (await readBody(event)) as SpatialSearchParams;
    const {
      center,
      radius = 10,
      bounds,
      filters = {},
      sorting = 'distance',
      page = 1,
      limit = 50,
    } = body;

    // Ensure filters is defined
    const safeFilters = filters || {};

    // 驗證參數
    if (!center?.lat || !center?.lng) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少中心座標',
      });
    }

    if (radius <= 0 || radius > 100) {
      throw createError({
        statusCode: 400,
        statusMessage: '搜尋半徑必須在 0.1-100 公里之間',
      });
    }

    // 檢查座標是否在台灣範圍內
    if (center.lat < 21.8 || center.lat > 25.4 || center.lng < 119.3 || center.lng > 122.1) {
      throw createError({
        statusCode: 400,
        statusMessage: '搜尋中心必須在台灣範圍內',
      });
    }

    const results = await performSpatialSearch(
      {
        center,
        radius,
        bounds,
        filters,
        sorting,
        page,
        limit,
      },
      sqlite
    );

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: results.activities,
      pagination: {
        page,
        limit,
        total: results.total,
        totalPages: Math.ceil(results.total / limit),
      },
    };
  } catch (error) {
    console.error('空間搜尋失敗:', error);

    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '空間搜尋失敗',
    });
  }
});

async function performSpatialSearch(params: SpatialSearchParams, sqlite: any) {
  const { center, radius, bounds, filters, sorting, page, limit } = params;
  const safeFilters = filters || {};

  try {
    // 構建基礎 SQL 查詢
    let query = `
      SELECT 
        a.id,
        a.name,
        a.description,
        a.summary,
        a.status,
        a.quality_score,
        a.popularity_score,
        a.price,
        a.price_type,
        a.view_count,
        a.favorite_count,
        a.created_at,
        a.updated_at,
        l.address,
        l.district,
        l.city,
        l.region,
        l.latitude,
        l.longitude,
        l.venue,
        l.landmarks,
        t.start_date,
        t.end_date,
        t.start_time,
        t.end_time,
        t.is_recurring,
        GROUP_CONCAT(DISTINCT c.name) AS category_names,
        GROUP_CONCAT(DISTINCT c.slug) AS category_slugs,
        GROUP_CONCAT(DISTINCT c.color_code) AS category_colors,
        GROUP_CONCAT(DISTINCT c.icon) AS category_icons,
        -- 計算距離 (使用 SpatiaLite 函數或 Haversine 公式)
        CASE 
          WHEN l.geom IS NOT NULL THEN
            Distance(l.geom, MakePoint(?, ?, 4326)) / 1000.0
          ELSE
            (6371 * acos(
              cos(radians(?)) * 
              cos(radians(l.latitude)) * 
              cos(radians(l.longitude) - radians(?)) + 
              sin(radians(?)) * 
              sin(radians(l.latitude))
            ))
        END AS distance_km
      FROM activities a
      INNER JOIN locations l ON a.id = l.activity_id
      LEFT JOIN activity_times t ON a.id = t.activity_id
      LEFT JOIN activity_categories ac ON a.id = ac.activity_id
      LEFT JOIN categories c ON ac.category_id = c.id
      WHERE a.status = 'active'
    `;

    const queryParams: any[] = [
      center.lng,
      center.lat, // SpatiaLite MakePoint
      center.lat,
      center.lng,
      center.lat, // Haversine 公式
    ];

    // 空間條件 - 優先使用空間索引
    if (bounds) {
      // 使用邊界框查詢 (更快)
      query += ` AND l.latitude BETWEEN ? AND ? AND l.longitude BETWEEN ? AND ?`;
      queryParams.push(bounds.south, bounds.north, bounds.west, bounds.east);
    } else {
      // 使用半徑查詢
      query += ` AND (
        CASE 
          WHEN l.geom IS NOT NULL THEN
            Within(l.geom, Buffer(MakePoint(?, ?, 4326), ?))
          ELSE
            (6371 * acos(
              cos(radians(?)) * 
              cos(radians(l.latitude)) * 
              cos(radians(l.longitude) - radians(?)) + 
              sin(radians(?)) * 
              sin(radians(l.latitude))
            )) <= ?
        END
      )`;
      queryParams.push(
        center.lng,
        center.lat,
        radius * 1000, // SpatiaLite Buffer (米)
        center.lat,
        center.lng,
        center.lat,
        radius // Haversine (公里)
      );
    }

    // 品質篩選
    if (safeFilters.minQuality) {
      query += ` AND a.quality_score >= ?`;
      queryParams.push(safeFilters.minQuality);
    }

    // 分類篩選
    if (safeFilters.categories?.length) {
      const placeholders = safeFilters.categories.map(() => '?').join(',');
      query += ` AND c.slug IN (${placeholders})`;
      queryParams.push(...safeFilters.categories);
    }

    // 地區篩選
    if (safeFilters.regions?.length) {
      const placeholders = safeFilters.regions.map(() => '?').join(',');
      query += ` AND l.region IN (${placeholders})`;
      queryParams.push(...safeFilters.regions);
    }

    // 城市篩選
    if (safeFilters.cities?.length) {
      const placeholders = safeFilters.cities.map(() => '?').join(',');
      query += ` AND l.city IN (${placeholders})`;
      queryParams.push(...safeFilters.cities);
    }

    // 時間篩選
    if (safeFilters.dateRange) {
      query += ` AND (
        (t.start_date <= ? AND (t.end_date >= ? OR t.end_date IS NULL))
        OR (t.start_date >= ? AND t.start_date <= ?)
      )`;
      queryParams.push(
        safeFilters.dateRange.end,
        safeFilters.dateRange.start,
        safeFilters.dateRange.start,
        safeFilters.dateRange.end
      );
    }

    // 分組
    query += ` GROUP BY a.id, l.id, t.id`;

    // 再次應用半徑限制 (HAVING 子句)
    if (!bounds) {
      query += ` HAVING distance_km <= ?`;
      queryParams.push(radius);
    }

    // 排序
    switch (sorting) {
      case 'distance':
        query += ` ORDER BY distance_km ASC`;
        break;
      case 'popularity':
        query += ` ORDER BY a.popularity_score DESC, distance_km ASC`;
        break;
      case 'quality':
        query += ` ORDER BY a.quality_score DESC, distance_km ASC`;
        break;
      case 'date':
        query += ` ORDER BY t.start_date ASC, distance_km ASC`;
        break;
      default:
        query += ` ORDER BY distance_km ASC`;
    }

    // 分頁
    const safePage = page || 1;
    const safeLimit = limit || 50;
    const offset = (safePage - 1) * safeLimit;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(safeLimit, offset);

    console.log('Executing spatial query with params:', {
      center,
      radius,
      bounds,
      filters: safeFilters,
      sorting,
      page: safePage,
      limit: safeLimit,
    });

    // 執行查詢
    // Note: This is a workaround for Drizzle sql.raw parameter issues
    let finalQuery = query;
    queryParams.forEach((param, index) => {
      finalQuery = finalQuery.replace(
        '?',
        typeof param === 'string' ? `'${param}'` : param.toString()
      );
    });
    const result = await sqlite.prepare(finalQuery).all();

    // 同時執行計數查詢 (不含 LIMIT/OFFSET)
    const countQuery = query
      .replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT a.id) as total FROM')
      .replace(/ORDER BY[\s\S]*$/, '')
      .replace(/LIMIT[\s\S]*$/, '');

    const countParams = queryParams.slice(0, -2); // 移除 LIMIT 和 OFFSET
    let finalCountQuery = countQuery;
    countParams.forEach((param, index) => {
      finalCountQuery = finalCountQuery.replace(
        '?',
        typeof param === 'string' ? `'${param}'` : param.toString()
      );
    });
    const countResult = await sqlite.prepare(finalCountQuery).get();
    const total = ((countResult as any)?.total as number) || 0;

    // 格式化結果
    const activities: Activity[] = (result as any[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || undefined,
      summary: (row.summary as string) || undefined,
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
        id: '', // 這裡需要從 join 結果中取得
        activityId: row.id as string,
        address: row.address as string,
        district: (row.district as string) || undefined,
        city: row.city as string,
        region: row.region as any,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        venue: (row.venue as string) || undefined,
        landmarks: row.landmarks ? JSON.parse(row.landmarks as string) : [],
      },
      time: row.start_date
        ? {
            id: '', // 同上
            activityId: row.id as string,
            startDate: row.start_date as string,
            endDate: (row.end_date as string) || undefined,
            startTime: (row.start_time as string) || undefined,
            endTime: (row.end_time as string) || undefined,
            timezone: 'Asia/Taipei',
            isRecurring: Boolean(row.is_recurring),
            recurrenceRule: undefined,
          }
        : undefined,
      categories: row.category_names
        ? (row.category_names as string)
            .split(',')
            .map((name, index) => ({
              id: '',
              name: name.trim(),
              slug: ((row.category_slugs as string)?.split(',')[index] || '').trim(),
              colorCode: ((row.category_colors as string)?.split(',')[index] || '').trim(),
              icon: ((row.category_icons as string)?.split(',')[index] || '').trim(),
            }))
            .filter((cat) => cat.name)
        : [],
      distance: Math.round((row.distance_km as number) * 100) / 100, // 保留兩位小數
    }));

    return { activities, total };
  } catch (error) {
    console.error('Spatial search database error:', error);
    throw error;
  }
}
