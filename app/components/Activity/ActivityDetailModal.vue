<template>
  <ElDialog
    v-model="dialogVisible"
    :title="''"
    width="850px"
    destroy-on-close
    @close="handleClose"
    class="activity-detail-modal"
  >
    <!-- 載入中 -->
    <div v-if="loading" class="p-8">
      <ElSkeleton :rows="8" animated />
    </div>

    <!-- 活動詳情內容 -->
    <div v-else-if="activity" class="activity-detail-content">
      <!-- 標題區塊 -->
      <div class="header-section">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ activity.name }}</h2>
            <div class="flex items-center gap-3 mb-3">
              <ElTag 
                :type="getStatusTagType(activity.status)" 
                size="default"
                effect="dark"
              >
                {{ getStatusText(activity.status) }}
              </ElTag>
              <span v-if="activity.categories?.[0]" class="text-sm text-gray-600">
                {{ activity.categories[0].icon }} {{ activity.categories[0].name }}
              </span>
            </div>
          </div>
          <FavoriteButton v-if="activity" :activity="activity" size="large" />
        </div>
      </div>

      <!-- 重要資訊區 -->
      <div class="info-cards">
        <!-- 時間卡片 -->
        <div class="info-card">
          <div class="info-card-header">
            <ElIcon size="18"><Calendar /></ElIcon>
            <span>活動時間</span>
          </div>
          <div class="info-card-content">
            <div v-if="activity.time" class="space-y-1">
              <div class="text-lg font-semibold text-gray-900">
                {{ formatDateRange(activity.time.startDate, activity.time.endDate) }}
              </div>
              <div v-if="activity.time.startTime || activity.time.endTime" class="text-sm text-gray-600">
                <ElIcon class="inline-block mr-1"><Clock /></ElIcon>
                {{ formatTimeRange(activity.time.startTime, activity.time.endTime) }}
              </div>
              <div v-if="activity.time.isRecurring" class="text-sm text-blue-600">
                <ElIcon class="inline-block mr-1"><RefreshRight /></ElIcon>
                定期舉辦
              </div>
            </div>
            <div v-else class="text-gray-500">未提供時間資訊</div>
          </div>
        </div>

        <!-- 地點卡片 -->
        <div class="info-card">
          <div class="info-card-header">
            <ElIcon size="18"><LocationFilled /></ElIcon>
            <span>活動地點</span>
          </div>
          <div class="info-card-content">
            <div v-if="activity.location" class="space-y-2">
              <div class="text-base font-medium text-gray-900">
                {{ activity.location.address }}
              </div>
              <div class="text-sm text-gray-600">
                {{ [activity.location.district, activity.location.city, activity.location.region].filter(Boolean).join(' · ') }}
              </div>
              <div v-if="activity.location.venue" class="text-sm text-blue-600 font-medium">
                <ElIcon class="inline-block mr-1"><OfficeBuilding /></ElIcon>
                {{ activity.location.venue }}
              </div>
              <div v-if="activity.distance" class="text-sm text-gray-500">
                <ElIcon class="inline-block mr-1"><MapLocation /></ElIcon>
                距離您約 {{ formatDistance(activity.distance) }}
              </div>
            </div>
            <div v-else class="text-gray-500">未提供地點資訊</div>
          </div>
        </div>

        <!-- 費用卡片 -->
        <div class="info-card">
          <div class="info-card-header">
            <ElIcon size="18"><Ticket /></ElIcon>
            <span>活動費用</span>
          </div>
          <div class="info-card-content">
            <div class="text-2xl font-bold text-green-600">免費</div>
            <div class="text-sm text-gray-500">無需報名費用</div>
          </div>
        </div>
      </div>

      <!-- 活動描述 -->
      <div v-if="activity.summary || activity.description" class="description-section">
        <h3 class="section-title">活動介紹</h3>
        <div class="bg-gray-50 rounded-lg p-4">
          <p v-if="activity.summary" class="text-base text-gray-800 mb-3 font-medium">
            {{ activity.summary }}
          </p>
          <p v-if="activity.description" class="text-sm text-gray-700 leading-relaxed">
            <span v-if="!showFullDescription && activity.description.length > 300">
              {{ activity.description.substring(0, 300) }}...
            </span>
            <span v-else>
              {{ activity.description }}
            </span>
          </p>
          <button
            v-if="activity.description && activity.description.length > 300"
            @click="showFullDescription = !showFullDescription"
            class="text-blue-600 text-sm mt-3 hover:text-blue-700 font-medium"
          >
            {{ showFullDescription ? '收起' : '閱讀更多' }}
          </button>
        </div>
      </div>

      <!-- 地圖連結區域 -->
      <div v-if="activity.location?.latitude && activity.location?.longitude" class="map-link-section">
        <h3 class="section-title">位置資訊</h3>
        <div class="map-link-container">
          <button 
            @click="openGoogleMaps"
            class="google-maps-btn"
          >
            <ElIcon size="20"><Position /></ElIcon>
            在 Google 地圖中查看
          </button>
          <div v-if="activity.location.landmarks?.length" class="landmarks-info">
            <ElIcon class="inline-block mr-1"><Guide /></ElIcon>
            <span class="text-sm text-gray-600">鄰近景點：{{ activity.location.landmarks.join('、') }}</span>
          </div>
        </div>
      </div>

      <!-- 特色標籤 -->
      <div v-if="activity.categories?.length || activity.features?.length" class="tags-section">
        <div v-if="activity.categories?.length" class="mb-3">
          <span class="text-sm text-gray-600 mr-3">活動分類：</span>
          <ElTag
            v-for="category in activity.categories"
            :key="category.id"
            type="primary"
            class="mr-2"
          >
            {{ category.icon }} {{ category.name }}
          </ElTag>
        </div>
        <div v-if="activity.features?.length">
          <span class="text-sm text-gray-600 mr-3">活動特色：</span>
          <ElTag
            v-for="feature in activity.features"
            :key="feature"
            type="warning"
            class="mr-2"
          >
            {{ feature }}
          </ElTag>
        </div>
      </div>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="text-center py-8">
      <ElResult icon="error" title="載入失敗" :sub-title="error.message || '無法載入活動詳情'">
        <template #extra>
          <ElButton type="primary" @click="fetchActivity">重試</ElButton>
        </template>
      </ElResult>
    </div>

    <!-- 對話框底部 -->
    <template #footer>
      <div class="dialog-footer">
        <ElButton @click="handleClose" size="large">關閉</ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
