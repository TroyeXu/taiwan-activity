<template>
  <div
    class="activity-card"
    :class="{ 'compact': compact }"
    @click="handleClick"
  >
    <!-- 活動圖片 -->
    <div v-if="!compact" class="relative aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
      <img
        v-if="activity.media?.images?.[0]"
        :src="activity.media.images[0].url"
        :alt="activity.media.images[0].alt || activity.name"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
        <el-icon size="48" class="text-primary-400">
          <Picture />
        </el-icon>
      </div>

      <!-- 狀態標籤 -->
      <div class="absolute top-3 left-3">
        <el-tag
          :type="getStatusTagType(activity.status)"
          size="small"
          class="shadow-sm"
        >
          {{ getStatusText(activity.status) }}
        </el-tag>
      </div>

      <!-- 品質分數 -->
      <div v-if="activity.qualityScore >= 90" class="absolute top-3 right-3">
        <el-tag type="success" size="small" class="shadow-sm">
          <el-icon class="mr-1"><StarFilled /></el-icon>
          優質
        </el-tag>
      </div>

      <!-- 收藏按鈕 -->
      <div class="absolute bottom-3 right-3">
        <button
          class="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors focus-outline"
          @click.stop="toggleFavorite"
        >
          <el-icon
            size="18"
            :class="{ 'text-red-500': isFavorited, 'text-gray-600': !isFavorited }"
          >
            <Star v-if="!isFavorited" />
            <StarFilled v-else />
          </el-icon>
        </button>
      </div>
    </div>

    <!-- 活動內容 -->
    <div class="card-body" :class="{ 'p-4': !compact, 'p-3': compact }">
      <!-- 活動標題 -->
      <h3 class="font-semibold text-gray-900 mb-2" :class="{ 'text-lg': !compact, 'text-base': compact }">
        {{ activity.name }}
      </h3>

      <!-- 活動摘要 -->
      <p v-if="activity.summary && !compact" class="text-sm text-gray-600 mb-3 text-truncate-2">
        {{ activity.summary }}
      </p>

      <!-- 活動資訊 -->
      <div class="space-y-2 mb-3">
        <!-- 時間資訊 -->
        <div v-if="activity.time" class="flex items-center text-sm text-gray-600">
          <el-icon class="mr-2 text-green-500"><Clock /></el-icon>
          <span>{{ formatActivityTime(activity.time) }}</span>
        </div>

        <!-- 地點資訊 -->
        <div v-if="activity.location" class="flex items-start text-sm text-gray-600">
          <el-icon class="mr-2 mt-0.5 text-red-500 flex-shrink-0"><Location /></el-icon>
          <div class="flex-1 min-w-0">
            <span class="truncate">{{ activity.location.address }}</span>
            <span v-if="showDistance && distance" class="ml-2 text-primary-600 font-medium">
              {{ formatDistance(distance) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 活動分類 -->
      <div v-if="activity.categories?.length" class="flex flex-wrap gap-1 mb-3">
        <span
          v-for="category in activity.categories.slice(0, compact ? 2 : 3)"
          :key="category.id"
          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
          :style="{
            backgroundColor: getCategoryColor(category.slug) + '20',
            color: getCategoryColor(category.slug)
          }"
        >
          {{ getCategoryIcon(category.slug) }} {{ category.name }}
        </span>
        <span
          v-if="activity.categories.length > (compact ? 2 : 3)"
          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600"
        >
          +{{ activity.categories.length - (compact ? 2 : 3) }}
        </span>
      </div>

      <!-- 行動按鈕 -->
      <div v-if="!compact" class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <!-- 收藏按鈕（緊湊模式） -->
          <button
            class="p-1.5 rounded-full hover:bg-gray-100 transition-colors focus-outline"
            @click.stop="toggleFavorite"
          >
            <el-icon
              size="16"
              :class="{ 'text-red-500': isFavorited, 'text-gray-400': !isFavorited }"
            >
              <Star v-if="!isFavorited" />
              <StarFilled v-else />
            </el-icon>
          </button>

          <!-- 分享按鈕 -->
          <button
            class="p-1.5 rounded-full hover:bg-gray-100 transition-colors focus-outline"
            @click.stop="handleShare"
          >
            <el-icon size="16" class="text-gray-400 hover:text-gray-600">
              <Share />
            </el-icon>
          </button>
        </div>

        <!-- 查看詳情按鈕 -->
        <el-button type="primary" size="small" @click.stop="viewDetails">
          查看詳情
        </el-button>
      </div>
    </div>

    <!-- 載入遮罩 -->
    <div
      v-if="loading"
      class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg"
    >
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Picture, StarFilled, Star, Clock, Location, Share 
} from '@element-plus/icons-vue';
import type { Activity } from '~/types';

