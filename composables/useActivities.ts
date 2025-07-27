import { ref, readonly, onMounted } from 'vue';
import type { Activity, SearchFilters, MapCenter } from '~/types';

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

export const useActivities = (options: UseActivitiesOptions = {}) => {
  const { autoLoad = false, pageSize = 20 } = options;

  // 響應式狀態
  const activities = ref<Activity[]>([]);
  const loading = ref(false);
  const totalActivities = ref(0);
  const hasMoreActivities = ref(false);
  const currentPage = ref(1);

  // 載入活動資料
  const loadActivities = async (page = 1, reset = false) => {
    loading.value = true;
    
    try {
      const response = await $fetch<{ success: boolean; data: Activity[]; pagination: any }>('/api/activities', {
        query: {
          page,
          limit: pageSize,
        }
      });

      if (reset || page === 1) {
        activities.value = response.data || [];
      } else {
        activities.value.push(...(response.data || []));
      }

      totalActivities.value = response.pagination?.total || response.data?.length || 0;
      hasMoreActivities.value = (response.data?.length || 0) === pageSize;
      currentPage.value = page;

    } catch (error) {
      console.error('載入活動失敗:', error);
      // 設置空數組以防止地圖組件等待
      activities.value = [];
      totalActivities.value = 0;
      hasMoreActivities.value = false;
    } finally {
      loading.value = false;
    }
  };

  // 搜尋活動
  const searchActivities = async (searchOptions: SearchOptions = {}) => {
    loading.value = true;
    
    try {
      // 先嘗試測試 API，如果失敗再嘗試真實 API
      try {
        const testResponse = await $fetch<{ success: boolean; data: Activity[] }>('/api/test');
        if (testResponse.success && testResponse.data) {
          activities.value = testResponse.data;
          totalActivities.value = testResponse.data.length;
          hasMoreActivities.value = false;
          currentPage.value = 1;
          return;
        }
      } catch (testError) {
        console.log('測試 API 不可用，嘗試真實 API');
      }

      const queryParams: any = {
        page: 1,
        limit: pageSize,
      };

      if (searchOptions.query) {
        queryParams.search = searchOptions.query;
      }

      if (searchOptions.filters?.categories?.length) {
        queryParams.categories = searchOptions.filters.categories.join(',');
      }

      if (searchOptions.filters?.regions?.length) {
        queryParams.regions = searchOptions.filters.regions.join(',');
      }

      if (searchOptions.location) {
        queryParams.lat = searchOptions.location.lat;
        queryParams.lng = searchOptions.location.lng;
        queryParams.radius = searchOptions.radius || 10;
      }

      const response = await $fetch<{ success: boolean; data: Activity[]; pagination: any }>('/api/activities', {
        query: queryParams
      });

      activities.value = response.data || [];
      totalActivities.value = response.pagination?.total || response.data?.length || 0;
      hasMoreActivities.value = (response.data?.length || 0) === pageSize;
      currentPage.value = 1;

    } catch (error) {
      console.error('搜尋活動失敗:', error);
      // 設置空數組以防止地圖組件等待
      activities.value = [];
      totalActivities.value = 0;
      hasMoreActivities.value = false;
    } finally {
      loading.value = false;
    }
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