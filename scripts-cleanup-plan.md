# Scripts 清理計畫

## 現有腳本分析

### 1. scripts/init-database.ts ✅ 保留
- **用途**：初始化資料庫、執行遷移、插入種子資料
- **狀態**：與當前架構相符，正常運作
- **建議**：保留

### 2. scripts/setup-database.ts ❌ 刪除
- **問題**：
  - 使用錯誤的資料庫路徑 (`data/tourism.db` vs `database/tourism.sqlite`)
  - 嘗試載入不需要的 SpatiaLite 擴展
  - 功能與 init-database.ts 重複
- **建議**：刪除

## 建議的 package.json scripts

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "generate": "nuxt generate",
    "postinstall": "nuxt prepare",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "nuxt typecheck",
    
    // 資料庫相關命令
    "db:init": "tsx scripts/init-database.ts",
    "db:reset": "rm -f ./database/tourism.sqlite && tsx scripts/init-database.ts",
    "db:seed": "tsx scripts/init-database.ts",
    
    // 清理命令
    "clean": "rm -rf .nuxt .output node_modules/.cache",
    "clean:all": "rm -rf .nuxt .output node_modules database/tourism.sqlite"
  }
}
```

## 執行步驟

1. 刪除不需要的腳本：
   ```bash
   rm scripts/setup-database.ts
   ```

2. 更新 package.json 的 scripts 部分

3. 確保 init-database.ts 使用正確的路徑和導入

## 其他建議

1. 考慮添加 `scripts/check-env.ts` 來檢查環境變數（如果需要）
2. 考慮添加 `scripts/backup-database.ts` 來備份資料庫
3. 保持腳本簡單且單一用途