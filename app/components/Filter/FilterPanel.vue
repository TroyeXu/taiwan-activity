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
          <el-button v-if="hasActiveFilters || showFavoritesOnly" type="text" size="small" @click="handleReset">
            重置
          </el-button>
        </div>
      </div>

      <!-- 我的收藏模式切換（桌面版） -->
      <div class="hidden md:block mb-4">
        <div 
          class="p-4 rounded-lg transition-all duration-300"
          :class="showFavoritesOnly ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border border-gray-200'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <el-icon :size="24" :class="showFavoritesOnly ? 'text-blue-600' : 'text-gray-600'">
                <Star />
              </el-icon>
              <div>
                <h4 class="font-medium text-gray-900">我的收藏模式</h4>
                <p class="text-sm text-gray-600 mt-1">
                  {{ favoriteCount > 0 
                    ? `您有 ${favoriteCount} 個收藏的活動` 
                    : '尚未收藏任何活動' }}
                </p>
              </div>
            </div>
            <el-switch
              v-model="showFavoritesOnly"
              @change="handleFavoritesToggle"
              size="large"
              :disabled="favoriteCount === 0"
              active-text="開啟"
              inactive-text="關閉"
            />
          </div>

          <!-- 收藏模式提示 -->
          <div v-if="showFavoritesOnly" class="mt-3 p-3 bg-blue-100 rounded-md">
            <p class="text-sm text-blue-700">
              <el-icon class="align-middle"><InfoFilled /></el-icon>
              收藏模式已開啟，目前只顯示您收藏的活動
            </p>
          </div>

          <!-- 無收藏提示 -->
          <div v-if="favoriteCount === 0" class="mt-3 p-3 bg-yellow-50 rounded-md">
            <p class="text-sm text-yellow-700">
              請先收藏一些活動，才能使用此功能
            </p>
          </div>
        </div>
      </div>

      <!-- 手機版口風琴篩選 -->
      <div class="md:hidden">
        <!-- 我的收藏模式切換（手機版） -->
        <div class="mb-4">
          <div 
            class="p-4 rounded-lg transition-all duration-300"
            :class="showFavoritesOnly ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border border-gray-200'"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <el-icon :size="20" :class="showFavoritesOnly ? 'text-blue-600' : 'text-gray-600'">
                  <Star />
                </el-icon>
                <div>
                  <h4 class="font-medium text-gray-900 text-sm">我的收藏</h4>
                  <p class="text-xs text-gray-600">
                    {{ favoriteCount > 0 ? `${favoriteCount} 個活動` : '無收藏' }}
                  </p>
                </div>
              </div>
              <el-switch
                v-model="showFavoritesOnly"
                @change="handleFavoritesToggle"
                :disabled="favoriteCount === 0"
              />
            </div>

            <!-- 收藏模式提示 -->
            <div v-if="showFavoritesOnly" class="mt-2 p-2 bg-blue-100 rounded-md">
              <p class="text-xs text-blue-700">
                收藏模式已開啟
              </p>
            </div>
          </div>
        </div>

        <!-- 收藏模式遮罩層（手機版） -->
        <div class="relative">
          <div v-if="showFavoritesOnly" class="absolute inset-0 bg-gray-100 bg-opacity-50 z-10 rounded-lg cursor-not-allowed"></div>
          <el-collapse v-model="mobileActiveNames" class="mobile-filter-collapse" :class="{ 'opacity-50 pointer-events-none': showFavoritesOnly }">
          <!-- 快速篩選組合方案 (手機版) -->
          <el-collapse-item name="quick-filters">
            <template #title>
              <div class="filter-header">
                <el-icon><Lightning /></el-icon>
                <span class="ml-2">選擇組合方案</span>
                <el-tag v-if="activeQuickFilter" size="small" type="primary" class="ml-auto mr-2">
                  {{ quickFiltersConfig.find((f) => f.id === activeQuickFilter)?.label }}
                </el-tag>
              </div>
            </template>
            <div class="p-4">
              <div class="mb-3 text-sm text-gray-600">選擇適合您的活動方案（單選）</div>
              <div class="grid grid-cols-2 gap-2">
                <el-button
                  v-for="filter in quickFiltersConfig"
                  :key="filter.id"
                  :type="activeQuickFilter === filter.id ? 'primary' : 'default'"
                  @click="selectQuickFilter(filter.id)"
                  size="small"
                  class="mobile-quick-filter-btn"
                >
                  <div class="flex flex-col items-center">
                    <span class="text-xl mb-1">{{ filter.icon }}</span>
                    <span class="text-xs">{{ filter.label }}</span>
                  </div>
                </el-button>
              </div>
              <div v-if="activeQuickFilter" class="mt-3 pt-3 border-t">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-600"> 已套用組合 </span>
                  <el-button text size="small" @click="selectQuickFilter('')"> 清除 </el-button>
                </div>
              </div>
            </div>
          </el-collapse-item>

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
              <!-- 位置篩選模式選擇 -->
              <div>
                <h5 class="text-sm font-medium text-gray-700 mb-3">選擇搜尋方式</h5>
                <el-radio-group
                  v-model="locationMode"
                  @change="handleLocationModeChange"
                  class="location-mode-group"
                >
                  <div class="space-y-3">
                    <!-- 附近活動模式 -->
                    <el-radio value="nearby" class="w-full">
                      <div class="flex items-center">
                        <el-icon class="mr-2"><Location /></el-icon>
                        <span>搜尋我附近的活動</span>
                      </div>
                    </el-radio>

                    <!-- 附近活動的設定 -->
                    <div v-if="locationMode === 'nearby'" class="ml-6 space-y-3">
                      <!-- 定位狀態 -->
                      <div class="bg-blue-50 p-3 rounded-md">
                        <div v-if="coordinates" class="text-sm">
                          <p class="text-blue-700 font-medium">📍 定位成功</p>
                          <p class="text-xs text-gray-600 mt-1">
                            {{ address || '已取得您的位置' }}
                          </p>
                          <el-button
                            text
                            size="small"
                            @click="handleGetCurrentLocation"
                            class="mt-2"
                          >
                            重新定位
                          </el-button>
                        </div>
                        <div v-else class="text-sm space-y-2">
                          <div
                            v-if="locationError"
                            class="text-red-600 text-xs bg-red-50 p-2 rounded"
                          >
                            {{ locationError }}
                          </div>
                          <p v-else class="text-gray-600 text-xs">需要您的位置來搜尋附近活動</p>

                          <el-button
                            type="primary"
                            size="small"
                            :loading="locationLoading"
                            @click="handleGetCurrentLocation"
                            class="w-full"
                          >
                            <el-icon class="mr-1"><Location /></el-icon>
                            {{
                              locationLoading
                                ? '定位中...'
                                : locationError
                                  ? '重新定位'
                                  : '開始定位'
                            }}
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

                      <!-- 距離範圍設定 -->
                      <div v-if="coordinates" class="space-y-2">
                        <div class="flex items-center justify-between">
                          <span class="text-sm text-gray-600">搜尋範圍</span>
                          <span class="text-sm font-medium text-primary-600"
                            >{{ distanceRadius }} 公里內</span
                          >
                        </div>
                        <div class="px-2">
                          <el-slider
                            v-model="distanceRadius"
                            :min="1"
                            :max="50"
                            :marks="{ 5: '5km', 15: '15km', 30: '30km', 50: '50km' }"
                            @change="handleDistanceRadiusChange"
                          />
                        </div>
                        <p class="text-xs text-gray-500">
                          將顯示距離您 {{ distanceRadius }} 公里內的所有活動
                        </p>
                      </div>
                    </div>

                    <!-- 地區模式 -->
                    <el-radio value="region" class="w-full">
                      <div class="flex items-center">
                        <el-icon class="mr-2"><MapLocation /></el-icon>
                        <span>搜尋指定地區的活動</span>
                      </div>
                    </el-radio>

                    <!-- 地區選擇 -->
                    <div v-if="locationMode === 'region'" class="ml-6">
                      <el-select
                        v-model="selectedCities"
                        placeholder="選擇縣市（預設為全部）"
                        multiple
                        filterable
                        clearable
                        @change="handleCitiesChange"
                        style="width: 100%"
                        size="small"
                        collapse-tags
                        collapse-tags-tooltip
                        :max-collapse-tags="2"
                      >
                        <el-option
                          label="全部縣市"
                          value="all"
                          :disabled="selectedCities.length > 0 && !selectedCities.includes('all')"
                        >
                          <span style="font-weight: 600; color: #3b82f6">全部縣市</span>
                        </el-option>
                        <el-option
                          v-for="city in cityOptions"
                          :key="city.value"
                          :label="city.label"
                          :value="city.value"
                          :disabled="selectedCities.includes('all')"
                        />
                      </el-select>
                      <p class="text-xs text-gray-500 mt-2">
                        {{
                          selectedCities.length === 0 || selectedCities.includes('all')
                            ? '顯示全部縣市的活動'
                            : `顯示 ${selectedCities.length} 個縣市的活動`
                        }}
                      </p>
                    </div>
                  </div>
                </el-radio-group>
              </div>

              <!-- 距離顯示開關（獨立功能） -->
              <div class="pt-3 border-t">
                <div class="flex items-center justify-between">
                  <div>
                    <h5 class="text-sm font-medium text-gray-700">顯示距離資訊</h5>
                    <p class="text-xs text-gray-500 mt-1">在活動卡片上顯示距離</p>
                  </div>
                  <el-switch
                    v-model="showDistance"
                    @change="handleDistanceToggle"
                    size="small"
                    :disabled="!coordinates"
                  />
                </div>
                <p v-if="!coordinates" class="text-xs text-orange-600 mt-2">
                  需要先定位才能顯示距離資訊
                </p>
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
              <!-- 時間篩選選項 -->
              <div>
                <div class="grid grid-cols-2 gap-2">
                  <el-button
                    v-for="(option, index) in quickTimeButtons"
                    :key="option.value"
                    :type="filters.dateRange.quickOption === option.value ? 'primary' : 'default'"
                    size="small"
                    @click="handleQuickTimeSelect(option.value)"
                    :class="['text-xs', 'ml-3']"
                  >
                    {{ option.label }}
                  </el-button>
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

          <!-- 標籤篩選 -->
          <el-collapse-item name="tags">
            <template #title>
              <div class="filter-header">
                <el-icon><Discount /></el-icon>
                <span class="ml-2">活動標籤</span>
                <el-badge
                  v-if="filters.tags.length > 0"
                  :value="filters.tags.length"
                  type="primary"
                  class="ml-auto mr-2"
                />
              </div>
            </template>

            <div class="p-4 space-y-3">
              <!-- 智慧推薦標籤 -->
              <div
                v-if="filters.categories.length > 0 || filters.dateRange?.quickOption"
                class="mb-3 p-3 bg-blue-50 rounded-lg"
              >
                <div class="text-xs font-medium text-blue-700 mb-2">🤖 根據您的選擇推薦</div>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in groupedTags.primary"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'light'"
                    class="cursor-pointer"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 基礎通用標籤 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">⭐ 熱門標籤</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in tagModules.base"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 特色標籤 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">✨ 活動特色</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in [
                      'pet-friendly',
                      'accessible',
                      'photo',
                      'instagram',
                      'romantic',
                      'educational',
                      'group',
                      'solo',
                      'reservation',
                      'walkin',
                    ]"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 場地標籤 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">📍 場地類型</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['indoor', 'outdoor']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 交通便利 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">🚗 交通便利</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['parking', 'mrt', 'bus']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 活動時長 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">⏱️ 活動時長</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['quick', 'halfday', 'fullday', 'multiday']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 適合年齡 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">👨‍👩‍👧‍👦 適合年齡</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['kids', 'teens', 'adults', 'seniors']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 季節限定 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">🌸 季節限定</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['spring', 'summer', 'autumn', 'winter', 'rainy']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 時間相關 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">🕐 時間相關</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['night', 'weekend', 'free']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
        </div>
      </div>

      <!-- 桌面版摺疊篩選 -->
      <div class="hidden md:block">
        <!-- 收藏模式遮罩提示 -->
        <div v-if="showFavoritesOnly" class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-sm text-yellow-800">
            <el-icon class="align-middle"><WarningFilled /></el-icon>
            收藏模式已開啟，其他篩選條件暫時無法使用。如需使用其他篩選，請先關閉收藏模式。
          </p>
        </div>

        <!-- 收藏模式遮罩層 -->
        <div class="relative">
          <div v-if="showFavoritesOnly" class="absolute inset-0 bg-gray-100 bg-opacity-50 z-10 rounded-lg cursor-not-allowed"></div>
          <el-collapse v-model="activeNames" class="filter-collapse" :class="{ 'opacity-50 pointer-events-none': showFavoritesOnly }">
          <!-- 1. 快速篩選組合方案 -->
          <el-collapse-item name="quick-filters">
            <template #title>
              <div class="filter-header">
                <el-icon><Lightning /></el-icon>
                <span class="ml-2 font-medium">選擇組合方案</span>
                <el-tag v-if="activeQuickFilter" size="small" type="primary" class="ml-auto mr-2">
                  {{ quickFiltersConfig.find((f) => f.id === activeQuickFilter)?.label }}
                </el-tag>
              </div>
            </template>
            <div class="p-4">
              <div class="mb-3 text-sm text-gray-600">選擇適合您的活動方案（單選）</div>
              <div class="flex flex-wrap gap-2">
                <el-button
                  v-for="filter in quickFiltersConfig"
                  :key="filter.id"
                  :type="activeQuickFilter === filter.id ? 'primary' : 'default'"
                  @click="selectQuickFilter(filter.id)"
                  size="small"
                  class="quick-filter-compact-btn"
                >
                  <span class="text-lg">{{ filter.icon }}</span>
                  <span class="ml-2 text-xs">{{ filter.label }}</span>
                </el-button>
              </div>
              <div v-if="activeQuickFilter" class="mt-3 pt-3 border-t">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-600">
                    已套用「{{
                      quickFiltersConfig.find((f) => f.id === activeQuickFilter)?.label
                    }}」組合
                  </span>
                  <el-button text size="small" @click="selectQuickFilter('')"> 清除組合 </el-button>
                </div>
              </div>
            </div>
          </el-collapse-item>

          <!-- 2. 位置篩選 (簡化版) -->
          <el-collapse-item name="location">
            <template #title>
              <div class="filter-header">
                <el-icon><Location /></el-icon>
                <span class="ml-2">位置與距離</span>
              </div>
            </template>

            <div class="p-4 space-y-4">
              <!-- 位置篩選模式選擇 -->
              <div>
                <h5 class="text-sm font-medium text-gray-700 mb-3">選擇搜尋方式</h5>
                <el-radio-group
                  v-model="locationMode"
                  @change="handleLocationModeChange"
                  class="location-mode-group"
                >
                  <div class="space-y-3">
                    <!-- 附近活動模式 -->
                    <el-radio value="nearby" class="w-full">
                      <div class="flex items-center">
                        <el-icon class="mr-2"><Location /></el-icon>
                        <span>搜尋我附近的活動</span>
                      </div>
                    </el-radio>

                    <!-- 附近活動的設定 -->
                    <div v-if="locationMode === 'nearby'" class="ml-6 space-y-3">
                      <!-- 定位狀態 -->
                      <div class="bg-blue-50 p-3 rounded-md">
                        <div v-if="coordinates" class="text-sm">
                          <p class="text-blue-700 font-medium">📍 定位成功</p>
                          <p class="text-xs text-gray-600 mt-1">
                            {{ address || '已取得您的位置' }}
                          </p>
                          <el-button
                            text
                            size="small"
                            @click="handleGetCurrentLocation"
                            class="mt-2"
                          >
                            重新定位
                          </el-button>
                        </div>
                        <div v-else class="text-sm space-y-2">
                          <div
                            v-if="locationError"
                            class="text-red-600 text-xs bg-red-50 p-2 rounded"
                          >
                            {{ locationError }}
                          </div>
                          <p v-else class="text-gray-600 text-xs">需要您的位置來搜尋附近活動</p>

                          <el-button
                            type="primary"
                            size="small"
                            :loading="locationLoading"
                            @click="handleGetCurrentLocation"
                            class="w-full"
                          >
                            <el-icon class="mr-1"><Location /></el-icon>
                            {{
                              locationLoading
                                ? '定位中...'
                                : locationError
                                  ? '重新定位'
                                  : '開始定位'
                            }}
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

                      <!-- 距離範圍設定 -->
                      <div v-if="coordinates" class="space-y-2">
                        <div class="flex items-center justify-between">
                          <span class="text-sm text-gray-600">搜尋範圍</span>
                          <span class="text-sm font-medium text-primary-600"
                            >{{ distanceRadius }} 公里內</span
                          >
                        </div>
                        <div class="px-2">
                          <el-slider
                            v-model="distanceRadius"
                            :min="1"
                            :max="50"
                            :marks="{ 5: '5km', 15: '15km', 30: '30km', 50: '50km' }"
                            @change="handleDistanceRadiusChange"
                          />
                        </div>
                        <p class="text-xs text-gray-500">
                          將顯示距離您 {{ distanceRadius }} 公里內的所有活動
                        </p>
                      </div>
                    </div>

                    <!-- 地區模式 -->
                    <el-radio value="region" class="w-full">
                      <div class="flex items-center">
                        <el-icon class="mr-2"><MapLocation /></el-icon>
                        <span>搜尋指定地區的活動</span>
                      </div>
                    </el-radio>

                    <!-- 地區選擇 -->
                    <div v-if="locationMode === 'region'" class="ml-6">
                      <el-select
                        v-model="selectedCities"
                        placeholder="選擇縣市（預設為全部）"
                        multiple
                        filterable
                        clearable
                        @change="handleCitiesChange"
                        style="width: 100%"
                        size="small"
                        collapse-tags
                        collapse-tags-tooltip
                        :max-collapse-tags="2"
                      >
                        <el-option
                          label="全部縣市"
                          value="all"
                          :disabled="selectedCities.length > 0 && !selectedCities.includes('all')"
                        >
                          <span style="font-weight: 600; color: #3b82f6">全部縣市</span>
                        </el-option>
                        <el-option
                          v-for="city in cityOptions"
                          :key="city.value"
                          :label="city.label"
                          :value="city.value"
                          :disabled="selectedCities.includes('all')"
                        />
                      </el-select>
                      <p class="text-xs text-gray-500 mt-2">
                        {{
                          selectedCities.length === 0 || selectedCities.includes('all')
                            ? '顯示全部縣市的活動'
                            : `顯示 ${selectedCities.length} 個縣市的活動`
                        }}
                      </p>
                    </div>
                  </div>
                </el-radio-group>
              </div>

              <!-- 距離顯示開關（獨立功能） -->
              <div class="pt-3 border-t">
                <div class="flex items-center justify-between">
                  <div>
                    <h5 class="text-sm font-medium text-gray-700">顯示距離資訊</h5>
                    <p class="text-xs text-gray-500 mt-1">在活動卡片上顯示距離</p>
                  </div>
                  <el-switch
                    v-model="showDistance"
                    @change="handleDistanceToggle"
                    size="small"
                    :disabled="!coordinates"
                  />
                </div>
                <p v-if="!coordinates" class="text-xs text-orange-600 mt-2">
                  需要先定位才能顯示距離資訊
                </p>
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
              <div v-if="false">
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

          <!-- 桌面版標籤篩選 -->
          <el-collapse-item name="tags">
            <template #title>
              <div class="filter-header">
                <el-icon><Discount /></el-icon>
                <span class="ml-2">活動標籤</span>
                <el-badge
                  v-if="filters.tags.length > 0"
                  :value="filters.tags.length"
                  type="primary"
                  class="ml-auto mr-2"
                />
              </div>
            </template>

            <div class="p-4 space-y-3">
              <!-- 智慧推薦標籤 -->
              <div
                v-if="filters.categories.length > 0 || filters.dateRange?.quickOption"
                class="mb-3 p-3 bg-blue-50 rounded-lg"
              >
                <div class="text-xs font-medium text-blue-700 mb-2">🤖 根據您的選擇推薦</div>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in groupedTags.primary"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'light'"
                    class="cursor-pointer"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 基礎通用標籤 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">⭐ 熱門標籤</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in tagModules.base"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 特色標籤 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">✨ 活動特色</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in [
                      'pet-friendly',
                      'accessible',
                      'photo',
                      'instagram',
                      'romantic',
                      'educational',
                      'group',
                      'solo',
                      'reservation',
                      'walkin',
                    ]"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 場地標籤 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">📍 場地類型</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['indoor', 'outdoor']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 交通便利 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">🚗 交通便利</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['parking', 'mrt', 'bus']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 活動時長 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">⏱️ 活動時長</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['quick', 'halfday', 'fullday', 'multiday']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 適合年齡 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">👨‍👩‍👧‍👦 適合年齡</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['kids', 'teens', 'adults', 'seniors']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 季節限定 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">🌸 季節限定</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['spring', 'summer', 'autumn', 'winter', 'rainy']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>

              <!-- 時間相關 -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">🕐 時間相關</label>
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="tag in ['night', 'weekend', 'free']"
                    :key="tag"
                    :type="filters.tags.includes(tag) ? 'primary' : 'info'"
                    :effect="filters.tags.includes(tag) ? 'dark' : 'plain'"
                    class="cursor-pointer text-xs"
                    size="small"
                    @click="handleTagToggle(tag)"
                  >
                    {{ getTagDisplay(tag) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
        </div>
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
import {
  Calendar,
  Close,
  Collection,
  Discount,
  Filter,
  InfoFilled,
  Lightning,
  Location,
  MapLocation,
  Star,
  Wallet,
  WarningFilled,
} from '@element-plus/icons-vue';
import { useDebounceFn } from '@vueuse/core';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
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
const { favoriteIds, favoritesCount } = useFavorites();

// 響應式狀態
const customLocationInput = ref('');
const customDateRange = ref<any>(null);
const locationSuggestions = ref<any[]>([]);
const locationLoading = ref(false);
const geocodeLoading = ref(false);
// 調整預設展開項目順序，符合使用者需求優先級
const activeNames = ref(['quick-filters', 'categories', 'location']); // 預設展開快速篩選、活動類型、位置
const mobileActiveNames = ref(['quick-filters']); // 手機版預設展開快速篩選
const showMoreTags = ref(false);
const priceRangeValue = ref([0, 5000]);
const quickFilter = ref('');
const activeQuickFilter = ref<string>(''); // 改為單選
const selectedCities = ref<string[]>([]);
const selectedDistrict = ref('');
const priceType = ref('all');
const showCustomDateRange = ref(false);
const showDistance = ref(false);
const distanceRadius = ref(10);
const enableDistanceFilter = ref(false);
const locationError = ref<string>('');
const locationMode = ref<'nearby' | 'region'>('nearby');
const showFavoritesOnly = ref(false);

// 快速篩選組合配置 - 更多元的組合選項
const quickFiltersConfig = [
  {
    id: 'weekend-family',
    label: '週末親子遊',
    icon: '👨‍👩‍👧‍👦',
    filters: {
      time: 'weekend',
      price: 'free',
      tags: ['outdoor', 'kids', 'parking'],
      categories: ['sightseeing', 'education'],
    },
  },
  {
    id: 'couple-date',
    label: '情侶約會',
    icon: '💑',
    filters: {
      tags: ['romantic', 'photo', 'instagram'],
      categories: ['food', 'entertainment'],
    },
  },
  {
    id: 'rainy-day',
    label: '雨天備案',
    icon: '☔',
    filters: {
      tags: ['indoor', 'mrt', 'rainy'],
      categories: ['culture', 'shopping', 'food'],
    },
  },
  {
    id: 'student-budget',
    label: '學生出遊',
    icon: '🎒',
    filters: {
      price: 'free',
      tags: ['educational', 'teens', 'group'],
      categories: ['education', 'culture'],
    },
  },
  {
    id: 'senior-leisure',
    label: '銀髮樂活',
    icon: '👴',
    filters: {
      tags: ['accessible', 'seniors', 'halfday'],
      categories: ['wellness', 'culture'],
    },
  },
  {
    id: 'night-owl',
    label: '夜貓行程',
    icon: '🌙',
    filters: {
      tags: ['night', 'walkin'],
      categories: ['food', 'entertainment'],
    },
  },
  {
    id: 'instagram-spots',
    label: '網美打卡',
    icon: '📸',
    filters: {
      tags: ['photo', 'instagram', 'hot'],
      categories: ['sightseeing'],
    },
  },
  {
    id: 'spontaneous',
    label: '說走就走',
    icon: '⚡',
    filters: {
      time: 'today',
      tags: ['walkin', 'quick'],
      distance: 5,
    },
  },
  {
    id: 'outdoor-adventure',
    label: '戶外冒險',
    icon: '🏔️',
    filters: {
      tags: ['outdoor', 'fullday'],
      categories: ['adventure', 'sightseeing'],
    },
  },
  {
    id: 'culture-tour',
    label: '文藝之旅',
    icon: '🎭',
    filters: {
      tags: ['educational', 'indoor'],
      categories: ['culture', 'education'],
    },
  },
  {
    id: 'foodie-paradise',
    label: '美食探索',
    icon: '🍜',
    filters: {
      tags: ['walkin', 'instagram'],
      categories: ['food'],
    },
  },
  {
    id: 'morning-exercise',
    label: '晨間運動',
    icon: '🌅',
    filters: {
      tags: ['outdoor', 'quick'],
      categories: ['wellness', 'adventure'],
    },
  },
  {
    id: 'shopping-therapy',
    label: '購物療癒',
    icon: '🛍️',
    filters: {
      tags: ['indoor', 'mrt', 'parking'],
      categories: ['shopping', 'food'],
    },
  },
  {
    id: 'pet-friendly',
    label: '毛孩同樂',
    icon: '🐾',
    filters: {
      tags: ['pet-friendly', 'outdoor'],
      categories: ['sightseeing', 'food'],
    },
  },
  {
    id: 'solo-adventure',
    label: '獨自探索',
    icon: '🚶',
    filters: {
      tags: ['solo', 'mrt', 'quick'],
      categories: ['culture', 'sightseeing'],
    },
  },
  {
    id: 'budget-friendly',
    label: '小資方案',
    icon: '💰',
    filters: {
      price: 'free',
      tags: ['free', 'outdoor'],
      categories: ['sightseeing', 'culture'],
    },
  },
];

// 快速時間按鈕選項
const quickTimeButtons = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'weekend', label: '本週末' },
  { value: 'next-week', label: '下週' },
  { value: 'this-month', label: '本月' },
  { value: 'next-month', label: '下月' },
  { value: 'custom', label: '自訂日期' },
  { value: 'all', label: '不限時間' },
];

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

