<template>
  <div v-if="isDevMode" class="dev-tools-panel">
    <!-- 浮動按鈕 -->
    <div 
      class="dev-tools-toggle"
      @click="isOpen = !isOpen"
      :class="{ 'is-open': isOpen }"
    >
      <el-icon :size="20">
        <Setting />
      </el-icon>
    </div>

    <!-- 工具面板 -->
    <transition name="slide">
      <div v-if="isOpen" class="dev-tools-content">
        <div class="dev-tools-header">
          <h3>開發工具</h3>
          <el-button size="small" circle @click="isOpen = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <el-tabs v-model="activeTab" class="dev-tools-tabs">
          <!-- 資料檢查 -->
          <el-tab-pane label="資料檢查" name="data">
            <div class="tool-section">
              <h4>資料庫狀態</h4>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-label">總活動數</div>
                  <div class="stat-value">{{ stats.totalActivities }}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">城市數</div>
                  <div class="stat-value">{{ stats.totalCities }}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">分類數</div>
                  <div class="stat-value">{{ stats.totalCategories }}</div>
                </div>
                <div class="stat-item">
                  <div class="stat-label">標籤數</div>
                  <div class="stat-value">{{ stats.totalTags }}</div>
                </div>
              </div>

              <el-button @click="refreshStats" :loading="loading.stats" size="small" type="primary">
                重新整理統計
              </el-button>
            </div>

            <div class="tool-section">
              <h4>檢查特定活動</h4>
              <el-input 
                v-model="activityId" 
                placeholder="輸入活動 ID"
                size="small"
                class="mb-2"
              />
              <el-button @click="inspectActivity" :loading="loading.inspect" size="small">
                檢查活動
              </el-button>
              
              <div v-if="inspectedActivity" class="inspect-result">
                <pre>{{ JSON.stringify(inspectedActivity, null, 2) }}</pre>
              </div>
            </div>
          </el-tab-pane>

          <!-- 篩選測試 -->
          <el-tab-pane label="篩選測試" name="filter">
            <div class="tool-section">
              <h4>快速測試篩選</h4>
              
              <div class="filter-test-form">
                <el-select 
                  v-model="testFilter.city" 
                  placeholder="選擇城市"
                  clearable
                  size="small"
                  class="mb-2"
                >
                  <el-option 
                    v-for="city in cityOptions" 
                    :key="city" 
                    :label="city" 
                    :value="city" 
                  />
                </el-select>

                <el-select 
                  v-model="testFilter.category" 
                  placeholder="選擇分類"
                  clearable
                  size="small"
                  class="mb-2"
                >
                  <el-option 
                    v-for="cat in categoryOptions" 
                    :key="cat.slug" 
                    :label="cat.name" 
                    :value="cat.slug" 
                  />
                </el-select>

                <el-button 
                  @click="runFilterTest" 
                  :loading="loading.filter"
                  type="primary"
                  size="small"
                >
                  執行測試
                </el-button>
              </div>

              <div v-if="filterResult" class="filter-result">
                <div class="result-summary">
                  <span>查詢時間: {{ filterResult.time }}ms</span>
                  <span>結果數量: {{ filterResult.count }}</span>
                </div>
                <div v-if="filterResult.sample" class="result-sample">
                  <h5>第一筆結果：</h5>
                  <div>名稱: {{ filterResult.sample.name }}</div>
                  <div>城市: {{ filterResult.sample.location?.city }}</div>
                  <div>分類: {{ filterResult.sample.categories?.map(c => c.name).join(', ') }}</div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 效能監控 -->
          <el-tab-pane label="效能" name="performance">
            <div class="tool-section">
              <h4>效能指標</h4>
              
              <div class="perf-metrics">
                <div class="metric-item">
                  <span class="metric-label">資料庫載入時間:</span>
                  <span class="metric-value">{{ performance.dbLoadTime }}ms</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">平均查詢時間:</span>
                  <span class="metric-value">{{ performance.avgQueryTime }}ms</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">記憶體使用:</span>
                  <span class="metric-value">{{ performance.memoryUsage }}MB</span>
                </div>
              </div>

              <el-button @click="runPerformanceTest" :loading="loading.perf" size="small">
                執行效能測試
              </el-button>

              <div v-if="performanceResults.length > 0" class="perf-results">
                <el-table :data="performanceResults" size="small">
                  <el-table-column prop="test" label="測試項目" />
                  <el-table-column prop="time" label="執行時間">
                    <template #default="{ row }">
                      <span :class="{ 'text-danger': row.time > 100 }">
                        {{ row.time }}ms
                      </span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-tab-pane>

          <!-- 當前狀態 -->
          <el-tab-pane label="當前狀態" name="state">
            <div class="tool-section">
              <h4>當前篩選條件</h4>
              <pre class="state-display">{{ JSON.stringify(currentFilters, null, 2) }}</pre>
            </div>

            <div class="tool-section">
              <h4>當前活動列表</h4>
              <div class="current-activities">
                <div>總數: {{ currentActivities.length }}</div>
                <div v-if="currentActivities.length > 0">
                  前 5 筆:
                  <ul>
                    <li v-for="act in currentActivities.slice(0, 5)" :key="act.id">
                      {{ act.name }} ({{ act.location?.city }})
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Setting, Close } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 只在開發環境顯示
const isDevMode = process.dev;

