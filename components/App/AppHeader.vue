<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo 和標題 -->
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ElIcon class="text-white" size="18">
                <LocationFilled />
              </ElIcon>
            </div>
            <h1 class="text-xl font-semibold text-gray-800 hidden sm:block">台灣觀光活動地圖</h1>
          </NuxtLink>
        </div>

        <!-- 導航選單 -->
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink
            to="/"
            class="text-gray-600 hover:text-blue-600 transition-colors"
            :class="{ 'text-blue-600 font-medium': $route.path === '/' }"
          >
            首頁
          </NuxtLink>
          <NuxtLink
            to="/favorites"
            class="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
            :class="{ 'text-blue-600 font-medium': $route.path === '/favorites' }"
          >
            <ElIcon><Star /></ElIcon>
            我的收藏
            <ElBadge v-if="favoriteCount > 0" :value="favoriteCount" :max="99" class="ml-1" />
          </NuxtLink>
        </nav>

        <!-- 右側操作 -->
        <div class="flex items-center gap-3">
          <!-- 搜尋框（桌面版） -->
          <div class="hidden lg:block">
            <ElInput
              v-model="searchQuery"
              placeholder="搜尋活動..."
              size="default"
              style="width: 200px"
              clearable
              @keyup.enter="handleSearch"
              @clear="clearSearch"
            >
              <template #prefix>
                <ElIcon><Search /></ElIcon>
              </template>
            </ElInput>
          </div>

          <!-- 位置按鈕 -->
          <ElTooltip content="取得我的位置" placement="bottom">
            <ElButton circle :loading="locationLoading" @click="getCurrentLocation">
              <ElIcon><Aim /></ElIcon>
            </ElButton>
          </ElTooltip>

          <!-- 手機版選單按鈕 -->
          <ElButton class="md:hidden" circle @click="showMobileMenu = true">
            <ElIcon><Menu /></ElIcon>
          </ElButton>
        </div>
      </div>
    </div>

    <!-- 手機版搜尋列 -->
    <div class="lg:hidden border-t border-gray-100 p-4">
      <ElInput
        v-model="searchQuery"
        placeholder="搜尋活動..."
        size="large"
        clearable
        @keyup.enter="handleSearch"
        @clear="clearSearch"
      >
        <template #prefix>
          <ElIcon><Search /></ElIcon>
        </template>
      </ElInput>
    </div>

    <!-- 手機版選單抽屜 -->
    <ElDrawer v-model="showMobileMenu" title="選單" direction="rtl" size="280px">
      <div class="space-y-4">
        <NuxtLink
          to="/"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          :class="{ 'bg-blue-50 text-blue-600': $route.path === '/' }"
          @click="showMobileMenu = false"
        >
          <ElIcon><HomeFilled /></ElIcon>
          首頁
        </NuxtLink>

        <NuxtLink
          to="/favorites"
          class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
          :class="{ 'bg-blue-50 text-blue-600': $route.path === '/favorites' }"
          @click="showMobileMenu = false"
        >
          <div class="flex items-center gap-3">
            <ElIcon><Star /></ElIcon>
            我的收藏
          </div>
          <ElBadge v-if="favoriteCount > 0" :value="favoriteCount" :max="99" />
        </NuxtLink>

        <div class="border-t border-gray-200 pt-4">
          <ElButton class="w-full" :loading="locationLoading" @click="getCurrentLocation">
            <ElIcon><Aim /></ElIcon>
            取得我的位置
          </ElButton>
        </div>
      </div>
    </ElDrawer>
  </header>
</template>

<script setup lang="ts">
import { LocationFilled, Search, Star, Aim, Menu, HomeFilled } from '@element-plus/icons-vue';

// 路由
const router = useRouter();

// 響應式狀態
const searchQuery = ref('');
const showMobileMenu = ref(false);
const locationLoading = ref(false);

// 使用 composables
const { favoriteCount } = useFavorites();
const { getUserLocation } = useGeolocation();

// 搜尋處理
const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({
      path: '/',
      query: { q: searchQuery.value.trim() },
    });
    searchQuery.value = '';
  }
};

// 清除搜尋
const clearSearch = () => {
  searchQuery.value = '';
};

// 取得使用者位置
const getCurrentLocation = async () => {
  locationLoading.value = true;

  try {
    const location = await getUserLocation();
    if (location) {
      // 導航到首頁並設定位置參數
      router.push({
        path: '/',
        query: {
          lat: location.lat.toString(),
          lng: location.lng.toString(),
          locate: 'true',
        },
      });
      ElMessage.success('已取得您的位置');
    }
  } catch (error) {
    ElMessage.error('無法取得您的位置，請檢查位置權限設定');
  } finally {
    locationLoading.value = false;
  }
};

// 監聽路由變化，關閉手機版選單
watch(
  () => router.currentRoute.value.path,
  () => {
    showMobileMenu.value = false;
  }
);
</script>

<style scoped>
/* 確保 NuxtLink 的 active 狀態 */
.router-link-exact-active {
  @apply text-blue-600 font-medium;
}

/* 搜尋框樣式優化 */
:deep(.el-input__wrapper) {
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

/* 手機版適配 */
@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
}
</style>
