# 資料庫設置說明

## 概述

本專案使用 SQLite 作為資料庫，搭配 Drizzle ORM 進行資料庫操作。由於 SQLite 檔案不會上傳到 GitHub，你需要在本地初始化資料庫。

## 快速開始

### 1. 初始化資料庫

第一次使用專案時，執行以下指令來建立資料庫：

```bash
npm run db:init
```

這個指令會：

- 建立 `database/tourism.sqlite` 檔案
- 執行資料庫遷移（建立所有資料表）
- 插入初始種子資料（分類、標籤等）

### 2. 載入測試資料（可選）

如果你想要載入更多測試資料來開發：

```bash
npm run db:fake
```

這會產生隨機的活動資料供測試使用。

## 資料庫指令

| 指令                  | 說明                               |
| --------------------- | ---------------------------------- |
| `npm run db:init`     | 初始化資料庫（遷移 + 種子資料）    |
| `npm run db:seed`     | 僅載入種子資料                     |
| `npm run db:fake`     | 產生假測試資料                     |
| `npm run db:reset`    | 重置資料庫（刪除並重建）           |
| `npm run db:studio`   | 開啟 Drizzle Studio 資料庫管理介面 |
| `npm run db:push`     | 推送 schema 變更到資料庫           |
| `npm run db:generate` | 產生新的遷移檔案                   |

## 資料庫結構

### 主要資料表

1. **activities** - 活動主表
   - 儲存活動基本資訊（名稱、描述、價格等）
   - 包含熱門度追蹤（瀏覽數、收藏數等）

2. **locations** - 地點資訊
   - 活動地點詳細資訊
   - 經緯度座標（用於地圖顯示）

3. **categories** - 活動分類
   - 預設分類：展覽、表演、節慶、市集等

4. **tags** - 標籤系統
   - 更細緻的活動標記

5. **users** - 使用者資料
   - 使用者基本資訊和偏好設定

6. **user_favorites** - 收藏記錄
   - 使用者收藏的活動

### 資料表關聯

```
activities ──┬── locations (1:1)
             ├── categories (M:N via activity_categories)
             ├── tags (M:N via activity_tags)
             ├── activity_times (1:1)
             └── data_sources (1:1)

users ────── user_favorites ──── activities
```

## 開發建議

### 查看資料庫內容

使用 Drizzle Studio 可視化介面：

```bash
npm run db:studio
```

開啟瀏覽器訪問 http://localhost:4983

### 修改資料庫結構

1. 修改 `db/schema.ts` 檔案
2. 產生遷移檔案：
   ```bash
   npm run db:generate
   ```
3. 執行遷移：
   ```bash
   npm run db:push
   ```

### 備份資料庫

SQLite 資料庫檔案位於 `database/tourism.sqlite`，可直接複製此檔案進行備份。

## 疑難排解

### 問題：找不到資料庫檔案

確保已執行初始化：

```bash
npm run db:init
```

### 問題：資料庫被鎖定

關閉所有使用資料庫的程式（開發伺服器、Drizzle Studio 等），然後重試。

### 問題：想要重新開始

使用重置指令：

```bash
npm run db:reset
```

## 生產環境

在生產環境中，建議：

1. 使用更強大的資料庫系統（如 PostgreSQL）
2. 設定定期備份
3. 監控資料庫效能

## 相關檔案

- `db/schema.ts` - 資料庫結構定義
- `db/index.ts` - 資料庫連接設定
- `drizzle.config.ts` - Drizzle ORM 設定
- `scripts/init-database.ts` - 初始化腳本
- `db/seeds/` - 種子資料