// 智慧模組化標籤系統
const tagModules = {
  // 基礎標籤（始終顯示）
  base: ['hot', 'new', 'discount', 'pet-friendly', 'accessible', 'instagram'],

  // 活動類型相關標籤
  categories: {
    sightseeing: ['photo', 'parking', 'mrt', 'bus', 'spring', 'summer', 'autumn', 'winter'],
    culture: ['educational', 'reservation', 'indoor', 'group', 'seniors'],
    adventure: ['outdoor', 'quick', 'halfday', 'fullday', 'spring', 'summer', 'rainy'],
    food: ['night', 'walkin', 'indoor', 'romantic', 'instagram'],
    shopping: ['mrt', 'parking', 'indoor', 'weekend', 'discount'],
    wellness: ['seniors', 'accessible', 'halfday', 'outdoor', 'indoor'],
    entertainment: ['night', 'weekend', 'kids', 'teens', 'group', 'indoor'],
    education: ['educational', 'kids', 'teens', 'reservation', 'group'],
  },

  // 時間相關標籤
  time: {
    today: ['walkin', 'quick', 'limited'],
    weekend: ['weekend', 'group', 'family', 'hot'],
    night: ['night', 'romantic', 'indoor'],
  },

  // 價格相關標籤
  price: {
    free: ['free', 'outdoor', 'photo'],
    paid: ['reservation', 'limited', 'hot'],
  },
};

