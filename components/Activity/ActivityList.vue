<template>
  <div class="activity-list">
    <!-- 列表標題 -->
    <div v-if="showHeader" class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-gray-900">
        {{ title }}
        <span v-if="total > 0" class="text-base font-normal text-gray-500 ml-2">
          ({{ total }} 個活動)
        </span>
      </h2>
      
      <!-- 檢視模式切換 -->
      <div class="flex items-center space-x-2">
        <el-radio-group v-model="viewMode" size="small" @change="handleViewModeChange">
          <el-radio-button value="grid">
            <el-icon><Grid /></el-icon>
          </el-radio-button>
          <el-radio-button value="list">
            <el-icon><List /></el-icon>
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 載入狀態 -->
    <div v-if="loading && activities.length === 0" class="space-y-4">
      <ActivityCardSkeleton
        v-for="i in 6"
        :key="i"
        :compact="viewMode === 'list'"
      />
    </div>

    <!-- 空狀態 -->
    <div v-else-if="!loading && activities.length === 0" class="text-center py-12">
      <div class="text-gray-400 text-6xl mb-4">🔍</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">{{ emptyTitle }}</h3>
      <p class="text-gray-600 mb-6">{{ emptyMessage }}</p>
      <el-button v-if="showResetButton" type="primary" @click="handleReset">
        重新搜尋
      </el-button>
    </div>

    <!-- 排序區域 -->
    <div v-if="showSorting && activities.length > 0" class="sorting-section mb-4">
      <div class="flex items-center justify-between bg-white rounded-lg p-4 border shadow-sm">
        <div class="text-sm text-gray-600">
          找到 {{ total }} 個活動
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">排序：</span>
          <el-select
            :model-value="currentSorting"
            size="small"
            style="width: 160px"
            @change="(value: string) => handleSortingChange(value)"
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

    <!-- 活動列表 -->
    <div
      v-if="activities.length > 0"
      class="activity-grid"
      :class="{
        'grid-cols-1': viewMode === 'list',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': viewMode === 'grid'
      }"
    >
      <ActivityCard
        v-for="activity in activities"
        :key="activity.id"
        :activity="activity"
        :show-distance="showDistance"
        :distance="getActivityDistance(activity)"
        :compact="viewMode === 'list'"
        @click="handleActivityClick"
        @favorite-toggle="handleFavoriteToggle"
      />
    </div>

    <!-- 載入更多 -->
    <div v-if="hasMore" class="mt-8 text-center">
      <el-button
        v-if="!autoLoad"
        type="primary"
        :loading="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? '載入中...' : '載入更多' }}
      </el-button>
      
      <!-- 自動載入指示器 -->
      <div
        v-else
        ref="loadMoreTrigger"
        class="py-4"
      >
        <div v-if="loadingMore" class="flex items-center justify-center">
          <div class="loading-spinner mr-2"></div>
          <span class="text-gray-600">載入更多活動...</span>
        </div>
      </div>
    </div>

    <!-- 載入更多時的骨架屏 -->
    <div v-if="loadingMore" class="activity-grid mt-6" :class="gridClass">
      <ActivityCardSkeleton
        v-for="i in 3"
        :key="`loading-${i}`"
        :compact="viewMode === 'list'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { Grid, List } from '@element-plus/icons-vue';
import type { Activity } from '~/types';
import ActivityCardSkeleton from './ActivityCardSkeleton.vue';

interface Props {
  activities: Activity[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  total?: number;
  title?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  showHeader?: boolean;
  showDistance?: boolean;
  showResetButton?: boolean;
  autoLoad?: boolean;
  viewMode?: 'grid' | 'list';
  showSorting?: boolean;
  currentSorting?: string;
  sortingOptions?: Array<{value: string, label: string}>;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  loadingMore: false,
  hasMore: false,
  total: 0,
  title: '活動列表',
  emptyTitle: '找不到活動',
  emptyMessage: '試試調整篩選條件或搜尋其他關鍵字',
  showHeader: true,
  showDistance: false,
  showResetButton: true,
  autoLoad: false,
  viewMode: 'grid',
  showSorting: false,
  currentSorting: 'relevance',
  sortingOptions: () => []
});

