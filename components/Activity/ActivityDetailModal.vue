<template>
  <ElDialog
    v-model="dialogVisible"
    :title="activity?.name || '活動詳情'"
    width="90%"
    :max-width="800"
    destroy-on-close
    @close="handleClose"
  >
    <!-- 載入中 -->
    <div v-if="loading" class="p-8">
      <ElSkeleton :rows="8" animated />
    </div>

    <!-- 活動詳情內容 -->
    <div v-else-if="activity" class="space-y-6">
      <!-- 活動圖片 -->
      <div v-if="activity.images && activity.images.length > 0" class="mb-4">
        <ElCarousel height="200px" indicator-position="outside">
          <ElCarouselItem v-for="image in activity.images" :key="image.id">
            <img 
              :src="image.url" 
              :alt="image.alt || activity.name"
              class="w-full h-full object-cover"
            />
          </ElCarouselItem>
        </ElCarousel>
      </div>

      <!-- 基本資訊 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 左側 - 活動資訊 -->
        <div class="space-y-4">
          <!-- 活動摘要 -->
          <div v-if="activity.summary" class="p-4 bg-blue-50 rounded-lg">
            <h3 class="font-medium text-blue-800 mb-2">活動摘要</h3>
            <p class="text-blue-700 text-sm">{{ activity.summary }}</p>
          </div>

          <!-- 活動描述 -->
          <div v-if="activity.description">
            <h3 class="font-medium mb-2">活動詳情</h3>
            <p class="text-gray-700 text-sm leading-relaxed line-clamp-4">
              {{ activity.description }}
            </p>
          </div>

          <!-- 分類標籤 -->
          <div v-if="activity.categories && activity.categories.length > 0">
            <h3 class="font-medium mb-2">活動分類</h3>
            <ElSpace wrap>
              <ElTag
                v-for="category in activity.categories"
                :key="category.id"
                :color="category.colorCode"
                class="text-white"
                size="small"
              >
                <ElIcon v-if="category.icon">
                  <component :is="category.icon" />
                </ElIcon>
                {{ category.name }}
              </ElTag>
            </ElSpace>
          </div>

          <!-- 驗證狀態 -->
          <div v-if="activity.validation" class="flex items-center gap-2">
            <ElIcon 
              :color="activity.validation.verified ? '#67C23A' : '#F56C6C'"
            >
              <component :is="activity.validation.verified ? 'CircleCheckFilled' : 'CircleCloseFilled'" />
            </ElIcon>
            <span 
              :class="activity.validation.verified ? 'text-green-600' : 'text-red-600'"
              class="text-sm"
            >
              {{ activity.validation.verified ? '已驗證' : '未驗證' }}
            </span>
            <ElTag size="small">
              品質: {{ activity.validation.qualityScore }}%
            </ElTag>
          </div>
        </div>

        <!-- 右側 - 時間和位置 -->
        <div class="space-y-4">
          <!-- 時間資訊 -->
          <div v-if="activity.time">
            <h3 class="font-medium mb-2 flex items-center gap-2">
              <ElIcon><Calendar /></ElIcon>
              活動時間
            </h3>
            <div class="space-y-2 text-sm text-gray-700">
              <div>
                {{ formatDateRange(activity.time.startDate, activity.time.endDate) }}
              </div>
              <div v-if="activity.time.startTime || activity.time.endTime">
                {{ formatTimeRange(activity.time.startTime, activity.time.endTime) }}
              </div>
              <div v-if="activity.time.isRecurring" class="text-blue-600">
                定期活動
              </div>
            </div>
          </div>

          <!-- 位置資訊 -->
          <div v-if="activity.location">
            <h3 class="font-medium mb-2 flex items-center gap-2">
              <ElIcon><LocationFilled /></ElIcon>
              活動地點
            </h3>
            <div class="space-y-1 text-sm text-gray-700">
              <div>{{ activity.location.address }}</div>
              <div class="text-gray-500">
                {{ activity.location.district }}, {{ activity.location.city }}, {{ activity.location.region }}
              </div>
              <div v-if="activity.location.venue" class="text-blue-600">
                {{ activity.location.venue }}
              </div>
            </div>
          </div>

          <!-- 地標 -->
          <div v-if="activity.location?.landmarks && activity.location.landmarks.length > 0">
            <h3 class="font-medium mb-2">鄰近地標</h3>
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

          <!-- 距離資訊 -->
          <div v-if="activity.distance" class="text-sm text-gray-500">
            距離您約 {{ formatDistance(activity.distance) }}
          </div>
        </div>
      </div>

      <!-- 小地圖 -->
      <div v-if="activity.location && activity.location.latitude != null && activity.location.longitude != null" class="h-48 bg-gray-100 rounded-lg">
        <ActivityMap
          :activities="[activity]"
          :center="{ lat: activity.location.latitude, lng: activity.location.longitude }"
          :zoom="15"
          :show-controls="false"
          class="h-full rounded-lg"
        />
      </div>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="text-center py-8">
      <ElResult
        icon="error"
        title="載入失敗"
        :sub-title="error.message || '無法載入活動詳情'"
      >
        <template #extra>
          <ElButton type="primary" @click="fetchActivity">重試</ElButton>
        </template>
      </ElResult>
    </div>

    <!-- 對話框底部 -->
    <template #footer>
      <div class="flex justify-between items-center">
        <!-- 左側操作 -->
        <div class="flex gap-2">
          <FavoriteButton 
            v-if="activity"
            :activity-id="activity.id" 
            size="default"
          />
          <ElButton 
            v-if="activity"
            @click="shareActivity"
            :icon="Share"
          >
            分享
          </ElButton>
        </div>

        <!-- 右側操作 -->
        <div class="flex gap-2">
          <ElButton @click="handleClose">關閉</ElButton>
          <ElButton 
            v-if="activity"
            type="primary" 
            @click="goToDetail"
          >
            查看完整詳情
          </ElButton>
        </div>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import { Calendar, LocationFilled, Share, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue';
import type { Activity } from '~/types';

// 導入缺失的組件
import ActivityMap from '~/components/Map/ActivityMap.vue';
import FavoriteButton from '~/components/Activity/FavoriteButton.vue';

// Props
interface Props {
  visible: boolean;
  activityId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  activityId: ''
});

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// 響應式狀態
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const activity = ref<Activity | null>(null);
const loading = ref(false);
const error = ref<Error | null>(null);