interface Props {
  activity: Activity;
  showDistance?: boolean;
  distance?: number;
  compact?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDistance: false,
  compact: false,
  loading: false
});

const emit = defineEmits<{
  click: [activity: Activity];
  favoriteToggle: [activity: Activity];
}>();

// Composables
const { isFavorite, toggleFavorite: toggleFav } = useFavorites();
const { getCategoryColor, getCategoryIcon } = useCategories();
const { formatDistance } = useGeolocation();

// 計算屬性
const isFavorited = computed(() => isFavorite(props.activity.id));

// 活動狀態映射
const getStatusTagType = (status: string) => {
  const statusMap = {
    active: 'success',
    upcoming: 'warning',
    ended: 'info',
    cancelled: 'danger',
    pending: 'info'
  };
  return statusMap[status as keyof typeof statusMap] || 'info';
};

const getStatusText = (status: string) => {
  const statusTextMap = {
    active: '進行中',
    upcoming: '即將開始',
    ended: '已結束',
    cancelled: '已取消',
    pending: '待確認'
  };
  return statusTextMap[status as keyof typeof statusTextMap] || '未知';
};

// 格式化活動時間
const formatActivityTime = (time: any) => {
  if (!time) return '';
  
  const startDate = new Date(time.startDate);
  const endDate = time.endDate ? new Date(time.endDate) : null;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr ? timeStr.substring(0, 5) : '';
  };

  let timeText = formatDate(startDate);
  
  if (endDate && endDate.getTime() !== startDate.getTime()) {
    timeText += ` - ${formatDate(endDate)}`;
  }
  
  if (time.startTime) {
    timeText += ` ${formatTime(time.startTime)}`;
    if (time.endTime) {
      timeText += `-${formatTime(time.endTime)}`;
    }
  }
  
  return timeText;
};

// 事件處理
const handleClick = () => {
  emit('click', props.activity);
};

const viewDetails = () => {
  navigateTo(`/activity/${props.activity.id}`);
};

const toggleFavorite = async () => {
  try {
    await toggleFav(props.activity);
    emit('favoriteToggle', props.activity);
  } catch (error) {
    console.error('切換收藏失敗:', error);
  }
};

const handleShare = async () => {
  const shareData = {
    title: props.activity.name,
    text: props.activity.summary || props.activity.name,
    url: `${window.location.origin}/activity/${props.activity.id}`
  };

  try {
    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      // 降級到複製連結
      await navigator.clipboard.writeText(shareData.url);
      ElMessage.success('連結已複製到剪貼板');
    }
  } catch (error) {
    console.error('分享失敗:', error);
    ElMessage.error('分享失敗');
  }
};
</script>

<style scoped>
.activity-card {
  @apply bg-white rounded-lg shadow-card border border-gray-200 overflow-hidden cursor-pointer transition-all duration-200 relative;
}

.activity-card:hover {
  @apply shadow-lg transform -translate-y-1;
}

.activity-card.compact {
  @apply shadow-sm;
}

.activity-card.compact:hover {
  @apply shadow-md transform-none;
}

.card-body {
  @apply relative;
}

/* 圖片載入動畫 */
.activity-card img {
  @apply transition-opacity duration-300;
}

.activity-card img[loading] {
  @apply opacity-0;
}

.activity-card img:not([loading]) {
  @apply opacity-100;
}

/* 標籤動畫 */
.el-tag {
  @apply transition-all duration-200;
}

/* 按鈕 hover 效果 */
.activity-card button {
  @apply transition-all duration-200;
}
</style>