const emit = defineEmits<{
  loadMore: [];
  activityClick: [activity: Activity];
  favoriteToggle: [activity: Activity];
  viewModeChange: [mode: 'grid' | 'list'];
  sortingChange: [sorting: string];
  reset: [];
}>;

// Composables
const { calculateDistance } = useGeolocation();

// 響應式狀態
const viewMode = ref(props.viewMode);
const loadMoreTrigger = ref<HTMLElement>();
const userLocation = ref<{ lat: number; lng: number } | null>(null);

// 計算屬性
const gridClass = computed(() => ({
  'grid-cols-1': viewMode.value === 'list',
  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': viewMode.value === 'grid'
}));

// 取得活動距離
const getActivityDistance = (activity: Activity): number | undefined => {
  if (!props.showDistance || !userLocation.value || !activity.location?.latitude || !activity.location?.longitude) {
    return undefined;
  }

  return calculateDistance(
    userLocation.value,
    { lat: activity.location.latitude, lng: activity.location.longitude }
  );
};

// 事件處理
const handleViewModeChange = (mode: 'grid' | 'list') => {
  viewMode.value = mode;
  emit('viewModeChange', mode);
  
  // 儲存使用者偏好
  try {
    localStorage.setItem('activity-list-view-mode', mode);
  } catch (error) {
    console.warn('無法儲存檢視模式偏好:', error);
  }
};

const handleActivityClick = (activity: Activity) => {
  emit('activityClick', activity);
};

const handleFavoriteToggle = (activity: Activity) => {
  emit('favoriteToggle', activity);
};

const loadMore = () => {
  emit('loadMore');
};

const handleReset = () => {
  emit('reset');
};

const handleSortingChange = (sorting: string) => {
  emit('sortingChange', sorting);
};

// 自動載入更多 (交集觀察器)
const setupIntersectionObserver = () => {
  if (!props.autoLoad || !loadMoreTrigger.value) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && props.hasMore && !props.loadingMore) {
        loadMore();
      }
    },
    {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    }
  );

  observer.observe(loadMoreTrigger.value);

  // 清理觀察器
  onUnmounted(() => {
    observer.disconnect();
  });
};

// 載入使用者位置
const loadUserLocation = async () => {
  if (props.showDistance) {
    try {
      const { getCurrentPosition } = useGeolocation();
      const coords = await getCurrentPosition();
      if (coords) {
        userLocation.value = coords;
      }
    } catch (error) {
      console.warn('無法取得使用者位置:', error);
    }
  }
};

// 載入使用者偏好
const loadUserPreferences = () => {
  try {
    const savedViewMode = localStorage.getItem('activity-list-view-mode');
    if (savedViewMode && ['grid', 'list'].includes(savedViewMode)) {
      viewMode.value = savedViewMode as 'grid' | 'list';
    }
  } catch (error) {
    console.warn('無法載入使用者偏好:', error);
  }
};

// 初始化
onMounted(async () => {
  loadUserPreferences();
  await loadUserLocation();
  
  nextTick(() => {
    setupIntersectionObserver();
  });
});

// 監聽自動載入設定變化
watch(() => props.autoLoad, () => {
  nextTick(() => {
    setupIntersectionObserver();
  });
});
</script>

<style scoped>
.activity-list {
  @apply w-full;
}

.activity-grid {
  @apply grid gap-6;
}

/* 響應式網格調整 */
@screen sm {
  .activity-grid.grid-cols-1.sm\:grid-cols-2 {
    gap: 1.5rem;
  }
}

@screen lg {
  .activity-grid.grid-cols-1.sm\:grid-cols-2.lg\:grid-cols-3 {
    gap: 1.5rem;
  }
}

/* 列表模式樣式調整 */
.activity-grid.grid-cols-1 {
  gap: 1rem;
}

/* 載入動畫 */
.activity-list .loading-spinner {
  @apply w-5 h-5;
}

/* 空狀態樣式 */
.activity-list .empty-state {
  @apply text-center py-12;
}
</style>