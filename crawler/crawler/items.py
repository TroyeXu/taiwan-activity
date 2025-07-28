# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy
from scrapy import Field
from datetime import datetime
from typing import List, Dict, Optional


class ActivityItem(scrapy.Item):
    """台灣觀光活動項目"""
    
    # 基本資訊
    id = Field()  # 唯一識別碼
    name = Field()  # 活動名稱
    description = Field()  # 活動描述
    summary = Field()  # 活動摘要
    
    # 位置資訊
    location = Field()  # LocationItem
    
    # 時間資訊
    time = Field()  # TimeItem
    
    # 分類和標籤
    categories = Field()  # List[CategoryItem]
    tags = Field()  # List[str]
    
    # 價格資訊
    price = Field()  # 價格
    price_type = Field()  # 'free', 'paid', 'donation'
    currency = Field()  # 貨幣代碼
    
    # 聯絡資訊
    contact = Field()  # ContactItem
    
    # 媒體資訊
    images = Field()  # List[str] 圖片 URLs
    videos = Field()  # List[str] 影片 URLs
    
    # 來源資訊
    source = Field()  # SourceItem
    
    # 其他資訊
    features = Field()  # List[str] 特殊功能/設施
    target_audience = Field()  # 目標對象
    capacity = Field()  # 容量限制
    registration_required = Field()  # 是否需要報名
    registration_url = Field()  # 報名網址
    
    # 抓取元資料
    crawled_at = Field()  # 抓取時間
    raw_data = Field()  # 原始資料 (備份用)


class LocationItem(scrapy.Item):
    """位置資訊項目"""
    
    address = Field()  # 完整地址
    district = Field()  # 區域
    city = Field()  # 城市
    region = Field()  # 地區 (north, central, south, east, islands)
    latitude = Field()  # 緯度
    longitude = Field()  # 經度
    venue = Field()  # 場地名稱
    landmarks = Field()  # List[str] 附近地標
    postal_code = Field()  # 郵遞區號
    
    # 地理編碼狀態
    geocoded = Field()  # Boolean 是否已地理編碼
    geocoding_source = Field()  # 地理編碼來源
    geocoding_confidence = Field()  # 地理編碼信心度


class TimeItem(scrapy.Item):
    """時間資訊項目"""
    
    start_date = Field()  # 開始日期 (YYYY-MM-DD)
    end_date = Field()  # 結束日期 (YYYY-MM-DD)
    start_time = Field()  # 開始時間 (HH:MM)
    end_time = Field()  # 結束時間 (HH:MM)
    timezone = Field()  # 時區
    is_recurring = Field()  # 是否重複性活動
    recurrence_rule = Field()  # 重複規則 (JSON)
    duration = Field()  # 活動時長 (分鐘)
    
    # 時間狀態
    is_all_day = Field()  # 是否全天活動
    flexible_time = Field()  # 時間是否彈性
    time_notes = Field()  # 時間備註


class CategoryItem(scrapy.Item):
    """分類項目"""
    
    name = Field()  # 分類名稱
    slug = Field()  # URL 友善的識別碼
    parent = Field()  # 父分類
    level = Field()  # 分類層級
    color_code = Field()  # 顏色代碼
    icon = Field()  # 圖示


class ContactItem(scrapy.Item):
    """聯絡資訊項目"""
    
    phone = Field()  # 電話
    email = Field()  # 電子郵件
    website = Field()  # 網站
    facebook = Field()  # Facebook 頁面
    instagram = Field()  # Instagram 帳號
    line = Field()  # LINE 帳號
    organizer = Field()  # 主辦單位
    contact_person = Field()  # 聯絡人


class SourceItem(scrapy.Item):
    """來源資訊項目"""
    
    website = Field()  # 來源網站
    url = Field()  # 原始網址
    title = Field()  # 原始頁面標題
    crawled_at = Field()  # 抓取時間
    crawler_version = Field()  # 爬蟲版本
    last_modified = Field()  # 頁面最後修改時間
    etag = Field()  # HTTP ETag
    
    # 內容指紋
    content_hash = Field()  # 內容雜湊值
    structure_hash = Field()  # 結構雜湊值


class ValidationItem(scrapy.Item):
    """驗證結果項目"""
    
    is_valid = Field()  # 是否通過驗證
    quality_score = Field()  # 品質分數 (0-100)
    issues = Field()  # List[Dict] 問題清單
    suggestions = Field()  # List[Dict] 改善建議
    validated_at = Field()  # 驗證時間
    validator = Field()  # 驗證器類型


# 輔助函數

def create_activity_item(**kwargs) -> ActivityItem:
    """建立活動項目的輔助函數"""
    item = ActivityItem()
    
    # 設定預設值
    item['id'] = kwargs.get('id', generate_activity_id())
    item['name'] = kwargs.get('name', '')
    item['description'] = kwargs.get('description', '')
    item['summary'] = kwargs.get('summary', '')
    item['categories'] = kwargs.get('categories', [])
    item['tags'] = kwargs.get('tags', [])
    item['price'] = kwargs.get('price', 0)
    item['price_type'] = kwargs.get('price_type', 'free')
    item['currency'] = kwargs.get('currency', 'TWD')
    item['images'] = kwargs.get('images', [])
    item['videos'] = kwargs.get('videos', [])
    item['features'] = kwargs.get('features', [])
    item['registration_required'] = kwargs.get('registration_required', False)
    item['crawled_at'] = datetime.now().isoformat()
    
    # 設定其他提供的值
    for key, value in kwargs.items():
        if key in item.fields:
            item[key] = value
    
    return item


