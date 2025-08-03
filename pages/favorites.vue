<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 頁面標題 -->
    <ElPageHeader @back="() => $router.push('/')" class="bg-white shadow-sm">
      <template #title>
        <div class="flex items-center gap-3">
          <ElIcon><StarFilled /></ElIcon>
          <h1 class="text-xl font-semibold text-gray-800">我的收藏</h1>
        </div>
      </template>
      <template #extra>
        <ElSpace>
          <ElButton v-if="favorites.length > 0" @click="showClearDialog = true" type="danger" plain>
            清空收藏
          </ElButton>
          <ElButton @click="exportFavorites" :disabled="favorites.length === 0">
            匯出收藏
          </ElButton>
        </ElSpace>
      </template>
    </ElPageHeader>

    <!-- 主要內容 -->
    <ElContainer class="max-w-6xl mx-auto p-6">
      <!-- 載入中 -->
      <div v-if="loading" class="space-y-4">
        <ElCard v-for="i in 6" :key="i">
          <ElSkeleton :rows="3" animated />
        </ElCard>
      </div>

      <!-- 空狀態 -->
      <div v-else-if="favorites.length === 0" class="text-center py-16">
        <ElEmpty description="還沒有收藏任何活動" :image-size="200">
          <template #description>
            <p class="text-gray-500 mb-4">探索更多精彩活動，將喜歡的活動加入收藏吧！</p>
          </template>
          <ElButton type="primary" @click="$router.push('/')"> 探索活動 </ElButton>
        </ElEmpty>
      </div>

      <!-- 收藏列表 -->
      <div v-else>
        <!-- 統計資訊 -->
        <ElCard class="mb-6">
          <ElRow :gutter="24">
            <ElCol :span="8">
              <ElStatistic title="收藏總數" :value="favorites.length" suffix="個活動" />
            </ElCol>
            <ElCol :span="8">
              <div>
                <p class="text-sm text-gray-500 mb-1">最近收藏</p>
                <p class="text-lg font-bold">{{ recentFavoriteDate }}</p>
              </div>
            </ElCol>
            <ElCol :span="8">
              <div>
                <p class="text-sm text-gray-500 mb-1">最愛分類</p>
                <p class="text-lg font-bold">{{ topCategory || '無' }}</p>
              </div>
            </ElCol>
          </ElRow>
        </ElCard>

        <!-- 篩選和排序 -->
        <ElCard class="mb-6">
          <ElRow :gutter="16" align="middle">
            <ElCol :span="6">
              <ElSelect
                v-model="filterCategory"
                placeholder="篩選分類"
                clearable
                @change="applyFilters"
              >
                <ElOption
                  v-for="category in availableCategories"
                  :key="category"
                  :label="category"
                  :value="category"
                />
              </ElSelect>
            </ElCol>
            <ElCol :span="6">
              <ElSelect
                v-model="filterRegion"
                placeholder="篩選地區"
                clearable
                @change="applyFilters"
              >
                <ElOption
                  v-for="region in availableRegions"
                  :key="region"
                  :label="region"
                  :value="region"
                />
              </ElSelect>
            </ElCol>
            <ElCol :span="6">
              <ElSelect v-model="sortBy" placeholder="排序方式" @change="applySorting">
                <ElOption label="收藏時間 (新到舊)" value="favorited_desc" />
                <ElOption label="收藏時間 (舊到新)" value="favorited_asc" />
                <ElOption label="活動時間" value="activity_date" />
                <ElOption label="活動名稱" value="name" />
                <ElOption label="品質分數" value="quality" />
              </ElSelect>
            </ElCol>
          </ElRow>
        </ElCard>

        <!-- 精簡收藏列表 -->
        <div class="space-y-2">
          <div
            v-for="favorite in filteredFavorites"
            :key="favorite.id"
            class="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
            @click="goToActivity(favorite)"
          >
            <!-- 活動資訊 -->
            <div class="flex-1">
              <h3 class="font-semibold text-lg text-gray-900 mb-1">
                {{ favorite.activity.name }}
              </h3>
              <div class="flex items-center text-sm text-gray-500 space-x-4">
                <span v-if="favorite.activity.location">
                  <ElIcon class="mr-1"><LocationFilled /></ElIcon>
                  {{ favorite.activity.location.city }}
                </span>
                <span v-if="favorite.activity.time">
                  <ElIcon class="mr-1"><Calendar /></ElIcon>
                  {{ formatDate(favorite.activity.time.startDate) }}
                </span>
                <span class="text-xs"> 收藏於 {{ formatDate(favorite.createdAt) }} </span>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <ElButton
              type="danger"
              size="small"
              plain
              @click.stop="removeFavorite(favorite.activityId)"
            >
              移除
            </ElButton>
          </div>
        </div>
      </div>
    </ElContainer>

    <!-- 清空收藏確認對話框 -->
    <ElDialog v-model="showClearDialog" title="確認清空收藏" width="400px" align-center>
      <p>確定要清空所有收藏的活動嗎？此操作無法復原。</p>
      <template #footer>
        <ElButton @click="showClearDialog = false">取消</ElButton>
        <ElButton type="danger" @click="clearAllFavorites">確認清空</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { StarFilled, LocationFilled, Calendar, Delete } from '@element-plus/icons-vue';
