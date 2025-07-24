<template>
  <ElConfigProvider :locale="zhTw">
    <div class="min-h-screen bg-gray-50">
      <!-- 應用標題列（僅在非首頁顯示） -->
      <AppHeader v-if="!isHomePage" />
      
      <!-- 主要內容 -->
      <main :class="isHomePage ? '' : 'pt-16'">
        <slot />
      </main>
      
      <!-- 應用底部（僅在非首頁顯示） -->
      <AppFooter v-if="!isHomePage" />
      
      <!-- 全域通知容器 -->
      <ElBacktop />
    </div>
  </ElConfigProvider>
</template>

<script setup lang="ts">
import zhTw from 'element-plus/es/locale/lang/zh-tw';

// 路由
const route = useRoute();

// 檢查是否為首頁
const isHomePage = computed(() => route.path === '/');

// 設定全域樣式
useHead({
  htmlAttrs: {
    lang: 'zh-TW'
  },
  bodyAttrs: {
    class: 'antialiased'
  }
});
</script>

<style>
/* 全域樣式 */
html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Element Plus 客製化 */
:root {
  --el-color-primary: #3b82f6;
  --el-color-primary-light-3: #93c5fd;
  --el-color-primary-light-5: #bfdbfe;
  --el-color-primary-light-7: #dbeafe;
  --el-color-primary-light-8: #eff6ff;
  --el-color-primary-light-9: #f8fafc;
  --el-color-primary-dark-2: #2563eb;
}

/* 自定義捲動條 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 響應式工具類 */
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .container {
    padding: 0 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 2rem;
  }
}
</style>