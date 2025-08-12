<template>
  <div class="favorites-container">
    <!-- 排序和分組選項 -->
    <div v-if="favorites.length > 0" class="controls-section">
      <div class="flex gap-3 mb-4">
        <!-- 分組方式 -->
        <ElSelect v-model="groupBy" placeholder="分組方式" size="small" style="width: 120px">
          <ElOption label="不分組" value="none" />
          <ElOption label="按區域" value="region" />
          <ElOption label="按分類" value="category" />
          <ElOption label="按月份" value="month" />
        </ElSelect>

        <!-- 排序方式 -->
        <ElSelect v-model="sortBy" placeholder="排序方式" size="small" style="width: 140px">
          <ElOption label="最近加入" value="recent" />
          <ElOption label="活動名稱" value="name" />
          <ElOption label="活動日期" value="date" />
          <ElOption label="地區排序" value="location" />
        </ElSelect>

        <!-- 統計資訊 -->
        <div class="flex-1 text-right text-sm text-gray-500">共 {{ favorites.length }} 個收藏</div>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="space-y-3">
      <ElCard v-for="i in 3" :key="i">
        <ElSkeleton :rows="2" animated />
      </ElCard>
    </div>

    <!-- 空狀態 -->
    <div v-else-if="favorites.length === 0" class="text-center py-8">
      <ElEmpty description="還沒有收藏任何活動" :image-size="100">
        <template #description>
          <p class="text-gray-500 text-sm">探索活動並加入收藏吧！</p>
        </template>
      </ElEmpty>
    </div>

    <!-- 分組顯示收藏 -->
    <div v-else-if="groupedFavorites && groupBy !== 'none'" class="grouped-favorites">
      <div v-for="group in groupedFavorites" :key="group.key" class="group-section">
        <!-- 組別標題 -->
        <div class="group-header">
          <div class="flex items-center gap-2">
            <component :is="group.icon" v-if="group.icon" class="text-lg" />
            <span class="group-title">{{ group.name }}</span>
            <ElBadge :value="group.items.length" class="ml-2" />
          </div>
        </div>

        <!-- 組內活動 -->
        <div class="group-items">
          <ElCard
            v-for="favorite in group.items"
            :key="favorite.id"
            shadow="hover"
            class="favorite-card"
            @click="handleActivityClick(favorite.activity)"
          >
            <div class="flex gap-3">
              <!-- 活動資訊 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h4 class="font-medium text-sm line-clamp-1">
                      {{ favorite.activity.name }}
                    </h4>
                    <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span v-if="favorite.activity.location" class="flex items-center gap-1">
                        <ElIcon><LocationFilled /></ElIcon>
                        {{ favorite.activity.location.city || favorite.activity.location.district }}
                      </span>
                      <span v-if="favorite.activity.time" class="flex items-center gap-1">
                        <ElIcon><Calendar /></ElIcon>
                        {{ formatDate(favorite.activity.time.startDate) }}
                      </span>
                    </div>
                  </div>
                  <ElButton
                    type="danger"
                    size="small"
                    circle
                    text
                    @click.stop="removeFavorite(favorite.id)"
                  >
                    <ElIcon><Delete /></ElIcon>
                  </ElButton>
                </div>
              </div>
            </div>
          </ElCard>
        </div>
      </div>
    </div>

    <!-- 無分組列表 -->
    <div v-else class="ungrouped-favorites">
      <ElCard
        v-for="favorite in sortedFavorites"
        :key="favorite.id"
        shadow="hover"
        class="favorite-card mb-3"
        @click="handleActivityClick(favorite.activity)"
      >
        <div class="flex gap-3">
          <!-- 活動資訊 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-medium text-base mb-1">
                  {{ favorite.activity.name }}
                </h3>
                <p v-if="favorite.activity.summary" class="text-sm text-gray-600 line-clamp-2 mb-2">
                  {{ favorite.activity.summary }}
                </p>
                <div class="flex items-center gap-4 text-sm text-gray-500">
                  <span v-if="favorite.activity.location" class="flex items-center gap-1">
                    <ElIcon><LocationFilled /></ElIcon>
                    {{ getLocationDisplay(favorite.activity.location) }}
                  </span>
                  <span v-if="favorite.activity.time" class="flex items-center gap-1">
                    <ElIcon><Calendar /></ElIcon>
                    {{ formatDate(favorite.activity.time.startDate) }}
                  </span>
                  <span v-if="favorite.activity.categories?.[0]" class="flex items-center gap-1">
                    <ElIcon><PriceTag /></ElIcon>
                    {{ favorite.activity.categories[0].name }}
                  </span>
                </div>
              </div>
              <ElButton
                type="danger"
                size="small"
                circle
                plain
                @click.stop="removeFavorite(favorite.id)"
              >
                <ElIcon><Delete /></ElIcon>
              </ElButton>
            </div>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  LocationFilled,
  Calendar,
  Delete,
  PriceTag,
  Location,
  MapLocation,
  Timer,
} from '@element-plus/icons-vue';
import type { Activity } from '~/types';

// Emits
const emit = defineEmits<{
  'activity-click': [activity: any];
}>();

// 路由
const router = useRouter();

// 使用收藏功能
const { favorites, loading, removeFavorite: removeFav, loadFavorites } = useFavorites();

// 響應式狀態
const groupBy = ref('region'); // 預設按區域分組
const sortBy = ref('recent');

