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
          <el-button size="small" @click="handleReset" :disabled="!hasActiveFilters">
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
          <el-icon class="text-gray-500">
            <Filter />
          </el-icon>

          <!-- 重置按鈕 -->
          <el-button v-if="hasActiveFilters" type="text" size="small" @click="handleReset">
            重置
          </el-button>
        </div>
      </div>

      <!-- 快速篩選 (口風琴設計) -->
      <div class="mb-3">
        <el-collapse v-model="quickFilterActiveNames" class="quick-filter-collapse">
          <el-collapse-item name="quick-filters">
            <template #title>
              <div class="filter-header quick-filter-header">
                <el-icon><Filter /></el-icon>
                <span class="ml-2">快速篩選</span>
              </div>
            </template>

            <div class="p-4">
              <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                <el-button
                  :type="quickFilter === 'today' ? 'primary' : 'default'"
                  size="small"
                  @click="setQuickFilter('today')"
                  class="quick-filter-btn ml-3"
                >
                  <el-icon><Calendar /></el-icon>
                  今天
                </el-button>
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

      <!-- 手機版口風琴篩選 -->
      <div class="md:hidden">
        <el-collapse v-model="mobileActiveNames" class="mobile-filter-collapse">
          <!-- 位置篩選 -->
          <el-collapse-item name="location">
            <template #title>
              <div class="filter-header">
                <el-icon><Location /></el-icon>
                <span class="ml-2">位置與距離</span>
                <el-badge v-if="hasLocationFilter" value="✓" type="primary" class="ml-auto mr-2" />
              </div>
            </template>

            <div class="p-4 space-y-4">
              <!-- 距離顯示設定 -->
              <div>
                <h5 class="text-sm font-medium text-gray-700 mb-2">距離顯示</h5>
                <p class="text-xs text-gray-500 mb-3">開啟後將顯示您與各活動的距離</p>

                <div class="bg-blue-50 p-3 rounded-md">
                  <div v-if="coordinates" class="text-sm">
                    <p class="text-blue-700 font-medium">📍 定位成功</p>
                    <div class="mt-2">
                      <el-switch
                        v-model="showDistance"
                        @change="handleDistanceToggle"
                        active-text="顯示距離"
                        inactive-text="隱藏距離"
                        size="small"
                      />
                    </div>
                  </div>
                  <div v-else class="text-sm space-y-2">
                    <div v-if="locationError" class="text-red-600 text-xs bg-red-50 p-2 rounded">
                      {{ locationError }}
                    </div>
                    <p v-else class="text-gray-600 text-xs">點擊下方按鈕開始定位</p>

                    <el-button
                      type="primary"
                      size="small"
                      :loading="locationLoading"
                      @click="handleGetCurrentLocation"
                      class="w-full"
                    >
                      <el-icon class="mr-1"><Location /></el-icon>
                      {{ locationLoading ? '定位中...' : locationError ? '重新定位' : '開始定位' }}
                    </el-button>

                    <div v-if="locationError" class="text-xs text-gray-500">
                      <p class="font-medium">如果定位失敗，請嘗試：</p>
                      <ul class="list-disc list-inside mt-1 space-y-1">
                        <li>確認瀏覽器允許此網站使用定位服務</li>
                        <li>檢查設備的定位服務是否開啟</li>
                        <li>嘗試重新整理頁面</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 地區篩選 -->
              <div>
                <h5 class="text-sm font-medium text-gray-700 mb-2">地區篩選</h5>
                <p class="text-xs text-gray-500 mb-3">選擇特定縣市來篩選活動</p>

                <el-select
                  v-model="selectedCity"
                  placeholder="選擇縣市"
                  filterable
                  clearable
                  @change="handleCityChange"
                  style="width: 100%"
                  size="small"
                >
                  <el-option
                    v-for="city in cityOptions"
                    :key="city.value"
                    :label="city.label"
                    :value="city.value"
                  />
                </el-select>
              </div>

              <!-- 距離範圍篩選 -->
              <div v-if="coordinates">
                <h5 class="text-sm font-medium text-gray-700 mb-2">附近活動篩選</h5>
                <p class="text-xs text-gray-500 mb-3">只顯示您附近指定距離內的活動</p>

                <div class="space-y-3">
                  <!-- 啟用/停用距離篩選 -->
                  <el-switch
                    v-model="enableDistanceFilter"
                    @change="handleDistanceFilterToggle"
                    active-text="開啟附近篩選"
                    inactive-text="關閉附近篩選"
                    size="small"
                    class="w-full"
                  />

                  <!-- 距離範圍設定 (只在啟用時顯示) -->
                  <div v-if="enableDistanceFilter" class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">搜尋範圍</span>
                      <span class="text-sm font-medium text-primary-600"
                        >{{ distanceRadius }} km 內</span
                      >
                    </div>
                    <el-slider
                      v-model="distanceRadius"
                      :min="1"
                      :max="30"
                      :marks="{ 5: '5km', 15: '15km', 30: '30km' }"
                      @change="handleDistanceRadiusChange"
                    />
                    <p class="text-xs text-gray-500">
                      將只顯示距離您 {{ distanceRadius }} 公里內的活動
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-item>

          <!-- 活動類型篩選 -->
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
              <!-- 分類選項 -->
              <div class="grid grid-cols-2 gap-3">
                <label
                  v-for="category in categoryOptions"
                  :key="category.id"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                  :class="{
                    'bg-blue-50 border-blue-300': filters.categories.includes(category.id),
                  }"
                >
                  <el-checkbox
                    :model-value="filters.categories.includes(category.id)"
                    @change="
                      (checked: boolean | string | number) =>
                        handleCategoryToggle(category.id, checked)
                    "
                    size="small"
                  />
                  <span
                    class="w-5 h-5 rounded-full mr-2 ml-2 flex items-center justify-center text-sm"
                    :style="{ backgroundColor: category.color, color: 'white' }"
                  >
                    {{ category.icon }}
                  </span>
                  <span class="text-sm text-gray-700 font-medium">{{ category.name }}</span>
                </label>
              </div>
            </div>
          </el-collapse-item>

          <!-- 時間篩選 -->
          <el-collapse-item name="time">
            <template #title>
              <div class="filter-header">
                <el-icon><Calendar /></el-icon>
                <span class="ml-2">活動時間</span>
                <el-badge v-if="hasDateFilter" value="✓" type="primary" class="ml-auto mr-2" />
              </div>
            </template>

            <div class="p-4 space-y-4">
              <!-- 快速時間選項 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">快速選擇</label>
                <div class="grid grid-cols-2 gap-2">
                  <el-button
                    v-for="option in quickTimeButtons"
                    :key="option.value"
                    :type="filters.dateRange.quickOption === option.value ? 'primary' : 'default'"
                    size="small"
                    @click="handleQuickTimeSelect(option.value)"
                    class="text-xs"
                  >
                    {{ option.label }}
                  </el-button>
                </div>
              </div>

              <!-- 月份選擇器 -->
              <div v-if="showMonthSelector">
                <label class="block text-sm font-medium text-gray-700 mb-2">選擇月份</label>
                <div class="grid grid-cols-3 gap-2">
                  <div
                    v-for="(month, index) in monthOptions"
                    :key="index"
                    class="month-selector-item"
                    :class="{
                      selected: selectedMonths.includes(index),
                      'has-activities': month.activityCount > 0,
                    }"
                    @click="toggleMonth(index)"
                  >
                    <div class="month-name">{{ month.name }}</div>
                    <div class="activity-count">{{ month.activityCount }}個</div>
                  </div>
                </div>
              </div>

              <!-- 自訂日期範圍 -->
              <div v-if="showCustomDateRange">
                <label class="block text-sm font-medium text-gray-700 mb-2">自訂日期</label>
                <el-date-picker
                  v-model="customDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="開始日期"
                  end-placeholder="結束日期"
                  @change="handleCustomDateChange"
                  size="small"
                  style="width: 100%"
                />
              </div>
            </div>
          </el-collapse-item>

          <!-- 費用篩選 -->
          <el-collapse-item name="price">
            <template #title>
              <div class="filter-header">
                <el-icon><Wallet /></el-icon>
                <span class="ml-2">費用</span>
                <el-badge v-if="hasPriceFilter" value="✓" type="primary" class="ml-auto mr-2" />
              </div>
            </template>

            <div class="p-4">
              <el-radio-group
                v-model="priceType"
                @change="handlePriceTypeChange"
                class="grid grid-cols-3 gap-2"
              >
                <el-radio value="all" class="text-sm">不限</el-radio>
                <el-radio value="free" class="text-sm">免費</el-radio>
                <el-radio value="paid" class="text-sm">收費</el-radio>
              </el-radio-group>
            </div>
          </el-collapse-item>

          <!-- 熱門標籤 -->
          <el-collapse-item name="tags">
            <template #title>
              <div class="filter-header">
                <el-icon><Star /></el-icon>
                <span class="ml-2">熱門標籤</span>
                <el-badge
                  v-if="filters.tags.length > 0"
                  :value="filters.tags.length"
                  type="primary"
                  class="ml-auto mr-2"
                />
              </div>
            </template>

            <div class="p-4">
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
          </el-collapse-item>
        </el-collapse>
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
              </div>
            </template>

            <div class="p-4 space-y-4">
              <!-- 距離顯示設定 -->
              <div>
                <h5 class="text-sm font-medium text-gray-700 mb-2">距離顯示</h5>
                <p class="text-xs text-gray-500 mb-3">開啟後將顯示您與各活動的距離</p>

                <div class="bg-blue-50 p-3 rounded-md">
                  <div v-if="coordinates" class="text-sm">
                    <p class="text-blue-700 font-medium">📍 定位成功</p>
                    <div class="mt-2">
                      <el-switch
                        v-model="showDistance"
                        @change="handleDistanceToggle"
                        active-text="顯示距離"
                        inactive-text="隱藏距離"
                        size="small"
                      />
                    </div>
                  </div>
                  <div v-else class="text-sm space-y-2">
                    <div v-if="locationError" class="text-red-600 text-xs bg-red-50 p-2 rounded">
                      {{ locationError }}
                    </div>
                    <p v-else class="text-gray-600 text-xs">點擊下方按鈕開始定位</p>

                    <el-button
                      type="primary"
                      size="small"
                      :loading="locationLoading"
                      @click="handleGetCurrentLocation"
                      class="w-full"
                    >
                      <el-icon class="mr-1"><Location /></el-icon>
                      {{ locationLoading ? '定位中...' : locationError ? '重新定位' : '開始定位' }}
                    </el-button>

                    <div v-if="locationError" class="text-xs text-gray-500">
                      <p class="font-medium">如果定位失敗，請嘗試：</p>
                      <ul class="list-disc list-inside mt-1 space-y-1">
                        <li>確認瀏覽器允許此網站使用定位服務</li>
                        <li>檢查設備的定位服務是否開啟</li>
                        <li>嘗試重新整理頁面</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 地區篩選 -->
              <div>
                <h5 class="text-sm font-medium text-gray-700 mb-2">地區篩選</h5>
                <p class="text-xs text-gray-500 mb-3">選擇特定縣市來篩選活動</p>

                <el-select
                  v-model="selectedCity"
                  placeholder="選擇縣市"
                  filterable
                  clearable
                  @change="handleCityChange"
                  style="width: 100%"
                  size="small"
                >
                  <el-option
                    v-for="city in cityOptions"
                    :key="city.value"
                    :label="city.label"
                    :value="city.value"
                  />
                </el-select>
              </div>

              <!-- 距離範圍篩選 -->
              <div v-if="coordinates">
                <h5 class="text-sm font-medium text-gray-700 mb-2">附近活動篩選</h5>
                <p class="text-xs text-gray-500 mb-3">只顯示您附近指定距離內的活動</p>

                <div class="space-y-3">
                  <!-- 啟用/停用距離篩選 -->
                  <el-switch
                    v-model="enableDistanceFilter"
                    @change="handleDistanceFilterToggle"
                    active-text="開啟附近篩選"
                    inactive-text="關閉附近篩選"
                    size="small"
                    class="w-full"
                  />

                  <!-- 距離範圍設定 (只在啟用時顯示) -->
                  <div v-if="enableDistanceFilter" class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">搜尋範圍</span>
                      <span class="text-sm font-medium text-primary-600"
                        >{{ distanceRadius }} km 內</span
                      >
                    </div>
                    <el-slider
                      v-model="distanceRadius"
                      :min="1"
                      :max="30"
                      :marks="{ 5: '5km', 15: '15km', 30: '30km' }"
                      @change="handleDistanceRadiusChange"
                    />
                    <p class="text-xs text-gray-500">
                      將只顯示距離您 {{ distanceRadius }} 公里內的活動
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-item>

          <!-- 桌面版活動類型 -->
          <el-collapse-item name="categories">
            <template #title>
              <div class="filter-header">
                <el-icon><Collection /></el-icon>
                <span class="ml-2">活動類型</span>
              </div>
            </template>

            <div class="p-4">
              <div class="grid grid-cols-2 gap-3">
                <label
                  v-for="category in categoryOptions"
                  :key="category.id"
                  class="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                  :class="{
                    'bg-blue-50 border-blue-300': filters.categories.includes(category.id),
                  }"
                >
                  <el-checkbox
                    :model-value="filters.categories.includes(category.id)"
                    @change="
                      (checked: boolean | string | number) =>
                        handleCategoryToggle(category.id, checked)
                    "
                    size="small"
                  />
                  <span
                    class="w-5 h-5 rounded-full mr-2 ml-2 flex items-center justify-center text-sm"
                    :style="{ backgroundColor: category.color, color: 'white' }"
                  >
                    {{ category.icon }}
                  </span>
                  <span class="text-sm text-gray-700 font-medium">{{ category.name }}</span>
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
              </div>
            </template>

            <div class="p-4 space-y-4">
              <!-- 快速時間選擇 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">快速選擇</label>
                <div class="grid grid-cols-2 gap-2">
                  <el-button
                    v-for="option in quickTimeButtons"
                    :key="option.value"
                    :type="filters.dateRange.quickOption === option.value ? 'primary' : 'default'"
                    size="small"
                    @click="handleQuickTimeSelect(option.value)"
                    class="text-xs"
                  >
                    {{ option.label }}
                  </el-button>
                </div>
              </div>

              <!-- 月份選擇器 -->
              <div v-if="showMonthSelector">
                <label class="block text-sm font-medium text-gray-700 mb-2">選擇月份</label>
                <div class="grid grid-cols-3 gap-2">
                  <div
                    v-for="(month, index) in monthOptions"
                    :key="index"
                    class="month-selector-item"
                    :class="{
                      selected: selectedMonths.includes(index),
                      'has-activities': month.activityCount > 0,
                    }"
                    @click="toggleMonth(index)"
                  >
                    <div class="month-name">{{ month.name }}</div>
                    <div class="activity-count">{{ month.activityCount }}個</div>
                  </div>
                </div>
              </div>

              <!-- 自訂日期範圍 -->
              <div v-if="showCustomDateRange">
                <label class="block text-sm font-medium text-gray-700 mb-2">自訂日期</label>
                <el-date-picker
                  v-model="customDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="開始日期"
                  end-placeholder="結束日期"
                  @change="handleCustomDateChange"
                  size="small"
                  style="width: 100%"
                />
              </div>
            </div>
          </el-collapse-item>

          <!-- 桌面版費用篩選 -->
          <el-collapse-item name="price">
            <template #title>
              <div class="filter-header">
                <el-icon><Wallet /></el-icon>
                <span class="ml-2">費用</span>
              </div>
            </template>

            <div class="p-4">
              <el-radio-group v-model="priceType" @change="handlePriceTypeChange">
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
        <el-button @click="handleClose" type="primary" class="w-full"> 關閉 </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { ElMessage } from 'element-plus';
