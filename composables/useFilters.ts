import type { FilterState } from '~/types';
import { REGIONS, CATEGORIES } from '~/types';

export const useFilters = () => {
  // 預設篩選狀態
  const getDefaultFilters = (): FilterState => ({
    categories: [],
    regions: [],
    cities: [],
    tags: [],
    priceRange: {
      min: 0,
      max: 5000,
      includeFreeze: true
    },
    dateRange: {
      type: 'quick',
      quickOption: 'this_week',
      includeOngoing: true
    },
    location: {
      type: 'current',
      radius: 10
    },
    timeOfDay: [],
    features: [],
    accessibility: [],
    groupSize: '',
    sorting: 'relevance'
  });

  // 篩選狀態
  const filters = ref<FilterState>(getDefaultFilters());
  const isFiltersOpen = ref(false);

  // 分類選項
  const categoryOptions = computed(() => {
    return Object.entries(CATEGORIES).map(([slug, info]) => ({
      id: slug,
      slug,
      name: info.name,
      icon: info.icon,
      color: info.color
    }));
  });

  // 地區選項
  const regionOptions = computed(() => {
    return Object.entries(REGIONS).map(([slug, info]) => ({
      id: slug,
      slug,
      name: info.name,
      cities: info.cities
    }));
  });

  // 快速時間選項
  const quickTimeOptions = [
    { value: 'today', label: '今天' },
    { value: 'tomorrow', label: '明天' },
    { value: 'this_week', label: '本週' },
    { value: 'this_weekend', label: '本週末' },
    { value: 'next_week', label: '下週' },
    { value: 'this_month', label: '本月' }
  ];

  // 時段選項
  const timeOfDayOptions = [
    { value: 'morning', label: '上午 (06:00-12:00)' },
    { value: 'afternoon', label: '下午 (12:00-18:00)' },
    { value: 'evening', label: '晚上 (18:00-24:00)' }
  ];

  // 活動特性選項
  const featureOptions = [
    { value: 'free', label: '免費活動', icon: '🆓' },
    { value: 'paid', label: '付費活動', icon: '💰' },
    { value: 'registration_required', label: '需要報名', icon: '📝' },
    { value: 'walk_in', label: '自由參加', icon: '🚶' },
    { value: 'family', label: '親子活動', icon: '👨‍👩‍👧‍👦' },
    { value: 'couples', label: '情侶約會', icon: '💑' },
    { value: 'indoor', label: '室內活動', icon: '🏠' },
    { value: 'outdoor', label: '戶外活動', icon: '🌳' }
  ];

  // 排序選項
  const sortingOptions = [
    { value: 'relevance', label: '最相關' },
    { value: 'distance', label: '距離最近' },
    { value: 'popularity', label: '最受歡迎' },
    { value: 'date', label: '時間最近' },
    { value: 'price', label: '價格最低' }
  ];

  // 設定分類篩選
  const toggleCategory = (categoryId: string) => {
    const index = filters.value.categories.indexOf(categoryId);
    if (index > -1) {
      filters.value.categories.splice(index, 1);
    } else {
      filters.value.categories.push(categoryId);
    }
  };

  const selectAllCategories = () => {
    filters.value.categories = categoryOptions.value.map(c => c.id);
  };

  const clearCategories = () => {
    filters.value.categories = [];
  };

  // 設定地區篩選
  const toggleRegion = (regionId: string) => {
    const index = filters.value.regions.indexOf(regionId);
    if (index > -1) {
      filters.value.regions.splice(index, 1);
      // 移除該地區的所有城市
      const regionCities = REGIONS[regionId]?.cities || [];
      filters.value.cities = filters.value.cities.filter(
        city => !regionCities.includes(city)
      );
    } else {
      filters.value.regions.push(regionId);
    }
  };

  const toggleCity = (city: string) => {
    const index = filters.value.cities.indexOf(city);
    if (index > -1) {
      filters.value.cities.splice(index, 1);
    } else {
      filters.value.cities.push(city);
    }
  };

  // 設定時間篩選
  const setDateRange = (type: 'quick' | 'custom', options?: any) => {
    filters.value.dateRange.type = type;
    
    if (type === 'quick' && options?.quickOption) {
      filters.value.dateRange.quickOption = options.quickOption;
      filters.value.dateRange.startDate = undefined;
      filters.value.dateRange.endDate = undefined;
    } else if (type === 'custom' && options) {
      filters.value.dateRange.startDate = options.startDate;
      filters.value.dateRange.endDate = options.endDate;
      filters.value.dateRange.quickOption = undefined;
    }
  };

  // 設定位置篩選
  const setLocation = (location: { lat: number; lng: number }, address?: string) => {
    filters.value.location = {
      ...filters.value.location,
      type: 'custom',
      coordinates: location,
      address
    };
  };

  const useCurrentLocation = async () => {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 分鐘
          });
        });

        filters.value.location = {
          type: 'current',
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          radius: filters.value.location.radius
        };

        return true;
      } catch (error) {
        console.error('取得位置失敗:', error);
        return false;
      }
    }
    return false;
  };

  // 設定距離範圍
  const setRadius = (radius: number) => {
    filters.value.location.radius = radius;
  };

  // 切換特性篩選
  const toggleFeature = (feature: string) => {
    const index = filters.value.features.indexOf(feature);
    if (index > -1) {
      filters.value.features.splice(index, 1);
    } else {
      filters.value.features.push(feature);
    }
  };

  // 設定排序
  const setSorting = (sorting: FilterState['sorting']) => {
    filters.value.sorting = sorting;
  };

  // 重置篩選
  const resetFilters = () => {
    filters.value = getDefaultFilters();
  };

  // 清除所有篩選
  const clearAllFilters = () => {
    resetFilters();
  };

  // 儲存篩選偏好
  const saveFiltersToStorage = () => {
    try {
      localStorage.setItem('tourism-filters', JSON.stringify(filters.value));
    } catch (error) {
      console.warn('無法儲存篩選偏好:', error);
    }
  };

  // 載入篩選偏好
  const loadFiltersFromStorage = () => {
    try {
      const saved = localStorage.getItem('tourism-filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        filters.value = { ...getDefaultFilters(), ...parsed };
      }
    } catch (error) {
      console.warn('無法載入篩選偏好:', error);
    }
  };

  // 計算屬性
  const activeFilterCount = computed(() => {
    let count = 0;
    if (filters.value.categories.length > 0) count++;
    if (filters.value.regions.length > 0 || filters.value.cities.length > 0) count++;
    if (filters.value.tags.length > 0) count++;
    if (filters.value.priceRange.min > 0 || filters.value.priceRange.max < 5000) count++;
    if (filters.value.dateRange.type === 'custom') count++;
    if (filters.value.timeOfDay.length > 0) count++;
    if (filters.value.features.length > 0) count++;
    return count;
  });

  const hasActiveFilters = computed(() => {
    return activeFilterCount.value > 0;
  });

  const selectedCategoryNames = computed(() => {
    return filters.value.categories.map(id => {
      const category = categoryOptions.value.find(c => c.id === id);
      return category?.name || id;
    });
  });

  const selectedRegionNames = computed(() => {
    return filters.value.regions.map(id => {
      const region = regionOptions.value.find(r => r.id === id);
      return region?.name || id;
    });
  });

  // 轉換為 API 參數
  const toSearchParams = computed(() => {
    const params: any = {
      sorting: filters.value.sorting
    };

    if (filters.value.categories.length > 0) {
      params.categories = filters.value.categories;
    }

    if (filters.value.regions.length > 0) {
      params.regions = filters.value.regions;
    }

    if (filters.value.cities.length > 0) {
      params.cities = filters.value.cities;
    }

    if (filters.value.location.coordinates) {
      params.location = filters.value.location.coordinates;
      params.radius = filters.value.location.radius;
    }

    if (filters.value.dateRange.type === 'quick' && filters.value.dateRange.quickOption) {
      params.timeFilter = filters.value.dateRange.quickOption;
    } else if (filters.value.dateRange.type === 'custom') {
      if (filters.value.dateRange.startDate) {
        params.startDate = filters.value.dateRange.startDate.toISOString().split('T')[0];
      }
      if (filters.value.dateRange.endDate) {
        params.endDate = filters.value.dateRange.endDate.toISOString().split('T')[0];
      }
    }

    if (filters.value.timeOfDay.length > 0) {
      params.timeOfDay = filters.value.timeOfDay;
    }

    if (filters.value.features.length > 0) {
      params.features = filters.value.features;
    }

    if (filters.value.tags.length > 0) {
      params.tags = filters.value.tags;
    }

    if (filters.value.priceRange.min > 0 || filters.value.priceRange.max < 5000) {
      params.priceRange = {
        min: filters.value.priceRange.min,
        max: filters.value.priceRange.max
      };
    }

    return params;
  });

  // 初始化時載入偏好
  onMounted(() => {
    loadFiltersFromStorage();
  });

  // 監聽篩選變化並儲存
  watch(filters, () => {
    saveFiltersToStorage();
  }, { deep: true });

  return {
    // 狀態
    filters,
    isFiltersOpen,

    // 選項
    categoryOptions,
    regionOptions,
    quickTimeOptions,
    timeOfDayOptions,
    featureOptions,
    sortingOptions,

    // 計算屬性
    activeFilterCount,
    hasActiveFilters,
    selectedCategoryNames,
    selectedRegionNames,
    toSearchParams,

    // 方法
    toggleCategory,
    selectAllCategories,
    clearCategories,
    toggleRegion,
    toggleCity,
    setDateRange,
    setLocation,
    useCurrentLocation,
    setRadius,
    toggleFeature,
    setSorting,
    resetFilters,
    clearAllFilters,
    saveFiltersToStorage,
    loadFiltersFromStorage
  };
};