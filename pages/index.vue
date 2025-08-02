<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 頁面標題 -->
    <div class="bg-white shadow-sm">
      <!-- 手機版標題 -->
      <div class="md:hidden">
        <!-- 定位按鈕 (只在未取得位置時顯示) -->
        <div v-if="!hasLocation" class="flex justify-center py-2 bg-blue-50 border-b">
          <ElButton 
            type="primary" 
            size="small"
            @click="getCurrentLocation"
            :loading="locationLoading"
          >
            <template #icon><Location /></template>
            取得目前位置
          </ElButton>
        </div>
        
        <!-- 標題區域 -->
        <div class="text-center py-3 px-4">
          <div class="flex flex-col items-center gap-1">
            <ElIcon class="text-primary-600" size="24"><LocationFilled /></ElIcon>
            <h1 class="text-xl font-bold text-gray-900 leading-tight">
              台灣觀光活動地圖
            </h1>
          </div>
        </div>
        
      </div>
      
      <!-- 桌面版標題 -->
      <div class="hidden md:block">
        <div class="px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <ElIcon><LocationFilled /></ElIcon>
            <h1 class="text-xl font-semibold text-gray-800">台灣觀光活動地圖</h1>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- 定位按鈕 (只在未取得位置時顯示) -->
            <ElButton 
              v-if="!hasLocation"
              type="primary" 
              @click="getCurrentLocation"
              :loading="locationLoading"
              class="px-4 py-2"
            >
              <template #icon><Location /></template>
              取得目前位置
            </ElButton>
            
            <ElButton 
              type="primary" 
              @click="showFilter = !showFilter"
              class="px-4 py-2"
            >
              <template #icon>
                <component :is="showFilter ? Hide : Filter" />
              </template>
              {{ showFilter ? '隱藏篩選' : '顯示篩選' }}
            </ElButton>
            
            <ElButton 
              @click="showFavorites = true"
              class="px-4 py-2"
            >
              <template #icon><Star /></template>
              我的收藏
            </ElButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="flex" style="height: calc(100vh - 120px);">
      <!-- 篩選面板 -->
      <ElAside 
        v-if="showFilter" 
        width="380px" 
        class="hidden md:block bg-white border-r border-gray-200 overflow-y-auto"
      >
        <FilterPanel 
          v-model:filters="searchFilters"
          @filter-change="handleFilterChange"
          @clear-filters="clearFilters"
          @close="showFilter = false"
        />
      </ElAside>

      <!-- 地圖和活動列表 -->
      <ElMain class="p-0">
        <div class="h-full flex flex-col">
          <!-- 搜尋列 -->
          <div class="bg-white border-b border-gray-200 px-4 py-3">
            <ElInput
              v-model="searchQuery"
              placeholder="搜尋活動名稱、地點或關鍵字..."
              size="large"
              clearable
              class="search-input"
              @input="handleSearch"
              @clear="clearSearch"
            >
              <template #prefix>
                <ElIcon><Search /></ElIcon>
              </template>
            </ElInput>
          </div>

          <!-- 檢視切換標籤 -->
          <div class="bg-white border-b border-gray-200">
            <div class="px-4 py-1">
              <ElTabs v-model="viewMode" class="view-mode-tabs">
                <ElTabPane label="地圖" name="map">
                  <template #label>
                    <div class="flex items-center gap-2">
                      <ElIcon><Location /></ElIcon>
                      <span>地圖</span>
                    </div>
                  </template>
                </ElTabPane>
                <ElTabPane label="列表" name="list">
                  <template #label>
                    <div class="flex items-center gap-2">
                      <ElIcon><List /></ElIcon>
                      <span>列表</span>
                    </div>
                  </template>
                </ElTabPane>
              </ElTabs>
            </div>
          </div>

          <!-- 檢視內容區域 -->
          <div class="flex-1 relative">

            <!-- 地圖檢視 -->
            <div 
              v-show="viewMode === 'map'" 
              class="w-full h-full"
            >
              <ActivityMap
                :activities="(activities as any) || []"
                :center="mapCenter"
                :zoom="mapZoom"
                :show-category-filter="false"
                :show-stats="false"
                @activity-click="handleMarkerClick"
                @center-changed="(center) => handleMapMove(center)"
                @map-ready="(map) => mapInstance = map"
              />
            </div>

            <!-- 活動列表檢視 -->
            <div 
              v-show="viewMode === 'list'"
              class="w-full h-full overflow-y-auto bg-gray-50"
            >
              <div class="p-4">
                <!-- 載入中狀態 -->
                <div v-if="loading" class="space-y-4">
                  <ElCard v-for="i in 6" :key="i" class="mb-4">
                    <ElSkeleton :rows="3" animated />
                  </ElCard>
                </div>

                <!-- 搜尋結果 -->
                <div v-else-if="activities.length > 0" class="space-y-4">
                  <!-- 排序選項 -->
                  <div class="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg">
                    <div class="text-sm text-gray-600">
                      找到 {{ totalActivities }} 個活動
                    </div>
                    <ElSelect
                      v-model="currentSorting"
                      @change="handleSortingChange"
                      style="width: 160px"
                      size="small"
                    >
                      <ElOption
                        v-for="option in sortingOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </ElSelect>
                  </div>
                  
                  <!-- 活動卡片列表 -->
                  <div class="grid gap-4">
                    <ActivityCard
                      v-for="activity in activities"
                      :key="activity.id"
                      :activity="activity as any"
                      @click="handleActivityClick(activity as any)"
                      class="cursor-pointer hover:shadow-lg transition-shadow"
                    />
                  </div>
                  
                  <!-- 載入更多按鈕 -->
                  <div v-if="hasMoreActivities" class="flex justify-center mt-6">
                    <ElButton
                      @click="loadMoreActivities"
                      :loading="loading"
                      type="primary"
                      size="large"
                    >
                      載入更多活動
                    </ElButton>
                  </div>
                </div>

                <!-- 無結果 -->
                <ElEmpty v-else description="沒有找到符合條件的活動" />
              </div>
            </div>

          </div>
        </div>
      </ElMain>
    </div>

    <!-- 手機版篩選面板 -->
    <ElDrawer
      v-model="showMobileFilter"
      direction="ltr"
      size="100%"
      :with-header="false"
      :show-close="false"
      class="md:hidden"
    >
      <FilterPanel 
        :loading="loading"
        :result-count="totalActivities"
        @filters-change="handleFilterChange"
        @close="showMobileFilter = false"
        @apply="handleMobileFilterApply"
      />
    </ElDrawer>

    <!-- 收藏頁面抽屜 -->
    <ElDrawer
      v-model="showFavorites"
      title="我的收藏"
      size="400px"
      direction="rtl"
    >
      <FavoritesList @activity-click="handleActivityClick" />
    </ElDrawer>

    <!-- 活動詳情對話框 -->
    <ActivityDetailModal
      v-model:visible="showActivityDetail"
      :activity-id="selectedActivityId"
    />
    
    <!-- 手機版 Footer -->
    <div class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div class="flex items-center justify-around">
        <ElButton 
          type="primary" 
          @click="showMobileFilter = true"
          class="flex-1 mr-2"
        >
          <template #icon><Filter /></template>
          篩選
        </ElButton>
        <ElButton 
          @click="showFavorites = true"
          class="flex-1 ml-2"
        >
          <template #icon><Star /></template>
          收藏
        </ElButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn, useThrottleFn } from '@vueuse/core';
