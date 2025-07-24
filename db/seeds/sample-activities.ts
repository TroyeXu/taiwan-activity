import { nanoid } from 'nanoid';
import type { NewActivity, NewLocation, NewActivityTime, NewDataSource, NewActivityCategory } from '../schema';

// 範例活動資料
export const sampleActivities = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);

  const activities: NewActivity[] = [
    {
      id: nanoid(),
      name: '2025 台北燈節',
      description: '台北燈節是台北市年度盛大活動，結合傳統燈藝與現代科技，打造璀璨燈海，展現台北獨特魅力。',
      summary: '台北年度燈節盛會，璀璨燈海迎新年',
      status: 'active',
      qualityScore: 95,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '阿里山櫻花季',
      description: '阿里山國家森林遊樂區春季櫻花盛開，吉野櫻、山櫻花等多品種櫻花競相綻放，是賞櫻的絕佳去處。',
      summary: '阿里山春季櫻花盛開，賞櫻勝地',
      status: 'upcoming',
      qualityScore: 98,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '墾丁音樂季',
      description: '南台灣最大型戶外音樂節，集結國內外知名樂團，在墾丁海邊享受音樂與海風的完美結合。',
      summary: '墾丁海邊音樂盛會，國內外樂團齊聚',
      status: 'active',
      qualityScore: 92,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '台中花毯節',
      description: '新社花海與花毯節結合，打造大面積花卉地景藝術，結合在地農業與觀光特色。',
      summary: '台中新社花海地景藝術展',
      status: 'active',
      qualityScore: 89,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '平溪天燈節',
      description: '新北市平溪區傳統節慶，數千盞天燈同時升空，場面壯觀，承載著人們的祈福心願。',
      summary: '平溪傳統天燈祈福活動',
      status: 'upcoming',
      qualityScore: 96,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '台南古蹟巡禮',
      description: '走訪台南歷史古蹟，探索赤崁樓、安平古堡等文化遺址，品味古都文化底蕴。',
      summary: '台南歷史古蹟文化之旅',
      status: 'active',
      qualityScore: 87,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '花蓮太魯閣健行',
      description: '太魯閣國家公園生態健行，欣賞壯麗峽谷風光，體驗大自然的鬼斧神工。',
      summary: '太魯閣峽谷生態健行體驗',
      status: 'active',
      qualityScore: 94,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '宜蘭綠色博覽會',
      description: '以永續環保為主題的博覽會，結合農業展示、生態教育與親子活動。',
      summary: '宜蘭環保主題博覽會',
      status: 'upcoming',
      qualityScore: 85,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '高雄愛河燈會',
      description: '高雄愛河畔燈光藝術裝置，夜間燈光倒映水面，營造浪漫氛圍。',
      summary: '愛河畔浪漫燈光藝術',
      status: 'active',
      qualityScore: 88,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '澎湖花火節',
      description: '澎湖國際海上花火節，在澎湖灣施放絢爛煙火，搭配音樂演出。',
      summary: '澎湖海上花火音樂盛會',
      status: 'upcoming',
      qualityScore: 93,
      createdAt: now,
      updatedAt: now,
    }
  ];

  const locations: NewLocation[] = [
    {
      id: nanoid(),
      activityId: activities[0].id,
      address: '台北市中正區中山南路21號',
      district: '中正區',
      city: '台北市',
      region: 'north',
      latitude: 25.0330,
      longitude: 121.5654,
      venue: '中正紀念堂',
      landmarks: JSON.stringify(['自由廣場', '國家戲劇院', '國家音樂廳']),
    },
    {
      id: nanoid(),
      activityId: activities[1].id,
      address: '嘉義縣阿里山鄉中正村59號',
      district: '阿里山鄉',
      city: '嘉義縣',
      region: 'south',
      latitude: 23.5081,
      longitude: 120.8436,
      venue: '阿里山國家森林遊樂區',
      landmarks: JSON.stringify(['阿里山車站', '祝山觀日平台', '神木群']),
    },
    {
      id: nanoid(),
      activityId: activities[2].id,
      address: '屏東縣恆春鎮墾丁路596號',
      district: '恆春鎮',
      city: '屏東縣',
      region: 'south',
      latitude: 21.9509,
      longitude: 120.7963,
      venue: '墾丁大街',
      landmarks: JSON.stringify(['墾丁國家公園', '南灣', '鵝鑾鼻燈塔']),
    },
    {
      id: nanoid(),
      activityId: activities[3].id,
      address: '台中市新社區協成里協興街30號',
      district: '新社區',
      city: '台中市',
      region: 'central',
      latitude: 24.2279,
      longitude: 120.8011,
      venue: '新社花海',
      landmarks: JSON.stringify(['新社古堡', '薰衣草森林', '安妮公主花園']),
    },
    {
      id: nanoid(),
      activityId: activities[4].id,
      address: '新北市平溪區南山里南山坑2號',
      district: '平溪區',
      city: '新北市',
      region: 'north',
      latitude: 25.0265,
      longitude: 121.7424,
      venue: '平溪國中',
      landmarks: JSON.stringify(['平溪老街', '平溪車站', '十分瀑布']),
    },
    {
      id: nanoid(),
      activityId: activities[5].id,
      address: '台南市中西區民族路二段212號',
      district: '中西區',
      city: '台南市',
      region: 'south',
      latitude: 22.9977,
      longitude: 120.2023,
      venue: '赤崁樓',
      landmarks: JSON.stringify(['孔廟', '安平古堡', '神農街']),
    },
    {
      id: nanoid(),
      activityId: activities[6].id,
      address: '花蓮縣秀林鄉富世村富世291號',
      district: '秀林鄉',
      city: '花蓮縣',
      region: 'east',
      latitude: 24.1947,
      longitude: 121.6226,
      venue: '太魯閣國家公園',
      landmarks: JSON.stringify(['燕子口', '九曲洞', '長春祠']),
    },
    {
      id: nanoid(),
      activityId: activities[7].id,
      address: '宜蘭縣蘇澳鎮武荖坑路75號',
      district: '蘇澳鎮',
      city: '宜蘭縣',
      region: 'east',
      latitude: 24.5842,
      longitude: 121.8522,
      venue: '武荖坑風景區',
      landmarks: JSON.stringify(['蘇澳冷泉', '南方澳', '豆腐岬']),
    },
    {
      id: nanoid(),
      activityId: activities[8].id,
      address: '高雄市前金區河東路180號',
      district: '前金區',
      city: '高雄市',
      region: 'south',
      latitude: 22.6219,
      longitude: 120.2974,
      venue: '愛河畔',
      landmarks: JSON.stringify(['85大樓', '駁二藝術特區', '西子灣']),
    },
    {
      id: nanoid(),
      activityId: activities[9].id,
      address: '澎湖縣馬公市新生路178號',
      district: '馬公市',
      city: '澎湖縣',
      region: 'islands',
      latitude: 23.5656,
      longitude: 119.5796,
      venue: '澎湖灣',
      landmarks: JSON.stringify(['澎湖天后宮', '篤行十村', '跨海大橋']),
    }
  ];

  const activityTimes: NewActivityTime[] = [
    {
      id: nanoid(),
      activityId: activities[0].id,
      startDate: '2025-02-01',
      endDate: '2025-02-15',
      startTime: '18:00',
      endTime: '22:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    {
      id: nanoid(),
      activityId: activities[1].id,
      startDate: '2025-03-01',
      endDate: '2025-04-15',
      startTime: '06:00',
      endTime: '18:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    {
      id: nanoid(),
      activityId: activities[2].id,
      startDate: '2025-04-04',
      endDate: '2025-04-06',
      startTime: '17:00',
      endTime: '23:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    {
      id: nanoid(),
      activityId: activities[3].id,
      startDate: '2025-11-01',
      endDate: '2025-12-01',
      startTime: '08:00',
      endTime: '17:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    {
      id: nanoid(),
      activityId: activities[4].id,
      startDate: '2025-02-12',
      endDate: '2025-02-12',
      startTime: '18:00',
      endTime: '21:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    {
      id: nanoid(),
      activityId: activities[5].id,
      startDate: '2025-01-15',
      endDate: '2025-12-31',
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Taipei',
      isRecurring: true,
      recurrenceRule: JSON.stringify({
        type: 'weekly',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
      }),
    },
    {
      id: nanoid(),
      activityId: activities[6].id,
      startDate: '2025-01-15',
      endDate: '2025-12-31',
      startTime: '08:00',
      endTime: '16:00',
      timezone: 'Asia/Taipei',
      isRecurring: true,
    },
    {
      id: nanoid(),
      activityId: activities[7].id,
      startDate: '2025-03-15',
      endDate: '2025-05-15',
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    {
      id: nanoid(),
      activityId: activities[8].id,
      startDate: '2025-01-20',
      endDate: '2025-02-28',
      startTime: '19:00',
      endTime: '22:00',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    },
    {
      id: nanoid(),
      activityId: activities[9].id,
      startDate: '2025-04-19',
      endDate: '2025-06-28',
      startTime: '20:00',
      endTime: '21:30',
      timezone: 'Asia/Taipei',
      isRecurring: false,
    }
  ];

  const dataSources: NewDataSource[] = activities.map(activity => ({
    id: nanoid(),
    activityId: activity.id,
    website: 'sample-data',
    url: `https://example.com/activity/${activity.id}`,
    crawledAt: now,
    crawlerVersion: '1.0.0',
  }));

  return {
    activities,
    locations,
    activityTimes,
    dataSources,
  };
};

// 活動分類關聯
export const getActivityCategoriesRelations = (activities: NewActivity[], categories: any[]) => {
  const relations = [];
  
  // 為每個活動分配合適的分類
  const categoryMap = {
    '2025 台北燈節': ['traditional'],
    '阿里山櫻花季': ['nature', 'romantic'],
    '墾丁音樂季': ['art_culture'],
    '台中花毯節': ['nature', 'romantic'],
    '平溪天燈節': ['traditional'],
    '台南古蹟巡禮': ['art_culture'],
    '花蓮太魯閣健行': ['nature', 'wellness'],
    '宜蘭綠色博覽會': ['nature'],
    '高雄愛河燈會': ['romantic', 'art_culture'],
    '澎湖花火節': ['traditional', 'romantic'],
  };

  activities.forEach(activity => {
    const categoryNames = categoryMap[activity.name] || ['nature'];
    categoryNames.forEach(categorySlug => {
      const category = categories.find(c => c.slug === categorySlug);
      if (category) {
        relations.push({
          id: nanoid(),
          activityId: activity.id,
          categoryId: category.id,
        });
      }
    });
  });

  return relations;
};