import {
  Calendar,
  LocationFilled,
  CircleCheckFilled,
  CircleCloseFilled,
  Clock,
  Timer,
  RefreshRight,
  Location,
  OfficeBuilding,
  Guide,
  Ticket,
  MapLocation,
  Position,
} from '@element-plus/icons-vue';
import type { Activity } from '~/types';
import { ActivityStatus, Region } from '~/types';

// 導入缺失的組件
import FavoriteButton from '~/components/Activity/FavoriteButton.vue';

// Props
interface Props {
  visible: boolean;
  activityId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  activityId: '',
});

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// 響應式狀態
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const activity = ref<Activity | null>(null);
const loading = ref(false);
const error = ref<Error | null>(null);
const showFullDescription = ref(false);

// 路由
const router = useRouter();

// 監聽 activityId 變化
watch(
  () => props.activityId,
  (newId) => {
    if (newId && props.visible) {
      fetchActivity();
    }
  },
  { immediate: true }
);

// 監聽對話框顯示
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.activityId) {
      fetchActivity();
    }
  }
);

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
        id: String(data.id),
        name: String(data.name),
        description: data.description ? String(data.description) : undefined,
        summary: data.summary ? String(data.summary) : undefined,
        status: (data.status as ActivityStatus) || ActivityStatus.ACTIVE,
        qualityScore: Number(data.qualityScore) || 0,
        createdAt: new Date(String(data.createdAt)),
        updatedAt: new Date(String(data.updatedAt)),
        location:
          data.latitude && data.longitude
            ? {
                id: String(data.locationId || ''),
                activityId: String(data.id),
                address: String(data.address),
                district: data.district ? String(data.district) : undefined,
                city: String(data.city),
                region: (data.region as Region) || Region.NORTH,
                latitude: Number(data.latitude),
                longitude: Number(data.longitude),
                venue: data.venue ? String(data.venue) : undefined,
                landmarks: data.landmarks ? JSON.parse(String(data.landmarks)) : [],
              }
            : undefined,
        time: data.startDate
          ? {
              id: String(data.timeId || ''),
              activityId: String(data.id),
              startDate: String(data.startDate),
              endDate: data.endDate ? String(data.endDate) : undefined,
              startTime: data.startTime ? String(data.startTime) : undefined,
              endTime: data.endTime ? String(data.endTime) : undefined,
              timezone: String(data.timezone || 'Asia/Taipei'),
              isRecurring: Boolean(data.isRecurring),
              recurrenceRule: data.recurrenceRule
                ? JSON.parse(String(data.recurrenceRule))
                : undefined,
            }
          : undefined,
        categories: data.categories
          ? String(data.categories)
              .split(',')
              .map((name: string) => ({
                id: '',
                name: name.trim(),
                slug: name.trim().toLowerCase(),
                colorCode: '#3B82F6',
                icon: '📍',
              }))
              .filter((cat: any) => cat.name)
          : [],
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
  showFullDescription.value = false;
};