import { ElMessage } from 'element-plus';
import { LocationFilled, Search, Hide, Filter, Star, Location, List, Grid, Calendar } from '@element-plus/icons-vue';
import type { Activity, SearchFilters, MapCenter } from '~/types';

// 導入缺失的組件
import ActivityMap from '~/components/Map/ActivityMap.vue';
import ActivityCard from '~/components/Activity/ActivityCard.vue';
import FavoritesList from '~/components/Activity/FavoritesList.vue';
import FilterPanel from '~/components/Filter/FilterPanel.vue';
import ActivityDetailModal from '~/components/Activity/ActivityDetailModal.vue';

// 路由
const route = useRoute();

// 頁面元資料
useHead({
  title: '台灣觀光活動地圖',
  meta: [
    { name: 'description', content: '探索台灣各地精彩的觀光活動，使用互動地圖尋找附近的景點和活動' }
  ]
});

// 響應式狀態
const showFilter = ref(true);
const showFavorites = ref(false);
const showActivityDetail = ref(false);
const selectedActivityId = ref<string>('');
const viewMode = ref<'map' | 'list' | 'calendar'>('map');
const searchQuery = ref('');
const mapInstance = ref<any>();
const currentSorting = ref('relevance');

// 排序選項
const sortingOptions = [
  { value: 'relevance', label: '相關性：最相關' },
  { value: 'distance', label: '距離：近到遠' },
  { value: 'popularity', label: '熱門度：高到低' },
  { value: 'date', label: '日期：近到遠' },
  { value: 'price', label: '價格：低到高' }
];

