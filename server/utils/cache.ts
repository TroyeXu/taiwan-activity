// 簡單的記憶體快取系統
interface CacheItem<T> {
  data: T;
  expires: number;
  hits: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize = 1000;
  private defaultTTL = 5 * 60 * 1000; // 5 分鐘

  constructor(options: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // 如果快取已滿，移除最少使用的項目
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data,
      expires,
      hits: 0
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 檢查是否過期
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    // 增加命中次數
    item.hits++;
    
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 移除過期項目
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }

  // 移除最少使用的項目
  private evictLRU(): void {
    let lruKey = '';
    let minHits = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.hits < minHits) {
        minHits = item.hits;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  // 取得快取統計
  getStats() {
    const now = Date.now();
    let expired = 0;
    let totalHits = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expires) {
        expired++;
      }
      totalHits += item.hits;
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      totalHits,
      hitRate: totalHits > 0 ? totalHits / this.cache.size : 0
    };
  }
}

// 全域快取實例
export const memoryCache = new MemoryCache({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000 // 5 分鐘
});

// 快取裝飾器
export function cached(keyGenerator: (...args: any[]) => string, ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);
      
      // 嘗試從快取取得
      const cached = memoryCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 執行原始方法
      const result = await originalMethod.apply(this, args);
      
      // 儲存到快取
      memoryCache.set(cacheKey, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

// 快取管理工具
export class CacheManager {
  static generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = memoryCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    memoryCache.set(key, data, ttl);
    return data;
  }

  static invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    for (const key of memoryCache['cache'].keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  static scheduleCleanup(intervalMs = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const removed = memoryCache.cleanup();
      if (removed > 0) {
        console.log(`Cache cleanup: removed ${removed} expired items`);
      }
    }, intervalMs);
  }

  static getStats() {
    return memoryCache.getStats();
  }
}

// 啟動定期清理
if (typeof process !== 'undefined') {
  CacheManager.scheduleCleanup();
}