# Nuxt.js 觀光活動地圖技術實作計畫

## 1. 技術堆疊選型

### 1.1 前端技術
```yaml
框架: Nuxt 3 + Vue 3 + TypeScript
UI 框架: Element Plus / Ant Design Vue
地圖整合: vue3-google-map
狀態管理: Pinia
CSS 框架: Tailwind CSS
構建工具: Vite (內建於 Nuxt 3)
```

### 1.2 後端技術（Nuxt 全端）
```yaml
運行環境: Node.js 20 LTS
框架: Nuxt 3 Server API
API 路由: Nitro (內建)
資料庫: SQLite + SpatiaLite (地理擴展)
ORM: Drizzle ORM
快取: Redis (可選) / Nuxt Storage
驗證: Nuxt Auth / Auth0
```

### 1.3 資料收集
```yaml
爬蟲: Python Scrapy (獨立服務)
驗證: Claude API
排程: Node-cron / GitHub Actions
```

### 1.4 部署與基礎設施
```yaml
部署: Vercel / Netlify / Railway
文件儲存: 本地文件系統 / Cloudinary
監控: Sentry
CDN: 部署平台內建
```

## 2. 資料庫選擇分析

### 2.1 輕量化方案比較

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|----------|
| **SQLite + SpatiaLite** | 零配置、高效能、地理支援 | 單文件限制、並發寫入限制 | 中小型應用，讀多寫少 |
| PostgreSQL + PostGIS | 功能完整、擴展性好 | 需要服務器管理 | 大型應用 |
| MongoDB | 文檔靈活、易擴展 | 地理查詢相對複雜 | 數據結構多變 |

### 2.2 推薦方案：SQLite + Drizzle

#### 安裝配置
```bash
# 安裝依賴
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# SpatiaLite 支援（地理功能）
# macOS
brew install spatialite-tools

# Ubuntu
sudo apt-get install spatialite-bin
```

#### 資料庫架構定義
```typescript
// db/schema.ts
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

export const activities = sqliteTable('activities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  summary: text('summary'),
  status: text('status').default('pending'),
  qualityScore: integer('quality_score').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id),
  address: text('address').notNull(),
  district: text('district'),
  city: text('city').notNull(),
  region: text('region').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  venue: text('venue'),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  colorCode: text('color_code'),
  icon: text('icon'),
});

export const activityCategories = sqliteTable('activity_categories', {
  activityId: text('activity_id').references(() => activities.id),
  categoryId: text('category_id').references(() => categories.id),
});

export const activityTimes = sqliteTable('activity_times', {
  id: text('id').primaryKey(),
  activityId: text('activity_id').references(() => activities.id),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  timezone: text('timezone').default('Asia/Taipei'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
});
```

## 3. Nuxt 專案結構

### 3.1 目錄結構
```
nuxt-tourism-map/
├── components/           # Vue 組件
│   ├── Activity/        # 活動相關組件
│   ├── Map/            # 地圖組件
│   ├── Filter/         # 篩選組件
│   └── UI/             # 基礎 UI 組件
├── composables/         # Composition API
│   ├── useActivities.ts
│   ├── useMap.ts
│   └── useFilters.ts
├── db/                 # 資料庫相關
│   ├── schema.ts       # 資料表定義
│   ├── migrations/     # 遷移文件
│   └── seed.ts         # 初始資料
├── pages/              # 頁面路由
│   ├── index.vue       # 首頁地圖
│   ├── activity/       # 活動詳情頁
│   └── favorites.vue   # 收藏頁面
├── server/             # 服務端 API
│   ├── api/            # API 端點
│   └── utils/          # 服務端工具
├── stores/             # Pinia 狀態管理
├── utils/              # 工具函數
├── types/              # TypeScript 類型
├── public/             # 靜態資源
├── assets/             # 需要處理的資源
├── nuxt.config.ts      # Nuxt 配置
└── drizzle.config.ts   # Drizzle 配置
```

