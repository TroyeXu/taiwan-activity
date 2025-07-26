<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 載入中狀態 -->
    <div v-if="pending" class="flex items-center justify-center min-h-screen">
      <ElCard class="w-full max-w-4xl mx-auto">
        <ElSkeleton :rows="8" animated />
      </ElCard>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <ElResult
        icon="error"
        title="載入失敗"
        :sub-title="error.message || '無法載入活動詳情'"
      >
        <template #extra>
          <ElButton type="primary" @click="refresh()">重試</ElButton>
          <ElButton @click="$router.push('/')">返回首頁</ElButton>
        </template>
      </ElResult>
    </div>

    <!-- 活動詳情內容 -->
    <div v-else-if="activity">
      <!-- 頁面標題列 -->
      <ElPageHeader @back="() => $router.back()" class="bg-white shadow-sm">
        <template #title>
          <div class="flex items-center gap-2">
            <span>{{ activity.name }}</span>
            <ElTag v-if="activity.validation?.verified" type="success" size="small">
              <ElIcon><CircleCheckFilled /></ElIcon>
              已驗證
            </ElTag>
          </div>
        </template>
        <template #extra>
          <ElSpace>
            <FavoriteButton :activity-id="activity.id" />
            <ElButton @click="shareActivity">
              <ElIcon><Share /></ElIcon>
              分享
            </ElButton>
          </ElSpace>
        </template>
      </ElPageHeader>

      <!-- 主要內容 -->
      <ElContainer class="max-w-6xl mx-auto p-6">
        <ElRow :gutter="24">
          <!-- 左側內容 -->
          <ElCol :lg="16" :md="24">
            <!-- 活動圖片 -->
            <ElCard v-if="activity.images && activity.images.length > 0" class="mb-6">
              <ElCarousel height="300px" indicator-position="outside">
                <ElCarouselItem v-for="image in activity.images" :key="image.id">
                  <img 
                    :src="image.url" 
                    :alt="image.alt || activity.name"
                    class="w-full h-full object-cover"
                  />
                </ElCarouselItem>
              </ElCarousel>
            </ElCard>

            <!-- 活動描述 -->
            <ElCard class="mb-6">
              <template #header>
                <h2 class="text-lg font-semibold">活動詳情</h2>
              </template>
              
              <!-- 簡短摘要 -->
              <div v-if="activity.summary" class="mb-4 p-4 bg-blue-50 rounded-lg">
                <h3 class="font-medium text-blue-800 mb-2">活動摘要</h3>
                <p class="text-blue-700">{{ activity.summary }}</p>
              </div>

              <!-- 詳細描述 -->
              <div v-if="activity.description" class="prose max-w-none">
                <div v-html="formatDescription(activity.description)"></div>
              </div>

              <!-- 分類標籤 -->
              <div v-if="activity.categories && activity.categories.length > 0" class="mt-4">
                <h4 class="font-medium mb-2">活動分類</h4>
                <ElSpace wrap>
                  <ElTag
                    v-for="category in activity.categories"
                    :key="category.id"
                    :color="category.colorCode"
                    class="text-white"
                  >
                    <ElIcon v-if="category.icon">
                      <component :is="category.icon" />
                    </ElIcon>
                    {{ category.name }}
                  </ElTag>
                </ElSpace>
              </div>
            </ElCard>

            <!-- 位置資訊 -->
            <ElCard v-if="activity.location" class="mb-6">
              <template #header>
                <h2 class="text-lg font-semibold flex items-center gap-2">
                  <ElIcon><LocationFilled /></ElIcon>
                  位置資訊
                </h2>
              </template>

              <div class="space-y-4">
                <!-- 地址資訊 -->
                <div>
                  <h4 class="font-medium mb-2">地址</h4>
                  <p class="text-gray-700">{{ activity.location.address }}</p>
                  <p class="text-sm text-gray-500">
                    {{ activity.location.district }}, {{ activity.location.city }}, {{ activity.location.region }}
                  </p>
                </div>

                <!-- 場地名稱 -->
                <div v-if="activity.location.venue">
                  <h4 class="font-medium mb-2">場地</h4>
                  <p class="text-gray-700">{{ activity.location.venue }}</p>
                </div>

                <!-- 地標 -->
                <div v-if="activity.location.landmarks && activity.location.landmarks.length > 0">
                  <h4 class="font-medium mb-2">鄰近地標</h4>
                  <ElSpace wrap>
                    <ElTag 
                      v-for="landmark in activity.location.landmarks" 
                      :key="landmark"
                      type="info"
                      size="small"
                    >
                      {{ landmark }}
                    </ElTag>
                  </ElSpace>
                </div>

                <!-- 小地圖 -->
                <div class="h-64 bg-gray-100 rounded-lg">
                  <ActivityMap
                    :activities="[activity]"
                    :center="{ lat: activity.location.latitude, lng: activity.location.longitude }"
                    :zoom="15"
                    :show-controls="false"
                    class="h-full"
                  />
                </div>
              </div>
            </ElCard>

            <!-- 資料來源和驗證 -->
            <ElCard v-if="activity.source || activity.validation">
              <template #header>
                <h2 class="text-lg font-semibold flex items-center gap-2">
                  <ElIcon><InfoFilled /></ElIcon>
                  資料資訊
                </h2>
              </template>

              <div class="space-y-4">
                <!-- 資料來源 -->
                <div v-if="activity.source">
                  <h4 class="font-medium mb-2">資料來源</h4>
                  <p class="text-gray-700">{{ activity.source.website }}</p>
                  <p class="text-xs text-gray-500">
                    更新時間: {{ formatDate(activity.source.crawledAt) }}
                  </p>
                </div>

                <!-- 驗證資訊 -->
                <div v-if="activity.validation">
                  <h4 class="font-medium mb-2">驗證狀態</h4>
                  <div class="flex items-center gap-2 mb-2">
                    <ElIcon 
                      :color="activity.validation.verified ? '#67C23A' : '#F56C6C'"
                    >
                      <component :is="activity.validation.verified ? 'CircleCheckFilled' : 'CircleCloseFilled'" />
                    </ElIcon>
                    <span :class="activity.validation.verified ? 'text-green-600' : 'text-red-600'">
                      {{ activity.validation.verified ? '已驗證' : '未驗證' }}
                    </span>
                    <ElTag size="small">
                      品質分數: {{ activity.validation.qualityScore }}%
                    </ElTag>
                  </div>
                  
                  <p class="text-xs text-gray-500 mb-2">
                    驗證時間: {{ formatDate(activity.validation.verificationDate) }}
                  </p>

                  <!-- 驗證問題 -->
                  <div v-if="activity.validation.issues && activity.validation.issues.length > 0">
                    <h5 class="text-sm font-medium mb-1">發現問題:</h5>
                    <ul class="text-sm text-gray-600 space-y-1">
                      <li v-for="issue in activity.validation.issues" :key="issue" class="flex items-start gap-2">
                        <ElIcon class="mt-0.5 text-orange-500"><Warning /></ElIcon>
                        {{ issue }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </ElCard>
          </ElCol>

          <!-- 右側邊欄 -->
          <ElCol :lg="8" :md="24">
            <!-- 時間資訊 -->
            <ElCard v-if="activity.time" class="mb-6 sticky top-6">
              <template #header>
                <h3 class="text-lg font-semibold flex items-center gap-2">
                  <ElIcon><Calendar /></ElIcon>
                  活動時間
                </h3>
              </template>

              <div class="space-y-4">
                <!-- 日期範圍 -->
                <div>
                  <h4 class="font-medium mb-2">活動日期</h4>
                  <div class="flex items-center gap-2 text-gray-700">
                    <ElIcon><Calendar /></ElIcon>
                    <span>
                      {{ formatDateRange(activity.time.startDate, activity.time.endDate) }}
                    </span>
                  </div>
                </div>

                <!-- 時間 -->
                <div v-if="activity.time.startTime || activity.time.endTime">
                  <h4 class="font-medium mb-2">活動時間</h4>
                  <div class="flex items-center gap-2 text-gray-700">
                    <ElIcon><Clock /></ElIcon>
                    <span>
                      {{ formatTimeRange(activity.time.startTime, activity.time.endTime) }}
                    </span>
                  </div>
                </div>

                <!-- 重複性活動 -->
                <div v-if="activity.time.isRecurring && activity.time.recurrenceRule">
                  <h4 class="font-medium mb-2">重複週期</h4>
                  <ElTag type="info">
                    {{ formatRecurrenceRule(activity.time.recurrenceRule) }}
                  </ElTag>
                </div>

                <!-- 時區 -->
                <div v-if="activity.time.timezone" class="text-xs text-gray-500">
                  時區: {{ activity.time.timezone }}
                </div>
              </div>
            </ElCard>

            <!-- 附近活動推薦 -->
            <ElCard v-if="nearbyActivities && nearbyActivities.length > 0">
              <template #header>
                <h3 class="text-lg font-semibold">附近活動</h3>
              </template>
              
              <div class="space-y-3">
                <div 
                  v-for="nearby in nearbyActivities.slice(0, 5)" 
                  :key="nearby.id"
                  class="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  @click="$router.push(`/activity/${nearby.id}`)"
                >
                  <h4 class="font-medium text-sm mb-1">{{ nearby.name }}</h4>
                  <p class="text-xs text-gray-600 mb-2">{{ nearby.summary }}</p>
                  <div class="flex justify-between items-center text-xs text-gray-500">
                    <span>{{ nearby.location?.city }}</span>
                    <span v-if="nearby.distance">{{ formatDistance(nearby.distance) }}</span>
                  </div>
                </div>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>
      </ElContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  LocationFilled, 
  Calendar, 
  Clock, 
  Share, 
  InfoFilled,
  CircleCheckFilled, 
  CircleCloseFilled,
  Warning
} from '@element-plus/icons-vue';
import type { Activity } from '~/types';

