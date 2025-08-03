import type { Activity, Category } from '../../app/types';
import { ActivityStatus, Region } from '../../app/types';

// Mock 分類資料
export const mockCategories: Category[] = [
  { id: '1', name: '文化藝術', slug: 'culture', colorCode: '#ff6b6b', icon: '🎨' },
  { id: '2', name: '戶外活動', slug: 'outdoor', colorCode: '#51cf66', icon: '🏃' },
  { id: '3', name: '美食體驗', slug: 'food', colorCode: '#ff922b', icon: '🍜' },
  { id: '4', name: '親子活動', slug: 'family', colorCode: '#339af0', icon: '👨‍👩‍👧‍👦' },
  { id: '5', name: '節慶活動', slug: 'festival', colorCode: '#f59f00', icon: '🎉' },
  { id: '6', name: '運動健身', slug: 'sports', colorCode: '#94d82d', icon: '⚽' },
  { id: '7', name: '教育學習', slug: 'education', colorCode: '#5c7cfa', icon: '📚' },
  { id: '8', name: '夜生活', slug: 'nightlife', colorCode: '#c92a2a', icon: '🌃' },
];

// Mock 活動資料
export const mockActivities: Activity[] = [
  {
    id: '1',
    name: '2024台北燈節',
    description: '台北燈節是台北市每年春節期間舉辦的大型燈會活動，展出各式創意花燈。',
    summary: '大型燈會活動，展出創意花燈',
    status: ActivityStatus.ACTIVE,
    qualityScore: 95,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    location: {
      id: '1',
      activityId: '1',
      address: '台北市信義區市府路1號',
      city: '台北市',
      region: Region.NORTH,
      latitude: 25.0375,
      longitude: 121.5637,
      venue: '台北市政府廣場',
      landmarks: ['台北101', '信義商圈'],
    },
    time: {
      id: '1',
      activityId: '1',
      startDate: '2024-02-10',
      endDate: '2024-02-25',
      startTime: '18:00',
      endTime: '22:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    categories: mockCategories.length >= 8 ? [mockCategories[4]!, mockCategories[0]!] : [],
  },
  {
    id: '2',
    name: '陽明山花季',
    description: '每年春天陽明山的櫻花、杜鵑花盛開，吸引大批遊客前往賞花。',
    summary: '春季賞花活動',
    status: ActivityStatus.ACTIVE,
    qualityScore: 90,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    location: {
      id: '2',
      activityId: '2',
      address: '台北市北投區竹子湖路1-20號',
      city: '台北市',
      region: Region.NORTH,
      latitude: 25.1667,
      longitude: 121.5333,
      venue: '陽明山國家公園',
      landmarks: ['竹子湖', '小油坑'],
    },
    time: {
      id: '2',
      activityId: '2',
      startDate: '2024-02-15',
      endDate: '2024-03-31',
      startTime: '08:00',
      endTime: '17:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    categories: mockCategories.length >= 8 ? [mockCategories[1]!, mockCategories[0]!] : [],
  },
  {
    id: '3',
    name: '九份老街美食之旅',
    description: '體驗九份老街的懷舊氛圍，品嚐芋圓、草仔粿等傳統美食。',
    summary: '老街美食文化體驗',
    status: ActivityStatus.ACTIVE,
    qualityScore: 88,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    location: {
      id: '3',
      activityId: '3',
      address: '新北市瑞芳區基山街',
      city: '新北市',
      region: Region.NORTH,
      latitude: 25.1095,
      longitude: 121.845,
      venue: '九份老街',
      landmarks: ['昇平戲院', '阿妹茶樓'],
    },
    categories: mockCategories.length >= 8 ? [mockCategories[2]!, mockCategories[0]!] : [],
  },
  {
    id: '4',
    name: '日月潭環湖自行車道',
    description: '騎乘自行車環繞日月潭，欣賞湖光山色美景。',
    summary: '環湖自行車運動',
    status: ActivityStatus.ACTIVE,
    qualityScore: 92,
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
    location: {
      id: '4',
      activityId: '4',
      address: '南投縣魚池鄉中山路599號',
      city: '南投縣',
      region: Region.CENTRAL,
      latitude: 23.8647,
      longitude: 120.9116,
      venue: '日月潭國家風景區',
      landmarks: ['向山遊客中心', '水社碼頭'],
    },
    categories: mockCategories.length >= 8 ? [mockCategories[1]!, mockCategories[5]!] : [],
  },
  {
    id: '5',
    name: '墾丁春吶音樂節',
    description: '台灣最大的戶外音樂節，匯集國內外知名樂團演出。',
    summary: '大型戶外音樂節',
    status: ActivityStatus.ACTIVE,
    qualityScore: 85,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    location: {
      id: '5',
      activityId: '5',
      address: '屏東縣恆春鎮墾丁路',
      city: '屏東縣',
      region: Region.SOUTH,
      latitude: 21.9483,
      longitude: 120.7797,
      venue: '墾丁大街',
      landmarks: ['墾丁國家公園', '鵝鑾鼻燈塔'],
    },
    time: {
      id: '5',
      activityId: '5',
      startDate: '2024-04-04',
      endDate: '2024-04-07',
      startTime: '14:00',
      endTime: '23:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    categories: mockCategories.length >= 8 ? [mockCategories[0]!, mockCategories[7]!] : [],
  },
  {
    id: '6',
    name: '太魯閣峽谷健行',
    description: '探索太魯閣國家公園的壯麗峽谷景觀，體驗大自然的鬼斧神工。',
    summary: '峽谷健行探險',
    status: ActivityStatus.ACTIVE,
    qualityScore: 94,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05'),
    location: {
      id: '6',
      activityId: '6',
      address: '花蓮縣秀林鄉富世291號',
      city: '花蓮縣',
      region: Region.EAST,
      latitude: 24.1939,
      longitude: 121.4906,
      venue: '太魯閣國家公園',
      landmarks: ['燕子口', '九曲洞'],
    },
    categories: mockCategories.length >= 8 ? [mockCategories[1]!, mockCategories[5]!] : [],
  },
  {
    id: '7',
    name: '台南古蹟巡禮',
    description: '參觀赤崁樓、安平古堡等歷史古蹟，體驗台南豐富的文化底蘊。',
    summary: '歷史文化古蹟導覽',
    status: ActivityStatus.ACTIVE,
    qualityScore: 89,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
    location: {
      id: '7',
      activityId: '7',
      address: '台南市中西區民族路二段212號',
      city: '台南市',
      region: Region.SOUTH,
      latitude: 22.9976,
      longitude: 120.2024,
      venue: '赤崁樓',
      landmarks: ['孔廟', '神農街'],
    },
    categories: mockCategories.length >= 8 ? [mockCategories[0]!, mockCategories[6]!] : [],
  },
  {
    id: '8',
    name: '宜蘭童玩節',
    description: '夏季親子同樂的水上活動，結合文化表演與遊樂設施。',
    summary: '夏季親子水上活動',
    status: ActivityStatus.ACTIVE,
    qualityScore: 87,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
    location: {
      id: '8',
      activityId: '8',
      address: '宜蘭縣五結鄉親河路2段2號',
      city: '宜蘭縣',
      region: Region.EAST,
      latitude: 24.6748,
      longitude: 121.8016,
      venue: '冬山河親水公園',
      landmarks: ['國立傳統藝術中心'],
    },
    time: {
      id: '8',
      activityId: '8',
      startDate: '2024-07-01',
      endDate: '2024-08-31',
      startTime: '09:00',
      endTime: '18:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    categories: mockCategories.length >= 8 ? [mockCategories[3]!, mockCategories[1]!] : [],
  },
];

// 輔助函數：根據條件篩選活動
export function filterActivities(options: {
  categories?: string[];
  regions?: string[];
  cities?: string[];
  startDate?: string;
  endDate?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}): Activity[] {
  let filtered = [...mockActivities];

  // 分類篩選
  if (options.categories && options.categories.length > 0) {
    filtered = filtered.filter((activity) =>
      activity.categories?.some((cat) => options.categories!.includes(cat.slug))
    );
  }

  // 地區篩選
  if (options.regions && options.regions.length > 0) {
    filtered = filtered.filter(
      (activity) => activity.location && options.regions!.includes(activity.location.region)
    );
  }

  // 城市篩選
  if (options.cities && options.cities.length > 0) {
    filtered = filtered.filter(
      (activity) => activity.location && options.cities!.includes(activity.location.city)
    );
  }

  // 日期篩選
  if (options.startDate || options.endDate) {
    filtered = filtered.filter((activity) => {
      if (!activity.time) return true;

      if (options.startDate && activity.time.endDate) {
        if (activity.time.endDate < options.startDate) return false;
      }

      if (options.endDate && activity.time.startDate) {
        if (activity.time.startDate > options.endDate) return false;
      }

      return true;
    });
  }

  // 距離篩選（簡單的實現）
  if (options.lat && options.lng && options.radius) {
    filtered = filtered.filter((activity) => {
      if (
        !activity.location ||
        activity.location.latitude == null ||
        activity.location.longitude == null
      ) {
        return false;
      }

      // 簡單的距離計算（不精確，僅用於演示）
      const latDiff = Math.abs(activity.location.latitude - options.lat!);
      const lngDiff = Math.abs(activity.location.longitude - options.lng!);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // 轉換為公里

      return distance <= options.radius!;
    });
  }

  return filtered;
}

// 輔助函數：取得單一活動
export function getActivityById(id: string): Activity | undefined {
  return mockActivities.find((activity) => activity.id === id);
}

// 輔助函數：搜尋活動
export function searchActivities(keyword: string): Activity[] {
  const lowerKeyword = keyword.toLowerCase();
  return mockActivities.filter(
    (activity) =>
      activity.name.toLowerCase().includes(lowerKeyword) ||
      activity.description?.toLowerCase().includes(lowerKeyword) ||
      activity.location?.city.includes(keyword) ||
      activity.location?.venue?.toLowerCase().includes(lowerKeyword)
  );
}
