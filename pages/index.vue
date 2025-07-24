<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 頁面標題 -->
    <ElPageHeader @back="false" class="bg-white shadow-sm px-6 py-4">
      <template #title>
        <div class="flex items-center gap-3">
          <ElIcon><LocationFilled /></ElIcon>
          <h1 class="text-xl font-semibold text-gray-800">台灣觀光活動地圖</h1>
        </div>
      </template>
      <template #extra>
        <ElSpace>
          <ElButton 
            type="primary" 
            @click="showFilter = !showFilter"
            :icon="showFilter ? 'Hide' : 'Filter'"
          >
            {{ showFilter ? '隱藏篩選' : '顯示篩選' }}
          </ElButton>
          <ElButton @click="showFavorites = true" :icon="'Star'">
            我的收藏
          </ElButton>
        </ElSpace>
      </template>
    </ElPageHeader>

    <!-- 主要內容區域 -->
    <div class="flex h-[calc(100vh-80px)]">
      <!-- 篩選面板 -->
      <ElAside 
        v-if="showFilter" 
        width="320px" 
        class="bg-white border-r border-gray-200 overflow-y-auto"
      >
        <FilterPanel 
          v-model:filters="searchFilters"
          @filter-change="handleFilterChange"
          @clear-filters="clearFilters"
        />
      </ElAside>

      <!-- 地圖和活動列表 -->
      <ElMain class="p-0">
        <div class="h-full flex flex-col">
          <!-- 搜尋列 -->
          <div class="bg-white border-b border-gray-200 p-4">
            <ElInput
              v-model="searchQuery"
              placeholder="搜尋活動名稱、地點或關鍵字..."
              size="large"
              clearable
              @input="handleSearch"
              @clear="clearSearch"
            >
              <template #prefix>
                <ElIcon><Search /></ElIcon>
              </template>
            </ElInput>
          </div>

          <!-- 地圖和列表切換 -->
          <div class="flex-1 relative">
            <!-- 檢視切換按鈕 -->
            <div class="absolute top-4 right-4 z-10">
              <ElButtonGroup>
                <ElButton 
                  :type="viewMode === 'map' ? 'primary' : 'default'"
                  @click="viewMode = 'map'"
                  :icon="'Location'"
                >
                  地圖
                </ElButton>
                <ElButton 
                  :type="viewMode === 'list' ? 'primary' : 'default'"
                  @click="viewMode = 'list'"
                  :icon="'List'"
                >
                  列表
                </ElButton>
                <ElButton 
                  :type="viewMode === 'split' ? 'primary' : 'default'"
                  @click="viewMode = 'split'"
                  :icon="'Grid'"
                >
                  分割
                </ElButton>
              </ElButtonGroup>
            </div>

            <!-- 地圖檢視 -->
            <div 
              v-show="viewMode === 'map' || viewMode === 'split'" 
              :class="viewMode === 'split' ? 'w-1/2 h-full float-left' : 'w-full h-full'"
            >
              <ActivityMap
                :activities="activities"
                :loading="loading"
                :center="mapCenter"
                :zoom="mapZoom"
                @marker-click="handleMarkerClick"
                @map-move="handleMapMove"
              />
            </div>

            <!-- 活動列表檢視 -->
            <div 
              v-show="viewMode === 'list' || viewMode === 'split'"
              :class="viewMode === 'split' ? 'w-1/2 h-full float-right overflow-y-auto' : 'w-full h-full overflow-y-auto'"
              class="bg-gray-50"
            >
              <div class="p-4">
                <!-- 載入中狀態 -->
                <div v-if="loading" class="space-y-4">
                  <ElCard v-for="i in 6" :key="i" class="mb-4">
                    <ElSkeleton :rows="3" animated />
                  </ElCard>
                </div>

                <!-- 搜尋結果 -->
                <div v-else-if="activities.length > 0">
                  <div class="mb-4 text-gray-600">
                    找到 {{ totalActivities }} 個活動
                  </div>
                  <ActivityList
                    :activities="activities"
                    @activity-click="handleActivityClick"
                    @load-more="loadMoreActivities"
                    :has-more="hasMoreActivities"
                  />
                </div>

                <!-- 無結果 -->
                <ElEmpty v-else description="沒有找到符合條件的活動" />
              </div>
            </div>
          </div>
        </div>
      </ElMain>
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { LocationFilled, Search } from '@element-plus/icons-vue';
import type { Activity, SearchFilters, MapCenter } from '~/types';

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
const viewMode = ref<'map' | 'list' | 'split'>('map');
const searchQuery = ref('');

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
const mapZoom = ref(8);

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
  autoLoad: true,
  pageSize: 20
});

const { getUserLocation } = useGeolocation();

// 頁面載入時取得使用者位置
onMounted(async () => {
  try {
    const location = await getUserLocation();
    if (location) {
      mapCenter.value = {
        lat: location.latitude,
        lng: location.longitude
      };
      mapZoom.value = 12;
      
      // 設定位置篩選
      searchFilters.value.location = {
        lat: location.latitude,
        lng: location.longitude
      };
      
      // 重新搜尋附近活動
      await handleSearch();
    }
  } catch (error) {
    console.warn('無法取得使用者位置:', error);
    // 使用預設位置
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
const handleFilterChange = (filters: SearchFilters) => {
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
  selectedActivityId.value = activity.id;
  showActivityDetail.value = true;
};

// 地圖移動處理
const handleMapMove = (center: MapCenter, zoom: number) => {
  mapCenter.value = center;
  mapZoom.value = zoom;
};

// 響應式佈局
const isMobile = ref(false);

onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768;
    if (isMobile.value) {
      showFilter.value = false;
      viewMode.value = 'map';
    }
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
  });
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
.float-left {
  float: left;
}

.float-right {
  float: right;
}

@media (max-width: 768px) {
  .float-left,
  .float-right {
    float: none !important;
    width: 100% !important;
  }
}
</style>