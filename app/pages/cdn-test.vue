<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">CDN 資料庫載入測試</h1>
    
    <div class="space-y-4">
      <!-- 測試狀態 -->
      <div class="bg-blue-100 p-4 rounded">
        <h2 class="text-lg font-semibold mb-2">測試狀態</h2>
        <div v-if="loading">載入中...</div>
        <div v-else-if="success" class="text-green-600">
          <p>✅ 資料庫載入成功！</p>
          <p>活動數量: {{ activityCount }}</p>
          <p>資料表: {{ tables.join(', ') }}</p>
        </div>
        <div v-else-if="error" class="text-red-600">
          <p>❌ 錯誤: {{ error }}</p>
        </div>
      </div>

      <!-- CDN URL 列表 -->
      <div class="bg-gray-100 p-4 rounded">
        <h2 class="text-lg font-semibold mb-2">CDN URLs</h2>
        <ul class="text-sm space-y-1">
          <li v-for="url in cdnUrls" :key="url">
            <a :href="url" target="_blank" class="text-blue-600 hover:underline">
              {{ url }}
            </a>
          </li>
        </ul>
      </div>

      <!-- 測試按鈕 -->
      <button 
        @click="testCDN" 
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        :disabled="loading"
      >
        測試 CDN 載入
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import initSqlJs from 'sql.js';

const loading = ref(false);
const success = ref(false);
const error = ref('');
const activityCount = ref(0);
const tables = ref<string[]>([]);

// CDN URLs
const cdnUrls = [
  'https://cdn.jsdelivr.net/gh/TroyeXu/taiwan-activity@main/public/tourism.sqlite',
  'https://raw.githubusercontent.com/TroyeXu/taiwan-activity/main/public/tourism.sqlite',
];

const testCDN = async () => {
  loading.value = true;
  success.value = false;
  error.value = '';
  
  try {
    console.log('🚀 開始 CDN 測試...');
    
    // 初始化 SQL.js
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    
    // 嘗試從 CDN 載入
    let buffer: ArrayBuffer | null = null;
    
    for (const url of cdnUrls) {
      try {
        console.log(`📥 嘗試: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
          buffer = await response.arrayBuffer();
          console.log(`✅ 成功載入 (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
          break;
        }
      } catch (err) {
        console.error(`❌ 失敗: ${url}`, err);
      }
    }
    
    if (!buffer) {
      throw new Error('無法從任何 CDN 載入資料庫');
    }
    
    // 創建資料庫
    const db = new SQL.Database(new Uint8Array(buffer));
    
    // 測試查詢
    const countResult = db.exec('SELECT COUNT(*) as count FROM activities');
    activityCount.value = countResult[0]?.values[0][0] as number || 0;
    
    // 取得資料表列表
    const tableResult = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    tables.value = tableResult[0]?.values.map(row => row[0] as string) || [];
    
    success.value = true;
    console.log('✅ 測試成功！');
    
  } catch (err) {
    error.value = String(err);
    console.error('❌ 測試失敗:', err);
  } finally {
    loading.value = false;
  }
};

// 自動執行測試
onMounted(() => {
  testCDN();
});
</script>