# Scrapy settings for taiwan_activity_crawler project
#
# For simplicity, this file contains only settings considered important or
# commonly used. You can find more settings consulting the documentation:
#
#     https://docs.scrapy.org/en/latest/topics/settings.html
#     https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
#     https://docs.scrapy.org/en/latest/topics/spider-middleware.html

BOT_NAME = 'taiwan_activity_crawler'

SPIDER_MODULES = ['crawler.spiders']
NEWSPIDER_MODULE = 'crawler.spiders'

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure a delay for requests for the same website (default: 0)
# See https://docs.scrapy.org/en/latest/topics/settings.html#download-delay
# See also autothrottle settings and docs
DOWNLOAD_DELAY = 2
RANDOMIZE_DOWNLOAD_DELAY = True

# The download delay setting will honor only one of:
CONCURRENT_REQUESTS_PER_DOMAIN = 4
CONCURRENT_REQUESTS_PER_IP = 2

# Disable cookies (enabled by default)
COOKIES_ENABLED = False

# Disable Telnet Console (enabled by default)
TELNETCONSOLE_ENABLED = False

# Override the default request headers:
DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# Enable or disable spider middlewares
# See https://docs.scrapy.org/en/latest/topics/spider-middleware.html
SPIDER_MIDDLEWARES = {
    'crawler.middlewares.ActivityDuplicateFilterMiddleware': 200,
    'crawler.middlewares.ActivityValidationMiddleware': 300,
}

# Enable or disable downloader middlewares
# See https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
DOWNLOADER_MIDDLEWARES = {
    'crawler.middlewares.RotateUserAgentMiddleware': 400,
    'crawler.middlewares.ProxyMiddleware': 500,
    'crawler.middlewares.RetryMiddleware': 550,
}

# Enable or disable extensions
# See https://docs.scrapy.org/en/latest/topics/extensions.html
EXTENSIONS = {
    'crawler.extensions.CrawlerStatsExtension': 100,
    'crawler.extensions.ActivityValidationExtension': 200,
}

# Configure item pipelines
# See https://docs.scrapy.org/en/latest/topics/item-pipeline.html
ITEM_PIPELINES = {
    'crawler.pipelines.ValidationPipeline': 200,
    'crawler.pipelines.DuplicationPipeline': 300,
    'crawler.pipelines.GeoCodingPipeline': 400,
    'crawler.pipelines.DatabasePipeline': 500,
    'crawler.pipelines.StatisticsPipeline': 600,
}

# Enable and configure the AutoThrottle extension (disabled by default)
# See https://docs.scrapy.org/en/latest/topics/autothrottle.html
AUTOTHROTTLE_ENABLED = True
# The initial download delay
AUTOTHROTTLE_START_DELAY = 1
# The maximum download delay to be set in case of high latencies
AUTOTHROTTLE_MAX_DELAY = 10
# The average number of requests Scrapy should be sending in parallel to
# each remote server
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0
# Enable showing throttling stats for every response received:
AUTOTHROTTLE_DEBUG = False

# Enable and configure HTTP caching (disabled by default)
# See https://docs.scrapy.org/en/latest/topics/downloader-middleware.html#httpcache-middleware-settings
HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 3600
HTTPCACHE_DIR = 'httpcache'
HTTPCACHE_IGNORE_HTTP_CODES = [503, 504, 505, 500, 403, 404, 408, 429]

# 自定義設定
# 資料庫連接
DATABASE_URL = '../data/tourism.db'

# Claude API 設定
CLAUDE_API_KEY = None  # 從環境變數載入
CLAUDE_VALIDATION_ENABLED = True

# 地理編碼服務
GEOCODING_SERVICE = 'google'  # 'google', 'openstreetmap', 'disabled'
GOOGLE_MAPS_API_KEY = None  # 從環境變數載入

# 去重設定
DUPEFILTER_DEBUG = True
DUPLICATE_FILTER_TYPE = 'fingerprint'  # 'fingerprint', 'hash', 'url'

# 統計和監控
STATS_CLASS = 'crawler.stats.DetailedStatsCollector'
TELNETCONSOLE_ENABLED = False

# 日誌設定
LOG_LEVEL = 'INFO'
LOG_FILE = 'crawler.log'
LOG_ENCODING = 'utf-8'

# 重試設定
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# 併發控制
CONCURRENT_REQUESTS = 16
CONCURRENT_REQUESTS_PER_DOMAIN = 4

# Request 設定
DOWNLOAD_TIMEOUT = 30
DOWNLOAD_MAXSIZE = 1073741824  # 1GB
DOWNLOAD_WARNSIZE = 33554432   # 32MB

# Feed 輸出設定
FEEDS = {
    'output/activities_%(time)s.json': {
        'format': 'json',
        'encoding': 'utf8',
        'store_empty': False,
        'fields': ['id', 'name', 'description', 'location', 'time', 'categories', 'source'],
        'indent': 2,
    },
    'output/activities_%(time)s.csv': {
        'format': 'csv',
        'encoding': 'utf8',
        'store_empty': False,
        'fields': ['id', 'name', 'location.city', 'location.address', 'time.start_date', 'categories'],
    }
}

# 自定義中間件設定
ROTATE_USER_AGENT_ENABLED = True
USER_AGENT_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
]

# 代理設定 (可選)
PROXY_ENABLED = False
PROXY_LIST = []

# 速率限制
DOWNLOAD_DELAY_RANDOMIZE = True

# 壓縮
COMPRESSION_ENABLED = True

# 內存使用限制
MEMUSAGE_ENABLED = True
MEMUSAGE_LIMIT_MB = 2048
MEMUSAGE_WARNING_MB = 1024

# Twisted reactor
TWISTED_REACTOR = 'twisted.internet.asyncioreactor.AsyncioSelectorReactor'