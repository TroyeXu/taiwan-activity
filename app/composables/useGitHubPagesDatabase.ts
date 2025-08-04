/**
 * GitHub Pages 專用的資料庫載入 composable
 */
export const useGitHubPagesDatabase = () => {
  const loadDatabase = async (): Promise<ArrayBuffer> => {
    console.log('🔍 開始載入資料庫 (GitHub Pages 模式)...');
    
    // 取得當前的 URL 資訊
    const currentUrl = window.location.href;
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    
    console.log('📍 當前環境:', { currentUrl, origin, pathname });
    
    // 根據當前路徑構建可能的資料庫 URL
    const possibleUrls: string[] = [];
    
    // 1. 如果在 GitHub Pages 上，使用絕對路徑
    if (origin.includes('github.io')) {
      // 從當前路徑推斷專案根目錄
      const pathParts = pathname.split('/').filter(Boolean);
      let projectRoot = '';
      
      if (pathParts.length > 0 && pathParts[0] === 'taiwan-activity') {
        projectRoot = '/taiwan-activity';
      } else if (pathParts.length > 1) {
        // 可能是 username.github.io/project-name 格式
        projectRoot = `/${pathParts[0]}`;
      }
      
      possibleUrls.push(
        `${origin}${projectRoot}/tourism.sqlite`,
        `${origin}/taiwan-activity/tourism.sqlite`,
        `https://troyexu.github.io/taiwan-activity/tourism.sqlite`
      );
    }
    
    // 2. 相對於當前頁面的路徑
    const currentDir = pathname.substring(0, pathname.lastIndexOf('/'));
    possibleUrls.push(
      `${origin}${currentDir}/tourism.sqlite`,
      `${origin}${currentDir}/../tourism.sqlite`,
      `${origin}${currentDir}/../../tourism.sqlite`
    );
    
    // 3. 本地開發環境
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      possibleUrls.push(
        '/tourism.sqlite',
        './tourism.sqlite',
        '/taiwan-activity/tourism.sqlite'
      );
    }
    
    // 4. CDN 備用方案
    possibleUrls.push(
      'https://cdn.jsdelivr.net/gh/TroyeXu/taiwan-activity@main/public/tourism.sqlite',
      'https://raw.githubusercontent.com/TroyeXu/taiwan-activity/main/public/tourism.sqlite'
    );
    
    // 去重
    const uniqueUrls = [...new Set(possibleUrls)];
    console.log('🔍 將嘗試以下 URL:', uniqueUrls);
    
    // 依序嘗試載入
    for (const url of uniqueUrls) {
      try {
        console.log(`📥 嘗試載入: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          cache: 'force-cache', // 使用快取
          headers: {
            'Accept': 'application/octet-stream, application/x-sqlite3, */*'
          }
        });
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          
          // 驗證是否為有效的 SQLite 檔案
          if (buffer.byteLength > 16) {
            const header = new Uint8Array(buffer, 0, 16);
            const magic = new TextDecoder().decode(header);
            
            if (magic.startsWith('SQLite format 3')) {
              console.log(`✅ 成功載入資料庫: ${url} (${buffer.byteLength} bytes)`);
              return buffer;
            }
          }
        }
        
        console.log(`❌ 載入失敗 (${response.status}): ${url}`);
      } catch (error) {
        console.log(`❌ 載入錯誤: ${url}`, error);
      }
    }
    
    throw new Error('無法載入資料庫：所有嘗試都失敗了');
  };
  
  return {
    loadDatabase
  };
};