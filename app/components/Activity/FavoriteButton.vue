<template>
  <ElButton
    :type="isFavorited ? 'primary' : 'default'"
    :size="size"
    :loading="loading"
    @click="toggleFavorite"
    :disabled="!activity"
  >
    <ElIcon>
      <StarFilled v-if="isFavorited" />
      <Star v-else />
    </ElIcon>
    {{ isFavorited ? '已收藏' : '收藏' }}
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
  loading,
} = useFavorites();

// 檢查是否已收藏
const isCurrentlyFavorited = computed(() => props.activity ? checkIsFavorite(props.activity.id) : false);

// 切換收藏狀態
const toggleFavorite = async () => {
  if (!props.activity) return;

  try {
    if (isCurrentlyFavorited.value) {
      await removeFromFavorites(props.activity.id);
      ElMessage.success('已移除收藏');
    } else {
      await addToFavorites(props.activity);
      ElMessage.success('已加入收藏');
    }
  } catch (error) {
    ElMessage.error(isCurrentlyFavorited.value ? '移除收藏失敗' : '加入收藏失敗');
    console.error('收藏操作失敗:', error);
  }
};

// 別名，方便模板使用
const isFavorited = computed(() => isCurrentlyFavorited.value);
</script>
