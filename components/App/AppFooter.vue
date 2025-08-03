<template>
  <footer class="bg-white border-t border-gray-200 mt-12">
    <div class="container mx-auto px-4 py-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- 品牌資訊 -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ElIcon class="text-white" size="18">
                <LocationFilled />
              </ElIcon>
            </div>
            <h3 class="text-lg font-semibold text-gray-800">台灣觀光活動地圖</h3>
          </div>
          <p class="text-gray-600 text-sm leading-relaxed">
            探索台灣各地精彩的觀光活動，使用互動地圖輕鬆找到您感興趣的景點和活動。
          </p>
          <div class="flex gap-3">
            <ElButton circle size="small" @click="shareApp">
              <ElIcon><Share /></ElIcon>
            </ElButton>
            <ElButton circle size="small" @click="openGitHub">
              <ElIcon><Link /></ElIcon>
            </ElButton>
          </div>
        </div>

        <!-- 快速連結 -->
        <div class="space-y-4">
          <h4 class="font-semibold text-gray-800">快速連結</h4>
          <div class="space-y-2">
            <NuxtLink
              to="/"
              class="block text-gray-600 hover:text-blue-600 transition-colors text-sm"
            >
              首頁
            </NuxtLink>
            <NuxtLink
              to="/favorites"
              class="block text-gray-600 hover:text-blue-600 transition-colors text-sm"
            >
              我的收藏
            </NuxtLink>
            <a
              href="#about"
              class="block text-gray-600 hover:text-blue-600 transition-colors text-sm"
              @click="scrollToTop"
            >
              關於我們
            </a>
            <a
              href="#contact"
              class="block text-gray-600 hover:text-blue-600 transition-colors text-sm"
              @click="scrollToTop"
            >
              聯絡我們
            </a>
          </div>
        </div>

        <!-- 活動分類 -->
        <div class="space-y-4">
          <h4 class="font-semibold text-gray-800">熱門分類</h4>
          <div class="space-y-2">
            <NuxtLink
              v-for="category in popularCategories"
              :key="category.slug"
              :to="`/?category=${category.slug}`"
              class="block text-gray-600 hover:text-blue-600 transition-colors text-sm"
            >
              {{ category.name }}
            </NuxtLink>
          </div>
        </div>

        <!-- 聯絡資訊 -->
        <div class="space-y-4">
          <h4 class="font-semibold text-gray-800">技術支援</h4>
          <div class="space-y-3 text-sm text-gray-600">
            <div class="flex items-center gap-2">
              <ElIcon><Message /></ElIcon>
              <span>support@example.com</span>
            </div>
            <div class="flex items-center gap-2">
              <ElIcon><Phone /></ElIcon>
              <span>+886-2-1234-5678</span>
            </div>
            <div class="flex items-center gap-2">
              <ElIcon><LocationFilled /></ElIcon>
              <span>台北市信義區</span>
            </div>
          </div>

          <!-- 資料來源說明 -->
          <div class="pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-500 leading-relaxed">
              本平台使用 Claude AI 技術驗證資料真實性，確保提供高品質的觀光資訊。
            </p>
          </div>
        </div>
      </div>

      <!-- 底部資訊 -->
      <div class="border-t border-gray-200 mt-8 pt-6">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div class="text-sm text-gray-500">© {{ currentYear }} 台灣觀光活動地圖. 版權所有.</div>

          <div class="flex items-center gap-6 text-sm text-gray-500">
            <a href="#privacy" class="hover:text-blue-600 transition-colors"> 隱私政策 </a>
            <a href="#terms" class="hover:text-blue-600 transition-colors"> 使用條款 </a>
            <a href="#cookies" class="hover:text-blue-600 transition-colors"> Cookie 政策 </a>
            <div class="flex items-center gap-1">
              <ElIcon><TrendCharts /></ElIcon>
              <span>資料更新: {{ lastUpdateDate }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { LocationFilled, Share, Link, Message, Phone, TrendCharts } from '@element-plus/icons-vue';

// 響應式資料
const currentYear = new Date().getFullYear();
const lastUpdateDate = new Date().toLocaleDateString('zh-TW');

// 熱門分類（這裡可以從 API 獲取）
const popularCategories = ref([
  { name: '文化藝術', slug: 'culture' },
  { name: '自然景觀', slug: 'nature' },
  { name: '美食體驗', slug: 'food' },
  { name: '戶外活動', slug: 'outdoor' },
  { name: '節慶活動', slug: 'festival' },
]);

// 分享應用
const shareApp = async () => {
  const shareData = {
    title: '台灣觀光活動地圖',
    text: '探索台灣各地精彩的觀光活動',
    url: window.location.origin,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      ElMessage.success('網址已複製到剪貼簿');
    }
  } catch (error) {
    console.error('分享失敗:', error);
  }
};

// 開啟 GitHub
const openGitHub = () => {
  window.open('https://github.com/your-repo/taiwan-activity-map', '_blank');
};

// 滾動到頂部
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>

<style scoped>
/* 連結 hover 效果 */
a {
  transition: color 0.2s ease;
}

/* 響應式調整 */
@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .grid-cols-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .grid-cols-4 {
    grid-template-columns: 1fr;
  }
}

/* 品牌 logo 動畫 */
.w-8.h-8 {
  transition: transform 0.2s ease;
}

.w-8.h-8:hover {
  transform: scale(1.05);
}
</style>