def create_location_item(**kwargs) -> LocationItem:
    """建立位置項目的輔助函數"""
    item = LocationItem()
    
    # 設定預設值
    item['address'] = kwargs.get('address', '')
    item['city'] = kwargs.get('city', '')
    item['region'] = kwargs.get('region', '')
    item['landmarks'] = kwargs.get('landmarks', [])
    item['geocoded'] = kwargs.get('geocoded', False)
    item['geocoding_confidence'] = kwargs.get('geocoding_confidence', 0.0)
    
    # 設定其他提供的值
    for key, value in kwargs.items():
        if key in item.fields:
            item[key] = value
    
    return item


def create_time_item(**kwargs) -> TimeItem:
    """建立時間項目的輔助函數"""
    item = TimeItem()
    
    # 設定預設值
    item['timezone'] = kwargs.get('timezone', 'Asia/Taipei')
    item['is_recurring'] = kwargs.get('is_recurring', False)
    item['is_all_day'] = kwargs.get('is_all_day', False)
    item['flexible_time'] = kwargs.get('flexible_time', False)
    
    # 設定其他提供的值
    for key, value in kwargs.items():
        if key in item.fields:
            item[key] = value
    
    return item


def create_source_item(**kwargs) -> SourceItem:
    """建立來源項目的輔助函數"""
    item = SourceItem()
    
    # 設定預設值
    item['crawled_at'] = kwargs.get('crawled_at', datetime.now().isoformat())
    item['crawler_version'] = kwargs.get('crawler_version', '1.0.0')
    
    # 設定其他提供的值
    for key, value in kwargs.items():
        if key in item.fields:
            item[key] = value
    
    return item


def generate_activity_id() -> str:
    """生成活動 ID"""
    import uuid
    return f"act_{uuid.uuid4().hex[:8]}"


def normalize_category(category_name: str) -> CategoryItem:
    """標準化分類名稱"""
    category_mapping = {
        '節慶活動': {'name': '傳統節慶', 'slug': 'traditional', 'color_code': '#DC2626'},
        '文化活動': {'name': '藝術文化', 'slug': 'art_culture', 'color_code': '#7C3AED'},
        '美食活動': {'name': '美食饗宴', 'slug': 'cuisine', 'color_code': '#F59E0B'},
        '自然活動': {'name': '自然生態', 'slug': 'nature', 'color_code': '#059669'},
        '養生活動': {'name': '養生樂活', 'slug': 'wellness', 'color_code': '#10B981'},
        '浪漫活動': {'name': '浪漫之旅', 'slug': 'romantic', 'color_code': '#EC4899'},
        '原住民活動': {'name': '原民慶典', 'slug': 'indigenous', 'color_code': '#B91C1C'},
        '客家活動': {'name': '客家文化', 'slug': 'hakka', 'color_code': '#1E40AF'},
    }
    
    # 模糊匹配
    for key, mapping in category_mapping.items():
        if key in category_name or category_name in key:
            return CategoryItem(mapping)
    
    # 如果沒有匹配，建立新分類
    slug = category_name.lower().replace(' ', '_').replace('活動', '')
    return CategoryItem({
        'name': category_name,
        'slug': slug,
        'color_code': '#6B7280'  # 預設灰色
    })


def determine_region(city: str) -> str:
    """根據城市判斷地區"""
    region_mapping = {
        'north': ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣'],
        'central': ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
        'south': ['嘉義縣', '嘉義市', '台南市', '高雄市', '屏東縣'],
        'east': ['宜蘭縣', '花蓮縣', '台東縣'],
        'islands': ['澎湖縣', '金門縣', '連江縣']
    }
    
    for region, cities in region_mapping.items():
        if city in cities:
            return region
    
    return 'unknown'


def extract_price_info(price_text: str) -> tuple:
    """從價格文字中提取價格資訊"""
    import re
    
    if not price_text:
        return 0, 'free', 'TWD'
    
    price_text = price_text.strip().lower()
    
    # 免費關鍵字
    free_keywords = ['免費', 'free', '不收費', '免費入場']
    if any(keyword in price_text for keyword in free_keywords):
        return 0, 'free', 'TWD'
    
    # 樂捐關鍵字
    donation_keywords = ['樂捐', '隨喜', '自由捐獻']
    if any(keyword in price_text for keyword in donation_keywords):
        return 0, 'donation', 'TWD'
    
    # 提取數字
    price_match = re.search(r'[\d,]+', price_text.replace(',', ''))
    if price_match:
        try:
            price = int(price_match.group().replace(',', ''))
            return price, 'paid', 'TWD'
        except ValueError:
            pass
    
    return 0, 'free', 'TWD'