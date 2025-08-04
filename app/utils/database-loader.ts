/**
 * 資料庫載入器
 * 處理不同環境下的資料庫檔案載入
 */

export class DatabaseLoader {
  private static dbCache: ArrayBuffer | null = null;
  private static loadingPromise: Promise<ArrayBuffer> | null = null;

  /**
   * 載入資料庫檔案
   * 支援多種環境和回退機制
   */
  static async loadDatabase(): Promise<ArrayBuffer> {
    // 如果已經快取，直接返回
    if (this.dbCache) {
      console.log('📦 使用快取的資料庫');
      return this.dbCache;
    }

    // 如果正在載入，等待載入完成
    if (this.loadingPromise) {
      console.log('⏳ 等待資料庫載入完成...');
      return await this.loadingPromise;
    }

    // 開始載入
    this.loadingPromise = this.performLoad();
    
    try {
      this.dbCache = await this.loadingPromise;
      return this.dbCache;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * 執行實際的載入操作
   */
  private static async performLoad(): Promise<ArrayBuffer> {
    const { $config } = useNuxtApp();
    const baseURL = $config.app.baseURL || '/';
    
    // 在客戶端環境中使用當前網址
    const isProduction = process.env.NODE_ENV === 'production';
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
    
    // 計算實際的基礎 URL
    let actualBaseURL = baseURL;
    if (isProduction && currentPathname.includes('/taiwan-activity/')) {
      actualBaseURL = '/taiwan-activity/';
    }
    
    // 嘗試不同的路徑組合
    const possiblePaths = [
      // 優先使用配置的 baseURL
      `${actualBaseURL}tourism.sqlite`,
      `${actualBaseURL.endsWith('/') ? actualBaseURL : actualBaseURL + '/'}tourism.sqlite`,
      // 如果在 GitHub Pages，明確使用完整路徑
      `${currentOrigin}/taiwan-activity/tourism.sqlite`,
      // 相對於目前頁面的路徑
      './tourism.sqlite',
      '../tourism.sqlite',
      '../../tourism.sqlite',
      // 絕對路徑
      '/tourism.sqlite',
      '/taiwan-activity/tourism.sqlite',
      // 直接檔名
      'tourism.sqlite'
    ];

    // 去重
    const uniquePaths = [...new Set(possiblePaths)];
    
    console.log('🔍 嘗試載入資料庫，可能的路徑:', uniquePaths);

    // 依序嘗試每個路徑
    for (const path of uniquePaths) {
      try {
        console.log(`📁 嘗試載入: ${path}`);
        
        const response = await fetch(path, {
          method: 'GET',
          headers: {
            'Accept': 'application/octet-stream, application/x-sqlite3, */*'
          },
          signal: AbortSignal.timeout(30000), // 30秒超時
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          
          console.log(`📊 回應狀態: ${response.status}, 類型: ${contentType}, 大小: ${contentLength}`);
          
          // 檢查內容長度
          if (contentLength && parseInt(contentLength) === 0) {
            console.warn(`⚠️ 檔案為空: ${path}`);
            continue;
          }

          const buffer = await response.arrayBuffer();
          
          // 驗證是否為有效的 SQLite 檔案
          if (this.isValidSQLite(buffer)) {
            console.log(`✅ 成功載入資料庫: ${path} (${buffer.byteLength} bytes)`);
            return buffer;
          } else {
            console.warn(`⚠️ 檔案不是有效的 SQLite 資料庫: ${path}`);
            continue;
          }
        } else {
          console.log(`❌ 載入失敗 (${response.status}): ${path}`);
        }
      } catch (error) {
        console.log(`❌ 載入錯誤: ${path}`, error);
      }
    }

    // 如果所有路徑都失敗，嘗試從 CDN 載入預設資料庫
    const cdnUrls = [
      'https://raw.githubusercontent.com/TroyeXu/taiwan-activity/main/public/tourism.sqlite',
      'https://github.com/TroyeXu/taiwan-activity/raw/main/public/tourism.sqlite',
      // 使用 jsdelivr CDN
      'https://cdn.jsdelivr.net/gh/TroyeXu/taiwan-activity@main/public/tourism.sqlite'
    ];
    
    for (const cdnUrl of cdnUrls) {
      try {
        console.log(`🌐 嘗試從 CDN 載入: ${cdnUrl}`);
        
        const response = await fetch(cdnUrl, {
          signal: AbortSignal.timeout(60000), // 60秒超時
          headers: {
            'Accept': 'application/octet-stream, */*'
          }
        });

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          if (this.isValidSQLite(buffer)) {
            console.log(`✅ 成功從 CDN 載入資料庫: ${cdnUrl}`);
            return buffer;
          }
        }
      } catch (error) {
        console.error(`❌ CDN 載入失敗: ${cdnUrl}`, error);
      }
    }

    throw new Error('無法載入資料庫檔案：所有路徑都失敗了');
  }

  /**
   * 檢查是否為有效的 SQLite 檔案
   */
  private static isValidSQLite(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 16) return false;
    
    // SQLite 檔案頭部應該是 "SQLite format 3\000"
    const header = new Uint8Array(buffer, 0, 16);
    const magic = new TextDecoder().decode(header);
    
    return magic.startsWith('SQLite format 3');
  }

  /**
   * 清除快取
   */
  static clearCache(): void {
    this.dbCache = null;
    this.loadingPromise = null;
    console.log('🗑️ 資料庫快取已清除');
  }

  /**
   * 取得快取狀態
   */
  static getCacheStatus(): { cached: boolean; size?: number } {
    return {
      cached: this.dbCache !== null,
      size: this.dbCache?.byteLength
    };
  }
}