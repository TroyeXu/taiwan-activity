<template>
  <div
    class="activity-card bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer"
    @click="handleClick"
  >
    <!-- 緊湊活動內容 -->
    <div class="p-3">
      <!-- 標題行 -->
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-base text-gray-900 flex-1 mr-2">
          {{ activity.name }}
        </h3>
        
        <!-- 收藏按鈕 -->
        <button
          class="p-1 rounded-full hover:bg-gray-100 transition-colors focus-outline"
          @click.stop="toggleFavorite"
        >
          <el-icon
            size="18"
            :class="{ 'text-yellow-500': isFavorited, 'text-gray-400': !isFavorited }"
          >
            <Star v-if="!isFavorited" />
            <StarFilled v-else />
          </el-icon>
        </button>
      </div>

      <!-- 資訊行 -->
      <div class="flex items-center justify-between mb-2">
        <!-- 狀態和地點 -->
        <div class="flex items-center space-x-3 text-sm text-gray-600">
          <el-tag
            :type="getStatusTagType(activity.status)"
            size="small"
          >
            {{ getStatusText(activity.status) }}
          </el-tag>
          
          <span v-if="activity.location" class="flex items-center">
            <el-icon class="mr-1 text-gray-400"><Location /></el-icon>
            {{ activity.location.city || activity.location.address }}
          </span>
        </div>
      </div>

      <!-- 底部行 -->
      <div class="flex items-center justify-between">
        <!-- 分類和時間 -->
        <div class="flex items-center space-x-2 flex-1">
          <span
            v-if="activity.categories?.[0]"
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
          >
            {{ activity.categories[0].icon }} {{ activity.categories[0].name }}
          </span>
          
          <span v-if="activity.time" class="text-xs text-gray-500 flex items-center">
            <el-icon class="mr-1"><Clock /></el-icon>
            {{ formatActivityTime(activity.time) }}
          </span>
        </div>

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
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  StarFilled, Star, Clock, Location 
} from '@element-plus/icons-vue';
import type { Activity } from '~/types';

interface Props {
  activity: Activity;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

const emit = defineEmits<{
  click: [activity: Activity];
  favoriteToggle: [activity: Activity];
}>();

// Composables
const { isFavorite, toggleFavorite: toggleFav } = useFavorites();

// 計算屬性
const isFavorited = computed(() => isFavorite(props.activity.id));

// 活動狀態映射
const getStatusTagType = (status: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' => {
  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    active: 'success',
    upcoming: 'warning',
    ended: 'info',
    cancelled: 'danger',
    pending: 'info'
  };
  return statusMap[status] || 'info';
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
  console.log('ActivityCard handleClick 被觸發:', props.activity.name);
  if (props.activity.url) {
    window.open(props.activity.url, '_blank');
  } else {
    emit('click', props.activity);
  }
};

const toggleFavorite = async () => {
  try {
    await toggleFav(props.activity);
    emit('favoriteToggle', props.activity);
  } catch (error) {
    console.error('切換收藏失敗:', error);
  }
};

</script>

<style scoped>
/* 焦點樣式 */
.focus-outline:focus {
  @apply outline-none ring-2 ring-primary-500/50;
}
</style>