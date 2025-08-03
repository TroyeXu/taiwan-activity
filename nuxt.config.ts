export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  
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
    '~/assets/css/main.css',
    'leaflet/dist/leaflet.css',
    'leaflet.markercluster/dist/MarkerCluster.css',
    'leaflet.markercluster/dist/MarkerCluster.Default.css'
  ],
  
  // 運行時配置
  runtimeConfig: {
    // 私有環境變數 (僅服務端可用)
    claudeApiKey: process.env.CLAUDE_API_KEY,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    databaseUrl: process.env.DATABASE_URL || './data/tourism.db',
    
    public: {
      // 公開環境變數 (客戶端可用)
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      appName: '台灣觀光活動地圖',
      appVersion: '1.0.0'
    }
  },
  
  // Nitro 配置
  nitro: {
    experimental: {
      wasm: true
    },
    // Node.js 原生模組
    nodeModulesDirs: ['./node_modules'],
    
    // 修復 cookie-es 導入問題
    rollupConfig: {
      external: ['cookie-es', 'better-sqlite3']
    },
    // 禁用有問題的 Azure 相關功能
    preset: 'node-server',
    storage: {
      fs: { 
        driver: 'fs',
        base: './data/cache'
      }
    }
  },
  
  // 應用程式配置
  app: {
    head: {
      title: '台灣觀光活動地圖',
      titleTemplate: '%s - 台灣觀光活動地圖',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: '探索台灣各地精彩的觀光活動，使用互動地圖尋找附近的景點和活動' 
        },
        { name: 'keywords', content: '台灣,觀光,活動,地圖,旅遊,景點,節慶,文化' },
        { property: 'og:title', content: '台灣觀光活動地圖' },
        { property: 'og:description', content: '探索台灣各地精彩的觀光活動' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: '#3B82F6' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
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
    strict: true,
    typeCheck: true
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
    },
    // 預設尺寸
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536
    }
  },
  
  // Vite 配置
  vite: {
    optimizeDeps: {
      include: ['leaflet', 'leaflet.markercluster'],
      exclude: ['cookie-es']
    },
    define: {
      global: 'globalThis'
    },
    server: {
      fs: {
        allow: ['..']
      }
    },
    plugins: [],
    // 修復 cookie-es 模組問題
    ssr: {
      noExternal: ['cookie-es']
    }
  },

  // 路由規則和快取配置
  routeRules: {
    // 主頁預渲染
    '/': { prerender: true },
    
    // API 路由快取設定
    '/api/categories/**': { 
      headers: { 'cache-control': 's-maxage=3600' },
      cors: true 
    },
    '/api/stats/**': { 
      headers: { 'cache-control': 's-maxage=1800' },
      cors: true 
    },
    '/api/health': { 
      headers: { 'cache-control': 's-maxage=60' },
      cors: true 
    },
    '/api/activities/search': { 
      headers: { 'cache-control': 's-maxage=300' },
      cors: true 
    },
    '/api/activities/recommend': { 
      headers: { 'cache-control': 's-maxage=900' },
      cors: true 
    },
    
    // 活動頁面 ISR
    '/activity/**': { isr: 3600 },
    
    // 管理頁面 SPA
    '/admin/**': { ssr: false },
    
    // 靜態資源長期快取  
    '/images/**': { headers: { 'cache-control': 's-maxage=31536000' } },
    '/icons/**': { headers: { 'cache-control': 's-maxage=31536000' } }
  },

  // 實驗性功能
  experimental: {
    payloadExtraction: false
  },

  // 忽略 build 警告
  build: {
    transpile: ['@element-plus/icons-vue']
  },

  // Nitro 忽略警告
  ignore: [
    '**/*.map',
    '.nuxt',
    '.output',
    'dist'
  ],

  // 開發工具配置
  devServer: {
    port: 3000,
    host: '0.0.0.0'
  },

  // 隱藏特定的構建警告
  hooks: {
    'build:error': (error: any) => {
      if (error.message?.includes('cookie-es') || error.message?.includes('azure')) {
        // 忽略 cookie-es 和 azure 相關錯誤
        return
      }
      throw error
    }
  }
});