<template>
  <div
    class="activity-card bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
    @click="handleClick"
  >
    <!-- 活動狀態緞條 -->
    <div 
      class="absolute top-0 left-0 right-0 h-1"
      :class="getStatusBarColor(activity.status)"
    ></div>
    
    <!-- 活動內容 -->
    <div class="p-4">
      <!-- 頂部區域 -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <!-- 標題 -->
          <h3 class="font-semibold text-base text-gray-900 line-clamp-2 mb-1">
            {{ activity.name }}
          </h3>
          
          <!-- 分類和狀態 -->
          <div class="flex items-center gap-2">
            <span
              v-if="activity.categories?.[0]"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {{ activity.categories[0].icon }} {{ activity.categories[0].name }}
            </span>
            <el-tag :type="getStatusTagType(activity.status)" size="small">
              {{ getStatusText(activity.status) }}
            </el-tag>
          </div>
        </div>

        <!-- 收藏按鈕 -->
        <button
          class="favorite-btn"
          :class="{ 'is-favorited': isFavorited }"
          @click.stop="toggleFavorite"
          :aria-label="isFavorited ? '移除收藏' : '加入收藏'"
        >
          <el-icon size="22">
            <Star v-if="!isFavorited" />
            <StarFilled v-else />
          </el-icon>
        </button>
      </div>

      <!-- 描述/摘要 -->
      <div v-if="activity.summary || activity.description" class="mb-3">
        <p class="text-sm text-gray-600 line-clamp-2">
          {{ activity.summary || activity.description }}
        </p>
      </div>

      <!-- 資訊區域 -->
      <div class="grid grid-cols-2 gap-3 mb-3">
        <!-- 位置 -->
        <div v-if="activity.location" class="flex items-center text-sm text-gray-600">
          <el-icon class="mr-1.5 text-gray-400"><Location /></el-icon>
          <span class="truncate">{{ activity.location.city || activity.location.district || activity.location.address }}</span>
        </div>
        
        <!-- 時間 -->
        <div v-if="activity.time" class="flex items-center text-sm text-gray-600">
          <el-icon class="mr-1.5 text-gray-400"><Clock /></el-icon>
          <span class="truncate">{{ formatActivityTime(activity.time) }}</span>
        </div>
        
        <!-- 價格 -->
        <div v-if="activity.price !== undefined" class="flex items-center text-sm text-gray-600">
          <el-icon class="mr-1.5 text-gray-400"><Ticket /></el-icon>
          <span>{{ activity.price === 0 ? '免費' : `NT$ ${activity.price}` }}</span>
        </div>
        
        <!-- 距離 -->
        <div v-if="activity.distance" class="flex items-center text-sm text-gray-600">
          <el-icon class="mr-1.5 text-gray-400"><MapLocation /></el-icon>
          <span>{{ formatDistance(activity.distance) }}</span>
        </div>
      </div>
      
      <!-- 底部操作區 -->
      <div class="flex items-center justify-between pt-3 border-t border-gray-100">
        <!-- 左側標籤 -->
        <div class="flex items-center gap-2">
          <!-- 特色標籤 -->
          <span v-if="activity.isHot" class="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
            <el-icon class="mr-0.5"><HotWater /></el-icon>
            熱門
          </span>
          <span v-if="activity.isNew" class="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs font-medium">
            <el-icon class="mr-0.5"><Promotion /></el-icon>
            新活動
          </span>
        </div>
        
        <!-- 右側操作 -->
        <button class="text-sm text-blue-600 hover:text-blue-700 font-medium">
          查看詳情 →
        </button>
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
  StarFilled, 
  Star, 
  Clock, 
  Location, 
  Ticket, 
  MapLocation,
  HotWater,
  Promotion 
} from '@element-plus/icons-vue';
import type { Activity } from '~/types';

interface Props {
  activity: Activity;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
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
const getStatusTagType = (
  status: string
): 'success' | 'warning' | 'info' | 'danger' | 'primary' => {
  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    active: 'success',
    upcoming: 'warning',
    ended: 'info',
    cancelled: 'danger',
    pending: 'info',
  };
  return statusMap[status] || 'info';
};

const getStatusText = (status: string) => {
  const statusTextMap = {
    active: '進行中',
    upcoming: '即將開始',
    ended: '已結束',
    cancelled: '已取消',
    pending: '待確認',
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
      month: 'short',
      day: 'numeric',
    });
  };

  let timeText = formatDate(startDate);

  if (endDate && endDate.getTime() !== startDate.getTime()) {
    timeText = `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  return timeText;
};

// 格式化距離
const formatDistance = (distance: number) => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

// 狀態欄顏色
const getStatusBarColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'bg-green-500',
    upcoming: 'bg-yellow-500',
    ended: 'bg-gray-400',
    cancelled: 'bg-red-500',
    pending: 'bg-blue-500',
  };
  return colorMap[status] || 'bg-gray-400';
};

// 事件處理
const handleClick = () => {
  console.log('ActivityCard handleClick 被觸發:', props.activity.name);
  emit('click', props.activity);
};

const toggleFavorite = async (e: Event) => {
  e.stopPropagation();
  try {
    await toggleFav(props.activity);
    emit('favoriteToggle', props.activity);
    ElMessage.success(isFavorited.value ? '已移除收藏' : '已加入收藏');
  } catch (error) {
    console.error('切換收藏失敗:', error);
    ElMessage.error('操作失敗，請稍後再試');
  }
};
</script>

<style scoped>
/* 收藏按鈕樣式 */
.favorite-btn {
  padding: 0.375rem;
  border-radius: 50%;
  transition: all 0.3s ease;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-btn:hover {
  background-color: #f3f4f6;
  transform: scale(1.1);
}

.favorite-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.2);
}

/* 未收藏狀態 */
.favorite-btn:not(.is-favorited) {
  color: #9ca3af;
}

.favorite-btn:not(.is-favorited):hover {
  color: #6b7280;
  background-color: #f9fafb;
}

/* 已收藏狀態 */
.favorite-btn.is-favorited {
  color: #fbbf24;
  animation: favoriteAdded 0.4s ease-in-out;
}

.favorite-btn.is-favorited:hover {
  color: #f59e0b;
  background-color: #fef3c7;
  transform: scale(1.15);
}

/* 收藏動畫 */
@keyframes favoriteAdded {
  0% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.2) rotate(-5deg);
  }
  50% {
    transform: scale(1.3) rotate(5deg);
  }
  75% {
    transform: scale(1.2) rotate(-3deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

/* 焦點樣式 */
.focus-outline:focus {
  @apply outline-none ring-2 ring-primary-500/50;
}

/* 文字截斷 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 卡片懸停效果 */
.activity-card:hover {
  transform: translateY(-2px);
}

/* 活動卡片載入動畫 */
.activity-card {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
