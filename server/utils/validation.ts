import { z } from 'zod';
import type { Activity, ApiResponse } from '~/types';

// 活動搜尋參數驗證
export const searchParamsSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  cities: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timeFilter: z.enum(['today', 'tomorrow', 'this_week', 'this_weekend', 'next_week', 'this_month']).optional(),
  features: z.array(z.string()).optional(),
  sorting: z.enum(['relevance', 'distance', 'popularity', 'date']).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(0.1).max(100).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// 附近活動查詢參數驗證
export const nearbyParamsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(0.1).max(100).default(10),
  limit: z.number().min(1).max(100).default(50)
});

// 活動 ID 驗證
export const activityIdSchema = z.string().min(1, '活動 ID 不能為空');

// 地理座標驗證
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

// 分頁參數驗證
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// 時間範圍驗證
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: '開始日期不能晚於結束日期'
  }
);

// 驗證輔助函數
export function validateSearchParams(params: any) {
  try {
    return searchParamsSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '參數驗證失敗',
        data: error.errors
      });
    }
    throw error;
  }
}

export function validateNearbyParams(params: any) {
  try {
    return nearbyParamsSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '參數驗證失敗',
        data: error.errors
      });
    }
    throw error;
  }
}

export function validateActivityId(id: any) {
  try {
    return activityIdSchema.parse(id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '活動 ID 格式錯誤'
      });
    }
    throw error;
  }
}

export function validateCoordinates(coords: any) {
  try {
    return coordinatesSchema.parse(coords);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '座標格式錯誤',
        data: error.errors
      });
    }
    throw error;
  }
}

export function validatePagination(params: any) {
  try {
    return paginationSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '分頁參數錯誤',
        data: error.errors
      });
    }
    throw error;
  }
}

// API 回應格式化
export function createApiResponse<T>(
  data: T, 
  message?: string, 
  pagination?: any
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    pagination
  };
}

export function createApiError(
  statusCode: number, 
  message: string, 
  details?: any
) {
  throw createError({
    statusCode,
    statusMessage: message,
    data: details
  });
}

// 距離計算工具函數
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371; // 地球半徑 (公里)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

// 時間範圍處理
export function parseDateFilter(timeFilter: string): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date, endDate: Date;

  switch (timeFilter) {
    case 'today':
      startDate = new Date(now);
      endDate = new Date(now);
      break;
    
    case 'tomorrow':
      startDate = new Date(now);
      startDate.setDate(now.getDate() + 1);
      endDate = new Date(startDate);
      break;
    
    case 'this_week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    
    case 'this_weekend':
      startDate = new Date(now);
      startDate.setDate(now.getDate() + (6 - now.getDay())); // 本週六
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1); // 本週日
      break;
    
    case 'next_week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() + (7 - now.getDay()));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    
    default:
      throw createError({
        statusCode: 400,
        statusMessage: '不支援的時間篩選選項'
      });
  }

  return {
    startDate: startDate?.toISOString().split('T')[0] || '',
    endDate: endDate?.toISOString().split('T')[0] || ''
  };
}

// SQL 查詢條件建構器
export function buildWhereConditions(filters: any) {
  const conditions: any[] = [];
  
  // 這裡可以根據需要添加更多條件建構邏輯
  
  return conditions;
}

// 結果格式化工具
export function formatActivityResult(row: any): Activity {
  return {
    id: row.activity.id,
    name: row.activity.name,
    description: row.activity.description,
    summary: row.activity.summary,
    status: row.activity.status as any,
    qualityScore: row.activity.qualityScore,
    createdAt: row.activity.createdAt,
    updatedAt: row.activity.updatedAt,
    location: row.location ? {
      id: row.location.id,
      activityId: row.location.activityId,
      address: row.location.address,
      district: row.location.district,
      city: row.location.city,
      region: row.location.region as any,
      latitude: row.location.latitude,
      longitude: row.location.longitude,
      venue: row.location.venue,
      landmarks: row.location.landmarks ? JSON.parse(row.location.landmarks) : []
    } : undefined,
    time: row.time ? {
      id: row.time.id,
      activityId: row.time.activityId,
      startDate: row.time.startDate,
      endDate: row.time.endDate,
      startTime: row.time.startTime,
      endTime: row.time.endTime,
      timezone: row.time.timezone,
      isRecurring: row.time.isRecurring,
      recurrenceRule: row.time.recurrenceRule ? JSON.parse(row.time.recurrenceRule) : undefined
    } : undefined,
    categories: row.categoryNames ? 
      row.categoryNames.split(',').map((name: string, index: number) => ({
        id: '',
        name: name.trim(),
        slug: row.categorySlugs?.split(',')[index]?.trim() || '',
        colorCode: row.categoryColors?.split(',')[index]?.trim() || '',
        icon: row.categoryIcons?.split(',')[index]?.trim() || ''
      })).filter((cat: any) => cat.name) : []
  };
}