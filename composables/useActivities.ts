import type { Activity, SearchParams, ApiResponse, PaginationInfo } from '~/types';

interface UseActivitiesOptions {
  immediate?: boolean;
  defaultParams?: Partial<SearchParams>;
}

export const useActivities = (options: UseActivitiesOptions = {}) => {
  const { immediate = false, defaultParams = {} } = options;

  // 響應式狀態
  const activities = ref<Activity[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<PaginationInfo | null>(null);
  const total = ref(0);

  // 搜尋參數
  const searchParams = ref<SearchParams>({
    page: 1,
    limit: 20,
    ...defaultParams
  });

  // 取得活動列表
  const fetchActivities = async (params: Partial<SearchParams> = {}) => {
    if (loading.value) return;

    loading.value = true;
    error.value = null;

    try {
      const mergedParams = { ...searchParams.value, ...params };
      
      const response = await $fetch<ApiResponse<Activity[]>>('/api/activities', {
        query: mergedParams
      });

      if (response.success) {
        activities.value = response.data;
        pagination.value = response.pagination || null;
        total.value = response.pagination?.total || response.data.length;
      } else {
        throw new Error(response.message || '載入活動失敗');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入活動時發生錯誤';
      error.value = errorMessage;
      console.error('Error fetching activities:', err);
    } finally {
      loading.value = false;
    }
  };

  // 搜尋附近活動
  const searchNearby = async (
    coordinates: { lat: number; lng: number },
    radius: number = 10
  ) => {
    return await fetchActivities({
      location: coordinates,
      radius,
      page: 1
    });
  };

  // 進階搜尋
  const advancedSearch = async (filters: Partial<SearchParams>) => {
    searchParams.value = { ...searchParams.value, ...filters, page: 1 };
    return await fetchActivities();
  };

  // 載入更多 (分頁)
  const loadMore = async () => {
    if (!pagination.value || loading.value) return;
    
    const nextPage = pagination.value.page + 1;
    if (nextPage > pagination.value.totalPages) return;

    const currentActivities = [...activities.value];
    
    await fetchActivities({ page: nextPage });
    
    // 合併結果
    activities.value = [...currentActivities, ...activities.value];
  };

  // 重置搜尋
  const resetSearch = async () => {
    searchParams.value = { page: 1, limit: 20, ...defaultParams };
    await fetchActivities();
  };

  // 取得單一活動
  const getActivityById = async (id: string): Promise<Activity | null> => {
    // 先檢查已載入的活動
    const existingActivity = activities.value.find(a => a.id === id);
    if (existingActivity) {
      return existingActivity;
    }

    // 從 API 取得
    try {
      const response = await $fetch<ApiResponse<Activity>>(`/api/activities/${id}`);
      return response.success ? response.data : null;
    } catch (err) {
      console.error('Error fetching activity by ID:', err);
      return null;
    }
  };

  // 重新整理
  const refresh = async () => {
    await fetchActivities();
  };

  // 計算屬性
  const hasMore = computed(() => {
    return pagination.value 
      ? pagination.value.page < pagination.value.totalPages
      : false;
  });

  const isEmpty = computed(() => {
    return !loading.value && activities.value.length === 0;
  });

  const hasError = computed(() => {
    return !!error.value;
  });

  // 監聽搜尋參數變化
  watch(searchParams, (newParams, oldParams) => {
    if (JSON.stringify(newParams) !== JSON.stringify(oldParams)) {
      fetchActivities();
    }
  }, { deep: true });

  // 立即執行
  if (immediate) {
    fetchActivities();
  }

  return {
    // 狀態
    activities: readonly(activities),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),
    total: readonly(total),
    totalActivities: total, // 別名
    searchParams,

    // 計算屬性
    hasMore,
    hasMoreActivities: hasMore, // 別名
    isEmpty,
    hasError,

    // 方法
    fetchActivities,
    searchActivities: advancedSearch, // 別名
    searchNearby,
    advancedSearch,
    loadMore,
    loadMoreActivities: loadMore, // 別名
    resetSearch,
    getActivityById,
    refresh,
    refreshActivities: refresh // 別名
  };
};