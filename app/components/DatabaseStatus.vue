<template>
  <div v-if="showStatus" class="fixed bottom-4 right-4 z-50">
    <transition
      name="fade"
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 transform translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="healthStatus"
        :class="['px-4 py-3 rounded-lg shadow-lg', statusClasses[healthStatus.status]]"
      >
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <Icon :name="statusIcons[healthStatus.status]" class="w-5 h-5" />
          </div>
          <div>
            <p class="text-sm font-medium">{{ healthStatus.message }}</p>
            <p v-if="healthStatus.details" class="text-xs opacity-75 mt-1">
              <span v-if="healthStatus.details.queryTime">
                查詢時間: {{ healthStatus.details.queryTime }}ms
              </span>
              <span v-if="healthStatus.details.errorCount" class="ml-2">
                錯誤次數: {{ healthStatus.details.errorCount }}
              </span>
            </p>
          </div>
          <button
            v-if="healthStatus.status !== 'healthy'"
            @click="retry"
            class="ml-4 px-3 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            重試
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { DatabaseHealthCheck } from '~/utils/database-health';

const props = defineProps<{
  checkInterval?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
}>();

const { checkDatabaseHealth, resetDatabase } = useActivitiesClient();

const healthStatus = ref<DatabaseHealthCheck | null>(null);
const showStatus = ref(false);
let checkTimer: NodeJS.Timeout | null = null;
let hideTimer: NodeJS.Timeout | null = null;

const statusClasses = {
  healthy: 'bg-green-500 text-white',
  degraded: 'bg-yellow-500 text-white',
  unhealthy: 'bg-red-500 text-white',
};

const statusIcons = {
  healthy: 'heroicons:check-circle-solid',
  degraded: 'heroicons:exclamation-circle-solid',
  unhealthy: 'heroicons:x-circle-solid',
};

const checkHealth = async () => {
  const status = await checkDatabaseHealth();
  healthStatus.value = status;

  // 只在狀態不健康時顯示
  if (status.status !== 'healthy') {
    showStatus.value = true;

    // 清除舊的隱藏計時器
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
  } else if (props.autoHide && showStatus.value) {
    // 健康狀態下自動隱藏
    hideTimer = setTimeout(() => {
      showStatus.value = false;
    }, props.autoHideDelay || 3000);
  }
};

const retry = async () => {
  try {
    await resetDatabase();
    await checkHealth();
  } catch (error) {
    console.error('重試失敗:', error);
  }
};

onMounted(() => {
  // 初始檢查
  checkHealth();

  // 定期檢查
  if (props.checkInterval) {
    checkTimer = setInterval(checkHealth, props.checkInterval);
  }
});

onUnmounted(() => {
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