import type { Activity, FavoriteActivity } from '~/types';

// 頁面元資料
useHead({
  title: '我的收藏 - 台灣觀光活動地圖',
  meta: [{ name: 'description', content: '查看您收藏的所有精彩觀光活動' }],
});

// 響應式狀態
const loading = ref(false);
const showClearDialog = ref(false);
const filterCategory = ref('');
const filterRegion = ref('');
const sortBy = ref('favorited_desc');

// 使用收藏功能
const {
  favorites,
  loading: favoritesLoading,
  removeFavorite: removeFav,
  clearFavorites,
  refreshFavorites,
} = useFavorites();

// 計算屬性
const availableCategories = computed(() => {
  const categories = new Set<string>();
  favorites.value.forEach((fav) => {
    fav.activity.categories?.forEach((cat) => categories.add(cat.name));
  });
  return Array.from(categories).sort();
});

const availableRegions = computed(() => {
  const regions = new Set<string>();
  favorites.value.forEach((fav) => {
    if (fav.activity.location?.region) {
      regions.add(fav.activity.location.region);
    }
  });
  return Array.from(regions).sort();
});

const recentFavoriteDate = computed(() => {
  if (favorites.value.length === 0) return '';
  const recent = favorites.value.reduce((latest, fav) =>
    new Date(fav.createdAt) > new Date(latest.createdAt) ? fav : latest
  );
  return formatDate(recent.createdAt);
});

const topCategory = computed(() => {
  const categoryCount = new Map<string, number>();
  favorites.value.forEach((fav) => {
    fav.activity.categories?.forEach((cat) => {
      categoryCount.set(cat.name, (categoryCount.get(cat.name) || 0) + 1);
    });
  });

  let topCat = '';
  let maxCount = 0;
  for (const [cat, count] of categoryCount) {
    if (count > maxCount) {
      maxCount = count;
      topCat = cat;
    }
  }
  return topCat || '無';
});

const filteredFavorites = computed(() => {
  let filtered = [...favorites.value];

  // 分類篩選
  if (filterCategory.value) {
    filtered = filtered.filter((fav) =>
      fav.activity.categories?.some((cat) => cat.name === filterCategory.value)
    );
  }

  // 地區篩選
  if (filterRegion.value) {
    filtered = filtered.filter((fav) => fav.activity.location?.region === filterRegion.value);
  }

  // 排序
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'favorited_desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'favorited_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'activity_date':
        const aDate = a.activity.time?.startDate || '';
        const bDate = b.activity.time?.startDate || '';
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      case 'name':
        return a.activity.name.localeCompare(b.activity.name, 'zh-TW');
      case 'quality':
        return (b.activity.qualityScore || 0) - (a.activity.qualityScore || 0);
      default:
        return 0;
    }
  });

  return filtered;
});

// 頁面載入時載入收藏
onMounted(() => {
  refreshFavorites();
});

// 格式化函數
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// 事件處理
const applyFilters = () => {
  // 篩選已在計算屬性中處理
};

const applySorting = () => {
  // 排序已在計算屬性中處理
};

const goToActivity = (row: any) => {
  navigateTo(`/activity/${row.activity.id}`);
};

const removeFavorite = async (favoriteId: string) => {
  try {
    await removeFav(favoriteId);
    ElMessage.success('已移除收藏');
  } catch (error) {
    ElMessage.error('移除收藏失敗');
  }
};

const clearAllFavorites = async () => {
  try {
    await clearFavorites();
    showClearDialog.value = false;
    ElMessage.success('已清空所有收藏');
  } catch (error) {
    ElMessage.error('清空收藏失敗');
  }
};

const exportFavorites = () => {
  const data = favorites.value.map((fav) => ({
    活動名稱: fav.activity.name,
    活動摘要: fav.activity.summary,
    地址: fav.activity.location?.address,
    城市: fav.activity.location?.city,
    地區: fav.activity.location?.region,
    活動時間: fav.activity.time?.startDate,
    分類: fav.activity.categories?.map((c) => c.name).join(', '),
    收藏時間: formatDate(fav.createdAt),
  }));

  const csv =
    data.length > 0
      ? [Object.keys(data[0]!).join(','), ...data.map((row) => Object.values(row!).join(','))].join(
          '\n'
        )
      : '';

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `收藏活動_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// 響應式監聽
watch(loading, (newVal) => {
  loading.value = newVal || favoritesLoading.value;
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 768px) {
  .transition-transform {
    transform: none !important;
  }

  .hover\:scale-105:hover {
    transform: none !important;
  }
}
</style>