import {
  Filter,
  Location,
  Collection,
  Calendar,
  Setting,
  Search,
  Wallet,
  PriceTag,
  ArrowUp,
  ArrowDown,
  Close,
  Star,
  User,
  House,
  Moon,
} from '@element-plus/icons-vue';
import type { FilterState, Tag } from '~/types';

interface Props {
  loading?: boolean;
  resultCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  resultCount: 0,
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
  resetFilters,
} = useFilters();

const { coordinates, address, getCurrentPosition, geocodeAddress } = useGeolocation();

// 響應式狀態
const customLocationInput = ref('');
const customDateRange = ref<any>(null);
const locationSuggestions = ref<any[]>([]);
const locationLoading = ref(false);
const geocodeLoading = ref(false);
const activeNames = ref(['location']);
const quickFilterActiveNames = ref([]); // 快速篩選預設收合
const mobileActiveNames = ref(['location', 'categories', 'time', 'price', 'tags']); // 手機版預設全部展開
const showMoreTags = ref(false);
const priceRangeValue = ref([0, 5000]);
const quickFilter = ref('');
const selectedCity = ref<string>('');
const selectedDistrict = ref('');
const priceType = ref('all');
const showMonthSelector = ref(false);
const showCustomDateRange = ref(false);
const selectedMonths = ref<number[]>([]);
const showDistance = ref(false);
const distanceRadius = ref(10);
const enableDistanceFilter = ref(false);
const locationError = ref<string>('');

