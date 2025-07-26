<template>
  <div class="activity-calendar">
    <!-- 月份選擇器 -->
    <div class="month-selector">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <el-button
            circle
            size="large"
            @click="previousYear"
          >
            <el-icon><DArrowLeft /></el-icon>
          </el-button>
          <h2 class="text-2xl font-semibold">
            {{ currentYear }} 年
          </h2>
          <el-button
            circle
            size="large"
            @click="nextYear"
          >
            <el-icon><DArrowRight /></el-icon>
          </el-button>
        </div>
        
        <el-button @click="goToToday">今天</el-button>
      </div>

      <!-- 月份網格 -->
      <div class="months-grid">
        <div
          v-for="(month, index) in months"
          :key="index"
          class="month-card"
          :class="{
            'current-month': isCurrentMonth(index),
            'selected-month': selectedMonth === index,
            'has-activities': monthActivities[index] > 0
          }"
          @click="selectMonth(index)"
        >
          <div class="month-name">{{ month }}</div>
          <div v-if="monthActivities[index] > 0" class="activity-count">
            {{ monthActivities[index] }} 個活動
          </div>
        </div>
      </div>

      <!-- 分類圖例 -->
      <div class="flex flex-wrap gap-3 mt-6 p-4 bg-gray-50 rounded-lg">
        <div
          v-for="category in visibleCategories"
          :key="category.id"
          class="flex items-center gap-2 text-sm"
        >
          <span
            class="w-4 h-4 rounded-full shadow-sm"
            :style="{ backgroundColor: category.color }"
          ></span>
          <span class="font-medium">{{ category.name }}</span>
        </div>
      </div>
    </div>

    <!-- 選中月份的活動列表 -->
    <div v-if="selectedMonth !== null" class="selected-month-activities mt-6">
      <h3 class="text-lg font-semibold mb-4">
        {{ currentYear }} 年 {{ selectedMonth + 1 }} 月活動列表
      </h3>
      
      <div v-if="selectedMonthActivities.length > 0" class="activities-list">
        <div
          v-for="activity in selectedMonthActivities"
          :key="activity.id"
          class="activity-item"
          @click="handleActivityClick(activity)"
        >
          <div class="activity-date">
            {{ formatActivityDate(activity) }}
          </div>
          <div class="activity-info">
            <div class="activity-name">{{ activity.name }}</div>
            <div class="activity-location">
              <el-icon><Location /></el-icon>
              {{ activity.location?.city }} {{ activity.location?.district }}
            </div>
          </div>
          <div class="activity-category">
            <el-tag
              v-for="category in activity.categories"
              :key="category.id"
              size="small"
              :style="{ backgroundColor: category.colorCode }"
            >
              {{ category.name }}
            </el-tag>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <el-empty description="本月暫無活動" />
      </div>
    </div>

    <!-- 活動詳情抽屜 -->
    <el-drawer
      v-model="showActivityDetail"
      :title="selectedActivity?.name"
      size="500px"
    >
      <ActivityDetailModal
        v-if="selectedActivity"
        :activity-id="selectedActivity.id"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { DArrowLeft, DArrowRight, Location } from '@element-plus/icons-vue';
import type { Activity } from '~/types';
import ActivityDetailModal from './ActivityDetailModal.vue';

