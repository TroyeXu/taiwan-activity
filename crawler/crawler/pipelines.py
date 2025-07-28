# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html

import json
import logging
import hashlib
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from itemadapter import ItemAdapter

import sqlite3
from scrapy import signals
from scrapy.exceptions import DropItem
from .items import ActivityItem, LocationItem, TimeItem


class ValidationPipeline:
    """資料驗證管道"""
    
    def __init__(self):
        self.stats = {
            'items_processed': 0,
            'items_validated': 0,
            'items_rejected': 0,
            'validation_errors': []
        }
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        try:
            # 基本欄位驗證
            if not self._validate_required_fields(adapter):
                raise DropItem(f"Missing required fields: {item.get('name', 'Unknown')}")
            
            # 資料格式驗證
            if not self._validate_data_formats(adapter):
                raise DropItem(f"Invalid data format: {item.get('name', 'Unknown')}")
            
            # 地理座標驗證
            if not self._validate_coordinates(adapter):
                spider.logger.warning(f"Invalid coordinates for: {item.get('name', 'Unknown')}")
            
            # 時間邏輯驗證
            if not self._validate_time_logic(adapter):
                spider.logger.warning(f"Invalid time logic for: {item.get('name', 'Unknown')}")
            
            self.stats['items_validated'] += 1
            spider.logger.info(f"Item validated: {item.get('name', 'Unknown')}")
            
            return item
            
        except DropItem as e:
            self.stats['items_rejected'] += 1
            self.stats['validation_errors'].append(str(e))
            spider.logger.error(f"Validation failed: {e}")
            raise
        
        finally:
            self.stats['items_processed'] += 1
    
    def _validate_required_fields(self, adapter: ItemAdapter) -> bool:
        """驗證必要欄位"""
        required_fields = ['name']
        
        for field in required_fields:
            if not adapter.get(field):
                return False
        
        # 驗證位置資訊
        location = adapter.get('location')
        if location:
            if not location.get('address') and not location.get('city'):
                return False
        
        return True
    
    def _validate_data_formats(self, adapter: ItemAdapter) -> bool:
        """驗證資料格式"""
        # 驗證價格
        price = adapter.get('price')
        if price is not None:
            try:
                float(price)
            except (ValueError, TypeError):
                return False
        
        # 驗證價格類型
        price_type = adapter.get('price_type')
        if price_type and price_type not in ['free', 'paid', 'donation']:
            return False
        
        return True
    
    def _validate_coordinates(self, adapter: ItemAdapter) -> bool:
        """驗證地理座標"""
        location = adapter.get('location')
        if not location:
            return True
        
        lat = location.get('latitude')
        lng = location.get('longitude')
        
        if lat is None or lng is None:
            return True  # 允許沒有座標
        
        try:
            lat_f = float(lat)
            lng_f = float(lng)
            
            # 檢查台灣範圍
            if not (21.8 <= lat_f <= 25.4 and 119.3 <= lng_f <= 122.1):
                return False
            
            return True
            
        except (ValueError, TypeError):
            return False
    
    def _validate_time_logic(self, adapter: ItemAdapter) -> bool:
        """驗證時間邏輯"""
        time_info = adapter.get('time')
        if not time_info:
            return True
        
        start_date = time_info.get('start_date')
        end_date = time_info.get('end_date')
        
        if start_date and end_date:
            try:
                from datetime import datetime
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date)
                
                if start_dt > end_dt:
                    return False
                    
            except ValueError:
                return False
        
        return True
    
    def close_spider(self, spider):
        spider.logger.info(f"Validation stats: {self.stats}")


class DuplicationPipeline:
    """去重管道"""
    
    def __init__(self):
        self.seen_fingerprints = set()
        self.stats = {
            'items_processed': 0,
            'duplicates_found': 0,
            'unique_items': 0
        }
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # 生成內容指紋
        fingerprint = self._generate_fingerprint(adapter)
        
        if fingerprint in self.seen_fingerprints:
            self.stats['duplicates_found'] += 1
            spider.logger.info(f"Duplicate item found: {item.get('name', 'Unknown')}")
            raise DropItem(f"Duplicate item: {fingerprint}")
        
        self.seen_fingerprints.add(fingerprint)
        self.stats['unique_items'] += 1
        self.stats['items_processed'] += 1
        
        # 將指紋添加到 item 中
        adapter['content_fingerprint'] = fingerprint
        
        return item
    
    def _generate_fingerprint(self, adapter: ItemAdapter) -> str:
        """生成內容指紋"""
        # 使用名稱、地址和開始時間來生成指紋
        content_parts = []
        
        name = adapter.get('name', '').strip().lower()
        content_parts.append(name)
        
        location = adapter.get('location')
        if location:
            address = location.get('address', '').strip().lower()
            content_parts.append(address)
        
        time_info = adapter.get('time')
        if time_info:
            start_date = time_info.get('start_date', '').strip()
            content_parts.append(start_date)
        
        content = '|'.join(content_parts)
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def close_spider(self, spider):
        spider.logger.info(f"Duplication stats: {self.stats}")


