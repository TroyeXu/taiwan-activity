import type { Activity, UserFavorite, ApiResponse } from '~/types';

export const useFavorites = () => {
  // 響應式狀態
  const favorites = ref<Activity[]>([]);
  const favoriteIds = ref<Set<string>>(new Set());
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 從 localStorage 載入收藏（未登入使用者）
  const loadFavoritesFromStorage = () => {
    if (process.client) {
      try {
        const stored = localStorage.getItem('tourism-favorites');
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          favoriteIds.value = new Set(ids);
        }
      } catch (err) {
        console.warn('載入本地收藏失敗:', err);
      }
    }
  };

  // 儲存收藏到 localStorage
  const saveFavoritesToStorage = () => {
    if (process.client) {
      try {
        const ids = Array.from(favoriteIds.value);
        localStorage.setItem('tourism-favorites', JSON.stringify(ids));
      } catch (err) {
        console.warn('儲存本地收藏失敗:', err);
      }
    }
  };

  // 載入收藏列表
  const loadFavorites = async () => {
    loading.value = true;
    error.value = null;

    try {
      // TODO: 如果有登入使用者，從 API 載入
      // const response = await $fetch<ApiResponse<Activity[]>>('/api/user/favorites');
      
      // 暫時從 localStorage 載入收藏 ID，然後取得活動詳情
      loadFavoritesFromStorage();
      
      if (favoriteIds.value.size > 0) {
        const favoriteActivities: Activity[] = [];
        
        // 逐一取得收藏活動的詳細資訊
        for (const id of favoriteIds.value) {
          try {
            const response = await $fetch<ApiResponse<Activity>>(`/api/activities/${id}`);
            if (response.success && response.data) {
              favoriteActivities.push(response.data);
            } else {
              // 如果活動不存在，從收藏中移除
              favoriteIds.value.delete(id);
            }
          } catch (err) {
            console.warn(`載入收藏活動 ${id} 失敗:`, err);
            favoriteIds.value.delete(id);
          }
        }
        
        favorites.value = favoriteActivities;
        saveFavoritesToStorage();
      } else {
        favorites.value = [];
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入收藏失敗';
      error.value = errorMessage;
      console.error('載入收藏失敗:', err);
    } finally {
      loading.value = false;
    }
  };

  // 新增到收藏
  const addToFavorites = async (activity: Activity) => {
    if (favoriteIds.value.has(activity.id)) {
      return; // 已經在收藏中
    }

    loading.value = true;
    error.value = null;

    try {
      // TODO: 如果有登入使用者，向 API 新增收藏
      // await $fetch('/api/user/favorites', {
      //   method: 'POST',
      //   body: { activityId: activity.id }
      // });

      // 本地處理
      favoriteIds.value.add(activity.id);
      
      // 檢查活動是否已在列表中
      const existingIndex = favorites.value.findIndex(fav => fav.id === activity.id);
      if (existingIndex === -1) {
        favorites.value.push(activity);
      }

      saveFavoritesToStorage();

      // 顯示成功訊息
      ElMessage.success('已加入收藏');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加入收藏失敗';
      error.value = errorMessage;
      ElMessage.error(errorMessage);
      console.error('加入收藏失敗:', err);
    } finally {
      loading.value = false;
    }
  };

  // 從收藏移除
  const removeFromFavorites = async (activityId: string) => {
    if (!favoriteIds.value.has(activityId)) {
      return; // 不在收藏中
    }

    loading.value = true;
    error.value = null;

    try {
      // TODO: 如果有登入使用者，向 API 移除收藏
      // await $fetch(`/api/user/favorites/${activityId}`, {
      //   method: 'DELETE'
      // });

      // 本地處理
      favoriteIds.value.delete(activityId);
      favorites.value = favorites.value.filter(fav => fav.id !== activityId);

      saveFavoritesToStorage();

      // 顯示成功訊息
      ElMessage.success('已從收藏移除');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '移除收藏失敗';
      error.value = errorMessage;
      ElMessage.error(errorMessage);
      console.error('移除收藏失敗:', err);
    } finally {
      loading.value = false;
    }
  };

  // 切換收藏狀態
  const toggleFavorite = async (activity: Activity) => {
    if (isFavorite(activity.id)) {
      await removeFromFavorites(activity.id);
    } else {
      await addToFavorites(activity);
    }
  };

  // 檢查是否為收藏
  const isFavorite = (activityId: string): boolean => {
    return favoriteIds.value.has(activityId);
  };

  // 清空所有收藏
  const clearAllFavorites = async () => {
    loading.value = true;
    error.value = null;

    try {
      // TODO: 如果有登入使用者，向 API 清空收藏
      // await $fetch('/api/user/favorites', { method: 'DELETE' });

      // 本地處理
      favoriteIds.value.clear();
      favorites.value = [];
      saveFavoritesToStorage();

      ElMessage.success('已清空所有收藏');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清空收藏失敗';
      error.value = errorMessage;
      ElMessage.error(errorMessage);
      console.error('清空收藏失敗:', err);
    } finally {
      loading.value = false;
    }
  };

  // 匯出收藏列表
  const exportFavorites = () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        favorites: favorites.value.map(activity => ({
          id: activity.id,
          name: activity.name,
          description: activity.description,
          location: activity.location,
          time: activity.time,
          categories: activity.categories
        }))
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `我的收藏_${new Date().toLocaleDateString('zh-TW')}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      ElMessage.success('收藏列表已匯出');
      
    } catch (err) {
      ElMessage.error('匯出失敗');
      console.error('匯出收藏失敗:', err);
    }
  };

  // 收藏統計
  const getFavoritesByCategory = computed(() => {
    const categoryCounts: Record<string, number> = {};
    
    favorites.value.forEach(activity => {
      activity.categories?.forEach(category => {
        categoryCounts[category.name] = (categoryCounts[category.name] || 0) + 1;
      });
    });

    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  const getFavoritesByRegion = computed(() => {
    const regionCounts: Record<string, number> = {};
    
    favorites.value.forEach(activity => {
      const region = activity.location?.region;
      if (region) {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }
    });

    return Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  });

  // 計算屬性
  const favoritesCount = computed(() => favorites.value.length);
  const hasFavorites = computed(() => favoritesCount.value > 0);
  const isEmpty = computed(() => !loading.value && favoritesCount.value === 0);

  // 初始化
  onMounted(() => {
    loadFavorites();
  });

  return {
    // 狀態
    favorites: readonly(favorites),
    favoriteIds: readonly(favoriteIds),
    loading: readonly(loading),
    error: readonly(error),

    // 計算屬性
    favoritesCount,
    favoriteCount: favoritesCount, // 別名
    hasFavorites,
    isEmpty,
    getFavoritesByCategory,
    getFavoritesByRegion,

    // 方法
    loadFavorites,
    refreshFavorites: loadFavorites, // 別名
    addToFavorites,
    addFavorite: addToFavorites, // 別名
    removeFromFavorites,
    removeFavorite: removeFromFavorites, // 別名
    toggleFavorite,
    isFavorite,
    isFavorited: isFavorite, // 別名
    clearAllFavorites,
    clearFavorites: clearAllFavorites, // 別名
    exportFavorites
  };
};