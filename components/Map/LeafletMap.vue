<template>
  <div class="leaflet-map-container">
    <!-- 載入中狀態 -->
    <div v-if="!mapReady" class="map-loading">
      <ElIcon class="loading-icon"><Loading /></ElIcon>
      <span>地圖載入中...</span>
    </div>
    
    <div ref="mapContainer" class="leaflet-map" :class="{ 'map-hidden': !mapReady }"></div>
    
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import type { Activity, MapCenter } from '~/types';

// Leaflet 將在需要時動態載入
let L: any = null;

interface Props {
  activities: Activity[];
  center: MapCenter;
  zoom?: number;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 7,
  height: '400px'
});

interface Emits {
  activityClick: [activity: Activity];
  mapReady: [map: any];
  boundsChanged: [bounds: any];
  centerChanged: [center: MapCenter];
}

const emit = defineEmits<Emits>();

// 響應式狀態
const mapContainer = ref<HTMLElement>();
const map = ref<any>();
const markers = ref<any[]>([]);
const markerClusterGroup = ref<any>();
const mapReady = ref(false);

// 地理位置
const { getCurrentPosition } = useGeolocation();

// 初始化地圖
const initMap = async () => {
  console.log('開始初始化地圖');
  console.log('mapContainer.value:', mapContainer.value);
  console.log('import.meta.client:', import.meta.client);
  
  if (!mapContainer.value || !import.meta.client) {
    console.log('地圖容器不存在或不在客戶端');
    return;
  }
  
  try {
    // 確保 Leaflet 已載入
    if (!L) {
      console.log('載入 Leaflet...');
      const leafletModule = await import('leaflet');
      L = leafletModule.default || leafletModule;
      console.log('Leaflet 載入成功:', L);
      
      // 載入 Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      
      // 載入 markercluster 插件
      try {
        await import('leaflet.markercluster');
        console.log('MarkerCluster 插件載入成功');
      } catch (error) {
        console.warn('MarkerCluster 插件載入失敗:', error);
      }
      
      // 修復 Leaflet 預設圖標問題
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }
  } catch (error) {
    console.error('載入 Leaflet 時發生錯誤:', error);
    return;
  }

  // 等待 CSS 載入，然後創建地圖
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 創建地圖
  console.log('初始化地圖，中心點:', props.center, '縮放等級:', props.zoom);
  
  map.value = L.map(mapContainer.value, {
    center: [props.center.lat, props.center.lng],
    zoom: props.zoom,
    zoomControl: false, // 我們使用自定義控制按鈕
    preferCanvas: true, // 提升性能
  });

  // 添加圖層 - 使用 OpenStreetMap（最穩定）
  const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  
  console.log('添加瓦片圖層');
  tileLayer.addTo(map.value);
  
  // 監聽瓦片載入事件
  tileLayer.on('loading', () => {
    console.log('瓦片開始載入');
  });
  
  tileLayer.on('load', () => {
    console.log('瓦片載入完成');
  });
  
  tileLayer.on('tileerror', (error: any) => {
    console.error('瓦片載入錯誤:', error);
  });
  
  // 添加載入完成事件
  map.value.whenReady(() => {
    console.log('地圖已完全載入');
    // 強制刷新地圖大小
    setTimeout(() => {
      if (map.value) {
        map.value.invalidateSize();
        console.log('強制刷新地圖大小');
      }
      mapReady.value = true;
      emit('mapReady', map.value);
    }, 100);
  });

  // 添加縮放控制到右下角
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map.value);

  // 創建標記聚合群組
  try {
    if (L.markerClusterGroup) {
      markerClusterGroup.value = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
      });
      map.value.addLayer(markerClusterGroup.value);
    } else {
      console.warn('MarkerClusterGroup 插件未正確載入，使用基本標記');
    }
  } catch (error) {
    console.error('建立標記聚合群組失敗:', error);
  }

  // 地圖事件監聽
  map.value.on('moveend', () => {
    if (map.value && !isInternalUpdate.value) {
      isInternalUpdate.value = true;
      const center = map.value.getCenter();
      emit('centerChanged', { lat: center.lat, lng: center.lng });
      emit('boundsChanged', map.value.getBounds());
      // 使用 nextTick 確保更新完成後重置標誌
      nextTick(() => {
        isInternalUpdate.value = false;
      });
    }
  });

  emit('mapReady', map.value);
  mapReady.value = true;
};