class GeoCodingPipeline:
    """地理編碼管道"""
    
    def __init__(self, google_api_key: Optional[str] = None):
        self.google_api_key = google_api_key
        self.geocoding_cache = {}
        self.stats = {
            'items_processed': 0,
            'geocoding_success': 0,
            'geocoding_failed': 0,
            'cache_hits': 0
        }
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            google_api_key=crawler.settings.get('GOOGLE_MAPS_API_KEY')
        )
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        location = adapter.get('location')
        
        if not location:
            return item
        
        # 如果已經有座標，跳過地理編碼
        if location.get('latitude') and location.get('longitude'):
            self.stats['items_processed'] += 1
            return item
        
        address = location.get('address')
        if not address:
            return item
        
        try:
            # 檢查快取
            if address in self.geocoding_cache:
                coords = self.geocoding_cache[address]
                self.stats['cache_hits'] += 1
            else:
                coords = self._geocode_address(address, spider)
                if coords:
                    self.geocoding_cache[address] = coords
            
            if coords:
                location['latitude'] = coords['lat']
                location['longitude'] = coords['lng']
                location['geocoded'] = True
                location['geocoding_source'] = 'google_maps'
                location['geocoding_confidence'] = coords.get('confidence', 0.8)
                
                self.stats['geocoding_success'] += 1
                spider.logger.info(f"Geocoded: {address} -> {coords['lat']}, {coords['lng']}")
            else:
                location['geocoded'] = False
                self.stats['geocoding_failed'] += 1
                spider.logger.warning(f"Geocoding failed for: {address}")
        
        except Exception as e:
            spider.logger.error(f"Geocoding error for {address}: {e}")
            self.stats['geocoding_failed'] += 1
        
        finally:
            self.stats['items_processed'] += 1
        
        return item
    
    def _geocode_address(self, address: str, spider) -> Optional[Dict[str, float]]:
        """使用 Google Maps API 進行地理編碼"""
        if not self.google_api_key:
            spider.logger.warning("Google Maps API key not configured")
            return self._geocode_with_openstreetmap(address, spider)
        
        try:
            url = 'https://maps.googleapis.com/maps/api/geocode/json'
            params = {
                'address': f"{address}, Taiwan",
                'key': self.google_api_key,
                'language': 'zh-TW'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data['status'] == 'OK' and data['results']:
                result = data['results'][0]
                location = result['geometry']['location']
                
                return {
                    'lat': location['lat'],
                    'lng': location['lng'],
                    'confidence': self._calculate_confidence(result)
                }
            
        except Exception as e:
            spider.logger.error(f"Google geocoding error: {e}")
        
        # 回退到 OpenStreetMap
        return self._geocode_with_openstreetmap(address, spider)
    
    def _geocode_with_openstreetmap(self, address: str, spider) -> Optional[Dict[str, float]]:
        """使用 OpenStreetMap Nominatim 進行地理編碼"""
        try:
            url = 'https://nominatim.openstreetmap.org/search'
            params = {
                'q': f"{address}, Taiwan",
                'format': 'json',
                'limit': 1,
                'countrycodes': 'tw'
            }
            
            headers = {
                'User-Agent': 'Taiwan Activity Crawler/1.0'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data:
                result = data[0]
                return {
                    'lat': float(result['lat']),
                    'lng': float(result['lon']),
                    'confidence': 0.6  # OpenStreetMap 的預設信心度
                }
                
        except Exception as e:
            spider.logger.error(f"OpenStreetMap geocoding error: {e}")
        
        return None
    
    def _calculate_confidence(self, result: Dict) -> float:
        """計算地理編碼信心度"""
        location_type = result.get('geometry', {}).get('location_type', '')
        
        confidence_map = {
            'ROOFTOP': 0.9,
            'RANGE_INTERPOLATED': 0.8,
            'GEOMETRIC_CENTER': 0.7,
            'APPROXIMATE': 0.6
        }
        
        return confidence_map.get(location_type, 0.5)
    
    def close_spider(self, spider):
        spider.logger.info(f"Geocoding stats: {self.stats}")


class DatabasePipeline:
    """資料庫儲存管道"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection = None
        self.stats = {
            'items_processed': 0,
            'items_saved': 0,
            'save_errors': 0
        }
    
    @classmethod
    def from_crawler(cls, crawler):
        database_url = crawler.settings.get('DATABASE_URL', 'tourism.db')
        return cls(database_url)
    
    def open_spider(self, spider):
        try:
            self.connection = sqlite3.connect(self.database_url)
            self.connection.row_factory = sqlite3.Row
            spider.logger.info(f"Connected to database: {self.database_url}")
        except Exception as e:
            spider.logger.error(f"Failed to connect to database: {e}")
            raise
    
    def close_spider(self, spider):
        if self.connection:
            self.connection.close()
            spider.logger.info(f"Database stats: {self.stats}")
    
    def process_item(self, item, spider):
        try:
            self._save_activity(item, spider)
            self.stats['items_saved'] += 1
            spider.logger.info(f"Saved to database: {item.get('name', 'Unknown')}")
            
        except Exception as e:
            self.stats['save_errors'] += 1
            spider.logger.error(f"Failed to save item: {e}")
            # 不拋出異常，讓其他管道繼續處理
        
        finally:
            self.stats['items_processed'] += 1
        
        return item
    
    def _save_activity(self, item, spider):
        """儲存活動到資料庫"""
        adapter = ItemAdapter(item)
        
        # 準備活動資料
        activity_data = {
            'id': adapter.get('id'),
            'name': adapter.get('name'),
            'description': adapter.get('description'),
            'summary': adapter.get('summary'),
            'status': 'pending',  # 新抓取的活動預設為待審核
            'quality_score': 0,
            'price': adapter.get('price', 0),
            'price_type': adapter.get('price_type', 'free'),
            'currency': adapter.get('currency', 'TWD'),
            'view_count': 0,
            'favorite_count': 0,
            'click_count': 0,
            'popularity_score': 0.0,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # 插入活動
        cursor = self.connection.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO activities (
                id, name, description, summary, status, quality_score,
                price, price_type, currency, view_count, favorite_count,
                click_count, popularity_score, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', tuple(activity_data.values()))
        
        # 儲存位置資訊
        location = adapter.get('location')
        if location:
            self._save_location(location, activity_data['id'], cursor)
        
        # 儲存時間資訊
        time_info = adapter.get('time')
        if time_info:
            self._save_time(time_info, activity_data['id'], cursor)
        
        # 儲存分類資訊
        categories = adapter.get('categories', [])
        if categories:
            self._save_categories(categories, activity_data['id'], cursor)
        
        # 儲存來源資訊
        source = adapter.get('source')
        if source:
            self._save_source(source, activity_data['id'], cursor)
        
        self.connection.commit()
    
    def _save_location(self, location, activity_id, cursor):
        """儲存位置資訊"""
        import uuid
        
        location_data = {
            'id': f"loc_{uuid.uuid4().hex[:8]}",
            'activity_id': activity_id,
            'address': location.get('address', ''),
            'district': location.get('district'),
            'city': location.get('city', ''),
            'region': location.get('region', ''),
            'latitude': location.get('latitude'),
            'longitude': location.get('longitude'),
            'venue': location.get('venue'),
            'landmarks': json.dumps(location.get('landmarks', []))
        }
        
        cursor.execute('''
            INSERT OR REPLACE INTO locations (
                id, activity_id, address, district, city, region,
                latitude, longitude, venue, landmarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', tuple(location_data.values()))
    
    def _save_time(self, time_info, activity_id, cursor):
        """儲存時間資訊"""
        import uuid
        
        time_data = {
            'id': f"time_{uuid.uuid4().hex[:8]}",
            'activity_id': activity_id,
            'start_date': time_info.get('start_date'),
            'end_date': time_info.get('end_date'),
            'start_time': time_info.get('start_time'),
            'end_time': time_info.get('end_time'),
            'timezone': time_info.get('timezone', 'Asia/Taipei'),
            'is_recurring': time_info.get('is_recurring', False),
            'recurrence_rule': json.dumps(time_info.get('recurrence_rule')) if time_info.get('recurrence_rule') else None
        }
        
        cursor.execute('''
            INSERT OR REPLACE INTO activity_times (
                id, activity_id, start_date, end_date, start_time,
                end_time, timezone, is_recurring, recurrence_rule
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', tuple(time_data.values()))
    
    def _save_categories(self, categories, activity_id, cursor):
        """儲存分類資訊"""
        import uuid
        
        for category in categories:
            # 確保分類存在
            category_id = f"cat_{uuid.uuid4().hex[:8]}"
            cursor.execute('''
                INSERT OR IGNORE INTO categories (id, name, slug, color_code, icon)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                category_id,
                category.get('name', ''),
                category.get('slug', ''),
                category.get('color_code', ''),
                category.get('icon', '')
            ))
            
            # 取得分類 ID
            cursor.execute('SELECT id FROM categories WHERE slug = ?', (category.get('slug', ''),))
            result = cursor.fetchone()
            if result:
                actual_category_id = result[0]
            else:
                actual_category_id = category_id
            
            # 建立活動-分類關聯
            cursor.execute('''
                INSERT OR IGNORE INTO activity_categories (id, activity_id, category_id)
                VALUES (?, ?, ?)
            ''', (f"ac_{uuid.uuid4().hex[:8]}", activity_id, actual_category_id))
    
    def _save_source(self, source, activity_id, cursor):
        """儲存來源資訊"""
        import uuid
        
        source_data = {
            'id': f"src_{uuid.uuid4().hex[:8]}",
            'activity_id': activity_id,
            'website': source.get('website', ''),
            'url': source.get('url', ''),
            'crawled_at': datetime.now().isoformat(),
            'crawler_version': source.get('crawler_version', '1.0.0')
        }
        
        cursor.execute('''
            INSERT OR REPLACE INTO data_sources (
                id, activity_id, website, url, crawled_at, crawler_version
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', tuple(source_data.values()))


class StatisticsPipeline:
    """統計資訊管道"""
    
    def __init__(self):
        self.stats = {
            'start_time': datetime.now(),
            'items_count': 0,
            'categories_count': {},
            'regions_count': {},
            'cities_count': {},
            'price_types_count': {},
            'validation_summary': {
                'total': 0,
                'valid': 0,
                'invalid': 0
            }
        }
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        self.stats['items_count'] += 1
        
        # 統計分類
        categories = adapter.get('categories', [])
        for category in categories:
            name = category.get('name', 'Unknown')
            self.stats['categories_count'][name] = self.stats['categories_count'].get(name, 0) + 1
        
        # 統計地區
        location = adapter.get('location')
        if location:
            region = location.get('region', 'Unknown')
            city = location.get('city', 'Unknown')
            
            self.stats['regions_count'][region] = self.stats['regions_count'].get(region, 0) + 1
            self.stats['cities_count'][city] = self.stats['cities_count'].get(city, 0) + 1
        
        # 統計價格類型
        price_type = adapter.get('price_type', 'Unknown')
        self.stats['price_types_count'][price_type] = self.stats['price_types_count'].get(price_type, 0) + 1
        
        return item
    
    def close_spider(self, spider):
        self.stats['end_time'] = datetime.now()
        self.stats['duration'] = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
        
        # 輸出統計報告
        spider.logger.info("=== Crawling Statistics ===")
        spider.logger.info(f"Duration: {self.stats['duration']:.2f} seconds")
        spider.logger.info(f"Total items: {self.stats['items_count']}")
        spider.logger.info(f"Categories: {dict(list(self.stats['categories_count'].items())[:5])}")
        spider.logger.info(f"Regions: {self.stats['regions_count']}")
        spider.logger.info(f"Cities: {dict(list(self.stats['cities_count'].items())[:5])}")
        spider.logger.info(f"Price types: {self.stats['price_types_count']}")
        
        # 儲存統計到檔案
        stats_file = f"crawler_stats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(stats_file, 'w', encoding='utf-8') as f:
                json.dump(self.stats, f, ensure_ascii=False, indent=2, default=str)
            spider.logger.info(f"Statistics saved to: {stats_file}")
        except Exception as e:
            spider.logger.error(f"Failed to save statistics: {e}")