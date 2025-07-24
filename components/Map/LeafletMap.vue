<template>
  <div class="leaflet-map-container">
    <div ref="mapContainer" class="leaflet-map"></div>
    
    <!-- 地圖控制按鈕 -->
    <div class="map-controls">
      <ElButton 
        circle 
        type="primary" 
        @click="centerOnUser"
        :loading="locating"
        title="定位到我的位置"
      >
        <ElIcon><Location /></ElIcon>
      </ElButton>
      
      <ElButton 
        circle 
        type="default" 
        @click="fitBounds"
        title="顯示所有標記"
      >
        <ElIcon><FullScreen /></ElIcon>
      </ElButton>
      
      <ElButton 
        circle 
        type="default" 
        @click="refreshMap"
        title="重新整理地圖"
      >
        <ElIcon><Refresh /></ElIcon>
      </ElButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import L from 'leaflet';
import 'leaflet.markercluster';
import { Location, FullScreen, Refresh } from '@element-plus/icons-vue';
import type { Activity, MapCenter } from '~/types';

// 修復 Leaflet 預設圖標問題
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Props {
  activities: Activity[];
  center: MapCenter;
  zoom?: number;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  zoom: 13,
  height: '400px'
});

interface Emits {
  activityClick: [activity: Activity];
  mapReady: [map: L.Map];
  boundsChanged: [bounds: L.LatLngBounds];
  centerChanged: [center: MapCenter];
}

const emit = defineEmits<Emits>();

// 響應式狀態
const mapContainer = ref<HTMLElement>();
const map = ref<L.Map>();
const markers = ref<L.Marker[]>([]);
const markerClusterGroup = ref<L.MarkerClusterGroup>();
const locating = ref(false);

// 地理位置
const { getCurrentPosition } = useGeolocation();

// 初始化地圖
const initMap = () => {
  if (!mapContainer.value) return;

  // 創建地圖
  map.value = L.map(mapContainer.value, {
    center: [props.center.lat, props.center.lng],
    zoom: props.zoom,
    zoomControl: false, // 我們使用自定義控制按鈕
  });

  // 添加圖層 - 使用 OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map.value);

  // 添加縮放控制到右下角
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map.value);

  // 創建標記聚合群組
  markerClusterGroup.value = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 60,
  });

  map.value.addLayer(markerClusterGroup.value);

  // 地圖事件監聽
  map.value.on('moveend', () => {
    if (map.value) {
      const center = map.value.getCenter();
      emit('centerChanged', { lat: center.lat, lng: center.lng });
      emit('boundsChanged', map.value.getBounds());
    }
  });

  emit('mapReady', map.value);
};

// 創建活動標記
const createActivityMarker = (activity: Activity): L.Marker | null => {
  if (!activity.location?.latitude || !activity.location?.longitude) {
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
  if (!map.value || !markerClusterGroup.value) return;

  // 清除現有標記
  markerClusterGroup.value.clearLayers();
  markers.value = [];

  // 添加新標記
  props.activities.forEach(activity => {
    const marker = createActivityMarker(activity);
    if (marker) {
      markers.value.push(marker);
      markerClusterGroup.value?.addLayer(marker);
    }
  });
};

// 居中到使用者位置
const centerOnUser = async () => {
  locating.value = true;
  try {
    const position = await getCurrentPosition();
    if (position && map.value) {
      map.value.setView([position.lat, position.lng], 15);
    }
  } catch (error) {
    ElMessage.warning('無法取得您的位置');
  } finally {
    locating.value = false;
  }
};

// 適配所有標記
const fitBounds = () => {
  if (!map.value || markers.value.length === 0) return;

  const group = new L.FeatureGroup(markers.value);
  map.value.fitBounds(group.getBounds(), {
    padding: [20, 20]
  });
};

// 重新整理地圖
const refreshMap = () => {
  if (!map.value) return;
  
  map.value.invalidateSize();
  updateMarkers();
};

// 全域函數供 popup 使用
if (process.client) {
  (window as any).selectActivity = (activityId: string) => {
    const activity = props.activities.find(a => a.id === activityId);
    if (activity) {
      emit('activityClick', activity);
    }
  };
}

// 監聽 props 變化
watch(() => props.activities, updateMarkers, { deep: true });
watch(() => props.center, (newCenter) => {
  if (map.value) {
    map.value.setView([newCenter.lat, newCenter.lng]);
  }
}, { deep: true });

// 生命週期
onMounted(() => {
  nextTick(() => {
    initMap();
    updateMarkers();
  });
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
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-controls .el-button {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
</style>