// 在 Google 地圖中開啟
const openGoogleMaps = () => {
  if (activity.value?.location) {
    const { latitude, longitude, address } = activity.value.location;
    const query = encodeURIComponent(address || `${latitude},${longitude}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }
};



// 格式化函數
const formatDateRange = (
  startDate: string | null | undefined,
  endDate?: string | null | undefined
) => {
  if (!startDate) return '';

  const start = new Date(startDate).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
  });

  if (!endDate || endDate === startDate) {
    return start;
  }

  const end = new Date(endDate).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
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

// 狀態相關函數
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: '#67C23A',
    upcoming: '#E6A23C',
    ended: '#909399',
    cancelled: '#F56C6C',
    pending: '#409EFF',
  };
  return colors[status] || '#909399';
};

const getStatusIcon = (status: string) => {
  const icons: Record<string, any> = {
    active: 'CircleCheckFilled',
    upcoming: 'Clock',
    ended: 'CircleCloseFilled',
    cancelled: 'CircleCloseFilled',
    pending: 'Timer',
  };
  return icons[status] || 'InfoFilled';
};

const getStatusText = (status: string) => {
  const statusTextMap = {
    active: '進行中',
    upcoming: '即將開始',
    ended: '已結束',
    cancelled: '已取消',
    pending: '待確認',
  };
  return statusTextMap[status as keyof typeof statusTextMap] || '未知';
};

const getStatusTagType = (status: string): 'success' | 'warning' | 'info' | 'danger' | '' => {
  const statusMap: Record<string, 'success' | 'warning' | 'info' | 'danger' | ''> = {
    active: 'success',
    upcoming: 'warning',
    ended: 'info',
    cancelled: 'danger',
    pending: '',
  };
  return statusMap[status] || '';
};
</script>

<style scoped>
/* 主要內容區 */
.activity-detail-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 標題區塊 */
.header-section {
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

/* 資訊卡片 */
.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.info-card {
  background: #f9fafb;
  border-radius: 0.75rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.info-card-content {
  color: #374151;
}

/* 區塊標題 */
.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 描述區塊 */
.description-section {
  background: white;
  border-radius: 0.5rem;
}

/* 地圖連結區塊 */
.map-link-section {
  background: white;
  border-radius: 0.5rem;
}

.map-link-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.google-maps-btn {
  background: #4285f4;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px 0 rgb(0 0 0 / 0.1);
  width: fit-content;
}

.google-maps-btn:hover {
  background: #357ae8;
  box-shadow: 0 4px 6px 0 rgb(0 0 0 / 0.15);
  transform: translateY(-1px);
}

.google-maps-btn:active {
  transform: translateY(0);
}

.landmarks-info {
  color: #6b7280;
  display: flex;
  align-items: center;
  padding-left: 0.5rem;
}

/* 標籤區塊 */
.tags-section {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

/* 對話框樣式 */
:deep(.activity-detail-modal .el-dialog__header) {
  display: none;
}

:deep(.activity-detail-modal .el-dialog__body) {
  padding: 1.5rem;
  max-height: 80vh;
  overflow-y: auto;
}

:deep(.activity-detail-modal .el-dialog__footer) {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dialog-footer {
  display: flex;
  justify-content: center;
}

/* 響應式設計 */
@media (max-width: 768px) {
  :deep(.activity-detail-modal .el-dialog) {
    width: 95% !important;
  }
  
  :deep(.activity-detail-modal .el-dialog__body) {
    padding: 1rem;
  }
  
  .info-cards {
    grid-template-columns: 1fr;
  }
  
  .google-maps-btn {
    width: 100%;
  }
}
</style>