// UI 狀態
const isOpen = ref(false);
const activeTab = ref('data');

// 載入狀態
const loading = ref({
  stats: false,
  inspect: false,
  filter: false,
  perf: false
});

// 資料統計
const stats = ref({
  totalActivities: 0,
  totalCities: 0,
  totalCategories: 0,
  totalTags: 0
});

// 測試資料
const activityId = ref('');
const inspectedActivity = ref(null);

const testFilter = ref({
  city: '',
  category: ''
});
const filterResult = ref(null);

// 效能資料
const performance = ref({
  dbLoadTime: 0,
  avgQueryTime: 0,
  memoryUsage: 0
});
const performanceResults = ref([]);

// 選項
const cityOptions = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣',
  '雲林縣', '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '台東縣', '澎湖縣', '金門縣', '連江縣'
];

const categoryOptions = [
  { name: '音樂表演', slug: 'music' },
  { name: '展覽活動', slug: 'exhibition' },
  { name: '運動健身', slug: 'sports' },
  { name: '教育講座', slug: 'education' },
  { name: '美食饗宴', slug: 'food' },
  { name: '親子活動', slug: 'family' },
  { name: '文化藝術', slug: 'culture' },
  { name: '戶外活動', slug: 'outdoor' }
];

// 當前狀態
const { filters } = useFilters();
const { activities } = useActivitiesClient();

const currentFilters = computed(() => filters.value);
const currentActivities = computed(() => activities.value);