interface Props {
  activities: Activity[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  monthSelect: [year: number, month: number];
  activityClick: [activity: Activity];
}>();

// 狀態
const currentDate = ref(new Date());
const selectedMonth = ref<number | null>(null);
const selectedActivity = ref<Activity | null>(null);
const showActivityDetail = ref(false);

// 計算屬性
const currentYear = computed(() => currentDate.value.getFullYear());

const months = ['一月', '二月', '三月', '四月', '五月', '六月', 
                '七月', '八月', '九月', '十月', '十一月', '十二月'];

// 每個月的活動數量
const monthActivities = computed(() => {
  const counts = new Array(12).fill(0);
  
  props.activities.forEach(activity => {
    if (activity.time?.startDate) {
      const date = new Date(activity.time.startDate);
      if (date.getFullYear() === currentYear.value) {
        counts[date.getMonth()]++;
      }
    }
  });
  
  return counts;
});

// 選中月份的活動
const selectedMonthActivities = computed(() => {
  if (selectedMonth.value === null) return [];
  
  return props.activities.filter(activity => {
    if (!activity.time?.startDate) return false;
    const date = new Date(activity.time.startDate);
    return date.getFullYear() === currentYear.value && 
           date.getMonth() === selectedMonth.value;
  }).sort((a, b) => {
    const dateA = new Date(a.time!.startDate!);
    const dateB = new Date(b.time!.startDate!);
    return dateA.getTime() - dateB.getTime();
  });
});

// 可見的分類
const visibleCategories = computed(() => {
  const categoriesMap = new Map();
  
  props.activities.forEach(activity => {
    activity.categories?.forEach(category => {
      if (!categoriesMap.has(category.id)) {
        categoriesMap.set(category.id, {
          id: category.id,
          name: category.name,
          color: category.colorCode || '#666'
        });
      }
    });
  });
  
  return Array.from(categoriesMap.values());
});

// 方法
const isCurrentMonth = (monthIndex: number): boolean => {
  const today = new Date();
  return today.getFullYear() === currentYear.value && 
         today.getMonth() === monthIndex;
};

const getCategoryColor = (activity: Activity): string => {
  return activity.categories?.[0]?.colorCode || '#666';
};

const previousYear = () => {
  const newDate = new Date(currentDate.value);
  newDate.setFullYear(newDate.getFullYear() - 1);
  currentDate.value = newDate;
  selectedMonth.value = null;
};

const nextYear = () => {
  const newDate = new Date(currentDate.value);
  newDate.setFullYear(newDate.getFullYear() + 1);
  currentDate.value = newDate;
  selectedMonth.value = null;
};

const goToToday = () => {
  currentDate.value = new Date();
  selectedMonth.value = new Date().getMonth();
};

const selectMonth = (monthIndex: number) => {
  selectedMonth.value = monthIndex;
  emit('monthSelect', currentYear.value, monthIndex + 1);
};

const handleActivityClick = (activity: Activity) => {
  selectedActivity.value = activity;
  showActivityDetail.value = true;
  emit('activityClick', activity);
};

const formatActivityDate = (activity: Activity): string => {
  if (!activity.time?.startDate) return '';
  
  const date = new Date(activity.time.startDate);
  return date.toLocaleDateString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  });
};

// 初始化時自動選擇當前月份
onMounted(() => {
  const today = new Date();
  if (today.getFullYear() === currentYear.value) {
    selectedMonth.value = today.getMonth();
  }
});
</script>

<style scoped>
.activity-calendar {
  @apply bg-white rounded-lg shadow-sm p-6;
}

.month-selector {
  @apply w-full;
}

/* 月份網格 */
.months-grid {
  @apply grid grid-cols-3 md:grid-cols-4 gap-4;
}

.month-card {
  @apply relative p-6 bg-gray-50 rounded-lg cursor-pointer transition-all duration-200;
  @apply hover:bg-gray-100 hover:shadow-md hover:scale-105;
  @apply border-2 border-transparent;
}

.month-card.current-month {
  @apply bg-blue-50 border-blue-300;
}

.month-card.selected-month {
  @apply bg-primary-100 border-primary-500 shadow-md;
}

.month-card.has-activities {
  @apply font-medium;
}

.month-name {
  @apply text-lg font-semibold text-gray-800 mb-2;
}

.activity-count {
  @apply text-sm text-gray-600;
}

.month-card.selected-month .month-name {
  @apply text-primary-700;
}

.month-card.selected-month .activity-count {
  @apply text-primary-600;
}

/* 活動列表 */
.selected-month-activities {
  @apply border-t pt-6;
}

.activities-list {
  @apply space-y-3;
}

.activity-item {
  @apply flex items-center gap-4 p-4 rounded-lg border border-gray-200 cursor-pointer;
  @apply hover:border-primary-300 hover:bg-primary-50 transition-colors;
}

.activity-date {
  @apply text-sm font-medium text-gray-700 min-w-[80px];
}

.activity-info {
  @apply flex-1;
}

.activity-name {
  @apply font-medium text-gray-900;
}

.activity-location {
  @apply text-sm text-gray-500 flex items-center gap-1 mt-1;
}

.activity-category {
  @apply flex gap-2;
}

.empty-state {
  @apply py-12;
}
</style>