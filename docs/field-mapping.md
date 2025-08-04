# 前端與資料庫欄位對照表

## 資料庫架構

### activities 表
| 資料庫欄位 | 型別 | 說明 |
|----------|------|------|
| id | TEXT | 活動 ID |
| name | TEXT | 活動名稱 |
| description | TEXT | 活動描述 |
| status | TEXT | 活動狀態 |
| quality_score | REAL | 品質分數 |
| created_at | TEXT | 建立時間 |
| updated_at | TEXT | 更新時間 |

### locations 表
| 資料庫欄位 | 型別 | 說明 |
|----------|------|------|
| id | TEXT | 位置 ID |
| activity_id | TEXT | 活動 ID |
| address | TEXT | 地址 |
| city | TEXT | 城市（存中文，如「台北市」） |
| district | TEXT | 區域 |
| region | TEXT | 地區（north/central/south/east/islands） |
| latitude | REAL | 緯度 |
| longitude | REAL | 經度 |

### categories 表
| 資料庫欄位 | 型別 | 說明 |
|----------|------|------|
| id | TEXT | 分類 ID |
| name | TEXT | 分類名稱（中文） |
| slug | TEXT | 分類代碼（英文） |

### tags 表
| 資料庫欄位 | 型別 | 說明 |
|----------|------|------|
| id | TEXT | 標籤 ID |
| name | TEXT | 標籤名稱（中文） |
| slug | TEXT | 標籤代碼（英文） |
| usage_count | INTEGER | 使用次數 |

### activity_times 表
| 資料庫欄位 | 型別 | 說明 |
|----------|------|------|
| activity_id | TEXT | 活動 ID |
| start_date | TEXT | 開始日期 |
| end_date | TEXT | 結束日期 |
| start_time | TEXT | 開始時間 |
| end_time | TEXT | 結束時間 |

## 前端資料格式

### SearchFilters 介面
```typescript
interface SearchFilters {
  categories?: string[];    // 分類 slug 陣列
  regions?: string[];      // 地區代碼陣列 (north/central/south/east/islands)
  cities?: string[];       // 城市名稱陣列（中文，如「台北市」）
  tags?: string[];         // 標籤 slug 陣列
  priceRange?: {
    min?: number;
    max?: number;
    includeFreeze?: boolean;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  location?: { lat: number; lng: number };
  radius?: number;
  sorting?: 'relevance' | 'distance' | 'popularity' | 'date' | 'price';
}
```

### Activity 介面
```typescript
interface Activity {
  id: string;
  name: string;
  description?: string;
  location?: {
    address: string;
    city: string;        // 中文城市名稱
    district?: string;   // 中文區域名稱
    region: Region;      // 英文地區代碼
    latitude?: number;
    longitude?: number;
  };
  time?: {
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
  categories?: Category[];
  tags?: Tag[];
}
```

## 資料處理流程

### 1. 篩選條件傳遞
- FilterPanel 組件收集使用者選擇
- 城市選擇器使用中文名稱（如「台北市」）
- 分類使用 slug（如 "music", "exhibition"）
- 標籤使用 slug（如 "indoor", "outdoor"）

### 2. SQL 查詢條件
```sql
-- 城市篩選（使用中文）
WHERE l.city = '台北市'

-- 分類篩選（使用 slug）
WHERE c.slug = 'music'

-- 標籤篩選（使用 slug）
WHERE tag.slug IN ('indoor', 'outdoor')
```

### 3. 資料顯示
- 前端顯示時使用中文名稱
- 篩選傳遞時：
  - 城市：直接使用中文名稱
  - 分類/標籤：使用英文 slug

## 注意事項

1. **城市名稱**：資料庫儲存中文，前端篩選也使用中文
2. **分類/標籤**：資料庫同時儲存中文名稱和英文 slug，篩選使用 slug
3. **地區**：使用統一的英文代碼（north/central/south/east/islands）
4. **日期格式**：統一使用 ISO 8601 格式（YYYY-MM-DD）

## 城市列表
```javascript
const cityOptions = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣',
  '雲林縣', '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣',
  '台東縣', '澎湖縣', '金門縣', '連江縣'
];
```

## 地區對應
```javascript
const regions = {
  north: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣'],
  central: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
  south: ['嘉義縣', '嘉義市', '台南市', '高雄市', '屏東縣'],
  east: ['宜蘭縣', '花蓮縣', '台東縣'],
  islands: ['澎湖縣', '金門縣', '連江縣']
};
```