<template>
  <NuxtLayout>
    <NuxtPage />
    <!-- 開發工具面板 -->
    <DevToolsPanel />
  </NuxtLayout>
</template>

<script setup lang="ts">
// 載入除錯工具（僅在開發環境）
if (process.dev) {
  // import('~/utils/dev-tools/data-validator').then(({ setupDebugTools }) => {
  //   setupDebugTools();
  // });
  // import('~/utils/dev-tools/data-inspector').then(({ setupDataInspector }) => {
  //   setupDataInspector();
  // });
  // import('~/utils/dev-tools/performance-monitor').then(({ setupPerformanceMonitor }) => {
  //   setupPerformanceMonitor();
  // });
}

// 處理 GitHub Pages 404 重定向
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');

  if (redirect) {
    // 移除查詢參數並導航到原始路徑
    const { baseURL } = useRuntimeConfig().app;
    let targetPath = redirect;

    // 如果重定向路徑已包含 baseURL，則移除它
    if (targetPath.startsWith(baseURL)) {
      targetPath = targetPath.substring(baseURL.length - 1);
    }

    // 清理 URL
    window.history.replaceState({}, document.title, window.location.pathname);

    // 導航到目標路徑
    navigateTo(targetPath);
  }
});

// SEO Meta
useHead({
  htmlAttrs: {
    lang: 'zh-TW',
  },
});
</script>
