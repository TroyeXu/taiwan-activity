"""
台灣觀光局活動爬蟲
抓取 https://www.taiwan.net.tw 上的觀光活動資訊
"""

import scrapy
import json
import re
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse

from ..items import (
    ActivityItem, LocationItem, TimeItem, CategoryItem, 
    ContactItem, SourceItem, create_activity_item,
    normalize_category, determine_region, extract_price_info
)


class TourismBureauSpider(scrapy.Spider):
    name = 'tourism_bureau'
    allowed_domains = ['taiwan.net.tw']
    start_urls = [
        'https://www.taiwan.net.tw/m1.aspx?sNo=0001016',  # 活動列表
        'https://www.taiwan.net.tw/m1.aspx?sNo=0001017',  # 節慶活動
        'https://www.taiwan.net.tw/m1.aspx?sNo=0001018',  # 文化活動
    ]
    
    custom_settings = {
        'DOWNLOAD_DELAY': 2,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 2,
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 1.0,
    }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # 爬蟲參數
        self.max_pages = int(kwargs.get('max_pages', 10))
        self.category_filter = kwargs.get('category', None)
        self.region_filter = kwargs.get('region', None)
        self.start_date = kwargs.get('start_date', None)
        self.end_date = kwargs.get('end_date', None)
        
        # 統計資訊
        self.stats = {
            'pages_crawled': 0,
            'activities_found': 0,
            'activities_processed': 0,
            'errors': []
        }
        
        self.logger.info(f"Tourism Bureau Spider started with params: "
                        f"max_pages={self.max_pages}, category={self.category_filter}")
    
    def parse(self, response):
        """解析活動列表頁面"""
        self.stats['pages_crawled'] += 1
        
        # 提取活動連結
        activity_links = response.css('.event-item a::attr(href)').getall()
        if not activity_links:
            # 嘗試其他可能的選擇器
            activity_links = response.css('.activity-card a::attr(href)').getall()
            if not activity_links:
                activity_links = response.css('a[href*="activity"]::attr(href)').getall()
        
        self.logger.info(f"Found {len(activity_links)} activity links on page")
        
        for link in activity_links:
            if link:
                absolute_url = urljoin(response.url, link)
                self.stats['activities_found'] += 1
                
                yield response.follow(
                    absolute_url,
                    callback=self.parse_activity,
                    meta={'source_url': response.url}
                )
        
        # 處理分頁
        if self.stats['pages_crawled'] < self.max_pages:
            next_page = self._extract_next_page(response)
            if next_page:
                yield response.follow(next_page, callback=self.parse)
    
    def parse_activity(self, response):
        """解析單一活動頁面"""
        try:
            self.logger.info(f"Parsing activity: {response.url}")
            
            # 基本資訊提取
            name = self._extract_name(response)
            if not name:
                self.logger.warning(f"No activity name found for {response.url}")
                return
            
            description = self._extract_description(response)
            summary = self._extract_summary(response)
            
            # 位置資訊
            location = self._extract_location(response)
            
            # 時間資訊
            time_info = self._extract_time(response)
            
            # 分類資訊
            categories = self._extract_categories(response)
            
            # 價格資訊
            price_info = self._extract_price(response)
            
            # 聯絡資訊
            contact = self._extract_contact(response)
            
            # 媒體資訊
            images = self._extract_images(response)
            
            # 來源資訊
            source = SourceItem({
                'website': 'taiwan.net.tw',
                'url': response.url,
                'title': response.css('title::text').get('').strip(),
                'crawled_at': datetime.now().isoformat(),
                'crawler_version': '1.0.0'
            })
            
            # 建立活動項目
            activity = create_activity_item(
                name=name,
                description=description,
                summary=summary,
                location=location,
                time=time_info,
                categories=categories,
                price=price_info[0],
                price_type=price_info[1],
                currency=price_info[2],
                contact=contact,
                images=images,
                source=source
            )
            
            self.stats['activities_processed'] += 1
            yield activity
            
        except Exception as e:
            error_msg = f"Error parsing activity {response.url}: {str(e)}"
            self.logger.error(error_msg)
            self.stats['errors'].append(error_msg)
    
    def _extract_name(self, response) -> str:
        """提取活動名稱"""
        selectors = [
            'h1.activity-title::text',
            'h1.event-title::text',
            '.page-title h1::text',
            'h1::text',
            '.title::text'
        ]
        
        for selector in selectors:
            name = response.css(selector).get()
            if name:
                return name.strip()
        
        return ''
    
    def _extract_description(self, response) -> str:
        """提取活動描述"""
        selectors = [
            '.activity-content .description',
            '.event-description',
            '.content-body',
            '.main-content p'
        ]
        
        for selector in selectors:
            desc_elements = response.css(selector)
            if desc_elements:
                # 提取所有文字內容
                text_parts = []
                for element in desc_elements:
                    text = element.css('::text').getall()
                    text_parts.extend([t.strip() for t in text if t.strip()])
                
                if text_parts:
                    return ' '.join(text_parts)
        
        return ''
    
    def _extract_summary(self, response) -> str:
        """提取活動摘要"""
        selectors = [
            '.activity-summary::text',
            '.event-summary::text',
            '.intro::text',
            '.brief::text'
        ]
        
        for selector in selectors:
            summary = response.css(selector).get()
            if summary:
                return summary.strip()
        
        # 如果沒有專門的摘要，取描述的前200字
        description = self._extract_description(response)
        if description:
            return description[:200] + '...' if len(description) > 200 else description
        
        return ''
    
    def _extract_location(self, response) -> LocationItem:
        """提取位置資訊"""
        # 地址提取
        address_selectors = [
            '.location .address::text',
            '.venue-info .address::text',
            '.activity-location::text',
            '.event-location::text'
        ]
        
        address = ''
        for selector in address_selectors:
            addr = response.css(selector).get()
            if addr:
                address = addr.strip()
                break
        
        # 場地名稱
        venue_selectors = [
            '.venue-name::text',
            '.location-name::text',
            '.place::text'
        ]
        
        venue = ''
        for selector in venue_selectors:
            v = response.css(selector).get()
            if v:
                venue = v.strip()
                break
        
        # 從地址解析城市和地區
        city = self._extract_city_from_address(address)
        region = determine_region(city) if city else ''
        
        # 嘗試提取座標
        latitude, longitude = self._extract_coordinates(response)
        
        location = LocationItem({
            'address': address,
            'city': city,
            'region': region,
            'venue': venue,
            'latitude': latitude,
            'longitude': longitude,
            'geocoded': bool(latitude and longitude)
        })
        
        return location
    
    def _extract_time(self, response) -> TimeItem:
        """提取時間資訊"""
        # 日期提取
        date_selectors = [
            '.event-date::text',
            '.activity-date::text',
            '.date-info::text',
            '.time-info .date::text'
        ]
        
        date_text = ''
        for selector in date_selectors:
            date = response.css(selector).get()
            if date:
                date_text = date.strip()
                break
        
        # 時間提取
        time_selectors = [
            '.event-time::text',
            '.activity-time::text',
            '.time-info .time::text'
        ]
        
        time_text = ''
        for selector in time_selectors:
            time = response.css(selector).get()
            if time:
                time_text = time.strip()
                break
        
        # 解析日期和時間
        start_date, end_date = self._parse_date_range(date_text)
        start_time, end_time = self._parse_time_range(time_text)
        
        time_item = TimeItem({
            'start_date': start_date,
            'end_date': end_date,
            'start_time': start_time,
            'end_time': end_time,
            'timezone': 'Asia/Taipei',
            'is_recurring': self._detect_recurring(date_text),
            'is_all_day': not bool(start_time or end_time)
        })
        
        return time_item
    
    def _extract_categories(self, response) -> list:
        """提取分類資訊"""
        category_selectors = [
            '.category::text',
            '.event-type::text',
            '.activity-type::text',
            '.tags .tag::text'
        ]
        
        categories = []
        
        for selector in category_selectors:
            cats = response.css(selector).getall()
            for cat in cats:
                if cat and cat.strip():
                    normalized = normalize_category(cat.strip())
                    if normalized not in categories:
                        categories.append(normalized)
        
        # 如果沒有找到分類，根據 URL 或內容推測
        if not categories:
            url_path = urlparse(response.url).path.lower()
            if 'festival' in url_path or '節慶' in response.text:
                categories.append(normalize_category('節慶活動'))
            elif 'culture' in url_path or '文化' in response.text:
                categories.append(normalize_category('文化活動'))
        
        return categories
    
    def _extract_price(self, response) -> tuple:
        """提取價格資訊"""
        price_selectors = [
            '.price::text',
            '.cost::text',
            '.fee::text',
            '.ticket-price::text'
        ]
        
        price_text = ''
        for selector in price_selectors:
            price = response.css(selector).get()
            if price:
                price_text = price.strip()
                break
        
        # 如果沒有找到價格資訊，檢查是否有免費關鍵字
        if not price_text:
            content = response.text.lower()
            if any(keyword in content for keyword in ['免費', 'free', '不收費']):
                price_text = '免費'
        
        return extract_price_info(price_text)
    
    def _extract_contact(self, response) -> ContactItem:
        """提取聯絡資訊"""
        # 電話
        phone_selectors = [
            '.contact .phone::text',
            '.tel::text',
            '.phone::text'
        ]
        
        phone = ''
        for selector in phone_selectors:
            p = response.css(selector).get()
            if p:
                phone = p.strip()
                break
        
        # 如果沒有找到，從文字中搜尋電話模式
        if not phone:
            phone_pattern = r'(?:電話|Tel|phone)[：:]\s*([0-9\-\s\(\)]+)'
            phone_match = re.search(phone_pattern, response.text, re.IGNORECASE)
            if phone_match:
                phone = phone_match.group(1).strip()
        
        # 網站
        website_selectors = [
            '.contact .website::attr(href)',
            '.official-site::attr(href)',
            'a[href*="http"]::attr(href)'
        ]
        
        website = ''
        for selector in website_selectors:
            w = response.css(selector).get()
            if w and 'taiwan.net.tw' not in w:
                website = w.strip()
                break
        
        # 主辦單位
        organizer_selectors = [
            '.organizer::text',
            '.host::text',
            '.sponsor::text'
        ]
        
        organizer = ''
        for selector in organizer_selectors:
            org = response.css(selector).get()
            if org:
                organizer = org.strip()
                break
        
        contact = ContactItem({
            'phone': phone,
            'website': website,
            'organizer': organizer
        })
        
        return contact
    
    def _extract_images(self, response) -> list:
        """提取圖片 URLs"""
        image_selectors = [
            '.gallery img::attr(src)',
            '.activity-images img::attr(src)',
            '.event-photos img::attr(src)',
            '.photo img::attr(src)'
        ]
        
        images = []
        for selector in image_selectors:
            imgs = response.css(selector).getall()
            for img in imgs:
                if img:
                    absolute_url = urljoin(response.url, img)
                    if absolute_url not in images:
                        images.append(absolute_url)
        
        return images[:10]  # 限制最多 10 張圖片
    
    def _extract_coordinates(self, response) -> tuple:
        """提取地理座標"""
        # 從 JavaScript 或 meta 標籤中提取座標
        coord_patterns = [
            r'latitude["\']?\s*[:=]\s*["\']?([0-9.]+)',
            r'longitude["\']?\s*[:=]\s*["\']?([0-9.]+)',
            r'lat["\']?\s*[:=]\s*["\']?([0-9.]+)',
            r'lng["\']?\s*[:=]\s*["\']?([0-9.]+)'
        ]
        
        lat_match = re.search(coord_patterns[0], response.text, re.IGNORECASE)
        lng_match = re.search(coord_patterns[1], response.text, re.IGNORECASE)
        
        if not lat_match:
            lat_match = re.search(coord_patterns[2], response.text, re.IGNORECASE)
        if not lng_match:
            lng_match = re.search(coord_patterns[3], response.text, re.IGNORECASE)
        
        latitude = float(lat_match.group(1)) if lat_match else None
        longitude = float(lng_match.group(1)) if lng_match else None
        
        # 驗證座標是否在台灣範圍內
        if latitude and longitude:
            if not (21.8 <= latitude <= 25.4 and 119.3 <= longitude <= 122.1):
                latitude = longitude = None
        
        return latitude, longitude
    
    def _extract_city_from_address(self, address: str) -> str:
        """從地址中提取城市"""
        if not address:
            return ''
        
        # 台灣城市列表
        cities = [
            '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣',
            '苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣',
            '嘉義縣', '嘉義市', '台南市', '高雄市', '屏東縣',
            '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'
        ]
        
        for city in cities:
            if city in address:
                return city
        
        return ''
    
    def _parse_date_range(self, date_text: str) -> tuple:
        """解析日期範圍"""
        if not date_text:
            return None, None
        
        # 常見日期格式
        date_patterns = [
            r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',  # 2024-01-01 或 2024/01/01
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})',  # 01-01-2024 或 01/01/2024
            r'(\d{4})年(\d{1,2})月(\d{1,2})日',  # 2024年1月1日
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, date_text)
            for match in matches:
                if isinstance(match, tuple):
                    # 處理年月日格式
                    if len(match) == 3:
                        date_str = f"{match[0]}-{match[1].zfill(2)}-{match[2].zfill(2)}"
                    else:
                        date_str = match[0]
                else:
                    date_str = match
                
                try:
                    # 標準化日期格式
                    if '/' in date_str:
                        date_str = date_str.replace('/', '-')
                    
                    # 確保格式為 YYYY-MM-DD
                    parts = date_str.split('-')
                    if len(parts) == 3:
                        if len(parts[0]) == 2:  # DD-MM-YYYY 格式
                            date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                        else:  # YYYY-MM-DD 格式
                            date_str = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    
                    # 驗證日期
                    datetime.strptime(date_str, '%Y-%m-%d')
                    dates.append(date_str)
                except ValueError:
                    continue
        
        if dates:
            dates.sort()
            return dates[0], dates[-1] if len(dates) > 1 else dates[0]
        
        return None, None
    
    def _parse_time_range(self, time_text: str) -> tuple:
        """解析時間範圍"""
        if not time_text:
            return None, None
        
        # 時間格式
        time_pattern = r'(\d{1,2}):(\d{2})'
        matches = re.findall(time_pattern, time_text)
        
        times = []
        for match in matches:
            hour, minute = match
            time_str = f"{hour.zfill(2)}:{minute}"
            times.append(time_str)
        
        if times:
            return times[0], times[-1] if len(times) > 1 else None
        
        return None, None
    
    def _detect_recurring(self, date_text: str) -> bool:
        """檢測是否為重複性活動"""
        if not date_text:
            return False
        
        recurring_keywords = [
            '每日', '每天', '每週', '每月', '每年',
            'daily', 'weekly', 'monthly', 'yearly',
            '固定', '定期', '常設'
        ]
        
        return any(keyword in date_text.lower() for keyword in recurring_keywords)
    
    def _extract_next_page(self, response) -> str:
        """提取下一頁連結"""
        next_selectors = [
            '.pagination .next::attr(href)',
            '.pager .next-page::attr(href)',
            'a:contains("下一頁")::attr(href)',
            'a:contains("Next")::attr(href)'
        ]
        
        for selector in next_selectors:
            next_url = response.css(selector).get()
            if next_url:
                return next_url
        
        return None
    
    def closed(self, reason):
        """爬蟲結束時的統計輸出"""
        self.logger.info("=== Tourism Bureau Spider Statistics ===")
        self.logger.info(f"Reason: {reason}")
        self.logger.info(f"Pages crawled: {self.stats['pages_crawled']}")
        self.logger.info(f"Activities found: {self.stats['activities_found']}")
        self.logger.info(f"Activities processed: {self.stats['activities_processed']}")
        self.logger.info(f"Errors: {len(self.stats['errors'])}")
        
        if self.stats['errors']:
            self.logger.error("Error details:")
            for error in self.stats['errors'][:5]:  # 只顯示前 5 個錯誤
                self.logger.error(f"  - {error}")
        
        # 計算成功率
        if self.stats['activities_found'] > 0:
            success_rate = (self.stats['activities_processed'] / self.stats['activities_found']) * 100
            self.logger.info(f"Success rate: {success_rate:.2f}%")