// 搜尋篩選
const searchFilters = ref<SearchFilters>({
  categories: [],
  regions: [],
  cities: [],
  dateRange: undefined,
  location: undefined,
  radius: 10,
  features: [],
  sorting: 'relevance'
});

// 地圖狀態
const mapCenter = ref<MapCenter>({
  lat: 23.8103,
  lng: 120.9605
});
const mapZoom = ref(7);

// 使用 composables
const {
  activities,
  loading,
  totalActivities,
  hasMoreActivities,
  searchActivities,
  loadMoreActivities,
  refreshActivities
} = useActivities({
  autoLoad: false, // 不自動載入，讓地圖先顯示
  pageSize: 20
});

const { getCurrentPosition, hasLocation, coordinates } = useGeolocation();

// 定位功能
const locationLoading = ref(false);
const showMobileFilter = ref(false);

const getCurrentLocation = async () => {
  locationLoading.value = true;
  try {
    const location = await getCurrentPosition();
    if (location) {
      mapCenter.value = {
        lat: location.lat,
        lng: location.lng
      };
      mapZoom.value = 14;
      
      // 設定位置篩選
      searchFilters.value.location = {
        lat: location.lat,
        lng: location.lng
      };
      
      // 重新搜尋附近活動
      await handleSearch();
      
      ElMessage.success('已取得您的位置並更新搜尋結果');
    }
  } catch (error) {
    console.warn('無法取得使用者位置:', error);
    ElMessage.warning('無法取得位置，請檢查定位權限');
  } finally {
    locationLoading.value = false;
  }
};

// 監聽位置狀態變化，自動更新地圖中心
watch(coordinates, (newCoords) => {
  if (newCoords) {
    mapCenter.value = {
      lat: newCoords.lat,
      lng: newCoords.lng
    };
    
    // 更新篩選條件
    searchFilters.value.location = {
      lat: newCoords.lat,
      lng: newCoords.lng
    };
  }
}, { immediate: true });

// 頁面載入時取得使用者位置
onMounted(async () => {
  // 先手動載入一些活動數據
  try {
    await searchActivities({});
  } catch (error) {
    console.warn('載入初始活動失敗:', error);
  }
  
  try {
    const location = await getCurrentPosition();
    if (location) {
      mapCenter.value = {
        lat: location.lat,
        lng: location.lng
      };
      mapZoom.value = 12;
      
      // 設定位置篩選
      searchFilters.value.location = {
        lat: location.lat,
        lng: location.lng
      };
      
      // 重新搜尋附近活動
      await handleSearch();
    }
  } catch (error) {
    console.warn('無法取得使用者位置:', error);
    // 使用預設位置，但仍然載入活動
    try {
      await searchActivities({});
    } catch (searchError) {
      console.warn('載入預設活動失敗:', searchError);
    }
  }
});

// 搜尋處理
const handleSearch = useDebounceFn(async () => {
  await searchActivities({
    query: searchQuery.value,
    filters: searchFilters.value,
    location: searchFilters.value.location,
    radius: searchFilters.value.radius
  });
}, 300);

// 清除搜尋
const clearSearch = () => {
  searchQuery.value = '';
  handleSearch();
};

// 篩選變更處理
const handleFilterChange = (filters: any) => {
  searchFilters.value = { ...filters };
  handleSearch();
};

// 清除篩選
const clearFilters = () => {
  searchFilters.value = {
    categories: [],
    regions: [],
    cities: [],
    dateRange: undefined,
    location: searchFilters.value.location, // 保留位置資訊
    radius: 10,
    features: [],
    sorting: 'relevance'
  };
  handleSearch();
};