// 頁面載入時載入收藏
onMounted(async () => {
  console.log('FavoritesList mounted, 載入收藏...');
  await loadFavorites();
  console.log('載入完成，收藏數量:', favorites.value.length);
  console.log('收藏內容:', favorites.value);
});

// 區域對應
const regionMap: Record<string, { name: string; icon: any; order: number }> = {
  北部: { name: '北部地區', icon: 'Location', order: 1 },
  中部: { name: '中部地區', icon: 'MapLocation', order: 2 },
  南部: { name: '南部地區', icon: 'MapLocation', order: 3 },
  東部: { name: '東部地區', icon: 'MapLocation', order: 4 },
  離島: { name: '離島地區', icon: 'MapLocation', order: 5 },
  其他: { name: '其他地區', icon: 'Location', order: 6 },
};

// 取得區域分組
const getRegionGroup = (location: any) => {
  if (!location) return '其他';

  const region = location.region;
  const city = location.city;

  // 北部
  if (['台北', '臺北', '新北', '基隆', '桃園', '新竹', '宜蘭'].some((c) => city?.includes(c))) {
    return '北部';
  }
  // 中部
  if (['台中', '臺中', '彰化', '南投', '苗栗', '雲林'].some((c) => city?.includes(c))) {
    return '中部';
  }
  // 南部
  if (['台南', '臺南', '高雄', '屏東', '嘉義'].some((c) => city?.includes(c))) {
    return '南部';
  }
  // 東部
  if (['花蓮', '台東', '臺東'].some((c) => city?.includes(c))) {
    return '東部';
  }
  // 離島
  if (['澎湖', '金門', '馬祖', '綠島', '蘭嶼'].some((c) => city?.includes(c))) {
    return '離島';
  }

  return region || '其他';
};

// 排序後的收藏
const sortedFavorites = computed(() => {
  const sorted = [...favorites.value];

  switch (sortBy.value) {
    case 'name':
      return sorted.sort((a, b) => a.activity.name.localeCompare(b.activity.name, 'zh-TW'));
    case 'date':
      return sorted.sort((a, b) => {
        const dateA = a.activity.time?.startDate || '9999-12-31';
        const dateB = b.activity.time?.startDate || '9999-12-31';
        return dateA.localeCompare(dateB);
      });
    case 'location':
      return sorted.sort((a, b) => {
        const locA = a.activity.location?.city || '';
        const locB = b.activity.location?.city || '';
        return locA.localeCompare(locB, 'zh-TW');
      });
    case 'recent':
    default:
      return sorted.reverse(); // 最新的在前
  }
});

// 分組後的收藏
const groupedFavorites = computed(() => {
  if (groupBy.value === 'none') return null;

  const groups = new Map<string, any>();

  sortedFavorites.value.forEach((favorite) => {
    let groupKey = '';

    switch (groupBy.value) {
      case 'region':
        groupKey = getRegionGroup(favorite.activity.location);
        break;
      case 'category':
        groupKey = favorite.activity.categories?.[0]?.name || '未分類';
        break;
      case 'month':
        if (favorite.activity.time?.startDate) {
          const date = new Date(favorite.activity.time.startDate);
          groupKey = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        } else {
          groupKey = '無日期';
        }
        break;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        name: groupBy.value === 'region' ? regionMap[groupKey]?.name || groupKey : groupKey,
        icon: groupBy.value === 'region' ? regionMap[groupKey]?.icon : null,
        order: groupBy.value === 'region' ? regionMap[groupKey]?.order || 999 : 0,
        items: [],
      });
    }

    groups.get(groupKey)!.items.push(favorite);
  });

  // 轉換為陣列並排序
  return Array.from(groups.values()).sort((a, b) => {
    if (groupBy.value === 'region') {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name, 'zh-TW');
  });
});

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
  });
};

// 取得位置顯示文字
const getLocationDisplay = (location: any) => {
  if (!location) return '';
  return location.city || location.district || location.address || '';
};

// 處理活動點擊
const handleActivityClick = (activity: any) => {
  emit('activity-click', activity);
};

// 移除收藏
const removeFavorite = async (favoriteId: string) => {
  console.log('Removing favorite with ID:', favoriteId);

  // 從 favorites 列表中找出對應的活動 ID
  const favorite = favorites.value.find((fav) => fav.id === favoriteId);
  if (!favorite) {
    console.error('Favorite not found:', favoriteId);
    return;
  }

  const activityId = favorite.activityId;
  console.log('Found activity ID:', activityId);

  try {
    await removeFav(activityId);
  } catch (error) {
    ElMessage.error('移除收藏失敗');
    console.error('移除收藏失敗:', error);
  }
};
</script>

<style scoped>
.favorites-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.controls-section {
  flex-shrink: 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.grouped-favorites {
  flex: 1;
  overflow-y: auto;
}

.group-section {
  margin-bottom: 1.5rem;
}

.group-header {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-title {
  font-weight: 600;
  color: #374151;
}

.group-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ungrouped-favorites {
  flex: 1;
  overflow-y: auto;
}

.favorite-card {
  cursor: pointer;
  transition: all 0.3s;
}

.favorite-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 滾動條樣式 */
.grouped-favorites::-webkit-scrollbar,
.ungrouped-favorites::-webkit-scrollbar {
  width: 6px;
}

.grouped-favorites::-webkit-scrollbar-track,
.ungrouped-favorites::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.grouped-favorites::-webkit-scrollbar-thumb,
.ungrouped-favorites::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.grouped-favorites::-webkit-scrollbar-thumb:hover,
.ungrouped-favorites::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
