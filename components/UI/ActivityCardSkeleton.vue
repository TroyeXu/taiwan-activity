<template>
  <div class="activity-card-skeleton" :class="{ 'compact': compact }">
    <!-- 圖片骨架 -->
    <div v-if="!compact" class="skeleton-image"></div>

    <!-- 內容骨架 -->
    <div class="skeleton-content" :class="{ 'p-4': !compact, 'p-3': compact }">
      <!-- 標題骨架 -->
      <div class="skeleton-title mb-2"></div>
      
      <!-- 摘要骨架 (非緊湊模式) -->
      <div v-if="!compact" class="space-y-1 mb-3">
        <div class="skeleton-text w-full"></div>
        <div class="skeleton-text w-3/4"></div>
      </div>

      <!-- 資訊骨架 -->
      <div class="space-y-2 mb-3">
        <!-- 時間資訊骨架 -->
        <div class="flex items-center">
          <div class="skeleton-icon mr-2"></div>
          <div class="skeleton-text w-32"></div>
        </div>
        
        <!-- 地點資訊骨架 -->
        <div class="flex items-center">
          <div class="skeleton-icon mr-2"></div>
          <div class="skeleton-text w-48"></div>
        </div>
      </div>

      <!-- 分類標籤骨架 -->
      <div class="flex gap-1 mb-3">
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
        <div v-if="!compact" class="skeleton-tag"></div>
      </div>

      <!-- 按鈕骨架 (非緊湊模式) -->
      <div v-if="!compact" class="flex items-center justify-between">
        <div class="flex space-x-2">
          <div class="skeleton-icon-btn"></div>
          <div class="skeleton-icon-btn"></div>
        </div>
        <div class="skeleton-button"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  compact?: boolean;
}

withDefaults(defineProps<Props>(), {
  compact: false
});
</script>

<style scoped>
.activity-card-skeleton {
  @apply bg-white rounded-lg shadow-card border border-gray-200 overflow-hidden animate-pulse;
}

.activity-card-skeleton.compact {
  @apply shadow-sm;
}

.skeleton-image {
  @apply aspect-video bg-gray-200 rounded-t-lg;
}

.skeleton-content {
  @apply relative;
}

.skeleton-title {
  @apply h-5 bg-gray-200 rounded w-3/4;
}

.skeleton-text {
  @apply h-3 bg-gray-200 rounded;
}

.skeleton-icon {
  @apply w-4 h-4 bg-gray-200 rounded flex-shrink-0;
}

.skeleton-tag {
  @apply h-6 bg-gray-200 rounded-full w-16;
}

.skeleton-icon-btn {
  @apply w-6 h-6 bg-gray-200 rounded-full;
}

.skeleton-button {
  @apply h-8 bg-gray-200 rounded w-20;
}

/* 動畫效果 */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.activity-card-skeleton::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer 2s infinite;
  pointer-events: none;
  z-index: 1;
}

/* 響應式調整 */
.activity-card-skeleton.compact .skeleton-title {
  @apply h-4;
}

.activity-card-skeleton.compact .skeleton-text {
  @apply h-2;
}
</style>