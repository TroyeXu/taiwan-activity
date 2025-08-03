import { ref, computed, onMounted } from 'vue';
import type { Category, ApiResponse } from '~/types';
import { CATEGORIES } from '~/types';

export const useCategories = () => {
  // 響應式狀態
  const categories = ref<Category[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 載入分類列表
  const loadCategories = async () => {
    if (categories.value.length > 0) {
      return; // 已載入，無需重複載入
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<ApiResponse<Category[]>>('/api/categories');
      
      if (response.success) {
        categories.value = response.data;
      } else {
        throw new Error(response.message || '載入分類失敗');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入分類時發生錯誤';
      error.value = errorMessage;
      console.error('載入分類失敗:', err);
      
      // 載入失敗時使用預設分類
      categories.value = Object.entries(CATEGORIES).map(([slug, info]) => ({
        id: slug,
        name: info.name,
        slug,
        colorCode: info.color,
        icon: info.icon
      }));
    } finally {
      loading.value = false;
    }
  };

  // 根據 slug 取得分類
  const getCategoryBySlug = (slug: string): Category | undefined => {
    return categories.value.find(category => category.slug === slug);
  };

  // 根據 ID 取得分類
  const getCategoryById = (id: string): Category | undefined => {
    return categories.value.find(category => category.id === id);
  };

  // 取得分類顏色
  const getCategoryColor = (slug: string): string => {
    const category = getCategoryBySlug(slug);
    return category?.colorCode || CATEGORIES[slug as keyof typeof CATEGORIES]?.color || '#6b7280';
  };

  // 取得分類圖標
  const getCategoryIcon = (slug: string): string => {
    const category = getCategoryBySlug(slug);
    return category?.icon || CATEGORIES[slug as keyof typeof CATEGORIES]?.icon || '📍';
  };

  // 格式化分類顯示
  const formatCategories = (activityCategories: Category[]): string => {
    return activityCategories.map(cat => cat.name).join('、');
  };

  // 分類統計
  const getCategoryStats = (activities: any[]) => {
    const stats: Record<string, { count: number; category: Category }> = {};

    activities.forEach(activity => {
      activity.categories?.forEach((category: Category) => {
        if (!stats[category.slug]) {
          stats[category.slug] = {
            count: 0,
            category
          };
        }
        stats[category.slug]!.count++;
      });
    });

    return Object.values(stats)
      .sort((a, b) => b.count - a.count);
  };

  // 分類篩選幫助函數
  const filterActivitiesByCategory = (activities: any[], categorySlug: string) => {
    return activities.filter(activity =>
      activity.categories?.some((cat: Category) => cat.slug === categorySlug)
    );
  };

  // 取得推薦分類 (基於時間或季節)
  const getRecommendedCategories = (): Category[] => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const season = getSeason(month);

    const seasonalRecommendations: Record<string, string[]> = {
      spring: ['nature', 'romantic', 'art_culture'],
      summer: ['nature', 'cuisine', 'indigenous'],
      autumn: ['traditional', 'art_culture', 'wellness'],
      winter: ['traditional', 'cuisine', 'hakka']
    };

    const recommendedSlugs = seasonalRecommendations[season] || ['nature', 'art_culture'];
    
    return categories.value.filter(cat => 
      recommendedSlugs.includes(cat.slug)
    );
  };

  // 取得季節
  const getSeason = (month: number): string => {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  };

  // 分類搜尋
  const searchCategories = (query: string): Category[] => {
    if (!query.trim()) return categories.value;

    const searchTerm = query.toLowerCase().trim();
    return categories.value.filter(category =>
      category.name.toLowerCase().includes(searchTerm) ||
      category.slug.toLowerCase().includes(searchTerm)
    );
  };

  // 計算屬性
  const categoriesCount = computed(() => categories.value.length);
  const hasCategories = computed(() => categoriesCount.value > 0);
  const isEmpty = computed(() => !loading.value && categoriesCount.value === 0);

  // 分類選項 (用於表單)
  const categoryOptions = computed(() => {
    return categories.value.map(category => ({
      label: `${category.icon} ${category.name}`,
      value: category.slug,
      color: category.colorCode
    }));
  });

  // 分類映射 (用於快速查找)
  const categoryMap = computed(() => {
    const map: Record<string, Category> = {};
    categories.value.forEach(category => {
      map[category.slug] = category;
      map[category.id] = category;
    });
    return map;
  });

  // 熱門分類 (暫時使用預設順序)
  const popularCategories = computed(() => {
    const popularOrder = ['nature', 'art_culture', 'traditional', 'cuisine', 'romantic'];
    const popular: Category[] = [];
    const others: Category[] = [];

    categories.value.forEach(category => {
      const index = popularOrder.indexOf(category.slug);
      if (index !== -1) {
        popular[index] = category;
      } else {
        others.push(category);
      }
    });

    return [...popular.filter(Boolean), ...others];
  });

  // 初始化載入
  onMounted(() => {
    loadCategories();
  });

  return {
    // 狀態
    categories: readonly(categories),
    loading: readonly(loading),
    error: readonly(error),

    // 計算屬性
    categoriesCount,
    hasCategories,
    isEmpty,
    categoryOptions,
    categoryMap,
    popularCategories,

    // 方法
    loadCategories,
    getCategoryBySlug,
    getCategoryById,
    getCategoryColor,
    getCategoryIcon,
    formatCategories,
    getCategoryStats,
    filterActivitiesByCategory,
    getRecommendedCategories,
    searchCategories
  };
};