import { ref, readonly, onMounted } from 'vue';
import type { Activity, SearchFilters, MapCenter } from '~/types';
import { useSqlite } from './useSqlite';

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
  const { getActivities, getActivity, initDatabase } = useSqlite();

  // 響應式狀態
  const activities = ref<Activity[]>([]);
  const loading = ref(false);
  const totalActivities = ref(0);
  const hasMoreActivities = ref(false);
  const currentPage = ref(1);
  const isInitialized = ref(false);

  // 格式化活動資料
  const formatActivity = (row: any): Activity => {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      summary: row.summary || undefined,
      status: row.status || 'active',
      qualityScore: row.qualityScore || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      location: row.latitude && row.longitude ? {
        id: row.locationId || '',
        activityId: row.id,
        address: row.address,
        district: row.district || undefined,
        city: row.city,
        region: row.region || 'north',
        latitude: row.latitude,
        longitude: row.longitude,
        venue: row.venue || undefined,
        landmarks: row.landmarks ? JSON.parse(row.landmarks) : []
      } : undefined,
      time: row.startDate ? {
        id: row.timeId || '',
        activityId: row.id,
        startDate: row.startDate,
        endDate: row.endDate,
        startTime: row.startTime,
        endTime: row.endTime,
        timezone: row.timezone || 'Asia/Taipei',
        isRecurring: row.isRecurring || false,
        recurrenceRule: row.recurrenceRule ? JSON.parse(row.recurrenceRule) : undefined
      } : undefined,
      categories: row.categories ? 
        row.categories.split(',').map((name: string) => ({
          id: '',
          name: name.trim(),
          slug: name.trim().toLowerCase(),
          colorCode: '#3B82F6',
          icon: '📍'
        })).filter((cat: any) => cat.name) : []
    };
  };

  // 初始化資料庫
  const initialize = async () => {
    if (isInitialized.value) return;
    
    loading.value = true;
    try {
      await initDatabase();
      isInitialized.value = true;
    } catch (error) {
      console.error('初始化資料庫失敗:', error);
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
        offset
      });

      const formattedResults = results.map(formatActivity);

      if (reset || page === 1) {
        activities.value = formattedResults;
      } else {
        activities.value.push(...formattedResults);
      }

      // 簡單估算總數
      totalActivities.value = results.length < pageSize ? 
        offset + results.length : 
        (offset + results.length) * 2;
      
      hasMoreActivities.value = results.length === pageSize;
      currentPage.value = page;

    } catch (error) {
      console.error('載入活動失敗:', error);
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
      const queryOptions: any = {
        limit: pageSize,
        offset: 0
      };

      if (searchOptions.query) {
        queryOptions.search = searchOptions.query;
      }

      if (searchOptions.filters?.categories?.length) {
        queryOptions.category = searchOptions.filters.categories[0];
      }

      if (searchOptions.filters?.regions?.length) {
        // 根據地區過濾城市
        const regionCityMap: Record<string, string[]> = {
          north: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
          central: ['台中市', '彰化縣', '南投縣', '雲林縣', '苗栗縣'],
          south: ['台南市', '高雄市', '嘉義市', '嘉義縣', '屏東縣'],
          east: ['花蓮縣', '台東縣'],
          island: ['澎湖縣', '金門縣', '連江縣']
        };
        
        const cities = searchOptions.filters.regions
          .flatMap(region => regionCityMap[region] || []);
        
        if (cities.length > 0) {
          queryOptions.city = cities[0]; // SQLite 查詢限制，只用第一個城市
        }
      }

      const results = await getActivities(queryOptions);
      const formattedResults = results.map(formatActivity);

      // 如果有位置篩選，計算距離並排序
      if (searchOptions.location && searchOptions.radius) {
        const { lat, lng } = searchOptions.location;
        const radius = searchOptions.radius;
        
        const filteredResults = formattedResults.filter(activity => {
          if (!activity.location?.latitude || !activity.location?.longitude) return false;
          
          const distance = calculateDistance(
            lat, lng,
            activity.location.latitude,
            activity.location.longitude
          );
          
          return distance <= radius;
        });
        
        // 按距離排序
        filteredResults.sort((a, b) => {
          if (!a.location?.latitude || !a.location?.longitude || !b.location?.latitude || !b.location?.longitude) {
            return 0;
          }
          const distA = calculateDistance(
            lat, lng,
            a.location.latitude,
            a.location.longitude
          );
          const distB = calculateDistance(
            lat, lng,
            b.location.latitude,
            b.location.longitude
          );
          return distA - distB;
        });
        
        activities.value = filteredResults;
      } else {
        activities.value = formattedResults;
      }

      totalActivities.value = activities.value.length;
      hasMoreActivities.value = false; // 客戶端搜尋不分頁
      currentPage.value = 1;

    } catch (error) {
      console.error('搜尋活動失敗:', error);
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
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

  return {
    activities: readonly(activities),
    loading: readonly(loading),
    totalActivities: readonly(totalActivities),
    hasMoreActivities: readonly(hasMoreActivities),
    searchActivities,
    loadMoreActivities,
    refreshActivities,
    loadActivities
  };
};