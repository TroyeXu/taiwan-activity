import { nanoid } from 'nanoid';
import type {
  NewActivity,
  NewLocation,
  NewActivityTime,
  NewDataSource,
  NewActivityCategory,
} from '../schema';

// 擴展的假活動資料 - 更多台灣觀光活動
export const extendedActivities = () => {
  const now = new Date();

  const activities: NewActivity[] = [
    // 台北地區
    {
      id: nanoid(),
      name: '台北101跨年煙火',
      description:
        '台北101大樓跨年煙火秀，全球矚目的跨年盛事，結合音樂與璀璨煙火，為新年揭開序幕。',
      summary: '台北101跨年煙火秀，全球矚目',
      status: 'upcoming',
      qualityScore: 99,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '陽明山花季',
      description: '陽明山國家公園春季花季，櫻花、杜鵑花、茶花等各種花卉盛開，是台北近郊賞花首選。',
      summary: '陽明山春季賞花勝地',
      status: 'active',
      qualityScore: 92,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '士林夜市美食之旅',
      description: '台北最著名夜市，匯集台灣各地小吃美食，是體驗台灣夜市文化的最佳去處。',
      summary: '台北知名夜市美食體驗',
      status: 'active',
      qualityScore: 88,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '淡水河岸夕陽',
      description: '淡水老街漫步，欣賞淡水河夕陽美景，品嚐阿給、魚酥等在地美食。',
      summary: '淡水夕陽與老街文化',
      status: 'active',
      qualityScore: 85,
      createdAt: now,
      updatedAt: now,
    },

    // 新北地區
    {
      id: nanoid(),
      name: '九份老街懷舊之旅',
      description: '漫步九份山城老街，體驗懷舊氛圍，品嚐芋圓、草仔粿，俯瞰基隆嶼海景。',
      summary: '九份山城懷舊文化體驗',
      status: 'active',
      qualityScore: 94,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '野柳地質公園',
      description: '欣賞女王頭、燭台石等奇特海蝕地形，是地質教育與自然景觀的絕佳場所。',
      summary: '野柳奇岩地質奇觀',
      status: 'active',
      qualityScore: 90,
      createdAt: now,
      updatedAt: now,
    },

    // 桃園地區
    {
      id: nanoid(),
      name: '桃園機場捷運體驗',
      description: '搭乘機場捷運，參觀桃園國際機場，體驗台灣航空樞紐的現代化設施。',
      summary: '桃園機場現代化體驗',
      status: 'active',
      qualityScore: 78,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '大溪老街巴洛克建築',
      description: '探訪大溪老街巴洛克式建築，品嚐大溪豆干、花生糖等傳統美食。',
      summary: '大溪巴洛克建築與美食',
      status: 'active',
      qualityScore: 83,
      createdAt: now,
      updatedAt: now,
    },

    // 新竹地區
    {
      id: nanoid(),
      name: '新竹城隍廟美食',
      description: '新竹城隍廟周邊小吃，米粉、貢丸、潤餅等新竹特色美食一次品嚐。',
      summary: '新竹城隍廟傳統美食',
      status: 'active',
      qualityScore: 86,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '司馬庫斯神木群',
      description: '司馬庫斯部落神木群，體驗泰雅族文化，欣賞千年神木的壯觀。',
      summary: '司馬庫斯神木與原住民文化',
      status: 'active',
      qualityScore: 95,
      createdAt: now,
      updatedAt: now,
    },

    // 台中地區
    {
      id: nanoid(),
      name: '逢甲夜市',
      description: '台中最熱鬧的夜市，創新小吃的發源地，是年輕人的聚集地。',
      summary: '台中逢甲夜市創新美食',
      status: 'active',
      qualityScore: 89,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '高美濕地生態',
      description: '高美濕地候鳥生態觀察，夕陽美景與豐富生態的完美結合。',
      summary: '高美濕地生態與夕陽',
      status: 'active',
      qualityScore: 93,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '彩虹眷村文創',
      description: '彩虹眷村彩繪藝術，老眷村的文創新生，是台中必訪文創景點。',
      summary: '彩虹眷村文創藝術',
      status: 'active',
      qualityScore: 87,
      createdAt: now,
      updatedAt: now,
    },

    // 彰化地區
    {
      id: nanoid(),
      name: '鹿港龍山寺文化',
      description: '鹿港古鎮巡禮，參觀龍山寺、摸乳巷等歷史古蹟，體驗傳統工藝。',
      summary: '鹿港古蹟與傳統工藝',
      status: 'active',
      qualityScore: 91,
      createdAt: now,
      updatedAt: now,
    },

    // 南投地區
    {
      id: nanoid(),
      name: '日月潭環湖之旅',
      description: '日月潭環湖自行車道，搭乘遊湖船，欣賞台灣最美高山湖泊風光。',
      summary: '日月潭湖光山色之美',
      status: 'active',
      qualityScore: 96,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '清境農場綿羊秀',
      description: '清境農場高山草原，觀賞綿羊秀，體驗歐式風情的山區度假。',
      summary: '清境農場高山歐式風情',
      status: 'active',
      qualityScore: 88,
      createdAt: now,
      updatedAt: now,
    },

    // 雲林地區
    {
      id: nanoid(),
      name: '劍湖山世界樂園',
      description: '劍湖山主題樂園，刺激遊樂設施與精彩表演，適合全家同遊。',
      summary: '劍湖山主題樂園體驗',
      status: 'active',
      qualityScore: 84,
      createdAt: now,
      updatedAt: now,
    },

    // 嘉義地區
    {
      id: nanoid(),
      name: '嘉義雞肉飯文化',
      description: '嘉義火雞肉飯巡禮，品嚐正宗嘉義雞肉飯，體驗在地飲食文化。',
      summary: '嘉義火雞肉飯美食文化',
      status: 'active',
      qualityScore: 82,
      createdAt: now,
      updatedAt: now,
    },

    // 台南地區
    {
      id: nanoid(),
      name: '台南孔廟文化園區',
      description: '全台首學孔廟，感受台南深厚的文教氣息，漫步府中街品嚐古早味。',
      summary: '台南孔廟文教氣息',
      status: 'active',
      qualityScore: 89,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '安平老街尋寶',
      description: '安平老街古蹟巡禮，品嚐蝦餅、豆花等安平小吃，探訪荷蘭時期遺跡。',
      summary: '安平古蹟與傳統小吃',
      status: 'active',
      qualityScore: 86,
      createdAt: now,
      updatedAt: now,
    },

    // 高雄地區
    {
      id: nanoid(),
      name: '駁二藝術特區',
      description: '駁二藝術特區文創展覽，結合港區風情與現代藝術的創意空間。',
      summary: '駁二港區文創藝術',
      status: 'active',
      qualityScore: 90,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '旗津海產美食',
      description: '旗津半島海鮮料理，搭乘渡輪欣賞高雄港景，品嚐新鮮海產。',
      summary: '旗津海鮮與港景',
      status: 'active',
      qualityScore: 85,
      createdAt: now,
      updatedAt: now,
    },

    // 屏東地區
    {
      id: nanoid(),
      name: '小琉球海龜浮潛',
      description: '小琉球海龜生態浮潛，與海龜共游，體驗珊瑚礁生態之美。',
      summary: '小琉球海龜生態體驗',
      status: 'active',
      qualityScore: 94,
      createdAt: now,
      updatedAt: now,
    },

    // 宜蘭地區
    {
      id: nanoid(),
      name: '宜蘭傳藝中心',
      description: '國立傳統藝術中心，體驗台灣傳統工藝，欣賞民俗表演。',
      summary: '宜蘭傳統藝術文化',
      status: 'active',
      qualityScore: 87,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '礁溪溫泉鄉',
      description: '礁溪溫泉區泡湯體驗，享受溫泉養生，品嚐溫泉蔬菜料理。',
      summary: '礁溪溫泉養生體驗',
      status: 'active',
      qualityScore: 91,
      createdAt: now,
      updatedAt: now,
    },

    // 花蓮地區
    {
      id: nanoid(),
      name: '花蓮東大門夜市',
      description: '花蓮東大門夜市原住民美食，品嚐山豬肉、小米酒等特色料理。',
      summary: '花蓮夜市原住民美食',
      status: 'active',
      qualityScore: 83,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '七星潭海岸風光',
      description: '七星潭礫石海灘，聆聽海浪聲，欣賞太平洋壯闊海景。',
      summary: '七星潭太平洋海景',
      status: 'active',
      qualityScore: 92,
      createdAt: now,
      updatedAt: now,
    },

    // 台東地區
    {
      id: nanoid(),
      name: '台東熱氣球嘉年華',
      description: '鹿野高台熱氣球嘉年華，乘坐熱氣球俯瞰花東縱谷美景。',
      summary: '台東熱氣球縱谷美景',
      status: 'upcoming',
      qualityScore: 97,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: '三仙台日出',
      description: '三仙台跨海步橋，欣賞台灣本島最早日出，體驗東海岸壯麗景色。',
      summary: '三仙台東海岸日出',
      status: 'active',
      qualityScore: 95,
      createdAt: now,
      updatedAt: now,
    },

    // 金門地區
    {
      id: nanoid(),
      name: '金門戰地風情',
      description: '金門戰地遺跡參觀，坑道體驗，品嚐高粱酒、貢糖等金門特產。',
      summary: '金門戰地文化體驗',
      status: 'active',
      qualityScore: 88,
      createdAt: now,
      updatedAt: now,
    },

    // 馬祖地區
    {
      id: nanoid(),
      name: '馬祖藍眼淚',
      description: '馬祖藍眼淚生態奇觀，夜間海岸螢光生物發光現象。',
      summary: '馬祖藍眼淚生態奇觀',
      status: 'upcoming',
      qualityScore: 98,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 對應的地點資料
  const locations: NewLocation[] = [
    // 台北地區
    {
      id: nanoid(),
      activityId: activities[0]!.id,
      address: '台北市信義區信義路五段7號',
      district: '信義區',
      city: '台北市',
      region: 'north',
      latitude: 25.034,
      longitude: 121.5645,
      venue: '台北101',
      landmarks: JSON.stringify(['象山', '世貿中心', '信義商圈']),
    },
    {
      id: nanoid(),
      activityId: activities[1]!.id,
      address: '台北市北投區竹子湖路',
      district: '北投區',
      city: '台北市',
      region: 'north',
      latitude: 25.1828,
      longitude: 121.5421,
      venue: '陽明山國家公園',
      landmarks: JSON.stringify(['竹子湖', '小油坑', '擎天崗']),
    },
    {
      id: nanoid(),
      activityId: activities[2]!.id,
      address: '台北市士林區大東路',
      district: '士林區',
      city: '台北市',
      region: 'north',
      latitude: 25.0877,
      longitude: 121.524,
      venue: '士林夜市',
      landmarks: JSON.stringify(['士林官邸', '故宮博物院', '兒童新樂園']),
    },
    {
      id: nanoid(),
      activityId: activities[3]!.id,
      address: '新北市淡水區中正路',
      district: '淡水區',
      city: '新北市',
      region: 'north',
      latitude: 25.1679,
      longitude: 121.4406,
      venue: '淡水老街',
      landmarks: JSON.stringify(['紅毛城', '漁人碼頭', '真理大學']),
    },

    // 新北地區
    {
      id: nanoid(),
      activityId: activities[4]!.id,
      address: '新北市瑞芳區九份',
      district: '瑞芳區',
      city: '新北市',
      region: 'north',
      latitude: 25.1097,
      longitude: 121.8444,
      venue: '九份老街',
      landmarks: JSON.stringify(['阿妹茶樓', '升平戲院', '基山街']),
    },
    {
      id: nanoid(),
      activityId: activities[5]!.id,
      address: '新北市萬里區野柳里港東路167-1號',
      district: '萬里區',
      city: '新北市',
      region: 'north',
      latitude: 25.2094,
      longitude: 121.6896,
      venue: '野柳地質公園',
      landmarks: JSON.stringify(['女王頭', '燭台石', '仙女鞋']),
    },

    // 桃園地區
    {
      id: nanoid(),
      activityId: activities[6]!.id,
      address: '桃園市大園區航站南路9號',
      district: '大園區',
      city: '桃園市',
      region: 'north',
      latitude: 25.0777,
      longitude: 121.2328,
      venue: '桃園國際機場',
      landmarks: JSON.stringify(['第一航廈', '第二航廈', '機場捷運']),
    },
    {
      id: nanoid(),
      activityId: activities[7]!.id,
      address: '桃園市大溪區和平路',
      district: '大溪區',
      city: '桃園市',
      region: 'north',
      latitude: 24.8838,
      longitude: 121.2876,
      venue: '大溪老街',
      landmarks: JSON.stringify(['大溪橋', '李騰芳古宅', '慈湖']),
    },

    // 新竹地區
    {
      id: nanoid(),
      activityId: activities[8]!.id,
      address: '新竹市北區中山路75號',
      district: '北區',
      city: '新竹市',
      region: 'north',
      latitude: 24.8058,
      longitude: 120.9682,
      venue: '新竹城隍廟',
      landmarks: JSON.stringify(['新竹車站', '東門城', '護城河']),
    },
    {
      id: nanoid(),
      activityId: activities[9]!.id,
      address: '新竹縣尖石鄉玉峰村14鄰司馬庫斯2號',
      district: '尖石鄉',
      city: '新竹縣',
      region: 'north',
      latitude: 24.5669,
      longitude: 121.1794,
      venue: '司馬庫斯部落',
      landmarks: JSON.stringify(['神木群', '司馬庫斯教堂', '泰雅文物館']),
    },

    // 台中地區
    {
      id: nanoid(),
      activityId: activities[10]!.id,
      address: '台中市西屯區文華路',
      district: '西屯區',
      city: '台中市',
      region: 'central',
      latitude: 24.1797,
      longitude: 120.6478,
      venue: '逢甲夜市',
      landmarks: JSON.stringify(['逢甲大學', '秋紅谷', '台中歌劇院']),
    },
    {
      id: nanoid(),
      activityId: activities[11]!.id,
      address: '台中市清水區美堤街',
      district: '清水區',
      city: '台中市',
      region: 'central',
      latitude: 24.3123,
      longitude: 120.5674,
      venue: '高美濕地',
      landmarks: JSON.stringify(['高美燈塔', '風車大道', '清水休息站']),
    },
    {
      id: nanoid(),
      activityId: activities[12]!.id,
      address: '台中市南屯區春安路56巷',
      district: '南屯區',
      city: '台中市',
      region: 'central',
      latitude: 24.1417,
      longitude: 120.6166,
      venue: '彩虹眷村',
      landmarks: JSON.stringify(['嶺東科技大學', '南屯老街', '文心森林公園']),
    },

    // 彰化地區
    {
      id: nanoid(),
      activityId: activities[13]!.id,
      address: '彰化縣鹿港鎮龍山里金門街81號',
      district: '鹿港鎮',
      city: '彰化縣',
      region: 'central',
      latitude: 24.057,
      longitude: 120.4338,
      venue: '鹿港龍山寺',
      landmarks: JSON.stringify(['鹿港天后宮', '摸乳巷', '九曲巷']),
    },

    // 南投地區
    {
      id: nanoid(),
      activityId: activities[14]!.id,
      address: '南投縣魚池鄉水社村中山路',
      district: '魚池鄉',
      city: '南投縣',
      region: 'central',
      latitude: 23.8567,
      longitude: 120.9155,
      venue: '日月潭',
      landmarks: JSON.stringify(['水社碼頭', '文武廟', '伊達邵']),
    },
    {
      id: nanoid(),
      activityId: activities[15]!.id,
      address: '南投縣仁愛鄉大同村仁和路170號',
      district: '仁愛鄉',
      city: '南投縣',
      region: 'central',
      latitude: 24.0821,
      longitude: 121.1621,
      venue: '清境農場',
      landmarks: JSON.stringify(['青青草原', '小瑞士花園', '合歡山']),
    },

    // 雲林地區
    {
      id: nanoid(),
      activityId: activities[16]!.id,
      address: '雲林縣古坑鄉永光村大湖口67號',
      district: '古坑鄉',
      city: '雲林縣',
      region: 'central',
      latitude: 23.627,
      longitude: 120.5774,
      venue: '劍湖山世界',
      landmarks: JSON.stringify(['古坑咖啡', '華山休閒農業區', '樟湖']),
    },

    // 嘉義地區
    {
      id: nanoid(),
      activityId: activities[17]!.id,
      address: '嘉義市東區中山路',
      district: '東區',
      city: '嘉義市',
      region: 'south',
      latitude: 23.4791,
      longitude: 120.4473,
      venue: '嘉義車站周邊',
      landmarks: JSON.stringify(['檜意森活村', '嘉義公園', '阿里山森鐵']),
    },

    // 台南地區
    {
      id: nanoid(),
      activityId: activities[18]!.id,
      address: '台南市中西區南門路2號',
      district: '中西區',
      city: '台南市',
      region: 'south',
      latitude: 22.9879,
      longitude: 120.2066,
      venue: '台南孔廟',
      landmarks: JSON.stringify(['大成殿', '府中街', '忠義國小']),
    },
    {
      id: nanoid(),
      activityId: activities[19]!.id,
      address: '台南市安平區延平街',
      district: '安平區',
      city: '台南市',
      region: 'south',
      latitude: 23.0007,
      longitude: 120.1598,
      venue: '安平老街',
      landmarks: JSON.stringify(['安平古堡', '德記洋行', '朱玖瑩故居']),
    },

    // 高雄地區
    {
      id: nanoid(),
      activityId: activities[20]!.id,
      address: '高雄市鹽埕區大勇路1號',
      district: '鹽埕區',
      city: '高雄市',
      region: 'south',
      latitude: 22.6202,
      longitude: 120.2816,
      venue: '駁二藝術特區',
      landmarks: JSON.stringify(['高雄港', '棧貳庫', '哈瑪星']),
    },
    {
      id: nanoid(),
      activityId: activities[21]!.id,
      address: '高雄市旗津區廟前路',
      district: '旗津區',
      city: '高雄市',
      region: 'south',
      latitude: 22.6178,
      longitude: 120.2751,
      venue: '旗津半島',
      landmarks: JSON.stringify(['旗津燈塔', '星空隧道', '風車公園']),
    },

    // 屏東地區
    {
      id: nanoid(),
      activityId: activities[22]!.id,
      address: '屏東縣琉球鄉民生路',
      district: '琉球鄉',
      city: '屏東縣',
      region: 'south',
      latitude: 22.3406,
      longitude: 120.3737,
      venue: '小琉球',
      landmarks: JSON.stringify(['美人洞', '烏鬼洞', '花瓶岩']),
    },

    // 宜蘭地區
    {
      id: nanoid(),
      activityId: activities[23]!.id,
      address: '宜蘭縣五結鄉季新村五濱路二段201號',
      district: '五結鄉',
      city: '宜蘭縣',
      region: 'east',
      latitude: 24.6939,
      longitude: 121.8302,
      venue: '傳統藝術中心',
      landmarks: JSON.stringify(['冬山河', '國立傳藝中心', '利澤簡橋']),
    },
    {
      id: nanoid(),
      activityId: activities[24]!.id,
      address: '宜蘭縣礁溪鄉德陽路',
      district: '礁溪鄉',
      city: '宜蘭縣',
      region: 'east',
      latitude: 24.828,
      longitude: 121.7711,
      venue: '礁溪溫泉區',
      landmarks: JSON.stringify(['湯圍溝公園', '礁溪車站', '五峰旗瀑布']),
    },

    // 花蓮地區
    {
      id: nanoid(),
      activityId: activities[25]!.id,
      address: '花蓮市中山路50號',
      district: '花蓮市',
      city: '花蓮縣',
      region: 'east',
      latitude: 23.974,
      longitude: 121.6045,
      venue: '東大門夜市',
      landmarks: JSON.stringify(['花蓮車站', '鐵道文化園區', '松園別館']),
    },
    {
      id: nanoid(),
      activityId: activities[26]!.id,
      address: '花蓮縣新城鄉海岸路',
      district: '新城鄉',
      city: '花蓮縣',
      region: 'east',
      latitude: 24.0266,
      longitude: 121.6419,
      venue: '七星潭',
      landmarks: JSON.stringify(['四八高地', '奇萊鼻燈塔', '柴魚博物館']),
    },

    // 台東地區
    {
      id: nanoid(),
      activityId: activities[27]!.id,
      address: '台東縣鹿野鄉永安村高台路',
      district: '鹿野鄉',
      city: '台東縣',
      region: 'east',
      latitude: 22.9064,
      longitude: 121.1267,
      venue: '鹿野高台',
      landmarks: JSON.stringify(['龍田村', '鹿野車站', '花東縱谷']),
    },
    {
      id: nanoid(),
      activityId: activities[28]!.id,
      address: '台東縣成功鎮三仙台',
      district: '成功鎮',
      city: '台東縣',
      region: 'east',
      latitude: 23.1247,
      longitude: 121.41,
      venue: '三仙台',
      landmarks: JSON.stringify(['三仙台跨海步橋', '比西里岸', '成功漁港']),
    },

    // 離島地區
    {
      id: nanoid(),
      activityId: activities[29]!.id,
      address: '金門縣金城鎮',
      district: '金城鎮',
      city: '金門縣',
      region: 'islands',
      latitude: 24.4326,
      longitude: 118.3173,
      venue: '金門縣',
      landmarks: JSON.stringify(['翟山坑道', '莒光樓', '水頭聚落']),
    },
    {
      id: nanoid(),
      activityId: activities[30]!.id,
      address: '連江縣南竿鄉',
      district: '南竿鄉',
      city: '連江縣',
      region: 'islands',
      latitude: 26.1605,
      longitude: 119.9295,
      venue: '馬祖南竿',
      landmarks: JSON.stringify(['北海坑道', '馬祖酒廠', '八八坑道']),
    },
  ];

  // 對應的時間資料
  const activityTimes: NewActivityTime[] = activities.map((activity, index) => ({
    id: nanoid(),
    activityId: activity.id,
    startDate: getRandomDate(2025, 1, 12).toISOString().split('T')[0]!,
    endDate: getRandomDate(2025, 3, 8).toISOString().split('T')[0]!,
    startTime: getRandomTime(),
    endTime: getRandomEndTime(),
    timezone: 'Asia/Taipei',
    isRecurring: Math.random() > 0.7, // 30% 機率為循環活動
  }));

  // 對應的資料來源
  const dataSources: NewDataSource[] = activities.map((activity) => ({
    id: nanoid(),
    activityId: activity.id,
    website: '台灣觀光局',
    url: `https://www.taiwan.net.tw/activity/${activity.id}`,
    crawledAt: now,
    crawlerVersion: '2.0.0',
  }));

  return {
    activities,
    locations,
    activityTimes,
    dataSources,
  };
};

// 輔助函數：生成隨機日期
function getRandomDate(year: number, monthStart: number, monthEnd: number): Date {
  const month = Math.floor(Math.random() * (monthEnd - monthStart + 1)) + monthStart;
  const day = Math.floor(Math.random() * 28) + 1; // 避免月份天數問題
  return new Date(year, month - 1, day);
}

// 輔助函數：生成隨機開始時間
function getRandomTime(): string {
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// 輔助函數：生成隨機結束時間
function getRandomEndTime(): string {
  const hours = Math.floor(Math.random() * 6) + 18; // 18-23 點
  const minutes = Math.floor(Math.random() * 4) * 15;
  return `${Math.min(hours, 23).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// 活動分類對應 - 擴展版
export const getExtendedActivityCategoriesRelations = (
  activities: NewActivity[],
  categories: any[]
): NewActivityCategory[] => {
  const relations: NewActivityCategory[] = [];

  // 更詳細的分類映射
  const categoryMap: { [key: string]: string[] } = {
    台北101跨年煙火: ['traditional', 'art_culture'],
    陽明山花季: ['nature', 'romantic'],
    士林夜市美食之旅: ['cuisine'],
    淡水河岸夕陽: ['romantic', 'nature'],
    九份老街懷舊之旅: ['art_culture', 'traditional'],
    野柳地質公園: ['nature'],
    桃園機場捷運體驗: ['wellness'],
    大溪老街巴洛克建築: ['art_culture', 'traditional'],
    新竹城隍廟美食: ['cuisine', 'traditional'],
    司馬庫斯神木群: ['nature', 'indigenous'],
    逢甲夜市: ['cuisine'],
    高美濕地生態: ['nature'],
    彩虹眷村文創: ['art_culture'],
    鹿港龍山寺文化: ['traditional', 'art_culture'],
    日月潭環湖之旅: ['nature', 'romantic'],
    清境農場綿羊秀: ['nature', 'wellness'],
    劍湖山世界樂園: ['wellness'],
    嘉義雞肉飯文化: ['cuisine'],
    台南孔廟文化園區: ['traditional', 'art_culture'],
    安平老街尋寶: ['traditional', 'cuisine'],
    駁二藝術特區: ['art_culture'],
    旗津海產美食: ['cuisine', 'nature'],
    小琉球海龜浮潛: ['nature', 'wellness'],
    宜蘭傳藝中心: ['traditional', 'art_culture'],
    礁溪溫泉鄉: ['wellness', 'romantic'],
    花蓮東大門夜市: ['cuisine', 'indigenous'],
    七星潭海岸風光: ['nature', 'romantic'],
    台東熱氣球嘉年華: ['nature', 'wellness'],
    三仙台日出: ['nature', 'romantic'],
    金門戰地風情: ['traditional', 'art_culture'],
    馬祖藍眼淚: ['nature', 'romantic'],
  };

  activities.forEach((activity) => {
    const categoryNames = categoryMap[activity.name] || ['nature'];
    categoryNames.forEach((categorySlug) => {
      const category = categories.find((c) => c.slug === categorySlug);
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
