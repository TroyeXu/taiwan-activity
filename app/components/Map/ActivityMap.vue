<template>
  <div class="map-container">
    <!-- 地圖 -->
    <div id="activity-map" class="leaflet-map" style="height: 100%; width: 100%"></div>

    <!-- 分類篩選器 -->
    <div v-if="showCategoryFilter" class="category-filter">
      <div class="filter-header">
        <h4>活動分類</h4>
        <ElButton text size="small" @click="clearCategoryFilter"> 清除 </ElButton>
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
import type { Activity, MapCenter } from '~/types';

// Leaflet 將在需要時動態載入
let L: any = null;

interface Props {
  activities: Activity[];
  center?: MapCenter;
  zoom?: number;
  height?: string;
  showCategoryFilter?: boolean;
  showStats?: boolean;
  initialCategories?: string[];
  userLocation?: { lat: number; lng: number } | null;
  searchRadius?: number;
  showUserLocation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  center: () => ({ lat: 23.8103, lng: 120.9605 }), // 台灣中心（更精確）
  zoom: 7,
  height: '500px',
  showCategoryFilter: true,
  showStats: true,
  initialCategories: () => [],
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
const map = ref<any>();
const markers = ref<any[]>([]);
const userMarker = ref<any>(null);
const radiusCircle = ref<any>(null);

// 使用收藏功能
const { favoriteIds } = useFavorites();

// 可用分類列表
const availableCategories = computed(() => {
  const categoryMap = new Map<
    string,
    {
      label: string;
      value: string;
      color: string;
      icon: string;
      count: number;
    }
  >();

  props.activities.forEach((activity) => {
    activity.categories?.forEach((category) => {
      const existing = categoryMap.get(category.slug);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(category.slug, {
          label: category.name,
          value: category.slug,
          color: category.colorCode || '#3b82f6',
          icon: category.icon || '📍',
          count: 1,
        });
      }
    });
  });

  return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
});

// 計算兩點間的距離（公里）
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // 地球半徑（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 篩選後的活動
const filteredActivities = computed(() => {
  console.log('地圖組件收到活動數量:', props.activities.length);
  console.log('用戶位置:', props.userLocation);
  console.log('搜尋半徑:', props.searchRadius);
  
  let filtered = props.activities;
  
  // 分類篩選
  if (selectedCategories.value.length > 0) {
    filtered = filtered.filter((activity) => {
      return activity.categories?.some((category) =>
        selectedCategories.value.includes(category.slug)
      );
    });
  }
  
  // 距離篩選（如果有用戶位置和搜尋範圍）
  // 改進：如果範圍內沒有活動，仍顯示所有活動
  if (props.userLocation && props.searchRadius) {
    console.log('檢查距離篩選');
    const withinRadius = filtered.filter((activity) => {
      if (!activity.location?.latitude || !activity.location?.longitude) {
        return false;
      }
      const distance = calculateDistance(
        props.userLocation.lat,
        props.userLocation.lng,
        activity.location.latitude,
        activity.location.longitude
      );
      return distance <= props.searchRadius;
    });
    
    if (withinRadius.length > 0) {
      console.log(`找到 ${withinRadius.length} 個在範圍內的活動`);
      filtered = withinRadius;
    } else {
      console.log('範圍內沒有活動，顯示所有活動');
      // 保持顯示所有活動，讓使用者看到地圖上有內容
    }
  }
  
  console.log('篩選後活動數量:', filtered.length);
  return filtered;
});

// 初始化地圖
const initMap = async () => {
  if (!import.meta.client) return;

  // 動態載入 Leaflet
  const leafletModule = await import('leaflet');
  L = leafletModule.default;

  // 手動載入 CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);

  // 等待 CSS 載入和 DOM 準備就緒
  setTimeout(() => {
    // 確保 DOM 元素存在
    const mapElement = document.getElementById('activity-map');
    if (!mapElement) {
      console.error('Map container not found, retrying...');
      setTimeout(() => initMap(), 500);
      return;
    }
    
    // 創建地圖
    try {
      map.value = L.map('activity-map').setView([props.center.lat, props.center.lng], props.zoom);

    // 添加瓦片圖層
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.value);

    // 添加活動標記
    updateMarkers();
    
    // 更新用戶位置
    updateUserLocation();

    // 發送地圖準備就緒事件
    emit('mapReady', map.value);

    console.log('ActivityMap 已創建');
    } catch (error) {
      console.error('Failed to initialize map:', error);
      // 如果初始化失敗，稍後重試
      setTimeout(() => initMap(), 1000);
    }
  }, 500);
};