### 3.2 Nuxt 配置
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@element-plus/nuxt',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  
  runtimeConfig: {
    // 服務端環境變數
    claudeApiKey: process.env.CLAUDE_API_KEY,
    googleMapsKey: process.env.GOOGLE_MAPS_KEY,
    
    public: {
      // 客戶端可訪問的環境變數
      googleMapsKey: process.env.GOOGLE_MAPS_KEY,
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }
  },
  
  css: ['~/assets/css/main.css'],
  
  nitro: {
    // 服務端配置
    experimental: {
      wasm: true
    }
  }
});
```

## 4. 資料庫初始化與遷移

### 4.1 Drizzle 配置
```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './data/tourism.db'
  }
} satisfies Config;
```

### 4.2 資料庫初始化
```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const sqlite = new Database('./data/tourism.db');

// 啟用 SpatiaLite 擴展（地理功能）
sqlite.exec('SELECT load_extension("mod_spatialite")');

export const db = drizzle(sqlite);

// 自動執行遷移
await migrate(db, { migrationsFolder: './db/migrations' });
```

### 4.3 地理查詢支援
```typescript
// server/utils/geo.ts
import { db } from '~/db';
import { locations, activities } from '~/db/schema';
import { sql } from 'drizzle-orm';

export async function findNearbyActivities(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
) {
  return await db
    .select({
      activity: activities,
      location: locations,
      distance: sql<number>`
        Distance(
          MakePoint(${longitude}, ${latitude}, 4326),
          MakePoint(locations.longitude, locations.latitude, 4326)
        ) / 1000 as distance
      `
    })
    .from(activities)
    .innerJoin(locations, eq(activities.id, locations.activityId))
    .where(
      sql`Distance(
        MakePoint(${longitude}, ${latitude}, 4326),
        MakePoint(locations.longitude, locations.latitude, 4326)
      ) / 1000 <= ${radiusKm}`
    )
    .orderBy(sql`distance`);
}
```

## 5. Nuxt Server API 實作

### 5.1 活動查詢 API
```typescript
// server/api/activities/index.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { 
    categories,
    region,
    startDate,
    endDate,
    lat,
    lng,
    radius = 10,
    page = 1,
    limit = 20
  } = query;
  
  try {
    let queryBuilder = db
      .select({
        activity: activities,
        location: locations,
        categories: sql<string[]>`GROUP_CONCAT(categories.name)`
      })
      .from(activities)
      .innerJoin(locations, eq(activities.id, locations.activityId))
      .leftJoin(activityCategories, eq(activities.id, activityCategories.activityId))
      .leftJoin(categories, eq(activityCategories.categoryId, categories.id))
      .where(eq(activities.status, 'active'));
    
    // 地理篩選
    if (lat && lng) {
      queryBuilder = queryBuilder.where(
        sql`Distance(
          MakePoint(${lng}, ${lat}, 4326),
          MakePoint(locations.longitude, locations.latitude, 4326)
        ) / 1000 <= ${radius}`
      );
    }
    
    // 類別篩選
    if (categories) {
      const categoryList = Array.isArray(categories) ? categories : [categories];
      queryBuilder = queryBuilder.where(
        inArray(categories.slug, categoryList)
      );
    }
    
    // 分頁
    const offset = (Number(page) - 1) * Number(limit);
    const results = await queryBuilder
      .groupBy(activities.id)
      .limit(Number(limit))
      .offset(offset);
    
    return {
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: results.length
      }
    };
    
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch activities'
    });
  }
});
```

### 5.2 Claude 驗證 API
```typescript
// server/api/validation/submit.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { rawData } = body;
  
  const config = useRuntimeConfig();
  
  try {
    // 調用 Claude API 進行驗證
    const response = await $fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `請驗證以下觀光活動資料的真實性和完整性：${JSON.stringify(rawData)}`
        }]
      }
    });
    
    const validationResult = parseClaudeResponse(response);
    
    // 儲存驗證結果
    if (validationResult.isValid) {
      await saveValidatedActivity(validationResult.data);
    }
    
    return validationResult;
    
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Validation failed'
    });
  }
});
```

## 6. 前端組件實作

### 6.1 地圖組件
```vue
<!-- components/Map/ActivityMap.vue -->
<template>
  <div class="w-full h-full">
    <GoogleMap
      ref="mapRef"
      :center="center"
      :zoom="zoom"
      :options="mapOptions"
      @click="handleMapClick"
    >
      <MarkerCluster>
        <Marker
          v-for="activity in activities"
          :key="activity.id"
          :position="{
            lat: activity.location.latitude,
            lng: activity.location.longitude
          }"
          :icon="getMarkerIcon(activity.categories[0])"
          @click="selectActivity(activity)"
        />
      </MarkerCluster>
      
      <!-- 活動資訊窗 -->
      <InfoWindow
        v-if="selectedActivity"
        :position="{
          lat: selectedActivity.location.latitude,
          lng: selectedActivity.location.longitude
        }"
        @closeclick="selectedActivity = null"
      >
        <ActivityInfoCard :activity="selectedActivity" />
      </InfoWindow>
    </GoogleMap>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activities: Activity[];
  center: { lat: number; lng: number };
  zoom?: number;
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 12
});