// 標籤相關
const allTags = ref<Tag[]>([]);

// 根據當前篩選條件動態獲取相關標籤
const relevantTags = computed(() => {
  const tags = new Set([...tagModules.base]);

  // 根據選擇的活動類型添加相關標籤
  filters.value.categories.forEach((category) => {
    const categoryTags = tagModules.categories[category] || [];
    categoryTags.forEach((tag) => tags.add(tag));
  });

  // 根據時間篩選添加相關標籤
  if (filters.value.dateRange?.quickOption) {
    const timeTags = tagModules.time[filters.value.dateRange.quickOption] || [];
    timeTags.forEach((tag) => tags.add(tag));
  }

  // 根據價格類型添加相關標籤
  if (priceType.value !== 'all') {
    const priceTags = tagModules.price[priceType.value] || [];
    priceTags.forEach((tag) => tags.add(tag));
  }

  return Array.from(tags);
});

// 分組顯示的標籤
const groupedTags = computed(() => {
  const relevant = relevantTags.value;
  return {
    primary: relevant.slice(0, 6), // 主要標籤
    secondary: relevant.slice(6, 12), // 次要標籤
    more: relevant.slice(12), // 更多標籤
  };
});

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

// 計算屬性 - 收藏數量
const favoriteCount = computed(() => favoritesCount.value);

