<template>
  <div class="filter-panel">
    <!-- 手機版篩選標題欄 -->
    <div class="mobile-filter-header md:hidden">
      <div class="px-4 py-3 border-b bg-white">
        <!-- 標題列 -->
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">篩選條件</h3>
          <el-button circle size="small" @click="handleClose">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <!-- 重置和結果顯示 -->
        <div class="flex items-center justify-between">
          <el-button 
            size="small" 
            @click="handleReset"
            :disabled="!hasActiveFilters"
          >
            重置
          </el-button>
          
          <div class="text-sm text-gray-600">
            <template v-if="loading">
              <div class="flex items-center">
                <div class="loading-spinner w-4 h-4 mr-2"></div>
                搜尋中...
              </div>
            </template>
            <template v-else>
              <span class="font-medium text-gray-900">{{ resultCount }}</span> 個結果
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 篩選內容 -->
    <div class="filter-content">
      <!-- 桌面版標題 -->
      <div class="hidden md:flex items-center justify-between mb-6">
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

      <!-- 快速篩選 (口風琴設計) -->
      <div class="mb-6">
        <el-collapse v-model="quickFilterActiveNames" class="quick-filter-collapse">
          <el-collapse-item name="quick-filters">
            <template #title>
              <div class="filter-header quick-filter-header">
                <el-icon><Filter /></el-icon>
                <span class="ml-2">快速篩選</span>
                <el-badge 
                  v-if="quickFilter" 
                  value="✓" 
                  type="primary" 
                  class="ml-auto mr-2"
                />
              </div>
            </template>
            
            <div class="p-4">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                <el-button 
                  :type="quickFilter === 'near' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('near')"
                  class="quick-filter-btn"
                >
                  <el-icon><Location /></el-icon>
                  附近活動
                </el-button>
                <el-button 
                  :type="quickFilter === 'weekend' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('weekend')"
                  class="quick-filter-btn"
                >
                  <el-icon><Calendar /></el-icon>
                  週末活動
                </el-button>
                <el-button 
                  :type="quickFilter === 'free' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('free')"
                  class="quick-filter-btn"
                >
                  <el-icon><Wallet /></el-icon>
                  免費活動
                </el-button>
                <el-button 
                  :type="quickFilter === 'family' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('family')"
                  class="quick-filter-btn"
                >
                  <el-icon><User /></el-icon>
                  親子活動
                </el-button>
                <el-button 
                  :type="quickFilter === 'indoor' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('indoor')"
                  class="quick-filter-btn"
                >
                  <el-icon><House /></el-icon>
                  室內活動
                </el-button>
                <el-button 
                  :type="quickFilter === 'night' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('night')"
                  class="quick-filter-btn"
                >
                  <el-icon><Moon /></el-icon>
                  夜間活動
                </el-button>
                
                <!-- 未來可以增加更多快速篩選選項 -->
                <el-button 
                  :type="quickFilter === 'outdoor' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('outdoor')"
                  class="quick-filter-btn"
                >
                  <el-icon><Collection /></el-icon>
                  戶外活動
                </el-button>
                <el-button 
                  :type="quickFilter === 'cultural' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('cultural')"
                  class="quick-filter-btn"
                >
                  <el-icon><Calendar /></el-icon>
                  文化體驗
                </el-button>
                <el-button 
                  :type="quickFilter === 'food' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('food')"
                  class="quick-filter-btn"
                >
                  <el-icon><Star /></el-icon>
                  美食體驗
                </el-button>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 手機版直接顯示篩選 -->
      <div class="md:hidden space-y-4">
        <!-- 位置篩選 -->
        <div class="filter-section">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-700">位置</h4>
            <el-badge 
              v-if="hasLocationFilter" 
              value="✓" 
              type="primary"
            />
          </div>
          <div class="space-y-3">
            <!-- 位置類型選擇 -->
            <el-radio-group
              v-model="filters.location.type"
              size="small"
              @change="handleLocationTypeChange"
            >
              <el-radio value="current">使用目前位置</el-radio>
              <el-radio value="custom">選擇縣市</el-radio>
            </el-radio-group>

            <!-- 目前位置狀態 -->
            <div
              v-if="filters.location.type === 'current'"
              class="bg-blue-50 p-3 rounded-md"
            >
              <div v-if="coordinates" class="text-sm">
                <p class="text-blue-700 font-medium">📍 已定位</p>
                <p class="text-blue-600 text-xs mt-1">
                  {{ address || '目前位置' }}
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
              </div>
            </div>

            <!-- 縣市選擇 -->
            <div v-else>
              <el-select
                v-model="selectedCity"
                placeholder="選擇縣市"
                filterable
                clearable
                @change="handleCityChange"
                style="width: 100%"
              >
                <el-option
                  v-for="city in cityOptions"
                  :key="city.value"
                  :label="city.label"
                  :value="city.value"
                />
              </el-select>
            </div>

            <!-- 距離範圍 -->
            <div v-if="filters.location.type === 'current'" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-700">搜尋範圍</span>
                <span class="text-sm font-medium text-primary-600">{{ filters.location.radius }} km</span>
              </div>
              <el-slider
                v-model="filters.location.radius"
                :min="1"
                :max="30"
                :marks="{ 2: '2km', 10: '10km', 30: '30km' }"
                @change="handleRadiusChange"
              />
            </div>
          </div>
        </div>

        <!-- 活動類型篩選 -->
        <div class="filter-section">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-700">活動類型</h4>
            <el-badge 
              v-if="filters.categories.length > 0" 
              :value="filters.categories.length" 
              type="primary"
            />
          </div>
          
          <div class="space-y-3">
            <!-- 分類選項 -->
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="category in categoryOptions.slice(0, 6)"
                :key="category.id"
                class="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors text-xs"
              >
                <el-checkbox
                  :model-value="filters.categories.includes(category.id)"
                  @change="(checked: boolean) => handleCategoryToggle(category.id, checked)"
                  size="small"
                />
                <span
                  class="w-4 h-4 rounded-full mr-2 ml-1 flex items-center justify-center text-xs"
                  :style="{ backgroundColor: category.color, color: 'white' }"
                >
                  {{ category.icon }}
                </span>
                <span class="text-xs text-gray-700">{{ category.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 時間篩選 -->
        <div class="filter-section">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-700">活動時間</h4>
            <el-badge 
              v-if="hasDateFilter" 
              value="✓" 
              type="primary"
            />
          </div>
          
          <div class="space-y-3">
            <!-- 快速時間選項 -->
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
            
            <!-- 活動時段 -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-2">活動時段</label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="timeSlot in timeOfDayOptions"
                  :key="timeSlot.value"
                  class="flex items-center text-xs cursor-pointer p-2 hover:bg-gray-50 rounded"
                >
                  <el-checkbox
                    :model-value="filters.timeOfDay.includes(timeSlot.value)"
                    @change="(checked: boolean) => handleTimeSlotToggle(timeSlot.value, checked)"
                    size="small"
                  />
                  <span class="ml-2">{{ timeSlot.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 費用篩選 -->
        <div class="filter-section">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-700">費用</h4>
            <el-badge 
              v-if="hasPriceFilter" 
              value="✓" 
              type="primary"
            />
          </div>
          
          <div>
            <el-radio-group
              v-model="priceType"
              @change="handlePriceTypeChange"
              class="grid grid-cols-2 gap-2"
            >
              <el-radio value="all" class="text-sm">不限</el-radio>
              <el-radio value="free" class="text-sm">免費</el-radio>
              <el-radio value="paid" class="text-sm">收費</el-radio>
            </el-radio-group>
          </div>
        </div>

        <!-- 熱門標籤 -->
        <div class="filter-section">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-gray-700">熱門標籤</h4>
            <el-badge 
              v-if="filters.tags.length > 0" 
              :value="filters.tags.length" 
              type="primary"
            />
          </div>
          
          <div class="flex flex-wrap gap-2">
            <el-tag
              v-for="tag in popularTags.slice(0, 6)"
              :key="tag.id"
              :type="filters.tags.includes(tag.id) ? 'primary' : 'info'"
              :effect="filters.tags.includes(tag.id) ? 'dark' : 'plain'"
              class="cursor-pointer text-xs"
              size="small"
              @click="handleTagToggle(tag.id)"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 桌面版摺疊篩選 -->
      <div class="hidden md:block">
        <el-collapse v-model="activeNames" class="filter-collapse">
          <!-- 桌面版位置篩選 -->
          <el-collapse-item name="location">
            <template #title>
              <div class="filter-header">
                <el-icon><Location /></el-icon>
                <span class="ml-2">位置與距離</span>
                <el-badge 
                  v-if="hasLocationFilter" 
                  value="✓" 
                  type="primary" 
                  class="ml-auto mr-2"
                />
              </div>
            </template>
            
            <div class="p-4 space-y-4">
              <el-radio-group
                v-model="filters.location.type"
                size="small"
                @change="handleLocationTypeChange"
              >
                <el-radio value="current">使用目前位置</el-radio>
                <el-radio value="custom">選擇縣市</el-radio>
              </el-radio-group>
              
              <div
                v-if="filters.location.type === 'current'"
                class="bg-blue-50 p-3 rounded-md"
              >
                <div v-if="coordinates" class="text-sm">
                  <p class="text-blue-700 font-medium">📍 已定位</p>
                  <p class="text-blue-600 text-xs mt-1">
                    {{ address || '目前位置' }}
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
                </div>
              </div>
              
              <div v-else>
                <el-select
                  v-model="selectedCity"
                  placeholder="選擇縣市"
                  filterable
                  clearable
                  @change="handleCityChange"
                  style="width: 100%"
                >
                  <el-option
                    v-for="city in cityOptions"
                    :key="city.value"
                    :label="city.label"
                    :value="city.value"
                  />
                </el-select>
              </div>
              
              <div v-if="filters.location.type === 'current'" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-700">搜尋範圍</span>
                  <span class="text-sm font-medium text-primary-600">{{ filters.location.radius }} km</span>
                </div>
                <el-slider
                  v-model="filters.location.radius"
                  :min="1"
                  :max="30"
                  :marks="{ 2: '2km', 10: '10km', 30: '30km' }"
                  @change="handleRadiusChange"
                />
              </div>
            </div>
          </el-collapse-item>
          
          <!-- 桌面版活動類型 -->
          <el-collapse-item name="categories">
            <template #title>
              <div class="filter-header">
                <el-icon><Collection /></el-icon>
                <span class="ml-2">活動類型</span>
                <el-badge 
                  v-if="filters.categories.length > 0" 
                  :value="filters.categories.length" 
                  type="primary" 
                  class="ml-auto mr-2"
                />
              </div>
            </template>
            
            <div class="p-4">
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
          </el-collapse-item>
          
          <!-- 桌面版時間篩選 -->
          <el-collapse-item name="time">
            <template #title>
              <div class="filter-header">
                <el-icon><Calendar /></el-icon>
                <span class="ml-2">活動時間</span>
                <el-badge 
                  v-if="hasDateFilter" 
                  value="✓" 
                  type="primary" 
                  class="ml-auto mr-2"
                />
              </div>
            </template>
            
            <div class="p-4 space-y-4">
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
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">活動時段</label>
                <div class="grid grid-cols-2 gap-2">
                  <label
                    v-for="timeSlot in timeOfDayOptions"
                    :key="timeSlot.value"
                    class="flex items-center text-sm cursor-pointer p-2 hover:bg-gray-50 rounded"
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
          
          <!-- 桌面版費用篩選 -->
          <el-collapse-item name="price">
            <template #title>
              <div class="filter-header">
                <el-icon><Wallet /></el-icon>
                <span class="ml-2">費用</span>
                <el-badge 
                  v-if="hasPriceFilter" 
                  value="✓" 
                  type="primary" 
                  class="ml-auto mr-2"
                />
              </div>
            </template>
            
            <div class="p-4">
              <el-radio-group
                v-model="priceType"
                @change="handlePriceTypeChange"
              >
                <div class="space-y-2">
                  <el-radio value="all">不限費用</el-radio>
                  <el-radio value="free">免費活動</el-radio>
                  <el-radio value="paid">收費活動</el-radio>
                </div>
              </el-radio-group>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      
    </div>

    <!-- 手機版底部按鈕 -->
    <div class="mobile-filter-footer md:hidden">
      <div class="p-4 border-t bg-white">
        <el-button @click="handleClose" type="primary" class="w-full">
          關閉
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { ElMessage } from 'element-plus';
import { 
  Filter, Location, Collection, Calendar, Setting, Search, Wallet, PriceTag, ArrowUp, ArrowDown,
  Close, Star, User, House, Moon
} from '@element-plus/icons-vue';
import type { FilterState, Tag } from '~/types';

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
  close: [];
  apply: [];
}>();

// Composables
const {
  filters,
  categoryOptions,
  quickTimeOptions,
  timeOfDayOptions,
  featureOptions,
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
const activeNames = ref(['location']);
const quickFilterActiveNames = ref(['quick-filters']); // 預設展開快速篩選
const showMoreTags = ref(false);
const priceRangeValue = ref([0, 5000]);
const quickFilter = ref('');
const selectedCity = ref('');
const selectedDistrict = ref('');
const priceType = ref('all');

// 地區選項
const cityOptions = [
  { value: 'taipei', label: '臺北市' },
  { value: 'newtaipei', label: '新北市' },
  { value: 'taoyuan', label: '桃園市' },
  { value: 'taichung', label: '臺中市' },
  { value: 'tainan', label: '臺南市' },
  { value: 'kaohsiung', label: '高雄市' },
  { value: 'keelung', label: '基隆市' },
  { value: 'hsinchu-city', label: '新竹市' },
  { value: 'hsinchu-county', label: '新竹縣' },
  { value: 'miaoli', label: '苗栗縣' },
  { value: 'changhua', label: '彰化縣' },
  { value: 'nantou', label: '南投縣' },
  { value: 'yunlin', label: '雲林縣' },
  { value: 'chiayi-city', label: '嘉義市' },
  { value: 'chiayi-county', label: '嘉義縣' },
  { value: 'pingtung', label: '屏東縣' },
  { value: 'yilan', label: '宜蘭縣' },
  { value: 'hualien', label: '花蓮縣' },
  { value: 'taitung', label: '臺東縣' },
  { value: 'penghu', label: '澎湖縣' },
  { value: 'kinmen', label: '金門縣' },
  { value: 'lienchiang', label: '連江縣' }
];

const districtOptions = computed(() => {
  // 根據選擇的縣市返回對應的區域
  // 這裡可以根據實際需求加入各縣市的區域數據
  return [];
});

// 增強的特性選項
const enhancedFeatureOptions = [
  { value: 'pet-friendly', label: '寵物友善', icon: '🐶' },
  { value: 'photo-spot', label: '拍照景點', icon: '📸' },
  { value: 'cultural', label: '文化體驗', icon: '🎭' },
  { value: 'adventure', label: '冒險刺激', icon: '🎢' },
  { value: 'educational', label: '教育學習', icon: '🎓' },
  { value: 'romantic', label: '浪漫約會', icon: '💕' },
  { value: 'eco-friendly', label: '環保生態', icon: '🌱' },
  { value: 'local-experience', label: '在地體驗', icon: '🏡' }
];

// 無障礙選項
const accessibilityOptions = [
  { value: 'wheelchair', label: '輪椅可達', icon: '♿' },
  { value: 'parking', label: '無障礙停車位', icon: '🅿' },
  { value: 'restroom', label: '無障礙廁所', icon: '🚻' },
  { value: 'elevator', label: '電梯設施', icon: '🛗' }
];

// 標籤相關
const allTags = ref<Tag[]>([
  { id: 'family', name: '親子活動', slug: 'family', usageCount: 45 },
  { id: 'outdoor', name: '戶外活動', slug: 'outdoor', usageCount: 38 },
  { id: 'indoor', name: '室內活動', slug: 'indoor', usageCount: 32 },
  { id: 'photography', name: '攝影熱點', slug: 'photography', usageCount: 28 },
  { id: 'night', name: '夜間活動', slug: 'night', usageCount: 25 },
  { id: 'weekend', name: '週末限定', slug: 'weekend', usageCount: 22 },
  { id: 'seasonal', name: '季節限定', slug: 'seasonal', usageCount: 20 },
  { id: 'traditional', name: '傳統體驗', slug: 'traditional', usageCount: 18 }
]);

const popularTags = computed(() => 
  allTags.value
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 6)
);

const moreTags = computed(() => 
  allTags.value
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(6)
);

// 計算屬性 - 篩選狀態檢查
const hasLocationFilter = computed(() => 
  filters.value.location.coordinates !== null || selectedCity.value !== ''
);

const hasDateFilter = computed(() => 
  filters.value.dateRange.startDate !== undefined || 
  filters.value.dateRange.quickOption !== ''
);

const hasPriceFilter = computed(() => 
  filters.value.priceRange.min > 0 || 
  filters.value.priceRange.max < 5000 ||
  filters.value.priceRange.includeFreeze
);

const hasFeatureFilter = computed(() => 
  filters.value.features.length > 0 || filters.value.tags.length > 0
);

const hasAdvancedFilter = computed(() => 
  filters.value.timeOfDay.length > 0 || 
  filters.value.accessibility.length > 0 ||
  filters.value.groupSize !== ''
);

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


// 處理價格類型變更
const handlePriceTypeChange = (type: string) => {
  switch (type) {
    case 'free':
      filters.value.priceRange.min = 0;
      filters.value.priceRange.max = 0;
      filters.value.priceRange.includeFreeze = true;
      break;
    case 'paid':
      filters.value.priceRange.min = 1;
      filters.value.priceRange.max = 5000;
      filters.value.priceRange.includeFreeze = false;
      break;
    default:
      filters.value.priceRange.min = 0;
      filters.value.priceRange.max = 5000;
      filters.value.priceRange.includeFreeze = true;
  }
  emitFiltersChange();
};

// 處理價格變更
const handlePriceChange = () => {
  emitFiltersChange();
};

// 處理價格範圍變更
const handlePriceRangeChange = (value: number[]) => {
  filters.value.priceRange.min = value[0];
  filters.value.priceRange.max = value[1];
  emitFiltersChange();
};

// 處理標籤切換
const handleTagToggle = (tagId: string) => {
  const index = filters.value.tags.indexOf(tagId);
  if (index > -1) {
    filters.value.tags.splice(index, 1);
  } else {
    filters.value.tags.push(tagId);
  }
  emitFiltersChange();
};

// 處理重置
const handleReset = () => {
  resetFilters();
  customLocationInput.value = '';
  customDateRange.value = null;
  priceRangeValue.value = [0, 5000];
  showMoreTags.value = false;
  emitFiltersChange();
  ElMessage.success('篩選條件已重置');
};

// 發送篩選變更事件
const emitFiltersChange = () => {
  emit('filtersChange', filters.value);
};

// 手機版關閉處理
const handleClose = () => {
  emit('close');
};

// 手機版套用處理
const handleApply = () => {
  emit('apply');
};

// 快速篩選
const setQuickFilter = (type: string) => {
  if (quickFilter.value === type) {
    quickFilter.value = '';
    resetFilters();
  } else {
    quickFilter.value = type;
    resetFilters();
    
    switch (type) {
      case 'near':
        filters.value.location.type = 'current';
        filters.value.location.radius = 5;
        handleGetCurrentLocation();
        break;
      case 'weekend':
        filters.value.dateRange.type = 'quick';
        filters.value.dateRange.quickOption = 'weekend';
        break;
      case 'free':
        filters.value.priceRange.includeFreeze = true;
        filters.value.priceRange.max = 0;
        break;
      case 'family':
        filters.value.tags = ['family'];
        filters.value.features = ['pet-friendly'];
        break;
      case 'indoor':
        filters.value.tags = ['indoor'];
        break;
      case 'night':
        filters.value.tags = ['night'];
        filters.value.timeOfDay = ['evening', 'night'];
        break;
      case 'outdoor':
        filters.value.tags = ['outdoor'];
        filters.value.features = ['outdoor'];
        break;
      case 'cultural':
        filters.value.categories = ['art_culture'];
        break;
      case 'food':
        filters.value.categories = ['cuisine'];
        break;
    }
    
    emitFiltersChange();
  }
};

// 處理縣市變更
const handleCityChange = (city: string) => {
  selectedDistrict.value = '';
  // 更新位置篩選
  if (city) {
    filters.value.location.type = 'custom';
    // 這裡可以加入地理編碼邏輯
  }
  emitFiltersChange();
};

const handleDistrictChange = (district: string) => {
  // 更新位置篩選
  emitFiltersChange();
};

// 處理無障礙選項
const handleAccessibilityToggle = (value: string, checked: boolean) => {
  if (!filters.value.accessibility) {
    filters.value.accessibility = [];
  }
  
  const index = filters.value.accessibility.indexOf(value);
  if (checked && index === -1) {
    filters.value.accessibility.push(value);
  } else if (!checked && index > -1) {
    filters.value.accessibility.splice(index, 1);
  }
  emitFiltersChange();
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
  @apply bg-white md:rounded-lg md:shadow-soft md:border md:border-gray-200;
  @apply h-full flex flex-col;
}

.mobile-filter-header {
  @apply sticky top-0 bg-white z-10 shadow-sm;
}

.filter-content {
  @apply flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6;
}

.mobile-filter-footer {
  @apply fixed bottom-0 left-0 right-0 bg-white z-10 md:relative;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06);
}

.filter-section {
  @apply bg-white border border-gray-200 rounded-lg p-4 mb-4;
}

.filter-section h4 {
  @apply text-sm font-medium text-gray-800;
}

.filter-collapse {
  @apply border-0;
}

.filter-collapse :deep(.el-collapse-item__header) {
  @apply bg-gray-50 rounded-lg px-4 py-3 mb-2;
}

.filter-collapse :deep(.el-collapse-item__content) {
  @apply p-0;
}

.filter-header {
  @apply flex items-center w-full;
}

/* 快速篩選口風琴樣式 */
.quick-filter-collapse {
  @apply border-0;
}

.quick-filter-collapse :deep(.el-collapse-item__header) {
  @apply bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-3 mb-2 border border-blue-200;
}

.quick-filter-collapse :deep(.el-collapse-item__content) {
  @apply p-0;
}

.quick-filter-header {
  @apply flex items-center w-full;
}

.quick-filter-header span {
  @apply text-blue-800 font-medium;
}

.quick-filter-btn {
  @apply text-xs;
}

/* 載入動畫 */
.loading-spinner {
  @apply animate-spin rounded-full border-2 border-gray-300 border-t-primary-600;
}

/* 響應式調整 */
@media (max-width: 768px) {
  .filter-panel {
    @apply fixed inset-0 z-50;
  }
}
</style>