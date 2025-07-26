<template>
  <div class="map-container">
    <!-- 地圖 -->
    <LeafletMap
      :activities="filteredActivities"
      :center="center"
      :zoom="zoom"
      :height="height"
      @activity-click="handleActivityClick"
      @map-ready="handleMapReady"
      @bounds-changed="handleBoundsChanged"
      @center-changed="handleCenterChanged"
    />

    <!-- 分類篩選器 -->
    <div v-if="showCategoryFilter" class="category-filter">
      <div class="filter-header">
        <h4>活動分類</h4>
        <ElButton 
          text 
          size="small" 
          @click="clearCategoryFilter"
        >
          清除
        </ElButton>
      </div>
      
      <div class="category-list">
        <ElCheckboxGroup v-model="selectedCategories" @change="updateFilter">
          <ElCheckbox
            v-for="category in availableCategories"
            :key="category.value"
            :value="category.value"
            class="category-item"
          >
            <span class="category-icon" :style="{ color: category.color }">
              {{ category.icon }}
            </span>
            <span class="category-name">{{ category.label }}</span>
            <span class="category-count">({{ category.count }})</span>
          </ElCheckbox>
        </ElCheckboxGroup>
      </div>
    </div>

    <!-- 地圖統計信息 -->
    <div v-if="showStats" class="map-stats">
      <div class="stats-item">
        <span class="stats-label">顯示活動:</span>
        <span class="stats-value">{{ filteredActivities.length }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">總活動:</span>
        <span class="stats-value">{{ activities.length }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Activity, MapCenter } from '~/types';
import LeafletMap from '~/components/Map/LeafletMap.vue';

interface Props {
  activities: Activity[];
  center?: MapCenter;
  zoom?: number;
  height?: string;
  showCategoryFilter?: boolean;
  showStats?: boolean;
  initialCategories?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  center: () => ({ lat: 23.8103, lng: 120.9605 }), // 台灣中心（更精確）
  zoom: 7,
  height: '500px',
  showCategoryFilter: true,
  showStats: true,
  initialCategories: () => []
});

interface Emits {
  activityClick: [activity: Activity];
  mapReady: [map: any];
  boundsChanged: [bounds: any];
  centerChanged: [center: MapCenter];
  categoryFilterChanged: [categories: string[]];
}

const emit = defineEmits<Emits>();

// 響應式狀態
const selectedCategories = ref<string[]>([...props.initialCategories]);

// 可用分類列表
const availableCategories = computed(() => {
  const categoryMap = new Map<string, {
    label: string;
    value: string;
    color: string;
    icon: string;
    count: number;
  }>();

  props.activities.forEach(activity => {
    activity.categories?.forEach(category => {
      const existing = categoryMap.get(category.slug);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(category.slug, {
          label: category.name,
          value: category.slug,
          color: category.colorCode || '#3b82f6',
          icon: category.icon || '📍',
          count: 1
        });
      }
    });
  });

  return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
});

// 篩選後的活動
const filteredActivities = computed(() => {
  if (selectedCategories.value.length === 0) {
    return props.activities;
  }

  return props.activities.filter(activity => {
    return activity.categories?.some(category => 
      selectedCategories.value.includes(category.slug)
    );
  });
});

// 事件處理
const handleActivityClick = (activity: Activity) => {
  emit('activityClick', activity);
};

const handleMapReady = (map: any) => {
  emit('mapReady', map);
};

const handleBoundsChanged = (bounds: any) => {
  emit('boundsChanged', bounds);
};

const handleCenterChanged = (center: MapCenter) => {
  emit('centerChanged', center);
};

const updateFilter = () => {
  emit('categoryFilterChanged', [...selectedCategories.value]);
};

const clearCategoryFilter = () => {
  selectedCategories.value = [];
  updateFilter();
};

// 監聽 props 變化
watch(() => props.initialCategories, (newCategories) => {
  selectedCategories.value = [...newCategories];
}, { deep: true });
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.category-filter {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  max-width: 250px;
  max-height: 400px;
  overflow-y: auto;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.filter-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  margin: 0 !important;
}

.category-item :deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding-left: 4px;
}

.category-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.category-name {
  flex: 1;
  color: #374151;
}

.category-count {
  color: #6b7280;
  font-size: 12px;
}

.map-stats {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1000;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 8px 12px;
  display: flex;
  gap: 16px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stats-label {
  color: #6b7280;
}

.stats-value {
  color: #1f2937;
  font-weight: 600;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .category-filter {
    max-width: 200px;
  }
  
  .map-stats {
    flex-direction: column;
    gap: 4px;
  }
}
</style>