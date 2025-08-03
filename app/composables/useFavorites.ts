import { ref, computed, readonly } from 'vue';
import { ElMessage } from 'element-plus';
import type { Activity, FavoriteActivity } from '~/types';

export const useFavorites = () => {
  // 響應式狀態
  const favorites = ref<FavoriteActivity[]>([]);
  const favoriteIds = ref<Set<string>>(new Set());
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 從 localStorage 載入收藏（未登入使用者）
  const loadFavoritesFromStorage = () => {
    if (import.meta.client) {
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

  // 儲存收藏到 localStorage（完整版本）
  const saveFavoritesToStorage = () => {
    if (import.meta.client) {
      try {
        // 儲存完整的收藏資料
        const favoritesData = favorites.value;
        console.log('準備儲存到 localStorage 的完整收藏資料:', favoritesData.length, '個');
        localStorage.setItem('tourism-favorites-full', JSON.stringify(favoritesData));

        // 同時儲存 ID 列表（向後兼容）
        const ids = Array.from(favoriteIds.value);
        localStorage.setItem('tourism-favorites', JSON.stringify(ids));

        console.log('已儲存完整收藏資料到 localStorage');
      } catch (err) {
        console.warn('儲存本地收藏失敗:', err);
      }
    }
  };

  // 載入收藏列表（純 localStorage 版本）
  const loadFavorites = async () => {
    loading.value = true;
    error.value = null;

    try {
      console.log('開始載入收藏（純 localStorage 模式）...');

      // 從 localStorage 載入完整的收藏資料
      if (import.meta.client) {
        try {
          const storedFavorites = localStorage.getItem('tourism-favorites-full');
          if (storedFavorites) {
            const parsedFavorites = JSON.parse(storedFavorites) as FavoriteActivity[];
            favorites.value = parsedFavorites;

            // 同步更新 favoriteIds
            favoriteIds.value = new Set(parsedFavorites.map((fav) => fav.activityId));

            console.log(`成功載入 ${parsedFavorites.length} 個收藏活動`);
          } else {
            favorites.value = [];
            favoriteIds.value = new Set();
            console.log('沒有收藏的活動');
          }
        } catch (err) {
          console.warn('載入本地收藏失敗:', err);
          favorites.value = [];
          favoriteIds.value = new Set();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入收藏失敗';
      error.value = errorMessage;
      console.error('載入收藏失敗:', err);
      ElMessage.error(errorMessage);
    } finally {
      loading.value = false;
    }
  };

  // 新增到收藏
  const addToFavorites = async (activity: Activity) => {
    console.log('準備加入收藏:', activity.name, activity.id);

    if (favoriteIds.value.has(activity.id)) {
      console.log('活動已在收藏中:', activity.id);
      ElMessage.info('此活動已在收藏中');
      return; // 已經在收藏中
    }

    loading.value = true;
    error.value = null;

    try {
      console.log('開始加入收藏流程...');

      // 本地處理
      favoriteIds.value.add(activity.id);
      console.log('已加入到 favoriteIds:', Array.from(favoriteIds.value));

      // 檢查活動是否已在列表中
      const existingIndex = favorites.value.findIndex((fav) => fav.activityId === activity.id);
      console.log('檢查是否已存在於 favorites 列表中:', existingIndex);

      if (existingIndex === -1) {
        const favoriteActivity: FavoriteActivity = {
          id: `fav_${activity.id}_${Date.now()}`,
          activityId: activity.id,
          userId: null,
          activity: activity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        favorites.value.push(favoriteActivity);
        console.log('已加入到 favorites 列表，目前總數:', favorites.value.length);
      }

      saveFavoritesToStorage();
      console.log('已儲存到 localStorage');

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
    console.log('準備移除收藏:', activityId);

    if (!favoriteIds.value.has(activityId)) {
      console.log('活動不在收藏中:', activityId);
      return; // 不在收藏中
    }

    loading.value = true;
    error.value = null;

    try {
      // 本地處理
      favoriteIds.value.delete(activityId);
      favorites.value = favorites.value.filter((fav) => fav.activityId !== activityId);

      console.log('已移除收藏，剩餘收藏數量:', favorites.value.length);
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
      console.log('準備清空所有收藏');

      // 本地處理
      favoriteIds.value.clear();
      favorites.value = [];
      saveFavoritesToStorage();

      console.log('已清空所有收藏');
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
        favorites: favorites.value.map((favorite) => ({
          id: favorite.activity.id,
          name: favorite.activity.name,
          description: favorite.activity.description,
          location: favorite.activity.location,
          time: favorite.activity.time,
          categories: favorite.activity.categories,
        })),
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

    favorites.value.forEach((favorite) => {
      favorite.activity.categories?.forEach((category) => {
        categoryCounts[category.name] = (categoryCounts[category.name] || 0) + 1;
      });
    });

    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  const getFavoritesByRegion = computed(() => {
    const regionCounts: Record<string, number> = {};

    favorites.value.forEach((favorite) => {
      const region = favorite.activity.location?.region;
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

  // 初始化（只在客戶端載入）
  if (import.meta.client) {
    loadFavoritesFromStorage();
  }

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
    exportFavorites,
  };
};
