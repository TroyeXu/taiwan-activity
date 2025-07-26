// 媒體相關類型
export interface ActivityImage {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ActivityMedia {
  images?: ActivityImage[];
  videos?: Array<{
    url: string;
    title?: string;
    thumbnail?: string;
  }>;
}

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
  source?: DataSource;
  validation?: ValidationInfo;
  // 價格相關
  price?: number;
  priceType?: 'free' | 'paid' | 'donation';
  currency?: string;
  // 熱門度相關
  viewCount?: number;
  favoriteCount?: number;
  clickCount?: number;
  popularityScore?: number;
  // 新增媒體相關屬性
  media?: ActivityMedia;
  images?: ActivityImage[]; // 為了向後相容
  // 新增搜尋結果相關屬性
  distance?: number;
}

export interface Location {
  id: string;
  activityId: string;
  address: string;
  district?: string; // 統一使用 undefined 而非 null
  city: string;
  region: Region;
  latitude?: number;
  longitude?: number;
  venue?: string;
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
  endDate?: string;
  startTime?: string;
  endTime?: string;
  timezone: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
}

export interface DataSource {
  id: string;
  activityId: string;
  website: string;
  url?: string;
  crawledAt: Date;
  crawlerVersion?: string;
}

export interface ValidationInfo {
  verified: boolean;
  verificationDate?: Date;
  qualityScore?: number;
  validator?: string;
  issues?: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

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
  DRAFT = 'draft'
}

export enum Region {
  NORTH = 'north',
  CENTRAL = 'central',
  SOUTH = 'south',
  EAST = 'east',
  ISLANDS = 'islands'
}

export enum CategorySlug {
  TRADITIONAL = 'traditional',
  ROMANTIC = 'romantic',
  ART_CULTURE = 'art_culture',
  WELLNESS = 'wellness',
  CUISINE = 'cuisine',
  NATURE = 'nature',
  INDIGENOUS = 'indigenous',
  HAKKA = 'hakka'
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
}

// API 相關類型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
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
  };
  startDate?: string;
  endDate?: string;
  query?: string;
  location?: { lat: number; lng: number };
  radius?: number;
  sort?: 'relevance' | 'distance' | 'popularity' | 'date' | 'price';
  sorting?: 'relevance' | 'distance' | 'popularity' | 'date' | 'price';
  dateRange?: any;
  features?: string[];
  sorting?: string;
}

// 收藏活動類型
export interface FavoriteActivity {
  id: string;
  userId: string;
  activity: Activity;
  createdAt: Date;
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

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// 常數
export const REGIONS = {
  [Region.NORTH]: {
    name: '北部地區',
    cities: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣']
  },
  [Region.CENTRAL]: {
    name: '中部地區', 
    cities: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣']
  },
  [Region.SOUTH]: {
    name: '南部地區',
    cities: ['嘉義縣', '嘉義市', '台南市', '高雄市', '屏東縣']
  },
  [Region.EAST]: {
    name: '東部地區',
    cities: ['宜蘭縣', '花蓮縣', '台東縣']
  },
  [Region.ISLANDS]: {
    name: '離島地區',
    cities: ['澎湖縣', '金門縣', '連江縣']
  }
};

export const CATEGORIES = {
  [CategorySlug.TRADITIONAL]: {
    name: '傳統節慶',
    icon: '🎊',
    color: '#DC2626'
  },
  [CategorySlug.ROMANTIC]: {
    name: '浪漫之旅', 
    icon: '💕',
    color: '#EC4899'
  },
  [CategorySlug.ART_CULTURE]: {
    name: '藝術文化',
    icon: '🎭',
    color: '#7C3AED'
  },
  [CategorySlug.WELLNESS]: {
    name: '養生樂活',
    icon: '🧘',
    color: '#10B981'
  },
  [CategorySlug.CUISINE]: {
    name: '美食饗宴',
    icon: '🍜',
    color: '#F59E0B'
  },
  [CategorySlug.NATURE]: {
    name: '自然生態',
    icon: '🌿',
    color: '#059669'
  },
  [CategorySlug.INDIGENOUS]: {
    name: '原民慶典',
    icon: '🪶',
    color: '#B91C1C'
  },
  [CategorySlug.HAKKA]: {
    name: '客家文化',
    icon: '🏮',
    color: '#1E40AF'
  }
};