export default defineNitroConfig({
  // 確保資料庫檔案被複製到輸出目錄
  publicAssets: [
    {
      baseURL: '/',
      dir: 'public',
      maxAge: 31536000 // 1年快取
    }
  ],
  
  // 在構建後複製資料庫檔案
  hooks: {
    'nitro:build:public-assets': async (nitro) => {
      console.log('📦 複製資料庫檔案到輸出目錄...');
    }
  }
});