// 快速時間按鈕選項
const quickTimeButtons = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'weekend', label: '本週末' },
  { value: 'next-week', label: '下週' },
  { value: 'this-month', label: '本月' },
  { value: 'next-month', label: '下月' },
  { value: 'months', label: '選擇月份' },
  { value: 'custom', label: '自訂日期' },
];

// 月份選項
const monthOptions = computed(() => {
  const months = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 12; i++) {
    const monthName = new Date(currentYear, i).toLocaleDateString('zh-TW', { month: 'short' });
    months.push({
      name: monthName,
      activityCount: Math.floor(Math.random() * 50), // 這裡應該是實際的活動數量
    });
  }
  return months;
});

// 地區選項
const cityOptions = [
  { value: '台北市', label: '台北市' },
  { value: '新北市', label: '新北市' },
  { value: '桃園市', label: '桃園市' },
  { value: '台中市', label: '台中市' },
  { value: '台南市', label: '台南市' },
  { value: '高雄市', label: '高雄市' },
  { value: '基隆市', label: '基隆市' },
  { value: '新竹市', label: '新竹市' },
  { value: '新竹縣', label: '新竹縣' },
  { value: '苗栗縣', label: '苗栗縣' },
  { value: '彰化縣', label: '彰化縣' },
  { value: '南投縣', label: '南投縣' },
  { value: '雲林縣', label: '雲林縣' },
  { value: '嘉義市', label: '嘉義市' },
  { value: '嘉義縣', label: '嘉義縣' },
  { value: '屏東縣', label: '屏東縣' },
  { value: '宜蘭縣', label: '宜蘭縣' },
  { value: '花蓮縣', label: '花蓮縣' },
  { value: '台東縣', label: '台東縣' },
  { value: '澎湖縣', label: '澎湖縣' },
  { value: '金門縣', label: '金門縣' },
  { value: '連江縣', label: '連江縣' },
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
  { value: 'local-experience', label: '在地體驗', icon: '🏡' },
];

