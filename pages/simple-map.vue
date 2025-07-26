<template>
  <div>
    <h1>簡單地圖測試</h1>
    <div id="simple-map" style="height: 600px; width: 100%; border: 2px solid red;"></div>
  </div>
</template>

<script setup lang="ts">
onMounted(async () => {
  // 動態載入 Leaflet
  const L = (await import('leaflet')).default;
  
  // 手動載入 CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  
  // 等待 CSS 載入
  setTimeout(() => {
    // 創建地圖
    const map = L.map('simple-map').setView([25.0330, 121.5654], 13);
    
    // 添加瓦片圖層
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // 添加一個標記
    L.marker([25.0330, 121.5654]).addTo(map)
      .bindPopup('台北市')
      .openPopup();
      
    console.log('簡單地圖已創建');
  }, 500);
});
</script>

<style>
/* 確保 Leaflet 樣式 */
@import 'leaflet/dist/leaflet.css';
</style>