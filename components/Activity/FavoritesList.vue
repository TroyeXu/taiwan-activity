<template>
  <div class="space-y-4">
    <!-- 載入中 -->
    <div v-if="loading" class="space-y-3">
      <ElCard v-for="i in 3" :key="i">
        <ElSkeleton :rows="2" animated />
      </ElCard>
    </div>

    <!-- 空狀態 -->
    <div v-else-if="favorites.length === 0" class="text-center py-8">
      <ElEmpty description="還沒有收藏任何活動" :image-size="100">
        <template #description>
          <p class="text-gray-500 text-sm">探索活動並加入收藏吧！</p>
        </template>
      </ElEmpty>
    </div>

    <!-- 收藏列表 -->
    <div v-else class="space-y-3">
      <ElCard
        v-for="activity in favorites"
        :key="activity.id"
        shadow="hover"
        class="cursor-pointer transition-all hover:shadow-md"
        @click="handleActivityClick(activity.activity)"
      >
        <div class="flex gap-3">
          <!-- 活動圖片 -->
          <div class="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
            <img
              v-if="activity.activity.media?.images?.[0]"
              :src="activity.activity.media.images[0].url"
              :alt="activity.activity.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="flex items-center justify-center h-full text-gray-400">
              <ElIcon><Picture /></ElIcon>
            </div>
          </div>

          <!-- 活動資訊 -->
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-sm line-clamp-2 mb-1">
              {{ activity.activity.name }}
            </h3>
            
            <p class="text-xs text-gray-600 line-clamp-2 mb-2">
              {{ activity.activity.summary }}
            </p>

            <!-- 位置和時間 -->
            <div class="flex items-center gap-4 text-xs text-gray-500">
              <span v-if="activity.activity.location" class="flex items-center gap-1">
                <ElIcon><LocationFilled /></ElIcon>
                {{ activity.activity.location.city }}
              </span>
              
              <span v-if="activity.activity.time" class="flex items-center gap-1">
                <ElIcon><Calendar /></ElIcon>
                {{ formatDate(activity.activity.time.startDate) }}
              </span>
            </div>

            <!-- 分類標籤 -->
            <div v-if="activity.activity.categories && activity.activity.categories.length > 0" class="mt-2">
              <ElTag
                v-for="category in activity.activity.categories.slice(0, 2)"
                :key="category.id"
                size="small"
                :color="category.colorCode"
                class="text-white mr-1"
              >
                {{ category.name }}
              </ElTag>
            </div>
          </div>

          <!-- 移除按鈕 -->
          <div class="flex-shrink-0 flex flex-col justify-between items-end">
            <ElButton
              type="danger"
              size="small"
              circle
              plain
              @click.stop="removeFavorite(activity.id)"
            >
              <ElIcon><Delete /></ElIcon>
            </ElButton>
            
            <div class="text-xs text-gray-400">
              已收藏
            </div>
          </div>
        </div>
      </ElCard>

      <!-- 查看更多 -->
      <div v-if="favorites.length >= 5" class="text-center pt-4">
        <ElButton 
          type="primary" 
          plain
          @click="goToFavoritesPage"
        >
          查看所有收藏 ({{ favorites.length }})
        </ElButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { LocationFilled, Calendar, Picture, Delete } from '@element-plus/icons-vue';
import type { Activity } from '~/types';

// Emits
const emit = defineEmits<{
  'activity-click': [activity: any];
}>();

// 路由
const router = useRouter();

// 使用收藏功能
const { 
  favorites, 
  loading,
  removeFavorite: removeFav,
  refreshFavorites
} = useFavorites();

// 頁面載入時載入收藏
onMounted(() => {
  refreshFavorites();
});

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric'
  });
};

// 處理活動點擊
const handleActivityClick = (activity: any) => {
  emit('activity-click', activity);
};

// 移除收藏
const removeFavorite = async (favoriteId: string) => {
  try {
    await removeFav(favoriteId);
    ElMessage.success('已移除收藏');
  } catch (error) {
    ElMessage.error('移除收藏失敗');
    console.error('移除收藏失敗:', error);
  }
};

// 前往收藏頁面
const goToFavoritesPage = () => {
  router.push('/favorites');
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>