// 計算屬性 - 篩選狀態檢查
const hasLocationFilter = computed(
  () => filters.value.location.coordinates !== null || selectedCities.value.length > 0
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

    // 設定位置到 filters
    filters.value.location.coordinates = coordinates.value;
    filters.value.location.radius = distanceRadius.value;

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
      // 選擇免費時，自動添加免費活動標籤
      if (!filters.value.tags.includes('free')) {
        filters.value.tags.push('free');
      }
      break;
    case 'paid':
      filters.value.priceRange.min = 1;
      filters.value.priceRange.max = 5000;
      filters.value.priceRange.includeFreeze = false;
      // 選擇收費時，移除免費活動標籤
      const freeIndex = filters.value.tags.indexOf('free');
      if (freeIndex > -1) {
        filters.value.tags.splice(freeIndex, 1);
      }
      break;
    default:
      filters.value.priceRange.min = 0;
      filters.value.priceRange.max = 5000;
      filters.value.priceRange.includeFreeze = true;
      // 選擇不限時，移除免費活動標籤
      const index = filters.value.tags.indexOf('free');
      if (index > -1) {
        filters.value.tags.splice(index, 1);
      }
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

// 取得標籤顯示名稱
const getTagDisplay = (tagSlug: string): string => {
  const tagMap: Record<string, string> = {
    // 熱門推薦
    new: '🆕 最新活動',
    hot: '🔥 熱門推薦',
    discount: '💰 優惠活動',
    limited: '⏰ 限量名額',
    // 活動特色
    'pet-friendly': '🐾 寵物友善',
    accessible: '♿ 無障礙',
    photo: '📸 適合拍照',
    instagram: '📷 網美打卡',
    romantic: '💝 浪漫約會',
    educational: '📚 教育學習',
    group: '👥 團體活動',
    solo: '👤 獨自體驗',
    reservation: '📝 需預約',
    walkin: '🚶 免預約',
    // 場地
    indoor: '🏠 室內',
    outdoor: '🌳 戶外',
    // 交通
    parking: '🅿️ 有停車場',
    mrt: '🚇 捷運可達',
    bus: '🚌 公車可達',
    // 時長
    quick: '⚡ 快速體驗',
    halfday: '🌤️ 半日遊',
    fullday: '☀️ 全日遊',
    multiday: '🗓️ 多日行程',
    // 年齡
    kids: '👶 幼兒適合',
    teens: '🧑 青少年',
    adults: '👨 成人限定',
    seniors: '👴 銀髮友善',
    // 季節
    spring: '🌸 春季限定',
    summer: '☀️ 夏季限定',
    autumn: '🍁 秋季限定',
    winter: '❄️ 冬季限定',
    rainy: '☔ 雨天備案',
    // 時間
    night: '🌙 夜間活動',
    weekend: '📅 週末活動',
    free: '🆓 免費活動',
  };

  return tagMap[tagSlug] || tagSlug;
};

// 處理標籤切換
const handleTagToggle = (tagId: string) => {
  const index = filters.value.tags.indexOf(tagId);
  if (index > -1) {
    filters.value.tags.splice(index, 1);
    // 取消免費活動標籤時，重置價格篩選
    if (tagId === 'free') {
      priceType.value = 'all';
      filters.value.priceRange.min = 0;
      filters.value.priceRange.max = 5000;
      filters.value.priceRange.includeFreeze = true;
    }
  } else {
    filters.value.tags.push(tagId);
    // 選擇免費活動標籤時，連動設定價格篩選為免費
    if (tagId === 'free') {
      priceType.value = 'free';
      filters.value.priceRange.min = 0;
      filters.value.priceRange.max = 0;
      filters.value.priceRange.includeFreeze = true;
      // 展開價格篩選面板
      if (!activeNames.value.includes('price')) {
        activeNames.value.push('price');
      }
    }
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
  selectedCities.value = [];
  selectedDistrict.value = '';
  priceType.value = 'all';
  quickFilter.value = '';
  activeQuickFilter.value = ''; // 重置快速篩選選擇
  showCustomDateRange.value = false;
  distanceRadius.value = 10;
  enableDistanceFilter.value = false;
  locationMode.value = 'nearby';
  showFavoritesOnly.value = false;

  console.log('重置所有篩選');
  emitFiltersChange();
  ElMessage.success('篩選條件已重置');
};

// 發送篩選變更事件
const emitFiltersChange = () => {
  // 根據 locationMode 調整 filters
  if (locationMode.value === 'nearby') {
    // 附近模式：使用坐標和距離
    if (coordinates.value) {
      filters.value.location.coordinates = coordinates.value;
      filters.value.location.radius = distanceRadius.value;
    }
  } else {
    // 地區模式：不使用坐標
    filters.value.location.coordinates = null;
  }

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

// 單選快速篩選組合
const selectQuickFilter = (filterId: string) => {
  // 如果點擊相同的，則取消選擇
  if (activeQuickFilter.value === filterId) {
    activeQuickFilter.value = '';
    resetFilters();
    emitFiltersChange();
    return;
  }

  // 設定新的選擇
  activeQuickFilter.value = filterId;
  applyQuickFilter(filterId);
};

// 應用快速篩選組合
const applyQuickFilter = (filterId: string) => {
  // 重置所有篩選
  resetFilters();

  const config = quickFiltersConfig.find((f) => f.id === filterId);
  if (!config) return;

  // 應用時間篩選
  if (config.filters.time) {
    filters.value.dateRange.type = 'quick';
    filters.value.dateRange.quickOption = config.filters.time;
  }

  // 應用價格篩選
  if (config.filters.price === 'free') {
    priceType.value = 'free';
    filters.value.priceRange.min = 0;
    filters.value.priceRange.max = 0;
    filters.value.priceRange.includeFreeze = true;
  }

  // 應用標籤篩選
  if (config.filters.tags) {
    filters.value.tags = [...config.filters.tags];
  }

  // 應用活動類型篩選
  if (config.filters.categories) {
    filters.value.categories = [...config.filters.categories];
  }

  // 應用距離篩選
  if (config.filters.distance) {
    filters.value.location.type = 'current';
    filters.value.location.radius = config.filters.distance;
    distanceRadius.value = config.filters.distance;
    locationMode.value = 'nearby';
    handleGetCurrentLocation();
  }

  emitFiltersChange();
};

// 舊的單選函數（保留以支援舊代碼）
const setQuickFilter = (type: string) => {
  if (quickFilter.value === type) {
    quickFilter.value = '';
    resetFilters();
    // 重置時收合所有面板
    activeNames.value = ['location'];
  } else {
    quickFilter.value = type;
    resetFilters();

    // 根據快速篩選類型，展開對應的篩選面板
    switch (type) {
      case 'today':
        filters.value.dateRange.type = 'quick';
        filters.value.dateRange.quickOption = 'today';
        activeNames.value = ['time']; // 展開時間篩選
        break;
      case 'near':
        filters.value.location.type = 'current';
        filters.value.location.radius = 5;
        handleGetCurrentLocation();
        activeNames.value = ['location']; // 展開位置篩選
        break;
      case 'weekend':
        filters.value.dateRange.type = 'quick';
        filters.value.dateRange.quickOption = 'weekend';
        activeNames.value = ['time']; // 展開時間篩選
        break;
      case 'free':
        filters.value.priceRange.includeFreeze = true;
        filters.value.priceRange.max = 0;
        activeNames.value = ['price']; // 展開價格篩選
        break;
      case 'family':
        filters.value.categories = ['family']; // 親子活動分類
        activeNames.value = ['categories']; // 展開分類篩選
        break;
      case 'indoor':
        filters.value.tags = ['indoor']; // 室內活動標籤
        activeNames.value = ['tags']; // 展開標籤篩選
        break;
      case 'night':
        filters.value.tags = ['night']; // 夜間活動標籤
        filters.value.timeOfDay = ['evening', 'night'];
        activeNames.value = ['tags', 'time']; // 展開標籤和時間篩選
        break;
      case 'outdoor':
        filters.value.categories = ['outdoor']; // 戶外活動分類
        filters.value.tags = ['outdoor']; // 同時選擇戶外活動標籤
        activeNames.value = ['categories', 'tags']; // 展開分類和標籤篩選
        break;
      case 'cultural':
        filters.value.categories = ['culture']; // 文化藝術分類
        activeNames.value = ['categories']; // 展開分類篩選
        break;
      case 'food':
        filters.value.categories = ['food']; // 美食饗宴分類
        activeNames.value = ['categories']; // 展開分類篩選
        break;
      case 'music':
        filters.value.categories = ['music']; // 音樂表演分類
        activeNames.value = ['categories']; // 展開分類篩選
        break;
      case 'sports':
        filters.value.categories = ['sports']; // 運動健身分類
        activeNames.value = ['categories']; // 展開分類篩選
        break;
      case 'exhibition':
        filters.value.categories = ['exhibition']; // 展覽分類
        activeNames.value = ['categories']; // 展開分類篩選
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

// 處理收藏篩選切換
const handleFavoritesToggle = (show: string | number | boolean) => {
  showFavoritesOnly.value = Boolean(show);
  
  if (showFavoritesOnly.value) {
    // 開啟收藏模式時，重置所有其他篩選條件
    console.log('開啟收藏模式，重置其他篩選');
    
    // 保存當前位置資訊（如果需要的話）
    const currentLocation = filters.value.location;
    
    // 重置所有篩選
    resetFilters();
    
    // 恢復位置資訊（可選）
    // filters.value.location = currentLocation;
    
    // 清除其他狀態
    customLocationInput.value = '';
    customDateRange.value = null;
    priceRangeValue.value = [0, 5000];
    showMoreTags.value = false;
    selectedCities.value = [];
    selectedDistrict.value = '';
    priceType.value = 'all';
    quickFilter.value = '';
    activeQuickFilter.value = '';
    showCustomDateRange.value = false;
    distanceRadius.value = 10;
    enableDistanceFilter.value = false;
    locationMode.value = 'nearby';
    
    // 收合所有篩選面板
    activeNames.value = [];
    mobileActiveNames.value = [];
    
    // 設定收藏模式標記
    filters.value.showFavoritesOnly = true;
    
    ElMessage.info('已切換至收藏模式，僅顯示您收藏的活動');
  } else {
    // 關閉收藏模式
    console.log('關閉收藏模式');
    filters.value.showFavoritesOnly = false;
    
    // 重新展開常用篩選面板
    activeNames.value = ['quick-filters', 'categories', 'location'];
    mobileActiveNames.value = ['quick-filters'];
    
    ElMessage.info('已關閉收藏模式');
  }
  
  emitFiltersChange();
};

// 處理距離範圍變更
const handleDistanceRadiusChange = (radius: number | number[]) => {
  distanceRadius.value = Array.isArray(radius) ? (radius[0] ?? 10) : radius;
  filters.value.location.radius = distanceRadius.value;
  if (locationMode.value === 'nearby' && coordinates.value) {
    emitFiltersChange();
  }
};

// 處理距離篩選切換
const handleDistanceFilterToggle = (enabled: string | number | boolean) => {
  enableDistanceFilter.value = Boolean(enabled);
  emitFiltersChange();
};

// 處理縣市變更（多選）
const handleCitiesChange = (cities: string[]) => {
  // 處理「全部」選項
  if (cities.includes('all')) {
    // 如果選了全部，清空其他選項，表示不限制城市
    selectedCities.value = [];
    filters.value.cities = [];
    // 選擇全部縣市時，也清除距離篩選，確保顯示所有活動
    filters.value.location.coordinates = null;
    filters.value.location.radius = 10;
  } else {
    selectedCities.value = cities;
    filters.value.cities = cities;

    // 當選擇特定地區時，清除距離篩選
    if (cities.length > 0) {
      filters.value.location.coordinates = null;
      filters.value.location.radius = 10;
    }
  }

  selectedDistrict.value = '';

  emitFiltersChange();
};

// 處理位置模式變更
const handleLocationModeChange = (mode: 'nearby' | 'region') => {
  locationMode.value = mode;

  if (mode === 'nearby') {
    // 切換到附近模式，清除地區選擇
    selectedCities.value = [];
    filters.value.cities = [];
    filters.value.location.type = 'current';
  } else {
    // 切換到地區模式，清除位置資訊
    filters.value.location.coordinates = null;
    filters.value.location.type = 'custom';
  }

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
  showCustomDateRange.value = false;

  if (value === 'custom') {
    showCustomDateRange.value = true;
  } else if (value === 'all') {
    // 不限時間：清除所有日期篩選
    filters.value.dateRange.startDate = undefined;
    filters.value.dateRange.endDate = undefined;
    filters.value.dateRange.quickOption = '';
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
  @apply text-xs w-full justify-center px-2 py-1;
  min-height: 36px;
}

.quick-filter-btn span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 緊湊版快速篩選按鈕 */
.quick-filter-compact-btn {
  @apply text-xs px-3 py-1 flex items-center justify-center;
  min-height: 32px;
  white-space: nowrap;
}

.quick-filter-compact-btn span {
  display: inline-flex;
  align-items: center;
}

/* 手機版快速篩選按鈕 */
.mobile-quick-filter-btn {
  @apply p-2;
  min-height: 70px;
  width: 100%;
}

.mobile-quick-filter-btn .text-xs {
  line-height: 1.2;
  text-align: center;
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
/* 載入動畫 */
.loading-spinner {
  @apply animate-spin rounded-full border-2 border-gray-300 border-t-primary-600;
}

/* 位置模式選擇器樣式 */
.location-mode-group {
  width: 100%;
  display: block;
}

.location-mode-group :deep(.el-radio) {
  display: flex;
  align-items: flex-start;
  margin-right: 0;
  margin-bottom: 0;
  width: 100%;
}

.location-mode-group :deep(.el-radio__input) {
  margin-top: 2px;
}

.location-mode-group :deep(.el-radio__label) {
  padding-left: 8px;
  white-space: normal;
  line-height: 1.5;
  width: 100%;
}

/* 滑桿樣式修正 */
:deep(.el-slider) {
  margin: 16px 0;
}

:deep(.el-slider__runway) {
  margin: 16px 0;
}

:deep(.el-slider__marks-text) {
  font-size: 11px;
  margin-top: 12px;
}

/* 快速篩選卡片樣式 */
.quick-filter-card {
  min-height: 80px;
  display: flex;
  align-items: center;
}

.quick-filter-card:hover {
  transform: translateY(-2px);
}

.quick-filter-card.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 響應式調整 */
@media (max-width: 768px) {
  .filter-panel {
    @apply fixed inset-0 z-50;
  }

  .quick-filter-card {
    min-height: 70px;
  }
}
</style>
