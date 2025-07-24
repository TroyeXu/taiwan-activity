<template>
  <ElButton
    :type="isFavorited ? 'primary' : 'default'"
    :size="size"
    :loading="loading"
    @click="toggleFavorite"
    :disabled="!activityId"
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

// Props
interface Props {
  activityId: string;
  size?: 'small' | 'default' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default'
});

// 使用收藏功能
const { 
  isFavorited, 
  addFavorite, 
  removeFavorite,
  loading 
} = useFavorites();

// 檢查是否已收藏
const isCurrentlyFavorited = computed(() => 
  isFavorited(props.activityId)
);

// 切換收藏狀態
const toggleFavorite = async () => {
  if (!props.activityId) return;

  try {
    if (isCurrentlyFavorited.value) {
      await removeFavorite(props.activityId);
      ElMessage.success('已移除收藏');
    } else {
      await addFavorite(props.activityId);
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