// 路由
const router = useRouter();

// 監聽 activityId 變化
watch(() => props.activityId, (newId) => {
  if (newId && props.visible) {
    fetchActivity();
  }
}, { immediate: true });

// 監聽對話框顯示
watch(() => props.visible, (visible) => {
  if (visible && props.activityId) {
    fetchActivity();
  }
});

// 使用客戶端 SQLite
import { useSqlite } from '~/composables/useSqlite';
const { getActivity, initDatabase } = useSqlite();

// 載入活動詳情
const fetchActivity = async () => {
  if (!props.activityId) return;

  loading.value = true;
  error.value = null;

  try {
    await initDatabase();
    const data = await getActivity(props.activityId);
    
    if (data) {
      // 格式化活動資料
      activity.value = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        summary: data.summary || undefined,
        status: data.status || 'active',
        qualityScore: data.qualityScore || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        location: data.latitude && data.longitude ? {
          id: data.locationId || '',
          activityId: data.id,
          address: data.address,
          district: data.district || undefined,
          city: data.city,
          region: data.region || 'north',
          latitude: data.latitude,
          longitude: data.longitude,
          venue: data.venue || undefined,
          landmarks: data.landmarks ? JSON.parse(data.landmarks) : []
        } : undefined,
        time: data.startDate ? {
          id: data.timeId || '',
          activityId: data.id,
          startDate: data.startDate,
          endDate: data.endDate,
          startTime: data.startTime,
          endTime: data.endTime,
          timezone: data.timezone || 'Asia/Taipei',
          isRecurring: data.isRecurring || false,
          recurrenceRule: data.recurrenceRule ? JSON.parse(data.recurrenceRule) : undefined
        } : undefined,
        categories: data.categories ? 
          data.categories.split(',').map((name: string) => ({
            id: '',
            name: name.trim(),
            slug: name.trim().toLowerCase(),
            colorCode: '#3B82F6',
            icon: '📍'
          })).filter((cat: any) => cat.name) : []
      };
    } else {
      throw new Error('找不到活動');
    }
  } catch (err) {
    error.value = err as Error;
    console.error('載入活動詳情失敗:', err);
  } finally {
    loading.value = false;
  }
};

// 關閉對話框
const handleClose = () => {
  dialogVisible.value = false;
  activity.value = null;
  error.value = null;
};

// 前往詳情頁面
const goToDetail = () => {
  if (activity.value) {
    router.push(`/activity/${activity.value.id}`);
    handleClose();
  }
};

// 分享活動
const shareActivity = async () => {
  if (!activity.value) return;
  
  const shareData = {
    title: activity.value.name,
    text: activity.value.summary || activity.value.description,
    url: `${window.location.origin}/activity/${activity.value.id}`
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      ElMessage.success('連結已複製到剪貼簿');
    }
  } catch (error) {
    console.error('分享失敗:', error);
  }
};

// 格式化函數
const formatDateRange = (startDate: string | null | undefined, endDate?: string | null | undefined) => {
  if (!startDate) return '';
  
  const start = new Date(startDate).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric'
  });
  
  if (!endDate || endDate === startDate) {
    return start;
  }
  
  const end = new Date(endDate).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric'
  });
  
  return `${start} - ${end}`;
};

const formatTimeRange = (startTime?: string | null, endTime?: string | null) => {
  if (!startTime && !endTime) return '';
  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }
  return startTime || endTime || '';
};

const formatDistance = (distance: number) => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 小螢幕適配 */
@media (max-width: 768px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
}
</style>