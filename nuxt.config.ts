export default defineNuxtConfig({
  devtools: { enabled: true },
  
  // 模組配置
  modules: [
    '@nuxtjs/tailwindcss',
    '@element-plus/nuxt',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/image'
  ],
  
  // CSS 配置
  css: [
    '~/assets/css/main.css'
  ],
  
  // 運行時配置
  runtimeConfig: {
    // 私有環境變數 (僅服務端可用)
    claudeApiKey: process.env.CLAUDE_API_KEY,
    databaseUrl: process.env.DATABASE_URL || './data/tourism.db',
    
    public: {
      // 公開環境變數 (客戶端可用)
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      appName: 'Taiwan Tourism Map'
    }
  },
  
  // Nitro 配置
  nitro: {
    experimental: {
      wasm: true
    }
  },
  
  // 應用程式配置
  app: {
    head: {
      title: 'Taiwan Tourism Map',
      titleTemplate: '%s - Taiwan Tourism Map',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'Discover amazing tourism activities across Taiwan. Find events, festivals, and attractions near you.' 
        },
        { name: 'keywords', content: 'Taiwan, tourism, activities, events, map, travel' },
        { property: 'og:title', content: 'Taiwan Tourism Map' },
        { property: 'og:description', content: 'Discover amazing tourism activities across Taiwan' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { 
          rel: 'preconnect', 
          href: 'https://fonts.gstatic.com', 
          crossorigin: 'anonymous' 
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        }
      ]
    }
  },
  
  // TypeScript 配置
  typescript: {
    strict: false,
    typeCheck: false
  },
  
  // Element Plus 配置
  elementPlus: {
    importStyle: 'scss',
    themes: ['dark']
  },
  
  // 圖片優化配置
  image: {
    // 圖片提供商
    providers: {
      cloudinary: {
        baseURL: process.env.CLOUDINARY_BASE_URL
      }
    }
  },
  
  // 開發工具配置
  devServer: {
    port: 3000
  }
});