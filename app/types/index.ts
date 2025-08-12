// 注意：媒體相關功能暫時移除，待資料庫支援後再加入

// 核心類型定義
export interface Activity {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  status: ActivityStatus;
  qualityScore: number;
  createdAt: Date;
  updatedAt: Date;
  location?: Location;
  time?: ActivityTime;
  categories?: Category[];
  tags?: Tag[];
  // 價格相關
  price?: number;
  priceType?: 'free' | 'paid' | 'donation';
  currency?: string;
  // 熱門度相關
  viewCount?: number;
  favoriteCount?: number;
  clickCount?: number;
  popularityScore?: number;
  // 動態計算的屬性（不存在資料庫）
  distance?: number;
  // 爬蟲相關欄位
  url?: string; // 活動官方連結
  sourceUrl?: string; // 資料來源網址
  lastCrawledAt?: Date; // 最後爬取時間
  dataHash?: string; // 資料雜湊值（防重複）
  externalId?: string; // 外部系統ID
}

export interface Location {
  id: string;
  activityId: string;
  address: string;
  district?: string | null; // 支援 null 和 undefined
  city: string;
  region: Region;
  latitude?: number | null; // 支援 null 和 undefined
  longitude?: number | null; // 支援 null 和 undefined
  venue?: string | null;
  landmarks?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  colorCode?: string;
  icon?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  category?: string;
  usageCount?: number;
}

export interface ActivityTime {
  id: string;
  activityId: string;
  startDate: string;
  endDate?: string | null; // 支援 null 和 undefined
  startTime?: string | null; // 支援 null 和 undefined
  endTime?: string | null; // 支援 null 和 undefined
  timezone: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
}

// 爬蟲相關欄位已移除，簡化資料結構

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
}

// 枚舉類型
export enum ActivityStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  DRAFT = 'draft',
}

export enum Region {
  NORTH = 'north',
  CENTRAL = 'central',
  SOUTH = 'south',
  EAST = 'east',
  ISLANDS = 'islands',
}

export enum CategorySlug {
  MUSIC = 'music',
  EXHIBITION = 'exhibition',
  SPORTS = 'sports',
  EDUCATION = 'education',
  FOOD = 'food',
  FAMILY = 'family',
  CULTURE = 'culture',
  OUTDOOR = 'outdoor',
}

// 篩選相關類型
export interface FilterState {
  categories: string[];
  regions: string[];
  cities: string[];
  tags: string[];
  priceRange: {
    min: number;
    max: number;
    includeFreeze?: boolean;
  };
  dateRange: {
    type: 'quick' | 'custom';
    quickOption?: string;
    startDate?: Date;
    endDate?: Date;
    includeOngoing: boolean;
  };
  location: {
    type: 'current' | 'custom';
    coordinates?: { lat: number; lng: number };
    address?: string;
    radius: number;
  };
  timeOfDay: string[];
  features: string[];
  accessibility: string[];
  groupSize: '' | 'small' | 'medium' | 'large' | 'xlarge';
  sorting: 'relevance' | 'distance' | 'popularity' | 'date' | 'price';
  showFavoritesOnly?: boolean;
}

// API 相關類型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
  meta?: any;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SearchParams {
  filters?: Partial<FilterState>;
  location?: { lat: number; lng: number };
  radius?: number;
  query?: string;
  page?: number;
  limit?: number;
}

// 搜尋篩選類型
export interface SearchFilters {
  categories?: string[];
  regions?: string[];
  cities?: string[];
  tags?: string[];
  priceRange?: {
    min?: number;
    max?: number;
    includeFreeze?: boolean;
  };
  startDate?: string;
  endDate?: string;
  query?: string;
  location?: { lat: number; lng: number };
  radius?: number;
  sorting?: 'relevance' | 'distance' | 'popularity' | 'date' | 'price';
  dateRange?: {
    start?: string;
    end?: string;
  };
  features?: string[];
  minQuality?: number;
}

// 收藏活動類型
export interface FavoriteActivity {
  id: string;
  userId: string | null;
  activityId: string;
  activity: Activity;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// 使用 Activities composable 選項
export interface UseActivitiesOptions {
  pageSize?: number;
}

// 地圖相關類型
export interface MapCenter {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MarkerInfo {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  category: string;
  icon?: string;
}

// 使用者相關類型
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  preferences?: UserPreferences;
  createdAt: Date;
}

export interface UserPreferences {
  preferredCategories: string[];
  preferredRegions: string[];
  defaultRadius: number;
  theme: 'light' | 'dark' | 'system';
}

export interface UserFavorite {
  userId: string;
  activityId: string;
  savedAt: Date;
}

// 組件 Props 類型
export interface ActivityCardProps {
  activity: Activity;
  showDistance?: boolean;
  compact?: boolean;
}

export interface FilterPanelProps {
  modelValue: FilterState;
  loading?: boolean;
  resultCount?: number;
}

export interface MapComponentProps {
  activities: Activity[];
  center: MapCenter;
  zoom?: number;
  markers?: MarkerInfo[];
}

// 錯誤處理類型
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  id?: string;
  isValid: boolean;
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
  issues?: ValidationIssue[];
  suggestions?:
    | Array<{
        field: string;
        suggestion: string;
        reason: string;
      }>
    | string[];
  qualityScore?: number;
  originalData?: any;
  validatedData?: any;
  activityId?: string;
  timestamp?: string;
}

// 常數
export const REGIONS = {
  [Region.NORTH]: {
    name: '北部地區',
    cities: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣'],
  },
  [Region.CENTRAL]: {
    name: '中部地區',
    cities: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
  },
  [Region.SOUTH]: {
    name: '南部地區',
    cities: ['嘉義縣', '嘉義市', '台南市', '高雄市', '屏東縣'],
  },
  [Region.EAST]: {
    name: '東部地區',
    cities: ['宜蘭縣', '花蓮縣', '台東縣'],
  },
  [Region.ISLANDS]: {
    name: '離島地區',
    cities: ['澎湖縣', '金門縣', '連江縣'],
  },
};

export const CATEGORIES = {
  [CategorySlug.MUSIC]: {
    name: '音樂表演',
    icon: '🎵',
    color: '#FF6B6B',
  },
  [CategorySlug.EXHIBITION]: {
    name: '展覽活動',
    icon: '🖼️',
    color: '#4ECDC4',
  },
  [CategorySlug.SPORTS]: {
    name: '運動健身',
    icon: '⚽',
    color: '#45B7D1',
  },
  [CategorySlug.EDUCATION]: {
    name: '教育講座',
    icon: '📚',
    color: '#F7DC6F',
  },
  [CategorySlug.FOOD]: {
    name: '美食饗宴',
    icon: '🍴',
    color: '#FFA07A',
  },
  [CategorySlug.FAMILY]: {
    name: '親子活動',
    icon: '👨‍👩‍👧‍👦',
    color: '#98D8C8',
  },
  [CategorySlug.CULTURE]: {
    name: '文化藝術',
    icon: '🎨',
    color: '#9B59B6',
  },
  [CategorySlug.OUTDOOR]: {
    name: '戶外活動',
    icon: '🌲',
    color: '#52C41A',
  },
};