const selectedActivity = ref<Activity | null>(null);
const mapRef = ref();

const mapOptions = {
  zoomControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeControl: false,
};

function getMarkerIcon(category: string) {
  const icons = {
    'traditional': '/icons/traditional.png',
    'romantic': '/icons/romantic.png',
    'art_culture': '/icons/art.png',
    // ...其他類別圖標
  };
  return icons[category] || '/icons/default.png';
}

function selectActivity(activity: Activity) {
  selectedActivity.value = activity;
}

function handleMapClick(event: any) {
  selectedActivity.value = null;
}
</script>
```

### 6.2 篩選組件
```vue
<!-- components/Filter/FilterPanel.vue -->
<template>
  <div class="bg-white shadow-lg rounded-lg p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">篩選條件</h3>
      <el-button @click="resetFilters" type="text">重置</el-button>
    </div>
    
    <!-- 位置篩選 -->
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">📍 位置</label>
      <el-radio-group v-model="filters.locationType" @change="onLocationTypeChange">
        <el-radio label="current">使用目前位置</el-radio>
        <el-radio label="custom">手動選擇</el-radio>
      </el-radio-group>
      
      <div v-if="filters.locationType === 'custom'" class="mt-2">
        <el-input
          v-model="filters.customLocation"
          placeholder="輸入地點"
          @input="searchLocation"
        />
      </div>
      
      <!-- 距離範圍 -->
      <div class="mt-4">
        <label class="block text-sm font-medium mb-2">📏 距離範圍</label>
        <el-slider
          v-model="filters.radius"
          :min="1"
          :max="50"
          :marks="{ 2: '2km', 10: '10km', 30: '30km' }"
          @change="onRadiusChange"
        />
      </div>
    </div>
    
    <!-- 活動類型 -->
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">🎭 活動類型</label>
      <div class="grid grid-cols-2 gap-2">
        <el-checkbox
          v-for="category in categoryOptions"
          :key="category.id"
          v-model="filters.categories"
          :label="category.id"
          @change="onCategoryChange"
        >
          {{ category.icon }} {{ category.name }}
        </el-checkbox>
      </div>
    </div>
    
    <!-- 時間篩選 -->
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">📅 時間</label>
      <el-radio-group v-model="filters.timeType" @change="onTimeTypeChange">
        <el-radio label="quick">快速選項</el-radio>
        <el-radio label="custom">自訂範圍</el-radio>
      </el-radio-group>
      
      <div v-if="filters.timeType === 'quick'" class="mt-2">
        <el-select v-model="filters.quickTime" @change="onQuickTimeChange">
          <el-option label="今天" value="today" />
          <el-option label="明天" value="tomorrow" />
          <el-option label="本週末" value="weekend" />
          <el-option label="本月" value="month" />
        </el-select>
      </div>
      
      <div v-if="filters.timeType === 'custom'" class="mt-2">
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="到"
          start-placeholder="開始日期"
          end-placeholder="結束日期"
          @change="onDateRangeChange"
        />
      </div>
    </div>
    
    <!-- 結果預覽 -->
    <div class="border-t pt-4">
      <p class="text-sm text-gray-600">
        找到 {{ resultCount }} 個符合的活動
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const filters = useFilters();
const { categoryOptions } = useCategories();
const { resultCount } = useActivitySearch();

