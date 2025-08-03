<template>
  <div class="container mx-auto p-8">
    <h1 class="text-2xl font-bold mb-6">資料庫健康檢查測試</h1>

    <!-- 健康狀態顯示 -->
    <div class="mb-8 p-6 bg-gray-100 rounded-lg">
      <h2 class="text-lg font-semibold mb-4">當前狀態</h2>
      <div v-if="healthStatus" class="space-y-2">
        <div class="flex items-center space-x-2">
          <span class="font-medium">狀態:</span>
          <span
            :class="[
              'px-3 py-1 rounded-full text-sm font-medium',
              healthStatus.status === 'healthy'
                ? 'bg-green-500 text-white'
                : healthStatus.status === 'degraded'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-red-500 text-white',
            ]"
          >
            {{ healthStatus.status }}
          </span>
        </div>
        <p><span class="font-medium">訊息:</span> {{ healthStatus.message }}</p>
        <p>
          <span class="font-medium">時間:</span>
          {{ new Date(healthStatus.timestamp).toLocaleString() }}
        </p>
        <div v-if="healthStatus.details" class="mt-2 p-3 bg-white rounded">
          <p class="text-sm font-medium mb-1">詳細資訊:</p>
          <pre class="text-xs">{{ JSON.stringify(healthStatus.details, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- 測試按鈕 -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      <button
        @click="performHealthCheck"
        :disabled="loading"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        執行健康檢查
      </button>

      <button
        @click="testNormalQuery"
        :disabled="loading"
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
      >
        測試正常查詢
      </button>

      <button
        @click="testBadQuery"
        :disabled="loading"
        class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
      >
        測試錯誤查詢
      </button>

      <button
        @click="testTimeout"
        :disabled="loading"
        class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
      >
        測試超時
      </button>

      <button
        @click="resetDb"
        :disabled="loading"
        class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
      >
        重置資料庫
      </button>

      <button
        @click="testLoadActivities"
        :disabled="loading"
        class="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
      >
        測試載入活動
      </button>
    </div>

    <!-- 測試結果 -->
    <div v-if="testResults.length > 0" class="mb-8">
      <h2 class="text-lg font-semibold mb-4">測試結果</h2>
      <div class="space-y-2 max-h-96 overflow-y-auto">
        <div
          v-for="(result, index) in testResults"
          :key="index"
          :class="['p-3 rounded', result.success ? 'bg-green-100' : 'bg-red-100']"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium">{{ result.test }}</span>
            <span class="text-sm">{{ new Date(result.timestamp).toLocaleTimeString() }}</span>
          </div>
          <p class="text-sm mt-1">{{ result.message }}</p>
          <pre v-if="result.error" class="text-xs mt-2 text-red-600">{{ result.error }}</pre>
        </div>
      </div>
    </div>

    <!-- 錯誤顯示 -->
    <div v-if="error" class="p-4 bg-red-100 text-red-700 rounded">
      <p class="font-medium">錯誤:</p>
      <p>{{ error }}</p>
    </div>

    <!-- DatabaseStatus 組件測試 -->
    <DatabaseStatus :check-interval="30000" :auto-hide="true" :auto-hide-delay="5000" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useActivitiesClient } from '~/composables/useActivitiesClient';
import { useSqlite } from '~/composables/useSqlite';
import type { DatabaseHealthCheck } from '~/utils/database-health';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  error?: string;
  timestamp: Date;
}

const { checkHealth, query, resetDatabase } = useSqlite();
const { loadActivities, checkDatabaseHealth } = useActivitiesClient();

const loading = ref(false);
const error = ref<string | null>(null);
const healthStatus = ref<DatabaseHealthCheck | null>(null);
const testResults = ref<TestResult[]>([]);

const addTestResult = (result: TestResult) => {
  testResults.value.unshift(result);
  if (testResults.value.length > 20) {
    testResults.value.pop();
  }
};

const performHealthCheck = async () => {
  loading.value = true;
  error.value = null;

  try {
    const status = await checkHealth();
    healthStatus.value = status;

    addTestResult({
      test: '健康檢查',
      success: status.status === 'healthy',
      message: status.message,
      timestamp: new Date(),
    });
  } catch (err) {
    error.value = (err as Error).message;
    addTestResult({
      test: '健康檢查',
      success: false,
      message: '健康檢查失敗',
      error: (err as Error).message,
      timestamp: new Date(),
    });
  } finally {
    loading.value = false;
  }
};

const testNormalQuery = async () => {
  loading.value = true;
  error.value = null;

  try {
    const results = await query('SELECT COUNT(*) as count FROM activities');

    addTestResult({
      test: '正常查詢',
      success: true,
      message: `查詢成功，活動數量: ${results[0]?.count || 0}`,
      timestamp: new Date(),
    });
  } catch (err) {
    error.value = (err as Error).message;
    addTestResult({
      test: '正常查詢',
      success: false,
      message: '查詢失敗',
      error: (err as Error).message,
      timestamp: new Date(),
    });
  } finally {
    loading.value = false;
  }
};

const testBadQuery = async () => {
  loading.value = true;
  error.value = null;

  try {
    await query('SELECT * FROM non_existent_table');

    addTestResult({
      test: '錯誤查詢',
      success: false,
      message: '預期應該失敗但卻成功了',
      timestamp: new Date(),
    });
  } catch (err) {
    // 這是預期的錯誤
    addTestResult({
      test: '錯誤查詢',
      success: true,
      message: '正確捕獲到錯誤',
      error: (err as Error).message,
      timestamp: new Date(),
    });
  } finally {
    loading.value = false;
  }
};

const testTimeout = async () => {
  loading.value = true;
  error.value = null;

  try {
    // 創建一個大型查詢來測試超時
    const bigQuery = `
      WITH RECURSIVE cnt(x) AS (
        SELECT 1
        UNION ALL
        SELECT x+1 FROM cnt
        WHERE x<1000000
      )
      SELECT COUNT(*) FROM cnt
    `;

    await query(bigQuery);

    addTestResult({
      test: '超時測試',
      success: false,
      message: '查詢應該超時但完成了',
      timestamp: new Date(),
    });
  } catch (err) {
    addTestResult({
      test: '超時測試',
      success: true,
      message: '正確處理超時',
      error: (err as Error).message,
      timestamp: new Date(),
    });
  } finally {
    loading.value = false;
  }
};

const resetDb = async () => {
  loading.value = true;
  error.value = null;

  try {
    await resetDatabase();

    addTestResult({
      test: '重置資料庫',
      success: true,
      message: '資料庫重置成功',
      timestamp: new Date(),
    });

    // 重新檢查健康狀態
    await performHealthCheck();
  } catch (err) {
    error.value = (err as Error).message;
    addTestResult({
      test: '重置資料庫',
      success: false,
      message: '重置失敗',
      error: (err as Error).message,
      timestamp: new Date(),
    });
  } finally {
    loading.value = false;
  }
};

const testLoadActivities = async () => {
  loading.value = true;
  error.value = null;

  try {
    await loadActivities(1, true);

    addTestResult({
      test: '載入活動',
      success: true,
      message: '活動載入成功',
      timestamp: new Date(),
    });
  } catch (err) {
    error.value = (err as Error).message;
    addTestResult({
      test: '載入活動',
      success: false,
      message: '載入失敗',
      error: (err as Error).message,
      timestamp: new Date(),
    });
  } finally {
    loading.value = false;
  }
};

// 初始健康檢查
performHealthCheck();
</script>