// 創建活動標記
const createActivityMarker = (activity: Activity) => {
  if (!activity.location?.latitude || !activity.location?.longitude || !L) {
    return null;
  }

  // 檢查是否已收藏 - 直接使用響應式的 favoriteIds
  const isFavorited = favoriteIds.value.has(activity.id);
  
  console.log(`創建標記 ${activity.name}: 收藏狀態 = ${isFavorited}`);

  // 根據收藏狀態創建不同顏色的圖標
  const markerIcon = L.divIcon({
    html: `
      <div class="custom-marker ${isFavorited ? 'is-favorited' : ''}" data-activity-id="${activity.id}">
        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                fill="${isFavorited ? '#fbbf24' : '#3b82f6'}"/>
          <circle cx="15" cy="15" r="8" fill="white"/>
          ${isFavorited ? 
            '<path d="M15 10l1.545 3.13L20 13.635l-2.5 2.435L18.09 20 15 18.27 11.91 20l.59-3.93L10 13.635l3.455-.505z" fill="#fbbf24"/>' :
            '<circle cx="15" cy="15" r="3" fill="#3b82f6"/>'
          }
        </svg>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });

  const marker = L.marker([activity.location.latitude, activity.location.longitude], {
    icon: markerIcon
  });
  
  // 儲存活動資料到標記
  (marker as any).activityId = activity.id;

  // 創建彈出窗口內容
  const popupContent = `
    <div class="activity-popup">
      <h3>${activity.name}</h3>
      <p>${activity.summary || activity.description || ''}</p>
      <div class="popup-info">
        <div>📍 ${activity.location.address}</div>
        ${isFavorited ? '<div class="favorited-badge">⭐ 已收藏</div>' : ''}
      </div>
    </div>
  `;

  marker.bindPopup(popupContent);

  // 點擊事件
  marker.on('click', () => {
    emit('activityClick', activity);
  });

  return marker;
};

// 更新地圖標記
const updateMarkers = () => {
  if (!map.value || !L) return;

  console.log('更新地圖標記，活動數量:', filteredActivities.value.length);
  console.log('篩選後的活動:', filteredActivities.value.map(a => ({ name: a.name, location: a.location })));

  // 清除現有標記
  markers.value.forEach((marker) => {
    if (marker && map.value) {
      map.value.removeLayer(marker);
    }
  });
  markers.value = [];

  // 添加新標記
  filteredActivities.value.forEach((activity) => {
    const marker = createActivityMarker(activity);
    if (marker) {
      markers.value.push(marker);
      marker.addTo(map.value);
    }
  });
};

// 更新用戶位置標記和範圍圓圈
const updateUserLocation = () => {
  if (!map.value || !L) return;
  
  // 清除現有的用戶標記和圓圈
  if (userMarker.value) {
    map.value.removeLayer(userMarker.value);
    userMarker.value = null;
  }
  if (radiusCircle.value) {
    map.value.removeLayer(radiusCircle.value);
    radiusCircle.value = null;
  }
  
  // 如果有用戶位置，添加標記和範圍圓圈
  if (props.userLocation && props.showUserLocation) {
    // 創建自定義圖標
    const userIcon = L.divIcon({
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
          <div style="
            position: absolute;
            width: 30px;
            height: 30px;
            border: 2px solid #3b82f6;
            border-radius: 50%;
            animation: pulse 2s infinite;
          "></div>
        </div>
      `,
      className: 'user-location-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    // 添加用戶位置標記
    userMarker.value = L.marker(
      [props.userLocation.lat, props.userLocation.lng],
      { icon: userIcon }
    )
    .bindPopup('您的位置')
    .addTo(map.value);
    
    // 如果有搜尋範圍，添加圓圈
    if (props.searchRadius) {
      radiusCircle.value = L.circle(
        [props.userLocation.lat, props.userLocation.lng],
        {
          radius: props.searchRadius * 1000, // 轉換為公尺
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 10'
        }
      ).addTo(map.value);
      
      // 調整地圖視野以包含整個圓圈
      const bounds = radiusCircle.value.getBounds();
      map.value.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // 只有位置沒有範圍時，聚焦到用戶位置
      map.value.setView([props.userLocation.lat, props.userLocation.lng], 13);
    }
  }
};

// 事件處理
const updateFilter = () => {
  updateMarkers();
  emit('categoryFilterChanged', [...selectedCategories.value]);
};

const clearCategoryFilter = () => {
  selectedCategories.value = [];
  updateFilter();
};

// 監聽 props 變化
watch(
  () => props.initialCategories,
  (newCategories) => {
    selectedCategories.value = [...newCategories];
  },
  { deep: true }
);

watch(
  () => props.activities,
  (newActivities) => {
    console.log('ActivityMap: activities prop 變更, 新數量:', newActivities.length);
    updateMarkers();
  },
  { deep: true, immediate: true }
);

watch(
  filteredActivities,
  () => {
    updateMarkers();
  },
  { deep: true }
);

// 監聽用戶位置變化
watch(
  () => [props.userLocation, props.searchRadius, props.showUserLocation],
  () => {
    updateUserLocation();
  },
  { deep: true }
);

// 監聽收藏狀態變化 - 使用 favoriteIds 而非 favorites
watch(
  favoriteIds,
  () => {
    console.log('收藏狀態改變，更新地圖標記');
    updateMarkers();
  },
  { deep: true }
);

// 生命週期
onMounted(async () => {
  if (import.meta.client) {
    await initMap();
  }
});

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
  }
});
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

/* 自定義標記樣式 */
:global(.custom-div-icon) {
  background: transparent !important;
  border: none !important;
}

:global(.custom-marker) {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: all 0.3s ease;
  cursor: pointer;
}

:global(.custom-marker:hover) {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  transform: translateY(-2px);
}

:global(.custom-marker.is-favorited) {
  animation: pulse 0.5s ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* 彈出窗口中的收藏標記 */
:global(.favorited-badge) {
  margin-top: 8px;
  padding: 4px 8px;
  background: #fef3c7;
  color: #d97706;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
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

/* 用戶位置動畫 */
:global(@keyframes pulse) {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
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
