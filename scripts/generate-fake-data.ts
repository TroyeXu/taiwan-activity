import { nanoid } from 'nanoid';
import { getDatabase, closeDatabase } from '../server/utils/database';
import { 
  activities, 
  locations, 
  categories, 
  activityCategories, 
  activityTimes,
  activityTags,
  tags
} from '../db/schema';

// 台灣城市與地區資料
const taiwanCities = {
  north: [
    { city: '台北市', districts: ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'] },
    { city: '新北市', districts: ['板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '土城區', '蘆洲區', '汐止區', '樹林區', '三峽區', '鶯歌區', '淡水區'] },
    { city: '基隆市', districts: ['仁愛區', '信義區', '中正區', '中山區', '安樂區', '暖暖區', '七堵區'] },
    { city: '桃園市', districts: ['桃園區', '中壢區', '平鎮區', '楊梅區', '龜山區', '八德區', '大溪區', '龍潭區'] },
    { city: '新竹市', districts: ['東區', '北區', '香山區'] },
    { city: '新竹縣', districts: ['竹北市', '湖口鄉', '新豐鄉', '新埔鎮', '關西鎮', '芎林鄉', '寶山鄉'] }
  ],
  central: [
    { city: '苗栗縣', districts: ['苗栗市', '頭份市', '竹南鎮', '後龍鎮', '通霄鎮', '苑裡鎮', '銅鑼鄉'] },
    { city: '台中市', districts: ['中區', '東區', '西區', '南區', '北區', '西屯區', '南屯區', '北屯區', '豐原區', '大里區', '太平區', '清水區', '沙鹿區'] },
    { city: '彰化縣', districts: ['彰化市', '員林市', '鹿港鎮', '和美鎮', '溪湖鎮', '二林鎮', '田中鎮'] },
    { city: '南投縣', districts: ['南投市', '埔里鎮', '草屯鎮', '竹山鎮', '集集鎮', '名間鄉', '鹿谷鄉', '中寮鄉'] },
    { city: '雲林縣', districts: ['斗六市', '斗南鎮', '虎尾鎮', '西螺鎮', '土庫鎮', '北港鎮', '麥寮鄉'] }
  ],
  south: [
    { city: '嘉義市', districts: ['東區', '西區'] },
    { city: '嘉義縣', districts: ['太保市', '朴子市', '布袋鎮', '大林鎮', '民雄鄉', '新港鄉', '水上鄉'] },
    { city: '台南市', districts: ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區'] },
    { city: '高雄市', districts: ['新興區', '前金區', '苓雅區', '鹽埕區', '鼓山區', '旗津區', '前鎮區', '三民區', '楠梓區', '小港區', '左營區', '仁武區', '大社區'] },
    { city: '屏東縣', districts: ['屏東市', '潮州鎮', '東港鎮', '恆春鎮', '萬丹鄉', '長治鄉', '內埔鄉', '里港鄉'] }
  ],
  east: [
    { city: '宜蘭縣', districts: ['宜蘭市', '羅東鎮', '頭城鎮', '礁溪鄉', '員山鄉', '壯圍鄉', '五結鄉', '冬山鄉', '三星鄉'] },
    { city: '花蓮縣', districts: ['花蓮市', '吉安鄉', '新城鄉', '秀林鄉', '壽豐鄉', '鳳林鎮', '光復鄉', '豐濱鄉', '瑞穗鄉', '玉里鎮'] },
    { city: '台東縣', districts: ['台東市', '成功鎮', '關山鎮', '卑南鄉', '鹿野鄉', '池上鄉', '東河鄉', '長濱鄉', '太麻里鄉'] }
  ],
  islands: [
    { city: '澎湖縣', districts: ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'] },
    { city: '金門縣', districts: ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉'] },
    { city: '連江縣', districts: ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉'] }
  ]
};

// 活動名稱模板
const activityTemplates = [
  // 文化藝術
  { name: '{year}{city}國際藝術節', category: 'art_culture' },
  { name: '{district}文化祭', category: 'art_culture' },
  { name: '{venue}書法展', category: 'art_culture' },
  { name: '{city}攝影藝術節', category: 'art_culture' },
  { name: '{venue}當代藝術展', category: 'art_culture' },
  { name: '{district}在地工藝展', category: 'art_culture' },
  
  // 傳統節慶
  { name: '{city}媽祖文化節', category: 'traditional' },
  { name: '{district}元宵燈會', category: 'traditional' },
  { name: '{venue}廟會慶典', category: 'traditional' },
  { name: '{city}龍舟競賽', category: 'traditional' },
  { name: '{district}中秋晚會', category: 'traditional' },
  
  // 美食饗宴
  { name: '{city}美食節', category: 'cuisine' },
  { name: '{district}夜市美食祭', category: 'cuisine' },
  { name: '{venue}料理教室', category: 'cuisine' },
  { name: '{city}咖啡文化節', category: 'cuisine' },
  { name: '{district}小農市集', category: 'cuisine' },
  
  // 自然生態
  { name: '{city}賞鳥季', category: 'nature' },
  { name: '{district}生態導覽', category: 'nature' },
  { name: '{venue}螢火蟲季', category: 'nature' },
  { name: '{city}賞花季', category: 'nature' },
  { name: '{district}登山健行', category: 'nature' },
  
  // 養生樂活
  { name: '{city}路跑活動', category: 'wellness' },
  { name: '{district}瑜珈體驗', category: 'wellness' },
  { name: '{venue}養生講座', category: 'wellness' },
  { name: '{city}單車逍遙遊', category: 'wellness' },
  
  // 浪漫之旅
  { name: '{city}情人節活動', category: 'romantic' },
  { name: '{district}星空音樂會', category: 'romantic' },
  { name: '{venue}浪漫市集', category: 'romantic' },
  { name: '{city}花海節', category: 'romantic' },
  
  // 原民慶典
  { name: '{city}原住民文化祭', category: 'indigenous' },
  { name: '{district}豐年祭', category: 'indigenous' },
  { name: '{venue}部落體驗', category: 'indigenous' },
  
  // 客家文化
  { name: '{city}客家桐花祭', category: 'hakka' },
  { name: '{district}客家美食節', category: 'hakka' },
  { name: '{venue}客家文化體驗', category: 'hakka' }
];

// 地點名稱
const venues = [
  '文化中心', '市民廣場', '運動公園', '活動中心', '藝術館', '博物館', 
  '展覽館', '演藝廳', '圖書館', '社區中心', '體育館', '會議中心',
  '創意園區', '文創基地', '觀光工廠', '老街', '夜市', '商圈',
  '風景區', '森林遊樂區', '海濱公園', '濕地公園', '生態園區'
];

// 地標
const landmarkTemplates = [
  '火車站', '客運站', '捷運站', '市政府', '郵局', '警察局',
  '醫院', '學校', '百貨公司', '購物中心', '傳統市場', '廟宇',
  '教堂', '公園', '圖書館', '體育場'
];

// 標籤
const tagList = [
  '親子同樂', '寵物友善', '無障礙', '免費入場', '需預約',
  '戶外活動', '室內活動', '雨天備案', '停車方便', '大眾運輸',
  '美食', '購物', '拍照打卡', '文青', '網美景點',
  '在地特色', '季節限定', '夜間活動', '早鳥優惠', '團體優惠'
];

// 活動描述模板
const descriptionTemplates = [
  '歡迎來到{name}！這是一個充滿{category}氛圍的精彩活動。我們精心規劃了豐富的內容，包括{feature1}、{feature2}和{feature3}，讓您體驗最道地的台灣文化。',
  '{name}即將盛大舉行！本次活動將帶給您前所未有的{category}體驗。現場將有{feature1}、{feature2}等精彩活動，適合全家大小一同參與。',
  '誠摯邀請您參加{name}。這是{city}年度最重要的{category}盛事，結合了{feature1}與{feature2}，展現在地文化的獨特魅力。',
  '{name}融合傳統與創新，打造獨一無二的{category}饗宴。活動期間將有{feature1}、{feature2}、{feature3}等豐富內容，千萬不要錯過！'
];

const features = [
  '精彩表演', '互動體驗', '手作DIY', '美食攤位', '文創市集',
  '音樂演出', '舞蹈表演', '導覽解說', '抽獎活動', '限量紀念品',
  '拍照打卡點', '兒童遊戲區', '藝術裝置', '燈光秀', '煙火表演'
];

// 生成隨機日期
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 生成活動時間
function generateActivityTime(baseDate: Date) {
  const duration = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 7) + 1; // 70% 單日活動
  const startDate = new Date(baseDate);
  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + duration - 1);
  
  const isFullDay = Math.random() < 0.3;
  const startHour = isFullDay ? null : Math.floor(Math.random() * 12) + 8; // 8-20
  const duration_hours = isFullDay ? null : Math.floor(Math.random() * 4) + 2; // 2-6 hours
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: duration > 1 ? endDate.toISOString().split('T')[0] : null,
    startTime: startHour ? `${startHour.toString().padStart(2, '0')}:00` : null,
    endTime: startHour && duration_hours ? `${(startHour + duration_hours).toString().padStart(2, '0')}:00` : null,
    isRecurring: Math.random() < 0.1 // 10% 重複活動
  };
}

// 生成假資料
async function generateFakeData() {
  console.log('🎯 開始生成假資料...');
  
  try {
    const db = getDatabase();
    
    // 清空現有資料
    console.log('🧹 清空現有資料...');
    await db.delete(activityTags);
    await db.delete(activityCategories);
    await db.delete(activityTimes);
    await db.delete(locations);
    await db.delete(activities);
    await db.delete(tags);
    await db.delete(categories);
    
    // 插入分類
    console.log('📁 插入分類...');
    const categoryData = [
      { id: nanoid(), name: '傳統節慶', slug: 'traditional', colorCode: '#DC2626', icon: '🎊' },
      { id: nanoid(), name: '浪漫之旅', slug: 'romantic', colorCode: '#EC4899', icon: '💕' },
      { id: nanoid(), name: '藝術文化', slug: 'art_culture', colorCode: '#7C3AED', icon: '🎭' },
      { id: nanoid(), name: '養生樂活', slug: 'wellness', colorCode: '#10B981', icon: '🧘' },
      { id: nanoid(), name: '美食饗宴', slug: 'cuisine', colorCode: '#F59E0B', icon: '🍜' },
      { id: nanoid(), name: '自然生態', slug: 'nature', colorCode: '#059669', icon: '🌿' },
      { id: nanoid(), name: '原民慶典', slug: 'indigenous', colorCode: '#B91C1C', icon: '🪶' },
      { id: nanoid(), name: '客家文化', slug: 'hakka', colorCode: '#1E40AF', icon: '🏮' }
    ];
    
    await db.insert(categories).values(categoryData);
    const categoryMap = Object.fromEntries(categoryData.map(c => [c.slug, c.id]));
    
    // 插入標籤
    console.log('🏷️ 插入標籤...');
    const tagData = tagList.map(tag => ({
      id: nanoid(),
      name: tag,
      slug: tag.replace(/\s+/g, '-').toLowerCase(),
      category: null,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await db.insert(tags).values(tagData);
    
    // 生成活動
    console.log('🎪 生成活動資料...');
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 9, 0);
    
    let activityCount = 0;
    const targetCount = 200; // 生成 200 個活動
    
    for (const [region, cities] of Object.entries(taiwanCities)) {
      for (const cityData of cities) {
        const activitiesPerCity = Math.ceil(targetCount / Object.values(taiwanCities).flat().length);
        
        for (let i = 0; i < activitiesPerCity && activityCount < targetCount; i++) {
          // 隨機選擇活動模板
          const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
          const district = cityData.districts[Math.floor(Math.random() * cityData.districts.length)];
          const venue = venues[Math.floor(Math.random() * venues.length)];
          const year = new Date().getFullYear();
          
          // 生成活動名稱
          const activityName = template!.name
            .replace('{year}', year.toString())
            .replace('{city}', cityData.city)
            .replace('{district}', district!)
            .replace('{venue}', venue!);
          
          // 生成活動 ID
          const activityId = nanoid();
          
          // 生成活動基本資料
          const activityDate = randomDate(startDate, endDate);
          const activityTime = generateActivityTime(activityDate);
          
          // 生成描述
          const descTemplate = descriptionTemplates[Math.floor(Math.random() * descriptionTemplates.length)];
          const selectedFeatures = features.sort(() => 0.5 - Math.random()).slice(0, 3);
          const description = descTemplate!
            .replace(/{name}/g, activityName)
            .replace('{city}', cityData.city)
            .replace('{category}', categoryData.find(c => c.slug === template!.category)?.name || '')
            .replace('{feature1}', selectedFeatures[0]!)
            .replace('{feature2}', selectedFeatures[1]!)
            .replace('{feature3}', selectedFeatures[2]!);
          
          // 生成價格
          const isFree = Math.random() < 0.4;
          const price = isFree ? 0 : Math.floor(Math.random() * 20) * 50 + 100;
          
          // 插入活動
          await db.insert(activities).values({
            id: activityId,
            name: activityName,
            description: description,
            summary: description.substring(0, 100) + '...',
            status: Math.random() < 0.8 ? 'active' : 'upcoming',
            qualityScore: Math.floor(Math.random() * 30) + 70,
            price: price,
            priceType: isFree ? 'free' : 'paid',
            currency: 'TWD',
            viewCount: Math.floor(Math.random() * 1000),
            favoriteCount: Math.floor(Math.random() * 100),
            clickCount: Math.floor(Math.random() * 500),
            popularityScore: Math.random() * 100,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // 插入地點
          const locationId = nanoid();
          const lat = 23.5 + Math.random() * 2; // 台灣緯度範圍
          const lng = 120 + Math.random() * 2; // 台灣經度範圍
          const selectedLandmarks = landmarkTemplates
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * 3) + 1)
            .map(l => `${district}${l}`);
          
          await db.insert(locations).values({
            id: locationId,
            activityId: activityId,
            address: `${cityData.city}${district}${venue}路${Math.floor(Math.random() * 200) + 1}號`,
            district: district,
            city: cityData.city,
            region: region,
            latitude: lat,
            longitude: lng,
            venue: venue,
            landmarks: JSON.stringify(selectedLandmarks)
          });
          
          // 插入活動時間
          const timeValues: any = {
            id: nanoid(),
            activityId: activityId,
            startDate: activityTime.startDate,
            endDate: activityTime.endDate,
            startTime: activityTime.startTime,
            endTime: activityTime.endTime,
            timezone: 'Asia/Taipei',
            isRecurring: activityTime.isRecurring
          };
          
          if (activityTime.isRecurring) {
            timeValues.recurrenceRule = JSON.stringify({
              type: 'weekly',
              interval: 1,
              daysOfWeek: [Math.floor(Math.random() * 7)]
            });
          }
          
          await db.insert(activityTimes).values(timeValues);
          
          // 插入活動分類（主分類 + 可能的副分類）
          await db.insert(activityCategories).values({
            id: nanoid(),
            activityId: activityId,
            categoryId: categoryMap[template!.category]!
          });
          
          // 20% 機率有第二個分類
          if (Math.random() < 0.2) {
            const otherCategories = Object.keys(categoryMap).filter(c => c !== template!.category);
            const secondCategory = otherCategories[Math.floor(Math.random() * otherCategories.length)];
            if (secondCategory && categoryMap[secondCategory]) {
              await db.insert(activityCategories).values({
                id: nanoid(),
                activityId: activityId,
                categoryId: categoryMap[secondCategory]
              });
            }
          }
          
          // 插入標籤（隨機 2-5 個）
          const selectedTags = tagData
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * 4) + 2);
          
          for (const tag of selectedTags) {
            await db.insert(activityTags).values({
              id: nanoid(),
              activityId: activityId,
              tagId: tag.id
            });
          }
          
          activityCount++;
          
          if (activityCount % 10 === 0) {
            console.log(`📊 已生成 ${activityCount} 個活動...`);
          }
        }
      }
    }
    
    console.log(`✅ 成功生成 ${activityCount} 個活動！`);
    
    console.log('\n📊 資料統計:');
    console.log(`- 活動總數: ${activityCount}`);
    console.log(`- 分類總數: ${categoryData.length}`);
    console.log(`- 標籤總數: ${tagData.length}`);
    console.log(`- 涵蓋地區: ${Object.keys(taiwanCities).length} 個`);
    console.log(`- 涵蓋城市: ${Object.values(taiwanCities).flat().length} 個`);
    
  } catch (error) {
    console.error('❌ 生成假資料失敗:', error);
    throw error;
  } finally {
    closeDatabase();
  }
}

// 執行生成
if (import.meta.url === `file://${process.argv[1]}`) {
  generateFakeData()
    .then(() => {
      console.log('\n🎉 假資料生成完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 假資料生成失敗:', error);
      process.exit(1);
    });
}

export { generateFakeData };