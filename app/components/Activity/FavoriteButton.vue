<template>
  <ElButton
    :type="isFavorited ? 'warning' : 'default'"
    :size="size"
    :loading="loading"
    @click="toggleFavorite"
    :disabled="!activity"
    :class="{ 'is-favorited': isFavorited }"
  >
    <ElIcon :size="size === 'large' ? 20 : 16">
      <StarFilled v-if="isFavorited" />
      <Star v-else />
    </ElIcon>
    <span class="ml-1">{{ isFavorited ? '已收藏' : '收藏' }}</span>
  </ElButton>
</template>

<script setup lang="ts">
import { Star, StarFilled } from '@element-plus/icons-vue';
import type { Activity } from '~/types';

// Props
interface Props {
  activity: Activity;
  size?: 'small' | 'default' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
});

// 使用收藏功能
const {
  isFavorite: checkIsFavorite,
  addToFavorites,
  removeFromFavorites,
  toggleFavorite: toggleFav,
  loading,
} = useFavorites();

// 檢查是否已收藏
const isFavorited = computed(() => props.activity ? checkIsFavorite(props.activity.id) : false);

// 切換收藏狀態
const toggleFavorite = async (e?: Event) => {
  if (e) {
    e.stopPropagation();
  }
  
  if (!props.activity) {
    console.error('No activity provided');
    return;
  }

  try {
    console.log('Toggle favorite for:', props.activity.id, 'Current status:', isFavorited.value);
    await toggleFav(props.activity);
    // 訊息已在 useFavorites 中處理
  } catch (error) {
    console.error('收藏操作失敗:', error);
  }
};
</script>

<style scoped>
/* 已收藏狀態的特殊樣式 */
.is-favorited {
  animation: favoriteAdded 0.3s ease-in-out;
}

.is-favorited :deep(.el-button__text--expand) {
  font-weight: 600;
}

/* 收藏動畫 */
@keyframes favoriteAdded {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* 按鈕懸停效果 */
:deep(.el-button--warning) {
  --el-button-text-color: #fff;
  --el-button-bg-color: #f59e0b;
  --el-button-border-color: #f59e0b;
}

:deep(.el-button--warning:hover) {
  --el-button-hover-text-color: #fff;
  --el-button-hover-bg-color: #d97706;
  --el-button-hover-border-color: #d97706;
}
</style>
