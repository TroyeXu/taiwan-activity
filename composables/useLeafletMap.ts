import type { Activity, MapCenter, MapBounds } from '~/types';
import { CATEGORIES } from '~/types';

interface UseLeafletMapOptions {
  defaultCenter?: MapCenter;
  defaultZoom?: number;
  clustered?: boolean;
}

export const useLeafletMap = (options: UseLeafletMapOptions = {}) => {
  const { 
    defaultCenter = { lat: 23.8, lng: 121 }, // 台灣中心
    defaultZoom = 8,
    clustered = true 
  } = options;

  // 響應式狀態
  const mapInstance = ref<any>(null);
  const mapElement = ref<HTMLElement | null>(null);
  const isMapLoaded = ref(false);
  const mapError = ref<string | null>(null);
  const markers = ref<any[]>([]);
  const markerCluster = ref<any>(null);
  const selectedActivity = ref<Activity | null>(null);

  // 地圖狀態
  const center = ref<MapCenter>(defaultCenter);
  const zoom = ref(defaultZoom);
  const bounds = ref<MapBounds | null>(null);

  // 載入 Leaflet 地圖庫
  const loadLeaflet = async () => {
    if (isMapLoaded.value) {
      return true;
    }

    try {
      if (import.meta.client) {
        const L = await import('leaflet');
        const MarkerClusterGroup = await import('leaflet.markercluster');
        isMapLoaded.value = true;
        mapError.value = null;
        return true;
      }
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '載入地圖失敗';
      mapError.value = errorMessage;
      console.error('Leaflet 載入失敗:', error);
      return false;
    }
  };

  // 初始化地圖
  const initializeMap = async (element: HTMLElement) => {
    if (!await loadLeaflet() || !process.client) {
      throw new Error('Leaflet 載入失敗');
    }

    const L = await import('leaflet');
    mapElement.value = element;

    // 創建地圖實例
    mapInstance.value = L.map(element, {
      center: [center.value.lat, center.value.lng],
      zoom: zoom.value,
      zoomControl: true,
      attributionControl: true
    });

    // 添加 OpenStreetMap 圖層
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(mapInstance.value);

    // 初始化標記聚合群組
    if (clustered) {
      const MarkerClusterGroup = await import('leaflet.markercluster');
      markerCluster.value = new MarkerClusterGroup.default();
      mapInstance.value.addLayer(markerCluster.value);
    }

    // 監聽地圖事件
    mapInstance.value.on('moveend', () => {
      const newCenter = mapInstance.value.getCenter();
      center.value = {
        lat: newCenter.lat,
        lng: newCenter.lng
      };

      const mapBounds = mapInstance.value.getBounds();
      bounds.value = {
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest()
      };
    });

    mapInstance.value.on('zoomend', () => {
      zoom.value = mapInstance.value.getZoom();
    });

    console.log('✅ Leaflet 地圖初始化成功');
    return mapInstance.value;
  };

  // 建立活動標記
  const createActivityMarker = async (activity: Activity): Promise<any | null> => {
    if (!mapInstance.value || !activity.location?.latitude || !activity.location?.longitude) {
      return null;
    }

    const L = await import('leaflet');
    const position = [activity.location.latitude, activity.location.longitude];

    // 取得分類圖標
    const category = activity.categories?.[0];
    const categoryInfo = category ? CATEGORIES[category.slug as keyof typeof CATEGORIES] : null;
    
    // 創建自定義圖標
    const markerIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          background-color: ${categoryInfo?.color || '#3b82f6'};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        ">
          ${categoryInfo?.icon || '📍'}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker(position, { 
      icon: markerIcon,
      title: activity.name
    });

    // 創建彈出視窗內容
    const popupContent = createPopupContent(activity);
    marker.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'custom-popup'
    });

    // 點擊標記事件
    marker.on('click', () => {
      selectedActivity.value = activity;
    });

    return marker;
  };

  // 建立彈出視窗內容
  const createPopupContent = (activity: Activity): string => {
    const categoryNames = activity.categories?.map(c => c.name).join(', ') || '';
    const timeInfo = activity.time 
      ? `${activity.time.startDate}${activity.time.endDate ? ` - ${activity.time.endDate}` : ''}`
      : '';

    return `
      <div class="activity-popup" style="font-family: 'Inter', sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${activity.name}</h3>
        
        ${activity.summary ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">${activity.summary}</p>` : ''}
        
        <div style="margin-bottom: 8px;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            <span style="color: #dc2626;">📍</span> ${activity.location?.address || ''}
          </p>
          ${timeInfo ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #9ca3af;">
            <span style="color: #059669;">📅</span> ${timeInfo}
          </p>` : ''}
        </div>
        
        ${categoryNames ? `<div style="margin-bottom: 8px;">
          <span style="font-size: 11px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; color: #4b5563;">${categoryNames}</span>
        </div>` : ''}
        
        <button onclick="window.viewActivityDetails('${activity.id}')" 
                style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 100%;">
          查看詳情
        </button>
      </div>
    `;
  };

  // 更新地圖上的活動標記
  const updateActivityMarkers = async (activities: Activity[]) => {
    if (!mapInstance.value) return;

    // 清除現有標記
    clearMarkers();

    // 建立新標記
    const newMarkers: any[] = [];
    
    for (const activity of activities) {
      const marker = await createActivityMarker(activity);
      if (marker) {
        newMarkers.push(marker);
      }
    }

    markers.value = newMarkers;

    // 添加標記到地圖或聚合群組
    if (clustered && markerCluster.value) {
      markerCluster.value.addLayers(newMarkers);
    } else {
      newMarkers.forEach(marker => {
        marker.addTo(mapInstance.value);
      });
    }

    // 自動調整地圖範圍
    if (newMarkers.length > 0) {
      fitBoundsToMarkers();
    }
  };

  // 清除所有標記
  const clearMarkers = () => {
    if (clustered && markerCluster.value) {
      markerCluster.value.clearLayers();
    } else {
      markers.value.forEach(marker => {
        mapInstance.value.removeLayer(marker);
      });
    }
    markers.value = [];
  };

  // 調整地圖範圍以包含所有標記
  const fitBoundsToMarkers = async () => {
    if (!mapInstance.value || markers.value.length === 0) return;

    const L = await import('leaflet');
    const group = new L.FeatureGroup(markers.value);
    mapInstance.value.fitBounds(group.getBounds(), {
      padding: [20, 20]
    });
  };

  // 移動地圖中心點
  const panTo = (newCenter: MapCenter) => {
    if (mapInstance.value) {
      mapInstance.value.setView([newCenter.lat, newCenter.lng]);
      center.value = newCenter;
    }
  };

  // 設定縮放級別
  const setZoom = (newZoom: number) => {
    if (mapInstance.value) {
      mapInstance.value.setZoom(newZoom);
      zoom.value = newZoom;
    }
  };

  // 重置地圖檢視
  const resetView = () => {
    panTo(defaultCenter);
    setZoom(defaultZoom);
  };

  // 取得目前地圖範圍內的活動
  const getActivitiesInBounds = (activities: Activity[]): Activity[] => {
    if (!bounds.value) return activities;

    return activities.filter(activity => {
      const lat = activity.location?.latitude;
      const lng = activity.location?.longitude;
      
      if (!lat || !lng) return false;
      
      return lat >= bounds.value!.south &&
             lat <= bounds.value!.north &&
             lng >= bounds.value!.west &&
             lng <= bounds.value!.east;
    });
  };

  // 清理資源
  const cleanup = () => {
    clearMarkers();
    if (mapInstance.value) {
      mapInstance.value.remove();
    }
    mapInstance.value = null;
    isMapLoaded.value = false;
  };

  // 全域函數 (供彈出視窗使用)
  if (process.client) {
    (window as any).viewActivityDetails = (activityId: string) => {
      navigateTo(`/activity/${activityId}`);
    };
  }

  // 組件卸載時清理
  onUnmounted(() => {
    cleanup();
  });

  return {
    // 狀態
    mapInstance: readonly(mapInstance),
    mapElement,
    isMapLoaded: readonly(isMapLoaded),
    mapError: readonly(mapError),
    selectedActivity: readonly(selectedActivity),
    center: readonly(center),
    zoom: readonly(zoom),
    bounds: readonly(bounds),

    // 方法
    loadLeaflet,
    initializeMap,
    updateActivityMarkers,
    clearMarkers,
    panTo,
    setZoom,
    resetView,
    fitBoundsToMarkers,
    getActivitiesInBounds,
    cleanup
  };
};