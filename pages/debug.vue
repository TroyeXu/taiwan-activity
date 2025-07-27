<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">調試工具</h1>
      
      <div class="space-y-6">
        <!-- 收藏狀態 -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-4">收藏狀態</h2>
          
          <div class="space-y-4">
            <div>
              <strong>localStorage 中的收藏 ID:</strong>
              <pre class="bg-gray-100 p-2 rounded mt-2">{{ storedFavorites }}</pre>
            </div>
            
            <div>
              <strong>載入的收藏活動數量:</strong>
              <span class="ml-2">{{ favorites.length }}</span>
            </div>
            
            <div>
              <strong>載入狀態:</strong>
              <span class="ml-2">{{ loading ? '載入中...' : '已完成' }}</span>
            </div>
            
            <div v-if="error" class="text-red-600">
              <strong>錯誤:</strong>
              <span class="ml-2">{{ error }}</span>
            </div>
          </div>
          
          <div class="mt-4 space-x-2">
            <el-button @click="refreshFavorites" :loading="loading">
              重新載入收藏
            </el-button>
            <el-button @click="clearInvalidFavorites" type="warning">
              清理無效收藏
            </el-button>
            <el-button @click="clearAllFavorites" type="danger">
              清空所有收藏
            </el-button>
          </div>
        </div>

        <!-- 資料庫活動 -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-lg font-semibold mb-4">資料庫中的活動</h2>
          
          <div class="space-y-2">
            <div v-for="activity in sampleActivities" :key="activity.id" class="border-b pb-2">
              <div class="flex justify-between items-center">
                <div>
                  <strong>{{ activity.name }}</strong>
                  <span class="text-gray-500 ml-2">(ID: {{ activity.id }})</span>
                </div>
                <el-button 
                  size="small" 
                  @click="addSampleToFavorites(activity)"
                  :disabled="isFavorite(activity.id)"
                >
                  {{ isFavorite(activity.id) ? '已收藏' : '加入收藏' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Activity } from '~/types';

const { 
  favorites, 
  loading, 
  error, 
  refreshFavorites, 
  clearAllFavorites: clearFavs,
  addToFavorites,
  isFavorite
} = useFavorites();

const storedFavorites = ref('');
const sampleActivities = ref<Activity[]>([]);

// 載入 localStorage 中的收藏
const loadStoredFavorites = () => {
  if (import.meta.client) {
    const stored = localStorage.getItem('tourism-favorites');
    storedFavorites.value = stored || '[]';
  }
};

// 載入範例活動
const loadSampleActivities = async () => {
  try {
    const response = await $fetch('/api/activities?limit=5');
    if (response.success && response.data) {
      sampleActivities.value = response.data;
    }
  } catch (err) {
    console.error('載入範例活動失敗:', err);
  }
};

// 清理無效收藏
const clearInvalidFavorites = () => {
  if (import.meta.client) {
    console.log('清理前的收藏:', localStorage.getItem('tourism-favorites'));
    localStorage.removeItem('tourism-favorites');
    loadStoredFavorites();
    refreshFavorites();
    ElMessage.success('已清理無效收藏');
    // 重新載入頁面以確保狀態完全重置
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};

// 清空所有收藏
const clearAllFavorites = async () => {
  await clearFavs();
  loadStoredFavorites();
};

// 添加範例到收藏
const addSampleToFavorites = async (activity: Activity) => {
  await addToFavorites(activity);
  loadStoredFavorites();
};

onMounted(() => {
  loadStoredFavorites();
  loadSampleActivities();
});
</script>