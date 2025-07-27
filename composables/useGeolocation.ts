import { ref, computed, onMounted } from 'vue';
import type { MapCenter } from '~/types';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export const useGeolocation = (options: GeolocationOptions = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000 // 5 分鐘
  } = options;

  // 響應式狀態
  const coordinates = ref<MapCenter | null>(null);
  const address = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const supported = ref(false);
  const permission = ref<PermissionState | null>(null);

  // 檢查地理位置支援
  const checkSupport = () => {
    supported.value = 'geolocation' in navigator;
    return supported.value;
  };

  // 檢查權限狀態
  const checkPermission = async (): Promise<PermissionState | null> => {
    if (!checkSupport()) return null;

    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        permission.value = result.state;
        
        // 監聽權限變化
        result.onchange = () => {
          permission.value = result.state;
        };

        return result.state;
      }
    } catch (err) {
      console.warn('無法檢查地理位置權限:', err);
    }

    return null;
  };

  // 取得目前位置
  const getCurrentPosition = async (): Promise<MapCenter | null> => {
    if (!import.meta.client) {
      error.value = '僅在瀏覽器環境可使用定位功能';
      return null;
    }

    if (!checkSupport()) {
      error.value = '瀏覽器不支援地理位置功能';
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy,
            timeout,
            maximumAge
          }
        );
      });

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      coordinates.value = coords;

      // 嘗試反向地理編碼取得地址
      await reverseGeocode(coords);

      console.log('成功取得位置:', coords);
      return coords;

    } catch (err: any) {
      let errorMessage = '無法取得位置資訊';

      if (err instanceof GeolocationPositionError || err.code !== undefined) {
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = '無法取得位置，請檢查瀏覽器權限設定';
            console.error('定位權限被拒絕，請在瀏覽器設定中允許此網站存取您的位置');
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = '無法取得位置資訊';
            console.error('無法取得位置資訊，請確認您的裝置已開啟定位功能');
            break;
          case 3: // TIMEOUT
            errorMessage = '取得位置資訊超時';
            console.error('取得位置超時，請稍後再試');
            break;
        }
      }

      error.value = errorMessage;
      console.error('定位錯誤:', err);
      return null;

    } finally {
      loading.value = false;
    }
  };

  // 監聽位置變化
  const watchPosition = (
    onSuccess: (coords: MapCenter) => void,
    onError?: (error: string) => void
  ): number | null => {
    if (!checkSupport()) {
      onError?.('瀏覽器不支援地理位置功能');
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        coordinates.value = coords;
        onSuccess(coords);
      },
      (err) => {
        let errorMessage = '無法監聽位置變化';
        if (err instanceof GeolocationPositionError) {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = '使用者拒絕了地理位置請求';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = '無法取得位置資訊';
              break;
            case err.TIMEOUT:
              errorMessage = '取得位置資訊超時';
              break;
          }
        }
        error.value = errorMessage;
        onError?.(errorMessage);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  };

  // 停止監聽位置變化
  const clearWatch = (watchId: number) => {
    if (supported.value && watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  };

  // 反向地理編碼 (座標轉地址) - 使用免費的 Nominatim API
  const reverseGeocode = async (coords: MapCenter): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&accept-language=zh-TW,zh,en`
      );

      const data = await response.json();

      if (data && data.display_name) {
        address.value = data.display_name;
        return data.display_name;
      } else {
        console.warn('反向地理編碼失敗: 無資料');
        return null;
      }

    } catch (err) {
      console.error('反向地理編碼錯誤:', err);
      return null;
    }
  };

  // 正向地理編碼 (地址轉座標) - 使用免費的 Nominatim API
  const geocodeAddress = async (addressQuery: string): Promise<MapCenter | null> => {
    try {
      const encodedAddress = encodeURIComponent(addressQuery);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodedAddress}&countrycodes=tw&accept-language=zh-TW,zh,en&limit=1`
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const coords = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };

        coordinates.value = coords;
        address.value = result.display_name;

        return coords;
      } else {
        console.warn('地理編碼失敗: 找不到地址');
        return null;
      }

    } catch (err) {
      console.error('地理編碼錯誤:', err);
      return null;
    }
  };

  // 計算兩點間距離 (公里)
  const calculateDistance = (
    point1: MapCenter,
    point2: MapCenter
  ): number => {
    const R = 6371; // 地球半徑 (公里)
    const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
    const dLng = (point2.lng - point1.lng) * (Math.PI / 180);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * (Math.PI / 180)) * Math.cos(point2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  };

  // 格式化距離顯示
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  };

  // 請求位置權限 (友善提示)
  const requestPermission = async (): Promise<boolean> => {
    try {
      // 先檢查當前權限狀態
      await checkPermission();

      if (permission.value === 'granted') {
        return true;
      }

      if (permission.value === 'denied') {
        error.value = '地理位置權限已被拒絕，請在瀏覽器設定中手動開啟';
        return false;
      }

      // 嘗試取得位置 (這會觸發權限請求)
      const coords = await getCurrentPosition();
      return coords !== null;

    } catch (err) {
      return false;
    }
  };

  // 重置狀態
  const reset = () => {
    coordinates.value = null;
    address.value = null;
    error.value = null;
    loading.value = false;
  };

  // 計算屬性
  const hasLocation = computed(() => coordinates.value !== null);
  const hasError = computed(() => error.value !== null);
  const canUseLocation = computed(() => supported.value && permission.value !== 'denied');

  // 初始化
  onMounted(() => {
    checkSupport();
    checkPermission();
  });

  return {
    // 狀態
    coordinates: readonly(coordinates),
    address: readonly(address),
    loading: readonly(loading),
    error: readonly(error),
    supported: readonly(supported),
    permission: readonly(permission),

    // 計算屬性
    hasLocation,
    hasError,
    canUseLocation,

    // 方法
    checkSupport,
    checkPermission,
    getCurrentPosition,
    getUserLocation: getCurrentPosition, // 別名
    watchPosition,
    clearWatch,
    reverseGeocode,
    geocodeAddress,
    calculateDistance,
    formatDistance,
    requestPermission,
    reset
  };
};