// 導入組件
import ActivityMap from '~/components/Map/ActivityMap.vue';
import FavoriteButton from '~/components/Activity/FavoriteButton.vue';

// 路由參數
const route = useRoute();
const activityId = route.params.id as string;

// 獲取活動詳情
const { data: activity, pending, error, refresh } = await useFetch<Activity>(
  `/api/activities/${activityId}`,
  {
    transform: (data: any) => data.data,
    key: `activity-${activityId}`
  }
);

// 獲取附近活動
const { data: nearbyActivities } = await useFetch<Activity[]>(
  `/api/activities/nearby`,
  {
    query: computed(() => ({
      lat: activity.value?.location?.latitude,
      lng: activity.value?.location?.longitude,
      radius: 5,
      limit: 10
    })),
    transform: (data: any) => data.data?.filter((a: Activity) => a.id !== activityId) || [],
    server: false
  }
);

// 頁面元資料
useHead({
  title: computed(() => activity.value?.name || '活動詳情'),
  meta: computed(() => [
    { name: 'description', content: activity.value?.summary || activity.value?.description || '' },
    { property: 'og:title', content: activity.value?.name || '' },
    { property: 'og:description', content: activity.value?.summary || '' },
    { property: 'og:type', content: 'article' }
  ])
});

// 格式化函數
const formatDescription = (description: string) => {
  return description.replace(/\n/g, '<br>');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateRange = (startDate: string, endDate?: string) => {
  const start = formatDate(startDate);
  if (!endDate || endDate === startDate) {
    return start;
  }
  return `${start} - ${formatDate(endDate)}`;
};

const formatTimeRange = (startTime?: string, endTime?: string) => {
  if (!startTime && !endTime) return '';
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }
  return startTime || endTime || '';
};

const formatRecurrenceRule = (rule: any) => {
  // 簡化的重複規則顯示
  if (rule.freq === 'DAILY') return '每日';
  if (rule.freq === 'WEEKLY') return '每週';
  if (rule.freq === 'MONTHLY') return '每月';
  if (rule.freq === 'YEARLY') return '每年';
  return '定期';
};

const formatDistance = (distance: number) => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

// 分享活動
const shareActivity = async () => {
  if (!activity.value) return;
  
  const shareData = {
    title: activity.value.name,
    text: activity.value.summary || activity.value.description,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // 回退到複製連結
      await navigator.clipboard.writeText(window.location.href);
      ElMessage.success('連結已複製到剪貼簿');
    }
  } catch (error) {
    console.error('分享失敗:', error);
  }
};

// 錯誤處理
if (error.value) {
  throw createError({
    statusCode: error.value?.statusCode || 404,
    statusMessage: error.value?.message || '找不到指定的活動'
  });
}
</script>

<style scoped>
.prose {
  line-height: 1.7;
}

.prose p {
  margin-bottom: 1rem;
}

.prose ul,
.prose ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.prose li {
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .sticky {
    position: static !important;
  }
}
</style>