function resetFilters() {
  filters.reset();
}

function onLocationTypeChange() {
  if (filters.locationType === 'current') {
    getCurrentLocation();
  }
}

async function getCurrentLocation() {
  if ('geolocation' in navigator) {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    
    filters.setLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude
    });
  }
}

// ... 其他事件處理函數
</script>
```

## 7. Composables 實作

### 7.1 活動管理
```typescript
// composables/useActivities.ts
export const useActivities = () => {
  const activities = ref<Activity[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const fetchActivities = async (params?: ActivitySearchParams) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch('/api/activities', {
        query: params
      });
      
      activities.value = response.data;
    } catch (err) {
      error.value = '載入活動資料失敗';
      console.error(err);
    } finally {
      loading.value = false;
    }
  };
  
  const getActivityById = (id: string) => {
    return activities.value.find(activity => activity.id === id);
  };
  
  return {
    activities: readonly(activities),
    loading: readonly(loading),
    error: readonly(error),
    fetchActivities,
    getActivityById
  };
};
```

### 7.2 篩選管理
```typescript
// composables/useFilters.ts
export const useFilters = () => {
  const filters = ref<FilterState>({
    categories: [],
    locationType: 'current',
    location: null,
    radius: 10,
    timeType: 'quick',
    quickTime: 'weekend',
    dateRange: null
  });
  
  const { fetchActivities } = useActivities();
  
  // 監聽篩選變化，自動重新搜尋
  watchEffect(() => {
    if (filters.value.location) {
      debouncedSearch();
    }
  });
  
  const debouncedSearch = useDebounceFn(() => {
    fetchActivities(toSearchParams(filters.value));
  }, 300);
  
  const reset = () => {
    filters.value = getDefaultFilters();
  };
  
  const setLocation = (location: { lat: number; lng: number }) => {
    filters.value.location = location;
  };
  
  return {
    filters,
    reset,
    setLocation
  };
};
```

## 8. 部署配置

### 8.1 Vercel 部署
```yaml
# vercel.json
{
  "builds": [
    {
      "src": "nuxt.config.ts",
      "use": "@nuxtjs/vercel-builder"
    }
  ],
  "routes": [
    {
      "src": "/api/.*",
      "dest": "/api/index.js"
    }
  ]
}
```

### 8.2 環境變數
```bash
# .env
CLAUDE_API_KEY=your_claude_api_key
GOOGLE_MAPS_KEY=your_google_maps_key
NUXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# 本地開發
DATABASE_PATH=./data/tourism.db
```

## 9. 開發命令

```bash
# 安裝依賴
npm install

# 資料庫遷移
npm run db:generate  # 生成遷移
npm run db:push      # 執行遷移
npm run db:seed      # 初始化資料

# 開發
npm run dev

# 構建
npm run build

# 預覽
npm run preview
```

這個 Nuxt.js 全端方案提供了輕量、高效的開發體驗，特別適合您的觀光活動地圖需求。SQLite + Drizzle 的組合既保持了輕量化，又提供了足夠的功能支援。