// 地圖標記點擊處理
const handleMarkerClick = (activity: Activity) => {
  selectedActivityId.value = activity.id;
  showActivityDetail.value = true;
};

// 活動項目點擊處理
const handleActivityClick = (activity: Activity) => {
  console.log('handleActivityClick 被觸發:', activity);
  selectedActivityId.value = activity.id;
  showActivityDetail.value = true;
  console.log('設定 selectedActivityId:', selectedActivityId.value);
  console.log('設定 showActivityDetail:', showActivityDetail.value);
};


// 手機版篩選套用
const handleMobileFilterApply = () => {
  showMobileFilter.value = false;
  handleFilterChange(searchFilters.value);
};

// 排序處理
const handleSortingChange = (sorting: string) => {
  currentSorting.value = sorting;
  if (searchFilters.value.sorting !== undefined) {
    searchFilters.value.sorting = sorting as any;
  }
  handleFilterChange(searchFilters.value);
};

// 地圖移動處理（使用 throttle 防止過於頻繁的更新）
const handleMapMove = useThrottleFn((center: MapCenter, zoom?: number) => {
  // 防止微小差異造成不必要的更新
  const currentCenter = mapCenter.value;
  const hasSignificantChange = 
    Math.abs(center.lat - currentCenter.lat) > 0.0001 || 
    Math.abs(center.lng - currentCenter.lng) > 0.0001;
  
  if (hasSignificantChange) {
    mapCenter.value = center;
  }
  
  if (zoom !== undefined && Math.abs(zoom - mapZoom.value) > 0.1) {
    mapZoom.value = zoom;
  }
}, 100);


// 響應式佈局
const isMobile = ref(false);

onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768;
    if (isMobile.value) {
      showFilter.value = false;
    }
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
});


// 監聽查詢參數
watch(() => route.query, (newQuery) => {
  if (newQuery.category) {
    searchFilters.value.categories = Array.isArray(newQuery.category) 
      ? newQuery.category as string[]
      : [newQuery.category as string];
    handleSearch();
  }
}, { immediate: true });
</script>

<style scoped>
/* 檢視模式標籤樣式 */
:deep(.view-mode-tabs .el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

:deep(.view-mode-tabs .el-tabs__nav-wrap) {
  padding: 0;
}

:deep(.view-mode-tabs .el-tabs__nav-scroll) {
  display: flex;
  width: 100%;
}

:deep(.view-mode-tabs .el-tabs__nav) {
  width: 100%;
  display: flex;
}

:deep(.view-mode-tabs .el-tabs__item) {
  flex: 1;
  text-align: center;
  padding: 12px 4px;
  font-weight: 500;
  color: #6b7280;
  border: none;
  border-radius: 0;
  transition: all 0.2s ease;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.view-mode-tabs .el-tabs__item:hover) {
  color: #3b82f6;
  background-color: #f8fafc;
}

:deep(.view-mode-tabs .el-tabs__item:focus) {
  outline: none;
  box-shadow: none;
}

:deep(.view-mode-tabs .el-tabs__item.is-active) {
  color: #3b82f6;
  background-color: #eff6ff;
  border-bottom: 2px solid #3b82f6;
}

:deep(.view-mode-tabs .el-tabs__active-bar) {
  display: none;
}

/* 搜尋框樣式優化 */
:deep(.search-input .el-input__wrapper) {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: none;
  transition: all 0.2s ease;
  background-color: #f9fafb;
}

:deep(.search-input .el-input__wrapper:hover) {
  border-color: #d1d5db;
  background-color: #ffffff;
}

:deep(.search-input.is-focus .el-input__wrapper) {
  border-color: #3b82f6;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:deep(.search-input .el-input__inner) {
  background-color: transparent;
}

:deep(.search-input .el-input__inner::placeholder) {
  color: #9ca3af;
}

/* 按鈕間距調整 */
.el-button + .el-button {
  margin-left: 8px;
}

/* 響應式調整 */
@media (max-width: 768px) {
  :deep(.view-mode-tabs .el-tabs__item) {
    padding: 8px 4px;
    font-size: 14px;
    margin: 0;
  }
  
  .el-button + .el-button {
    margin-left: 6px;
  }
}
</style>