<template>
  <ElCard class="activity-card-skeleton">
    <template #header>
      <div class="card-header">
        <ElSkeleton style="width: 60%" animated />
        <ElSkeleton style="width: 30%; height: 24px" animated />
      </div>
    </template>
    
    <div class="card-body">
      <!-- 圖片骨架 -->
      <div class="image-skeleton">
        <ElSkeleton style="width: 100%; height: 120px" animated />
      </div>
      
      <!-- 內容骨架 -->
      <div class="content-skeleton">
        <ElSkeleton :rows="2" animated />
        
        <!-- 標籤骨架 -->
        <div class="tags-skeleton">
          <ElSkeleton style="width: 60px; height: 20px; border-radius: 10px" animated />
          <ElSkeleton style="width: 80px; height: 20px; border-radius: 10px" animated />
        </div>
        
        <!-- 位置和時間骨架 -->
        <div class="meta-skeleton">
          <ElSkeleton style="width: 40%" animated />
          <ElSkeleton style="width: 35%" animated />
        </div>
      </div>
    </div>
  </ElCard>
</template>

<script setup lang="ts">
// 無需 props，純骨架組件
</script>

<style scoped>
.activity-card-skeleton {
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-body {
  display: flex;
  gap: 16px;
}

.image-skeleton {
  flex-shrink: 0;
  width: 120px;
}

.content-skeleton {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tags-skeleton {
  display: flex;
  gap: 8px;
}

.meta-skeleton {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .card-body {
    flex-direction: column;
  }
  
  .image-skeleton {
    width: 100%;
  }
  
  .meta-skeleton {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>