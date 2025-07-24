# Cookie 政策與隱私權保護文件

## 1. 隱私權政策

### 1.1 資訊收集與使用

#### 1.1.1 自動收集的資訊
```
位置資訊：
- GPS 座標（需要使用者同意）
- IP 位址地理位置
- 用於提供附近活動推薦

瀏覽行為：
- 瀏覽的活動頁面
- 搜尋關鍵字
- 篩選偏好設定
- 用於改善推薦演算法

技術資訊：
- 裝置類型與作業系統
- 瀏覽器類型與版本
- 螢幕解析度
- 用於優化使用者體驗
```

#### 1.1.2 主動提供的資訊
```
帳戶資訊（選填）：
- 電子郵件地址
- 暱稱
- 用於收藏功能與個人化服務

回饋資訊：
- 活動評價
- 錯誤回報
- 功能建議
- 用於改善服務品質
```

### 1.2 資料保護措施

#### 1.2.1 技術保護
- 採用 HTTPS 加密傳輸
- 敏感資料加密儲存
- 定期安全漏洞掃描
- 存取權限控制

#### 1.2.2 政策保護
- 最少必要原則收集資料
- 資料保存期限管理
- 員工資料處理培訓
- 第三方合作商審查

### 1.3 使用者權利

#### 1.3.1 資料控制權
- 查閱個人資料
- 更正錯誤資訊
- 刪除帳戶資料
- 停止資料處理

#### 1.3.2 同意管理
- 隨時撤回位置同意
- 調整 Cookie 設定
- 選擇不接收推薦

## 2. Cookie 使用政策

### 2.1 Cookie 類型說明

#### 2.1.1 必要 Cookies
```javascript
// 功能性 Cookies（不需同意）
const essentialCookies = {
  'session_id': {
    purpose: '維持使用者登入狀態',
    duration: '瀏覽器關閉後刪除',
    data: '隨機產生的識別碼'
  },
  
  'csrf_token': {
    purpose: '防止跨站請求攻擊',
    duration: '24小時',
    data: '安全令牌'
  },
  
  'preferences': {
    purpose: '記住語言和地區設定',
    duration: '1年',
    data: '語言代碼、地區代碼'
  }
};
```

#### 2.1.2 功能性 Cookies
```javascript
// 需要同意的功能性 Cookies
const functionalCookies = {
  'search_history': {
    purpose: '記住最近的搜尋條件',
    duration: '30天',
    data: '搜尋關鍵字、篩選條件',
    impact: '提供快速搜尋建議'
  },
  
  'map_preferences': {
    purpose: '記住地圖檢視偏好',
    duration: '90天',
    data: '地圖類型、縮放層級、中心點',
    impact: '下次開啟時顯示相同檢視'
  },
  
  'favorites': {
    purpose: '儲存收藏的活動（未登入用戶）',
    duration: '180天',
    data: '活動ID清單',
    impact: '跨瀏覽記住收藏內容'
  }
};
```

#### 2.1.3 分析 Cookies
```javascript
// 分析用 Cookies
const analyticsCookies = {
  'ga_tracking': {
    purpose: 'Google Analytics 使用統計',
    duration: '26個月',
    data: '匿名使用者識別碼、頁面瀏覽記錄',
    thirdParty: 'Google',
    impact: '協助改善網站效能與功能'
  },
  
  'usage_analytics': {
    purpose: '內部使用行為分析',
    duration: '12個月',
    data: '點擊熱點、停留時間、轉換路徑',
    impact: '優化使用者體驗設計'
  }
};
```

#### 2.1.4 行銷 Cookies
```javascript
// 行銷用 Cookies（可選）
const marketingCookies = {
  'personalization': {
    purpose: '個人化活動推薦',
    duration: '12個月',
    data: '瀏覽偏好、互動歷史',
    impact: '提供更符合興趣的活動建議'
  },
  
  'social_sharing': {
    purpose: '社群媒體分享功能',
    duration: '30天',
    data: '分享偏好設定',
    thirdParty: 'Facebook, LINE',
    impact: '記住分享平台偏好'
  }
};
```

### 2.2 Cookie 同意機制

#### 2.2.1 同意橫幅設計
```
┌────────────────────────────────────────────────────────────┐
│ 🍪 此網站使用 Cookies                                      │
│                                                             │
│ 我們使用 cookies 來提供更好的使用體驗。您可以選擇接受      │
│ 全部或僅接受必要的 cookies。                                │
│                                                             │
│ [Cookie 設定] [接受全部] [僅接受必要]                      │
│                                                             │
│ 詳細資訊請參閱我們的 [隱私權政策] [Cookie 政策]            │
└────────────────────────────────────────────────────────────┘
```