// 無障礙選項
const accessibilityOptions = [
  { value: 'wheelchair', label: '輪椅可達', icon: '♿' },
  { value: 'parking', label: '無障礙停車位', icon: '🅿' },
  { value: 'restroom', label: '無障礙廁所', icon: '🚻' },
  { value: 'elevator', label: '電梯設施', icon: '🛗' },
];

// 標籤相關
const allTags = ref<Tag[]>([]);

const popularTags = computed(() =>
  allTags.value.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 6)
);

const moreTags = computed(() =>
  allTags.value.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(6)
);

// 計算屬性 - 決定是否顯示活動時段篩選
const showTimeSlotFilter = computed(() => {
  const quickOption = filters.value.dateRange.quickOption;

  // 短期日期範圍才顯示時段篩選
  const shortTermOptions = ['today', 'tomorrow', 'weekend', 'next-week'];

  if (quickOption && shortTermOptions.includes(quickOption)) {
    return true;
  }

  // 如果選擇自訂日期，檢查日期範圍
  if (
    quickOption === 'custom' &&
    filters.value.dateRange.startDate &&
    filters.value.dateRange.endDate
  ) {
    const start = new Date(filters.value.dateRange.startDate);
    const end = new Date(filters.value.dateRange.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

    // 7天以內才顯示時段篩選
    return diffDays <= 7;
  }

  return false;
});

// 計算屬性 - 篩選狀態檢查
const hasLocationFilter = computed(
  () => filters.value.location.coordinates !== null || selectedCity.value !== ''
);

const hasDateFilter = computed(
  () =>
    filters.value.dateRange.startDate !== undefined || filters.value.dateRange.quickOption !== ''
);

const hasPriceFilter = computed(
  () =>
    filters.value.priceRange.min > 0 ||
    filters.value.priceRange.max < 5000 ||
    filters.value.priceRange.includeFreeze
);

const hasFeatureFilter = computed(
  () => filters.value.features.length > 0 || filters.value.tags.length > 0
);

const hasAdvancedFilter = computed(
  () =>
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
  locationError.value = ''; // 清除之前的錯誤

  try {
    // 使用 useGeolocation 組合式函數取得位置
    const result = await getCurrentPosition();

    if (!result) {
      // getCurrentPosition 已經處理了錯誤設定，這裡只需要設定 UI 狀態
      locationError.value = '無法取得位置資訊';
      ElMessage.error('定位失敗，請確認瀏覽器權限設定');
      return;
    }

    // 成功取得位置，coordinates 和 address 已經由 composable 更新
    console.log('定位成功:', result);

    // 清除錯誤狀態
    locationError.value = '';
    ElMessage.success('位置取得成功');
    emitFiltersChange();
  } catch (error: any) {
    console.error('取得位置失敗:', error);
    locationError.value = error.message || '無法取得位置，請檢查瀏覽器權限設定';
    ElMessage.error(error.message || '無法取得位置，請檢查瀏覽器權限設定');
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
const handleCategoryToggle = (categoryId: string, checked: boolean | string | number) => {
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
const handlePriceTypeChange = (type: string | number | boolean | undefined) => {
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
  filters.value.priceRange.min = value[0] ?? 0;
  filters.value.priceRange.max = value[1] ?? 10000;
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
  selectedCity.value = '';
  selectedDistrict.value = '';
  priceType.value = 'all';
  quickFilter.value = '';
  showMonthSelector.value = false;
  showCustomDateRange.value = false;
  selectedMonths.value = [];
  distanceRadius.value = 10;
  enableDistanceFilter.value = false;
  
  console.log('重置所有篩選');
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
      case 'today':
        filters.value.dateRange.type = 'quick';
        filters.value.dateRange.quickOption = 'today';
        break;
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
        filters.value.categories = ['family']; // 使用分類而不是標籤
        filters.value.features = ['pet-friendly'];
        break;
      case 'indoor':
        filters.value.tags = ['indoor']; // 使用實際的 slug
        break;
      case 'night':
        filters.value.tags = ['night']; // 使用實際的 slug
        filters.value.timeOfDay = ['evening', 'night'];
        break;
      case 'outdoor':
        filters.value.tags = ['outdoor']; // 使用實際的 slug
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

// 處理距離顯示切換
const handleDistanceToggle = (show: string | number | boolean) => {
  showDistance.value = Boolean(show);
  emitFiltersChange();
};

// 處理距離範圍變更
const handleDistanceRadiusChange = (radius: number | number[]) => {
  distanceRadius.value = Array.isArray(radius) ? (radius[0] ?? 10) : radius;
  if (enableDistanceFilter.value) {
    emitFiltersChange();
  }
};

// 處理距離篩選切換
const handleDistanceFilterToggle = (enabled: string | number | boolean) => {
  enableDistanceFilter.value = Boolean(enabled);
  emitFiltersChange();
};

// 處理縣市變更
const handleCityChange = (city: string) => {
  selectedCity.value = city;
  selectedDistrict.value = '';
  // 更新城市篩選
  filters.value.cities = city ? [city] : [];
  emitFiltersChange();
};

const handleDistrictChange = (district: string) => {
  // 更新位置篩選
  emitFiltersChange();
};

// 處理快速時間選擇
const handleQuickTimeSelect = (value: string) => {
  filters.value.dateRange.quickOption = value;

  // 重置其他時間選項
  showMonthSelector.value = false;
  showCustomDateRange.value = false;
  selectedMonths.value = [];

  if (value === 'months') {
    showMonthSelector.value = true;
  } else if (value === 'custom') {
    showCustomDateRange.value = true;
  }

  emitFiltersChange();
};

// 處理月份切換
const toggleMonth = (monthIndex: number) => {
  const index = selectedMonths.value.indexOf(monthIndex);
  if (index > -1) {
    selectedMonths.value.splice(index, 1);
  } else {
    selectedMonths.value.push(monthIndex);
  }
  emitFiltersChange();
};

// 處理自訂日期變更
const handleCustomDateChange = (dates: [Date, Date] | null) => {
  if (dates) {
    filters.value.dateRange.startDate = dates[0];
    filters.value.dateRange.endDate = dates[1];
  } else {
    filters.value.dateRange.startDate = undefined;
    filters.value.dateRange.endDate = undefined;
  }
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

// 載入標籤資料
const loadTags = async () => {
  try {
    const { getTags } = useSqlite();
    const tags = await getTags();
    allTags.value = tags.map((tag: any) => ({
      id: tag.slug, // 使用 slug 作為篩選的 ID
      name: tag.name,
      slug: tag.slug,
      usageCount: tag.usage_count || 0,
    }));
  } catch (error) {
    console.error('載入標籤失敗:', error);
  }
};

// 初始化
onMounted(() => {
  // 載入標籤資料
  loadTags();
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
  box-shadow:
    0 -4px 6px -1px rgba(0, 0, 0, 0.1),
    0 -2px 4px -1px rgba(0, 0, 0, 0.06);
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
  @apply bg-gray-50 rounded-lg px-4 py-3 mb-2 border border-gray-200;
}

.quick-filter-collapse :deep(.el-collapse-item__content) {
  @apply p-0;
}

.quick-filter-header {
  @apply flex items-center w-full;
}

.quick-filter-header span {
  @apply text-gray-700 font-medium;
}

.quick-filter-btn {
  @apply text-xs w-full justify-center;
}

/* 手機版口風琴樣式 */
.mobile-filter-collapse {
  @apply border-0;
}

.mobile-filter-collapse :deep(.el-collapse-item__header) {
  @apply bg-gray-50 rounded-lg px-4 py-3 mb-2;
}

.mobile-filter-collapse :deep(.el-collapse-item__content) {
  @apply p-0;
}

/* 月份選擇器樣式 */
.month-selector-item {
  @apply p-3 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200;
  @apply hover:border-blue-300 hover:bg-blue-50;
}

.month-selector-item.selected {
  @apply bg-blue-100 border-blue-400 text-blue-800;
}

.month-selector-item.has-activities {
  @apply font-medium;
}

.month-name {
  @apply text-sm font-medium text-center;
}

.activity-count {
  @apply text-xs text-gray-600 text-center mt-1;
}

.month-selector-item.selected .activity-count {
  @apply text-blue-600;
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
