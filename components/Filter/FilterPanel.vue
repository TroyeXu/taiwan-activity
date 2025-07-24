<template>
  <div class="filter-panel">
    <!-- 面板標題 -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900">篩選條件</h3>
      <div class="flex items-center space-x-2">
        <!-- 篩選計數 -->
        <el-badge
          v-if="activeFilterCount > 0"
          :value="activeFilterCount"
          type="primary"
        >
          <el-icon class="text-gray-500">
            <Filter />
          </el-icon>
        </el-badge>
        <el-icon v-else class="text-gray-500">
          <Filter />
        </el-icon>
        
        <!-- 重置按鈕 -->
        <el-button
          v-if="hasActiveFilters"
          type="text"
          size="small"
          @click="handleReset"
        >
          重置
        </el-button>
      </div>
    </div>

    <!-- 位置篩選 -->
    <div class="filter-section">
      <label class="filter-label">
        <el-icon class="mr-1"><Location /></el-icon>
        位置與距離
      </label>
      
      <div class="space-y-4">
        <!-- 位置類型選擇 -->
        <el-radio-group
          v-model="filters.location.type"
          size="small"
          @change="handleLocationTypeChange"
        >
          <el-radio value="current">使用目前位置</el-radio>
          <el-radio value="custom">手動選擇</el-radio>
        </el-radio-group>

        <!-- 目前位置狀態 -->
        <div
          v-if="filters.location.type === 'current'"
          class="bg-blue-50 p-3 rounded-md"
        >
          <div v-if="coordinates" class="text-sm">
            <p class="text-blue-700 font-medium">📍 已定位</p>
            <p class="text-blue-600 text-xs mt-1">
              {{ address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` }}
            </p>
          </div>
          <div v-else class="text-sm">
            <el-button
              type="primary"
              size="small"
              :loading="locationLoading"
              @click="handleGetCurrentLocation"
            >
              <el-icon class="mr-1"><Location /></el-icon>
              取得位置
            </el-button>
            <p class="text-gray-600 text-xs mt-1">點擊按鈕取得您的位置</p>
          </div>
        </div>

        <!-- 手動輸入位置 -->
        <div v-else class="space-y-2">
          <el-input
            v-model="customLocationInput"
            placeholder="輸入地點名稱或地址"
            :loading="geocodeLoading"
            @input="handleLocationSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <!-- 搜尋建議 -->
          <div
            v-if="locationSuggestions.length > 0"
            class="bg-white border border-gray-200 rounded-md shadow-sm max-h-40 overflow-y-auto"
          >
            <div
              v-for="suggestion in locationSuggestions"
              :key="suggestion.place_id"
              class="p-2 hover:bg-gray-50 cursor-pointer text-sm"
              @click="handleLocationSelect(suggestion)"
            >
              {{ suggestion.description }}
            </div>
          </div>
        </div>

        <!-- 距離範圍 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700">搜尋範圍</span>
            <span class="text-sm font-medium text-primary-600">{{ filters.location.radius }} km</span>
          </div>
          <el-slider
            v-model="filters.location.radius"
            :min="1"
            :max="50"
            :marks="{ 2: '2km', 10: '10km', 30: '30km', 50: '50km' }"
            @change="handleRadiusChange"
          />
        </div>
      </div>
    </div>

    <!-- 活動類型篩選 -->
    <div class="filter-section">
      <label class="filter-label">
        <el-icon class="mr-1"><Collection /></el-icon>
        活動類型
      </label>
      
      <div class="space-y-3">
        <!-- 全選/清除按鈕 -->
        <div class="flex space-x-2">
          <el-button size="small" @click="selectAllCategories">全選</el-button>
          <el-button size="small" @click="clearCategories">清除</el-button>
        </div>

        <!-- 分類選項 -->
        <div class="grid grid-cols-1 gap-2">
          <label
            v-for="category in categoryOptions"
            :key="category.id"
            class="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <el-checkbox
              :model-value="filters.categories.includes(category.id)"
              @change="(checked: boolean) => handleCategoryToggle(category.id, checked)"
            />
            <span
              class="w-6 h-6 rounded-full mr-3 ml-2 flex items-center justify-center text-sm"
              :style="{ backgroundColor: category.color, color: 'white' }"
            >
              {{ category.icon }}
            </span>
            <span class="text-sm text-gray-700">{{ category.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 時間篩選 -->
    <div class="filter-section">
      <label class="filter-label">
        <el-icon class="mr-1"><Calendar /></el-icon>
        活動時間
      </label>
      
      <div class="space-y-4">
        <!-- 時間類型選擇 -->
        <el-radio-group
          v-model="filters.dateRange.type"
          size="small"
          @change="handleTimeTypeChange"
        >
          <el-radio value="quick">快速選項</el-radio>
          <el-radio value="custom">自訂日期</el-radio>
        </el-radio-group>

        <!-- 快速時間選項 -->
        <div v-if="filters.dateRange.type === 'quick'">
          <el-select
            v-model="filters.dateRange.quickOption"
            placeholder="選擇時間範圍"
            style="width: 100%"
            @change="handleQuickTimeChange"
          >
            <el-option
              v-for="option in quickTimeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

        <!-- 自訂日期範圍 -->
        <div v-else class="space-y-2">
          <el-date-picker
            v-model="customDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="開始日期"
            end-placeholder="結束日期"
            format="YYYY/MM/DD"
            style="width: 100%"
            @change="handleDateRangeChange"
          />
          
          <!-- 包含進行中的活動 -->
          <el-checkbox
            v-model="filters.dateRange.includeOngoing"
            @change="handleIncludeOngoingChange"
          >
            包含進行中的活動
          </el-checkbox>
        </div>
      </div>
    </div>

    <!-- 進階篩選 -->
    <div class="filter-section">
      <el-collapse v-model="advancedOpen">
        <el-collapse-item name="advanced">
          <template #title>
            <div class="flex items-center">
              <el-icon class="mr-2"><Setting /></el-icon>
              <span>進階篩選</span>
            </div>
          </template>
          
          <div class="space-y-4">
            <!-- 活動特性 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">活動特性</label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="feature in featureOptions"
                  :key="feature.value"
                  class="flex items-center text-sm cursor-pointer"
                >
                  <el-checkbox
                    :model-value="filters.features.includes(feature.value)"
                    @change="(checked: boolean) => handleFeatureToggle(feature.value, checked)"
                  />
                  <span class="ml-2">{{ feature.icon }} {{ feature.label }}</span>
                </label>
              </div>
            </div>

            <!-- 時段篩選 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">活動時段</label>
              <div class="space-y-1">
                <label
                  v-for="timeSlot in timeOfDayOptions"
                  :key="timeSlot.value"
                  class="flex items-center text-sm cursor-pointer"
                >
                  <el-checkbox
                    :model-value="filters.timeOfDay.includes(timeSlot.value)"
                    @change="(checked: boolean) => handleTimeSlotToggle(timeSlot.value, checked)"
                  />
                  <span class="ml-2">{{ timeSlot.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 結果預覽 -->
    <div class="border-t pt-4 mt-6">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-600">
          <template v-if="loading">
            <div class="flex items-center">
              <div class="loading-spinner w-4 h-4 mr-2"></div>
              搜尋中...
            </div>
          </template>
          <template v-else>
            找到 <span class="font-medium text-gray-900">{{ resultCount }}</span> 個活動
          </template>
        </div>
        
        <!-- 排序選擇 -->
        <el-select
          v-model="filters.sorting"
          size="small"
          style="width: 120px"
          @change="handleSortingChange"
        >
          <el-option
            v-for="option in sortingOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Filter, Location, Collection, Calendar, Setting, Search 
} from '@element-plus/icons-vue';
import type { FilterState } from '~/types';

interface Props {
  loading?: boolean;
  resultCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  resultCount: 0
});

const emit = defineEmits<{
  filtersChange: [filters: FilterState];
}>();

// Composables
const {
  filters,
  categoryOptions,
  quickTimeOptions,
  timeOfDayOptions,
  featureOptions,
  sortingOptions,
  activeFilterCount,
  hasActiveFilters,
  toggleCategory,
  selectAllCategories,
  clearCategories,
  setLocation,
  useCurrentLocation,
  resetFilters
} = useFilters();

const {
  coordinates,
  address,
  getCurrentPosition,
  geocodeAddress
} = useGeolocation();

// 響應式狀態
const customLocationInput = ref('');
const customDateRange = ref<[Date, Date] | null>(null);
const locationSuggestions = ref<any[]>([]);
const locationLoading = ref(false);
const geocodeLoading = ref(false);
const advancedOpen = ref<string[]>([]);

// 處理位置類型變更
const handleLocationTypeChange = async (type: 'current' | 'custom') => {
  if (type === 'current') {
    await handleGetCurrentLocation();
  }
};

// 取得目前位置
const handleGetCurrentLocation = async () => {
  locationLoading.value = true;
  
  try {
    const success = await useCurrentLocation();
    if (success && coordinates.value) {
      ElMessage.success('位置已更新');
      emitFiltersChange();
    } else {
      ElMessage.error('無法取得位置，請檢查瀏覽器權限設定');
    }
  } catch (error) {
    console.error('取得位置失敗:', error);
    ElMessage.error('取得位置失敗');
  } finally {
    locationLoading.value = false;
  }
};

// 處理地點搜尋
const handleLocationSearch = useDebounceFn(async (query: string) => {
  if (!query || query.length < 2) {
    locationSuggestions.value = [];
    return;
  }

  geocodeLoading.value = true;
  
  try {
    // TODO: 實作地點自動完成 API
    // const suggestions = await searchPlaces(query);
    // locationSuggestions.value = suggestions;
    
    // 暫時清空
    locationSuggestions.value = [];
  } catch (error) {
    console.error('地點搜尋失敗:', error);
  } finally {
    geocodeLoading.value = false;
  }
}, 300);

// 選擇地點建議
const handleLocationSelect = async (suggestion: any) => {
  customLocationInput.value = suggestion.description;
  locationSuggestions.value = [];
  
  try {
    const coords = await geocodeAddress(suggestion.description);
    if (coords) {
      setLocation(coords, suggestion.description);
      emitFiltersChange();
      ElMessage.success('地點已設定');
    }
  } catch (error) {
    console.error('地理編碼失敗:', error);
    ElMessage.error('設定地點失敗');
  }
};

// 處理距離變更
const handleRadiusChange = () => {
  emitFiltersChange();
};

// 處理分類切換
const handleCategoryToggle = (categoryId: string, checked: boolean) => {
  toggleCategory(categoryId);
  emitFiltersChange();
};

// 處理時間類型變更
const handleTimeTypeChange = () => {
  emitFiltersChange();
};

// 處理快速時間選項變更
const handleQuickTimeChange = () => {
  emitFiltersChange();
};

// 處理日期範圍變更
const handleDateRangeChange = (dates: [Date, Date] | null) => {
  if (dates) {
    filters.value.dateRange.startDate = dates[0];
    filters.value.dateRange.endDate = dates[1];
  } else {
    filters.value.dateRange.startDate = undefined;
    filters.value.dateRange.endDate = undefined;
  }
  emitFiltersChange();
};

// 處理包含進行中活動變更
const handleIncludeOngoingChange = () => {
  emitFiltersChange();
};

// 處理特性切換
const handleFeatureToggle = (feature: string, checked: boolean) => {
  const index = filters.value.features.indexOf(feature);
  if (checked && index === -1) {
    filters.value.features.push(feature);
  } else if (!checked && index > -1) {
    filters.value.features.splice(index, 1);
  }
  emitFiltersChange();
};

// 處理時段切換
const handleTimeSlotToggle = (timeSlot: string, checked: boolean) => {
  const index = filters.value.timeOfDay.indexOf(timeSlot);
  if (checked && index === -1) {
    filters.value.timeOfDay.push(timeSlot);
  } else if (!checked && index > -1) {
    filters.value.timeOfDay.splice(index, 1);
  }
  emitFiltersChange();
};

// 處理排序變更
const handleSortingChange = () => {
  emitFiltersChange();
};

// 處理重置
const handleReset = () => {
  resetFilters();
  customLocationInput.value = '';
  customDateRange.value = null;
  emitFiltersChange();
  ElMessage.success('篩選條件已重置');
};

// 發送篩選變更事件
const emitFiltersChange = () => {
  emit('filtersChange', filters.value);
};

// 監聽自訂日期範圍變更
watch(customDateRange, (newRange) => {
  if (newRange) {
    handleDateRangeChange(newRange);
  }
});

// 初始化
onMounted(() => {
  // 發送初始篩選狀態
  emitFiltersChange();
});
</script>

<style scoped>
.filter-panel {
  @apply bg-white rounded-lg shadow-soft border border-gray-200 p-6;
}

.filter-section {
  @apply mb-6 last:mb-0;
}

.filter-label {
  @apply flex items-center text-sm font-medium text-gray-700 mb-3;
}
</style>