#### 2.2.2 詳細設定頁面
```
Cookie 偏好設定

✅ 必要 Cookies （無法關閉）
   維持網站基本功能運作所必需的 cookies

□ 功能性 Cookies
   提升使用便利性，如記住搜尋偏好

□ 分析 Cookies  
   協助我們了解網站使用情況以改善服務

□ 行銷 Cookies
   提供個人化推薦與社群分享功能

[儲存設定] [全部接受] [全部拒絕]
```

### 2.3 技術實作

#### 2.3.1 同意管理系統
```typescript
interface CookieConsent {
  essential: boolean;     // 永遠為 true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: Date;
  version: string;       // 政策版本
}

class CookieManager {
  private consent: CookieConsent;
  
  // 初始化同意狀態
  initializeConsent(): CookieConsent {
    const saved = localStorage.getItem('cookieConsent');
    
    if (saved) {
      const consent = JSON.parse(saved);
      // 檢查政策版本是否更新
      if (consent.version !== CURRENT_POLICY_VERSION) {
        return this.requestConsent();
      }
      return consent;
    }
    
    return this.requestConsent();
  }
  
  // 設定 Cookie 前檢查同意狀態
  setCookie(name: string, value: string, category: CookieCategory): void {
    if (this.hasConsent(category)) {
      document.cookie = `${name}=${value}; path=/; secure; samesite=strict`;
    }
  }
  
  // 檢查特定類別是否有同意
  hasConsent(category: CookieCategory): boolean {
    switch (category) {
      case 'essential': return true;
      case 'functional': return this.consent.functional;
      case 'analytics': return this.consent.analytics;
      case 'marketing': return this.consent.marketing;
    }
  }
  
  // 更新同意狀態
  updateConsent(newConsent: Partial<CookieConsent>): void {
    this.consent = { ...this.consent, ...newConsent, timestamp: new Date() };
    localStorage.setItem('cookieConsent', JSON.stringify(this.consent));
    
    // 清除不同意類別的 cookies
    this.cleanupCookies();
    
    // 重新載入分析工具
    this.reloadAnalytics();
  }
}
```

#### 2.3.2 分析工具條件載入
```typescript
class AnalyticsManager {
  private cookieManager: CookieManager;
  
  // 條件性載入 Google Analytics
  loadGoogleAnalytics(): void {
    if (this.cookieManager.hasConsent('analytics')) {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
      script.async = true;
      document.head.appendChild(script);
      
      window.gtag = function() { dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA_TRACKING_ID, {
        anonymize_ip: true,
        cookie_flags: 'secure;samesite=strict'
      });
    }
  }
  
  // 內部分析工具
  trackEvent(event: string, data: any): void {
    if (this.cookieManager.hasConsent('analytics')) {
      // 發送匿名化的使用行為資料
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          data: this.anonymizeData(data),
          timestamp: Date.now()
        })
      });
    }
  }
  
  private anonymizeData(data: any): any {
    // 移除個人識別資訊
    const { ip, userId, email, ...anonymized } = data;
    return anonymized;
  }
}
```

## 3. 合規性檢查清單

### 3.1 GDPR 合規性
- ✅ 明確的同意機制
- ✅ 資料處理目的說明
- ✅ 撤回同意權利
- ✅ 資料可攜權
- ✅ 被遺忘權
- ✅ 資料保護影響評估

### 3.2 個人資料保護法合規性
- ✅ 告知義務履行
- ✅ 合法收集與使用
- ✅ 資料安全維護
- ✅ 當事人權利保障

### 3.3 技術合規性
- ✅ Cookie 分類管理
- ✅ 同意記錄保存
- ✅ 第三方服務控制
- ✅ 資料最小化原則

## 4. 定期檢核機制

### 4.1 政策更新流程
1. **法規變更監控**
   - 定期檢查相關法規更新
   - 評估對現有政策的影響

2. **政策修訂**
   - 必要時更新隱私政策
   - 修訂 Cookie 使用說明

3. **使用者通知**
   - 重大變更前 30 天通知
   - 更新同意機制版本

### 4.2 合規性稽核
- **每季度**：內部合規性檢查
- **每半年**：第三方安全稽核
- **每年度**：法務合規性評估

## 5. 緊急應變計畫

### 5.1 資料外洩應變
1. **即時應變**（1小時內）
   - 停止資料外洩
   - 評估影響範圍
   - 通知相關人員

2. **通報程序**（72小時內）
   - 向主管機關通報
   - 評估是否需通知當事人

3. **後續處理**
   - 強化安全措施
   - 更新應變程序

### 5.2 法規變更應變
- 建立法規監控機制
- 制定快速更新流程
- 預備合規性調整方案

這份文件確保觀光活動地圖平台在隱私權保護和 Cookie 使用方面符合相關法規要求，保障使用者權益。