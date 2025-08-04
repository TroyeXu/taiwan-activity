<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">資料庫載入測試</h1>
    
    <div class="space-y-4">
      <!-- 環境資訊 -->
      <div class="bg-gray-100 p-4 rounded">
        <h2 class="text-lg font-semibold mb-2">環境資訊</h2>
        <pre class="text-sm">{{ environmentInfo }}</pre>
      </div>

      <!-- 載入狀態 -->
      <div class="bg-blue-100 p-4 rounded">
        <h2 class="text-lg font-semibold mb-2">資料庫載入狀態</h2>
        <div v-if="loading">載入中...</div>
        <div v-else-if="error" class="text-red-600">
          <p>錯誤: {{ error.message }}</p>
          <pre class="text-xs mt-2">{{ error.stack }}</pre>
        </div>
        <div v-else-if="loadResult" class="text-green-600">
          <p>✅ 載入成功！</p>
          <p>測試查詢結果: {{ loadResult }}</p>
        </div>
      </div>

      <!-- 手動測試按鈕 -->
      <div class="space-x-2">
        <button 
          @click="testDatabase" 
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          :disabled="loading"
        >
          測試資料庫載入
        </button>
        
        <button 
          @click="clearCache" 
          class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          清除快取
        </button>
      </div>

      <!-- 詳細日誌 -->
      <div class="bg-gray-100 p-4 rounded">
        <h2 class="text-lg font-semibold mb-2">詳細日誌</h2>
        <pre class="text-xs overflow-auto max-h-96">{{ logs.join('\n') }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DatabaseLoader } from '~/utils/database-loader';
import { useSqliteWeb } from '~/composables/useSqliteWeb';

const loading = ref(false);
const error = ref<Error | null>(null);
const loadResult = ref<any>(null);
const logs = ref<string[]>([]);

const { $config } = useNuxtApp();

// 環境資訊
const environmentInfo = computed(() => {
  return JSON.stringify({
    baseURL: $config.app.baseURL,
    env: process.env.NODE_ENV,
    url: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
  }, null, 2);
});

// 添加日誌
const addLog = (message: string) => {
  const timestamp = new Date().toISOString();
  logs.value.push(`[${timestamp}] ${message}`);
  console.log(message);
};

// 測試資料庫載入
const testDatabase = async () => {
  loading.value = true;
  error.value = null;
  loadResult.value = null;
  logs.value = [];

  try {
    addLog('開始測試資料庫載入...');
    addLog(`環境: ${window.location.href}`);
    
    // 使用新的 Web SQLite 載入器
    addLog('使用 useSqliteWeb 載入資料庫...');
    const { initDatabase, query } = useSqliteWeb();
    
    // 初始化資料庫
    addLog('初始化資料庫...');
    await initDatabase();
    addLog('資料庫初始化成功');
    
    // 執行測試查詢
    addLog('執行測試查詢...');
    const result = await query('SELECT COUNT(*) as count FROM activities');
    addLog(`查詢成功，活動數量: ${result[0].count}`);
    
    // 查詢更多資訊
    const tableResult = await query("SELECT name FROM sqlite_master WHERE type='table'");
    addLog(`資料表數量: ${tableResult.length}`);
    addLog(`資料表名稱: ${tableResult.map(t => t.name).join(', ')}`);
    
    loadResult.value = result[0];
  } catch (err) {
    error.value = err as Error;
    addLog(`錯誤: ${err}`);
    console.error('詳細錯誤:', err);
  } finally {
    loading.value = false;
  }
};

// 清除快取
const clearCache = () => {
  DatabaseLoader.clearCache();
  addLog('快取已清除');
};

// 組件掛載時自動測試
onMounted(() => {
  testDatabase();
});
</script>