import { ref, readonly, onMounted, nextTick } from 'vue';
import type { Activity, SearchFilters, MapCenter } from '~/types';
import { ActivityStatus, Region } from '~/types';
import { useSqlite } from './useSqlite';
import { DatabaseError, DatabaseErrorType } from '~/utils/database-health';

interface UseActivitiesOptions {
  autoLoad?: boolean;
  pageSize?: number;
}

interface SearchOptions {
  query?: string;
  filters?: SearchFilters;
  location?: MapCenter;
  radius?: number;
}

export const useActivitiesClient = (options: UseActivitiesOptions = {}) => {
  const { autoLoad = false, pageSize = 20 } = options;
  const { getActivities, initDatabase, checkHealth, resetDatabase } = useSqlite();

  // 響應式狀態
  const activities = ref<Activity[]>([]);
  const loading = ref(false);
  const totalActivities = ref(0);
  const hasMoreActivities = ref(false);
  const currentPage = ref(1);
  const isInitialized = ref(false);
  const lastError = ref<string | null>(null);
  const retryCount = ref(0);

  // 格式化活動資料 - 支援 snake_case 和 camelCase
  interface ActivityRow {
    // 基本欄位
    id: string;
    name: string;
    description?: string;
    summary?: string;
    status?: string;

    // snake_case 欄位（資料庫）
    quality_score?: number;
    created_at?: string;
    updated_at?: string;

    // camelCase 欄位（相容性）
    qualityScore?: number;
    createdAt?: string;
    updatedAt?: string;

    // 位置相關
    locationId?: string;
    address?: string;
    district?: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
    venue?: string;
    landmarks?: string;

    // 時間相關（snake_case）
    timeId?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    is_recurring?: boolean;
    recurrence_rule?: string;

    // 時間相關（camelCase 相容性）
    isRecurring?: boolean;
    recurrenceRule?: string;

    // 價格相關（snake_case）
    price?: number;
    price_type?: string;
    currency?: string;

    // 價格相關（camelCase 相容性）
    priceType?: string;

    // 熱門度相關（snake_case）
    view_count?: number;
    favorite_count?: number;
    click_count?: number;
    popularity_score?: number;

    // 熱門度相關（camelCase 相容性）
    viewCount?: number;
    favoriteCount?: number;
    clickCount?: number;
    popularityScore?: number;

    // 其他
    categories?: string;
    url?: string;
  }

  const formatActivity = (row: ActivityRow): Activity => {
    // 統一處理資料庫 snake_case 到程式 camelCase 的轉換
    const data: Activity = {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      summary: row.summary || undefined,
      status: (row.status as ActivityStatus) || ActivityStatus.ACTIVE,
      // 處理 snake_case 欄位
      qualityScore: row.quality_score || row.qualityScore || 0,
      createdAt: new Date(row.created_at || row.createdAt),
      updatedAt: new Date(row.updated_at || row.updatedAt),
      // 價格相關欄位
      price: row.price || 0,
      priceType: (row.price_type || row.priceType || 'free') as 'free' | 'paid' | 'donation',
      currency: row.currency || 'TWD',
      // 熱門度相關欄位
      viewCount: row.view_count || row.viewCount || 0,
      favoriteCount: row.favorite_count || row.favoriteCount || 0,
      clickCount: row.click_count || row.clickCount || 0,
      popularityScore: row.popularity_score || row.popularityScore || 0,
      // 位置資訊
      location:
        row.latitude && row.longitude
          ? {
              id: row.locationId || '',
              activityId: row.id,
              address: row.address,
              district: row.district || undefined,
              city: row.city,
              region: (row.region as Region) || Region.NORTH,
              latitude: row.latitude,
              longitude: row.longitude,
              venue: row.venue || undefined,
              landmarks: row.landmarks
                ? typeof row.landmarks === 'string'
                  ? row.landmarks.split(',').map((l) => l.trim())
                  : []
                : [],
            }
          : undefined,
      // 時間資訊
      time: row.start_date
        ? {
            id: row.timeId || '',
            activityId: row.id,
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time,
            endTime: row.end_time,
            timezone: row.timezone || 'Asia/Taipei',
            isRecurring: row.is_recurring || row.isRecurring || false,
            recurrenceRule:
              row.recurrence_rule || row.recurrenceRule
                ? JSON.parse(row.recurrence_rule || row.recurrenceRule)
                : undefined,
          }
        : undefined,
      // 分類資訊
      categories: row.categories
        ? row.categories
            .split(',')
            .map((name: string) => ({
              id: '',
              name: name.trim(),
              slug: name.trim().toLowerCase(),
              colorCode: '#3B82F6',
              icon: '📍',
            }))
            .filter((cat) => cat.name)
        : [],
      // 活動連結（如果資料庫有此欄位）
      url: row.url || undefined,
    };

    return data;
  };

  // 初始化資料庫
  const initialize = async () => {
    if (isInitialized.value) return;

    loading.value = true;
    lastError.value = null;

    try {
      await initDatabase();
      isInitialized.value = true;
      retryCount.value = 0;
    } catch (error) {
      const dbError =
        error instanceof DatabaseError ? error : DatabaseError.fromError(error as Error);

      console.error('初始化資料庫失敗:', dbError);
      lastError.value = dbError.message;

      // 根據錯誤類型決定是否重試
      if (dbError.type === DatabaseErrorType.CONNECTION_FAILED && retryCount.value < 3) {
        retryCount.value++;
        console.log(`🔄 將在 ${retryCount.value * 2} 秒後重試...`);

        setTimeout(() => {
          isInitialized.value = false;
          initialize();
        }, retryCount.value * 2000);
      }

      throw dbError;
    } finally {
      loading.value = false;
    }
  };

  // 載入活動資料
  const loadActivities = async (page = 1, reset = false) => {
    await initialize();

    loading.value = true;

    try {
      const offset = (page - 1) * pageSize;
      const results = await getActivities({
        limit: pageSize,
        offset,
      });

      const formattedResults = results.map((row: any) => formatActivity(row as ActivityRow));

      if (reset || page === 1) {
        activities.value = [...formattedResults];
      } else {
        activities.value = [...activities.value, ...formattedResults];
      }

      // 簡單估算總數
      totalActivities.value =
        results.length < pageSize ? offset + results.length : (offset + results.length) * 2;

      hasMoreActivities.value = results.length === pageSize;
      currentPage.value = page;
      lastError.value = null;
    } catch (error) {
      const dbError =
        error instanceof DatabaseError ? error : DatabaseError.fromError(error as Error);

      console.error('載入活動失敗:', dbError);
      lastError.value = dbError.message;

      // 檢查是否需要重置資料庫
      if (
        dbError.type === DatabaseErrorType.CONNECTION_FAILED ||
        dbError.type === DatabaseErrorType.TIMEOUT
      ) {
        isInitialized.value = false;

        // 嘗試自動修復
        try {
          await resetDatabase();
          // 重試查詢
          return await loadActivities(page, reset);
        } catch (resetError) {
          console.error('重置資料庫失敗:', resetError);
        }
      }

      activities.value = [];
      totalActivities.value = 0;
      hasMoreActivities.value = false;
    } finally {
      loading.value = false;
    }
  };

  // 搜尋活動
  const searchActivities = async (searchOptions: SearchOptions = {}) => {
    await initialize();

    loading.value = true;

    try {
      interface QueryOptions {
        limit: number;
        offset: number;
        search?: string;
        category?: string;
        city?: string;
        cities?: string[];
        region?: string;
        startDate?: string;
        endDate?: string;
        tags?: string[];
      }

      const queryOptions: QueryOptions = {
        limit: pageSize,
        offset: 0,
      };

      if (searchOptions.query) {
        queryOptions.search = searchOptions.query;
      }

      if (searchOptions.filters?.categories?.length) {
        // categories 陣列包含的是 slug，直接使用
        queryOptions.category = searchOptions.filters.categories[0];
      }

      if (searchOptions.filters?.regions?.length) {
        // 直接使用地區篩選
        queryOptions.region = searchOptions.filters.regions[0]; // SQLite 查詢限制，只用第一個地區
      }

      if (searchOptions.filters?.cities?.length) {
        // 如果有指定城市，使用城市篩選
        console.log('城市篩選:', searchOptions.filters.cities);
        // 傳遞所有選中的城市
        queryOptions.cities = searchOptions.filters.cities;
      }

      // 處理日期篩選
      if (searchOptions.filters?.dateRange) {
        const { start, end } = searchOptions.filters.dateRange;

        if (start && end) {
          queryOptions.startDate = start;
          queryOptions.endDate = end;
        }
      }

      // 處理快速日期篩選（來自 FilterState）
      if (searchOptions.filters && 'quickOption' in searchOptions.filters) {
        const quickOption = (searchOptions.filters as any).quickOption;
        if (quickOption) {
          const today = new Date();
          switch (quickOption) {
            case 'today':
              queryOptions.startDate = today.toISOString().split('T')[0];
              queryOptions.endDate = today.toISOString().split('T')[0];
              break;
            case 'tomorrow': {
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              queryOptions.startDate = tomorrow.toISOString().split('T')[0];
              queryOptions.endDate = tomorrow.toISOString().split('T')[0];
              break;
            }
            case 'this-week':
            case 'weekend': {
              const weekEnd = new Date(today);
              weekEnd.setDate(weekEnd.getDate() + (7 - today.getDay()));
              queryOptions.startDate = today.toISOString().split('T')[0];
              queryOptions.endDate = weekEnd.toISOString().split('T')[0];
              break;
            }
            case 'this-month': {
              const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
              const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              queryOptions.startDate = monthStart.toISOString().split('T')[0];
              queryOptions.endDate = monthEnd.toISOString().split('T')[0];
              break;
            }
          }
        }
      }

      // 處理標籤篩選
      if (searchOptions.filters?.tags?.length) {
        queryOptions.tags = searchOptions.filters.tags;
      }

      console.log('搜尋參數:', queryOptions);
      console.log('完整篩選條件:', searchOptions.filters);
      const results = await getActivities(queryOptions);
      console.log('查詢結果數量:', results.length);
      let formattedResults = results.map((row: any) => formatActivity(row as ActivityRow));

      // 在前端進行價格篩選（因為 SQLite 查詢不支援價格範圍）
      if (searchOptions.filters?.priceRange) {
        const { min, max, includeFreeze } = searchOptions.filters.priceRange;
        console.log('價格篩選:', { min, max, includeFreeze });

        formattedResults = formattedResults.filter((activity) => {
          const price = activity.price || 0;
          if (min === 0 && max === 0 && includeFreeze) {
            // 只顯示免費活動
            return price === 0;
          } else if (min > 0) {
            // 只顯示付費活動
            return price >= min && price <= max;
          }
          // 不限價格，顯示所有
          return true;
        });

        console.log('價格篩選後數量:', formattedResults.length);
      }

      // 處理收藏篩選
      if (searchOptions.filters?.showFavoritesOnly) {
        console.log('套用收藏篩選...');
        const { favoriteIds } = useFavorites();
        const favoriteIdSet = favoriteIds.value;
        console.log('目前收藏的 ID:', Array.from(favoriteIdSet));
        console.log('篩選前活動數量:', formattedResults.length);

        formattedResults = formattedResults.filter((activity) => {
          const isFavorited = favoriteIdSet.has(activity.id);
          if (isFavorited) {
            console.log('找到收藏活動:', activity.name, activity.id);
          }
          return isFavorited;
        });

        console.log('收藏篩選後數量:', formattedResults.length);
        console.log(
          '收藏篩選後的活動:',
          formattedResults.map((a) => ({ id: a.id, name: a.name }))
        );
      }

      // 如果有位置篩選，計算距離並排序
      if (searchOptions.location && searchOptions.radius) {
        const { lat, lng } = searchOptions.location;
        const radius = searchOptions.radius;

        const filteredResults = formattedResults.filter((activity) => {
          if (!activity.location?.latitude || !activity.location?.longitude) {
            return false;
          }

          const distance = calculateDistance(
            lat,
            lng,
            activity.location.latitude,
            activity.location.longitude
          );

          return distance <= radius;
        });

        // 如果沒有活動在範圍內，顯示所有活動但按距離排序
        if (filteredResults.length === 0) {
          // 為所有活動計算距離並排序
          formattedResults.forEach((activity) => {
            if (activity.location?.latitude && activity.location?.longitude) {
              const distance = calculateDistance(
                lat,
                lng,
                activity.location.latitude,
                activity.location.longitude
              );
              (activity as any).distance = distance;
            }
          });

          // 按距離排序所有活動
          formattedResults.sort((a, b) => {
            const distA = (a as any).distance || 999999;
            const distB = (b as any).distance || 999999;
            return distA - distB;
          });

          // 使用所有活動
          activities.value = [...formattedResults];
        } else {
          // 按距離排序
          filteredResults.sort((a, b) => {
            if (
              !a.location?.latitude ||
              !a.location?.longitude ||
              !b.location?.latitude ||
              !b.location?.longitude
            ) {
              return 0;
            }
            const distA = calculateDistance(lat, lng, a.location.latitude, a.location.longitude);
            const distB = calculateDistance(lat, lng, b.location.latitude, b.location.longitude);
            return distA - distB;
          });

          // 使用篩選後的活動
          activities.value = [...filteredResults];
        }
      } else {
        // 使用格式化後的活動
        activities.value = [...formattedResults];
      }

      // 強制觸發響應式更新
      await nextTick();

      totalActivities.value = activities.value.length;
      hasMoreActivities.value = activities.value.length === 0 ? false : true;
      currentPage.value = 1;
      lastError.value = null;

      console.log('最終活動數量:', activities.value.length);
    } catch (error) {
      const dbError =
        error instanceof DatabaseError ? error : DatabaseError.fromError(error as Error);

      console.error('搜尋活動失敗:', dbError);
      lastError.value = dbError.message;

      // 針對特定錯誤提供更好的錯誤提示
      if (dbError.type === DatabaseErrorType.QUERY_FAILED) {
        lastError.value = '搜尋查詢失敗，請檢查搜尋條件';
      } else if (dbError.type === DatabaseErrorType.CONNECTION_FAILED) {
        lastError.value = '資料庫連接失敗，請稍後再試';
      }

      activities.value = [];
      totalActivities.value = 0;
      hasMoreActivities.value = false;
    } finally {
      loading.value = false;
    }
  };

  // 計算兩點間距離（公里）
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球半徑（公里）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 載入更多活動
  const loadMoreActivities = async () => {
    if (!hasMoreActivities.value || loading.value) return;

    await loadActivities(currentPage.value + 1, false);
  };

  // 重新整理活動
  const refreshActivities = async () => {
    await loadActivities(1, true);
  };

  // 自動載入
  if (autoLoad) {
    onMounted(() => {
      loadActivities();
    });
  }

  // 檢查資料庫健康狀態
  const checkDatabaseHealth = async () => {
    try {
      const health = await checkHealth();
      return health;
    } catch (error) {
      console.error('健康檢查失敗:', error);
      return {
        status: 'unhealthy' as const,
        message: '無法檢查資料庫狀態',
        timestamp: new Date(),
      };
    }
  };

  return {
    activities: readonly(activities),
    loading: readonly(loading),
    totalActivities: readonly(totalActivities),
    hasMoreActivities: readonly(hasMoreActivities),
    lastError: readonly(lastError),
    searchActivities,
    loadMoreActivities,
    refreshActivities,
    loadActivities,
    checkDatabaseHealth,
    resetDatabase: async () => {
      isInitialized.value = false;
      retryCount.value = 0;
      await resetDatabase();
    },
  };
};