// 重新整理統計
const refreshStats = async () => {
  loading.value.stats = true;
  try {
    const { query } = useSqlite();
    
    const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM activities) as totalActivities,
        (SELECT COUNT(DISTINCT city) FROM locations) as totalCities,
        (SELECT COUNT(*) FROM categories) as totalCategories,
        (SELECT COUNT(*) FROM tags) as totalTags
    `);
    
    if (result.length > 0) {
      stats.value = result[0];
    }
    
    ElMessage.success('統計資料已更新');
  } catch (error) {
    ElMessage.error('統計失敗: ' + error.message);
  } finally {
    loading.value.stats = false;
  }
};

// 檢查活動
const inspectActivity = async () => {
  if (!activityId.value) {
    ElMessage.warning('請輸入活動 ID');
    return;
  }
  
  loading.value.inspect = true;
  inspectedActivity.value = null;
  
  try {
    const { query } = useSqlite();
    
    const activity = await query('SELECT * FROM activities WHERE id = ?', [activityId.value]);
    if (activity.length === 0) {
      ElMessage.warning('找不到此活動');
      return;
    }
    
    const location = await query('SELECT * FROM locations WHERE activity_id = ?', [activityId.value]);
    const categories = await query(`
      SELECT c.* FROM categories c
      JOIN activity_categories ac ON c.id = ac.category_id
      WHERE ac.activity_id = ?
    `, [activityId.value]);
    
    inspectedActivity.value = {
      ...activity[0],
      location: location[0] || null,
      categories: categories
    };
    
  } catch (error) {
    ElMessage.error('檢查失敗: ' + error.message);
  } finally {
    loading.value.inspect = false;
  }
};

// 執行篩選測試
const runFilterTest = async () => {
  loading.value.filter = true;
  filterResult.value = null;
  
  try {
    const startTime = performance.now();
    
    const { searchActivities, activities: testActivities } = useActivitiesClient();
    
    const filters = {};
    if (testFilter.value.city) {
      filters.cities = [testFilter.value.city];
    }
    if (testFilter.value.category) {
      filters.categories = [testFilter.value.category];
    }
    
    await searchActivities({ filters });
    
    const endTime = performance.now();
    
    filterResult.value = {
      time: Math.round(endTime - startTime),
      count: testActivities.value.length,
      sample: testActivities.value[0] || null
    };
    
  } catch (error) {
    ElMessage.error('篩選測試失敗: ' + error.message);
  } finally {
    loading.value.filter = false;
  }
};

// 執行效能測試
const runPerformanceTest = async () => {
  loading.value.perf = true;
  performanceResults.value = [];
  
  try {
    const tests = [
      { test: '簡單查詢', sql: 'SELECT * FROM activities LIMIT 10' },
      { test: '單一 JOIN', sql: 'SELECT a.*, l.city FROM activities a LEFT JOIN locations l ON a.id = l.activity_id LIMIT 10' },
      { test: '多重 JOIN', sql: `
        SELECT a.*, l.city, GROUP_CONCAT(c.name) as categories
        FROM activities a
        LEFT JOIN locations l ON a.id = l.activity_id
        LEFT JOIN activity_categories ac ON a.id = ac.activity_id
        LEFT JOIN categories c ON ac.category_id = c.id
        GROUP BY a.id
        LIMIT 10
      `}
    ];
    
    const { query } = useSqlite();
    
    for (const test of tests) {
      const startTime = performance.now();
      await query(test.sql);
      const endTime = performance.now();
      
      performanceResults.value.push({
        test: test.test,
        time: Math.round(endTime - startTime)
      });
    }
    
    // 更新記憶體使用
    if ((window.performance as any).memory) {
      performance.value.memoryUsage = Math.round(
        (window.performance as any).memory.usedJSHeapSize / 1024 / 1024
      );
    }
    
  } catch (error) {
    ElMessage.error('效能測試失敗: ' + error.message);
  } finally {
    loading.value.perf = false;
  }
};

// 初始化
onMounted(() => {
  if (isDevMode) {
    refreshStats();
  }
});
</script>

<style scoped>
.dev-tools-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.dev-tools-toggle {
  width: 50px;
  height: 50px;
  background: #409eff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
}

.dev-tools-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dev-tools-toggle.is-open {
  background: #67c23a;
}

.dev-tools-content {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 400px;
  max-height: 600px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dev-tools-header {
  padding: 15px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dev-tools-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.dev-tools-tabs {
  flex: 1;
  overflow-y: auto;
}

.dev-tools-tabs :deep(.el-tabs__content) {
  padding: 15px;
}

.tool-section {
  margin-bottom: 20px;
}

.tool-section h4 {
  font-size: 14px;
  color: #606266;
  margin-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.stat-item {
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

.inspect-result,
.filter-result {
  margin-top: 15px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.inspect-result pre {
  margin: 0;
  font-size: 12px;
  overflow-x: auto;
}

.filter-test-form .el-select {
  width: 100%;
}

.result-summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #606266;
}

.result-sample {
  font-size: 13px;
  line-height: 1.5;
}

.result-sample h5 {
  margin: 10px 0 5px;
  color: #303133;
}

.perf-metrics {
  margin-bottom: 15px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 14px;
}

.metric-label {
  color: #606266;
}

.metric-value {
  font-weight: bold;
  color: #303133;
}

.text-danger {
  color: #f56c6c;
}

.state-display {
  font-size: 12px;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.current-activities {
  font-size: 14px;
}

.current-activities ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.current-activities li {
  margin: 5px 0;
  color: #606266;
}

.mb-2 {
  margin-bottom: 8px;
}

/* 動畫 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* 響應式 */
@media (max-width: 768px) {
  .dev-tools-content {
    width: calc(100vw - 40px);
    right: 20px;
    left: 20px;
  }
}
</style>