// 創建活動標記
const createActivityMarker = (activity: Activity): any | null => {
  if (!activity.location?.latitude || !activity.location?.longitude || !L) {
    return null;
  }

  // 獲取分類信息
  const category = activity.categories?.[0];
  const categoryIcon = category?.icon || '📍';
  const categoryColor = category?.colorCode || '#3b82f6';

  // 創建自定義圖標
  const customIcon = L.divIcon({
    html: `
      <div class="custom-marker" style="background-color: ${categoryColor}">
        <span class="marker-icon">${categoryIcon}</span>
      </div>
    `,
    className: 'custom-marker-container',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  const marker = L.marker(
    [activity.location.latitude, activity.location.longitude],
    { icon: customIcon }
  );

  // 創建彈出窗口內容
  const popupContent = `
    <div class="activity-popup">
      <h3 class="popup-title">${activity.name}</h3>
      <p class="popup-summary">${activity.summary || activity.description || ''}</p>
      <div class="popup-info">
        <div class="popup-location">
          <i class="icon">📍</i>
          <span>${activity.location.address}</span>
        </div>
        ${activity.time ? `
          <div class="popup-time">
            <i class="icon">⏰</i>
            <span>${activity.time.startDate}</span>
          </div>
        ` : ''}
      </div>
      <div class="popup-actions">
        <button class="popup-btn" onclick="window.selectActivity('${activity.id}')">
          查看詳情
        </button>
      </div>
    </div>
  `;

  marker.bindPopup(popupContent, {
    maxWidth: 300,
    className: 'custom-popup'
  });

  // 點擊事件
  marker.on('click', () => {
    emit('activityClick', activity);
  });

  return marker;
};

// 更新地圖標記
const updateMarkers = () => {
  if (!map.value || !import.meta.client) return;

  console.log('更新地圖標記，活動數量:', props.activities.length);
  
  // 清除現有標記
  if (markerClusterGroup.value) {
    markerClusterGroup.value.clearLayers();
  } else {
    // 如果沒有聚合群組，直接從地圖移除標記
    markers.value.forEach(marker => {
      if (marker && map.value) {
        map.value.removeLayer(marker);
      }
    });
  }
  markers.value = [];

  // 添加新標記
  props.activities.forEach(activity => {
    console.log('處理活動:', activity.name, activity.location);
    const marker = createActivityMarker(activity);
    if (marker) {
      markers.value.push(marker);
      if (markerClusterGroup.value) {
        markerClusterGroup.value.addLayer(marker);
      } else {
        // 直接添加到地圖
        marker.addTo(map.value);
      }
    }
  });
  
  console.log('成功創建標記數量:', markers.value.length);
};



// 全域函數供 popup 使用
if (import.meta.client) {
  (window as any).selectActivity = (activityId: string) => {
    const activity = props.activities.find(a => a.id === activityId);
    if (activity) {
      emit('activityClick', activity);
    }
  };
}

// 響應式狀態
const isInternalUpdate = ref(false);

// 監聽 props 變化
watch(() => props.activities, updateMarkers, { deep: true });
watch(() => props.center, (newCenter, oldCenter) => {
  if (map.value && !isInternalUpdate.value) {
    // 檢查是否真的需要更新（避免微小差異造成的循環）
    if (!oldCenter || 
        Math.abs(newCenter.lat - oldCenter.lat) > 0.0001 || 
        Math.abs(newCenter.lng - oldCenter.lng) > 0.0001) {
      map.value.setView([newCenter.lat, newCenter.lng]);
    }
  }
}, { deep: true });

// 生命週期
onMounted(() => {
  // 僅在客戶端初始化地圖
  if (import.meta.client) {
    nextTick(async () => {
      await initMap();
      updateMarkers();
      
      // 添加額外的大小刷新
      setTimeout(() => {
        if (map.value) {
          map.value.invalidateSize();
          console.log('Mount 後刷新地圖大小');
        }
      }, 200);
    });
  }
});

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
  }
});
</script>

<style scoped>
.leaflet-map-container {
  position: relative;
  width: 100%;
  height: v-bind(height);
}

.leaflet-map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  transition: opacity 0.3s ease;
  background-color: #f0f0f0; /* 添加背景色以便看到容器 */
  min-height: 400px; /* 確保有最小高度 */
}

/* 確保 Leaflet 容器正確設置 */
.leaflet-map :deep(.leaflet-container) {
  height: 100% !important;
  width: 100% !important;
}

.map-hidden {
  opacity: 0;
  pointer-events: none;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  z-index: 1000;
  gap: 12px;
  color: #666;
  font-size: 14px;
}

.loading-icon {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

</style>

<style>
/* 全域樣式，不使用 scoped */
.custom-marker-container {
  background: none !important;
  border: none !important;
}

.custom-marker {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.custom-marker:hover {
  transform: scale(1.1);
}

.marker-icon {
  font-size: 16px;
  line-height: 1;
}

.custom-popup .leaflet-popup-content {
  margin: 12px 16px;
  line-height: 1.4;
}

.activity-popup {
  min-width: 200px;
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.popup-summary {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.popup-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.popup-location,
.popup-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4b5563;
}

.popup-location .icon,
.popup-time .icon {
  width: 16px;
  text-align: center;
}

.popup-actions {
  display: flex;
  justify-content: flex-end;
}

.popup-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.popup-btn:hover {
  background: #2563eb;
}

/* Leaflet 聚合樣式自定義 */
.marker-cluster-small {
  background-color: rgba(59, 130, 246, 0.6) !important;
}

.marker-cluster-small div {
  background-color: rgba(59, 130, 246, 0.8) !important;
  color: white !important;
  font-weight: 600 !important;
}

.marker-cluster-medium {
  background-color: rgba(16, 185, 129, 0.6) !important;
}

.marker-cluster-medium div {
  background-color: rgba(16, 185, 129, 0.8) !important;
  color: white !important;
  font-weight: 600 !important;
}

.marker-cluster-large {
  background-color: rgba(239, 68, 68, 0.6) !important;
}

.marker-cluster-large div {
  background-color: rgba(239, 68, 68, 0.8) !important;
  color: white !important;
  font-weight: 600 !important;
}

/* 使用者位置標記樣式 */
.user-location-container {
  background: none !important;
  border: none !important;
}

.user-location-marker {
  position: relative;
  width: 20px;
  height: 20px;
}

.marker-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border: 2px solid white;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.pulse-ring {
  position: absolute;
  width: 20px;
  height: 20px;
  background: rgba(59, 130, 246, 0.4);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}
</style>