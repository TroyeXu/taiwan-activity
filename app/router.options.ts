import type { RouterConfig } from '@nuxt/schema';

export default <RouterConfig>{
  // 使用 hash 模式以更好地支援 GitHub Pages
  hashMode: false,

  // 滾動行為
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    }

    return { top: 0 };
  },
};
