import type { ValidationResult, ValidationIssue, Activity } from '../../app/types';

interface ClaudeValidationRequest {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface ClaudeValidationResponse {
  isValid: boolean;
  qualityScore: number;
  issues: ValidationIssue[];
  suggestions: Array<{
    field: string;
    suggestion: string;
    reason: string;
  }>;
  standardizedData?: Partial<Activity>;
}

export class ClaudeValidationService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    const config = useRuntimeConfig();
    this.apiKey = config.claudeApiKey || process.env.CLAUDE_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Claude API key not configured, validation service disabled');
    }
  }

  async validateActivity(rawData: any): Promise<ValidationResult> {
    if (!this.apiKey) {
      return this.createFallbackValidation(rawData);
    }

    try {
      // 基礎驗證
      const basicIssues = this.performBasicValidation(rawData);

      // Claude AI 深度驗證
      const claudeResult = await this.callClaudeAPI(rawData);

      // 計算品質分數
      const qualityScore = this.calculateQualityScore(rawData, [
        ...basicIssues,
        ...claudeResult.issues,
      ]);

      return {
        id: this.generateUUID(),
        originalData: rawData,
        validatedData: claudeResult.isValid
          ? this.standardizeData(rawData, claudeResult.standardizedData)
          : null,
        isValid:
          claudeResult.isValid && basicIssues.filter((i) => i.severity === 'error').length === 0,
        qualityScore,
        issues: [...basicIssues, ...claudeResult.issues],
        suggestions: claudeResult.suggestions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Claude validation failed:', error);
      // 降級到基礎驗證
      return this.createFallbackValidation(rawData);
    }
  }

  private async callClaudeAPI(data: any): Promise<ClaudeValidationResponse> {
    const prompt = this.buildValidationPrompt(data);

    const request: ClaudeValidationRequest = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return this.parseClaudeResponse(result.content[0]?.text || '');
  }

  private buildValidationPrompt(data: any): string {
    return `
請驗證以下台灣觀光活動資料的品質和正確性：

${JSON.stringify(data, null, 2)}

請檢查以下項目並以 JSON 格式回應：
1. 必要欄位完整性 (名稱、地址、時間)
2. 地址格式是否符合台灣地址格式
3. 時間邏輯是否合理 (開始時間不晚於結束時間)
4. 活動內容描述是否真實可信
5. 聯絡資訊格式是否正確
6. 地理座標是否在台灣範圍內

回應格式：
{
  "isValid": boolean,
  "qualityScore": number (0-100),
  "issues": [
    {
      "field": "欄位名稱",
      "type": "missing|invalid|suspicious|format",
      "severity": "error|warning|info",
      "message": "問題描述"
    }
  ],
  "suggestions": [
    {
      "field": "欄位名稱", 
      "suggestion": "改善建議",
      "reason": "建議原因"
    }
  ],
  "standardizedData": {
    // 標準化後的資料建議
  }
}

注意：
- error 等級的問題會導致 isValid: false
- 品質分數考慮完整性、準確性、可信度
- 建議具體可行的改善方案
`;
  }

  private parseClaudeResponse(responseText: string): ClaudeValidationResponse {
    try {
      // 嘗試解析 JSON 回應
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果無法解析，回傳預設結果
      return {
        isValid: false,
        qualityScore: 30,
        issues: [
          {
            field: 'general',
            type: 'invalid',
            severity: 'error',
            message: '無法解析驗證回應',
          },
        ],
        suggestions: [],
      };
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return {
        isValid: false,
        qualityScore: 20,
        issues: [
          {
            field: 'general',
            type: 'invalid',
            severity: 'error',
            message: 'Claude 回應格式錯誤',
          },
        ],
        suggestions: [],
      };
    }
  }

  private performBasicValidation(data: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 必要欄位檢查
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      issues.push({
        field: 'name',
        type: 'missing',
        severity: 'error',
        message: '活動名稱為必填欄位',
      });
    }

    if (!data.location?.address) {
      issues.push({
        field: 'location.address',
        type: 'missing',
        severity: 'error',
        message: '活動地址為必填欄位',
      });
    }

    if (!data.time?.startDate) {
      issues.push({
        field: 'time.startDate',
        type: 'missing',
        severity: 'error',
        message: '活動開始日期為必填欄位',
      });
    }

    // 地理座標檢查 (台灣範圍)
    if (data.location?.latitude && data.location?.longitude) {
      const lat = parseFloat(data.location.latitude);
      const lng = parseFloat(data.location.longitude);

      if (lat < 21.8 || lat > 25.4 || lng < 119.3 || lng > 122.1) {
        issues.push({
          field: 'location.coordinates',
          type: 'invalid',
          severity: 'warning',
          message: '座標位置可能不在台灣範圍內',
        });
      }
    }

    // 時間邏輯檢查
    if (data.time?.startDate && data.time?.endDate) {
      const startDate = new Date(data.time.startDate);
      const endDate = new Date(data.time.endDate);

      if (startDate > endDate) {
        issues.push({
          field: 'time',
          type: 'invalid',
          severity: 'error',
          message: '開始時間不能晚於結束時間',
        });
      }
    }

    return issues;
  }

  private calculateQualityScore(data: any, issues: ValidationIssue[]): number {
    let score = 100;

    // 扣分規則
    issues.forEach((issue) => {
      switch (issue.severity) {
        case 'error':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 5;
          break;
      }
    });

    // 完整性加分
    const completenessBonus = this.calculateCompletenessBonus(data);
    score = Math.min(100, score + completenessBonus);

    return Math.max(0, Math.round(score));
  }

  private calculateCompletenessBonus(data: any): number {
    let bonus = 0;

    // 檢查可選欄位完整性
    if (data.description) bonus += 5;
    if (data.summary) bonus += 3;
    if (data.location?.venue) bonus += 3;
    if (data.time?.startTime) bonus += 2;
    if (data.time?.endTime) bonus += 2;
    if (data.categories?.length > 0) bonus += 5;
    if (data.media?.images?.length > 0) bonus += 5;

    return Math.min(20, bonus);
  }

  private standardizeData(
    originalData: any,
    claudeSuggestions?: Partial<Activity>
  ): Partial<Activity> {
    const standardized = { ...originalData };

    // 標準化地址格式
    if (standardized.location?.address) {
      standardized.location.address = this.standardizeAddress(standardized.location.address);
    }

    // 標準化類別
    if (standardized.categories) {
      standardized.categories = this.standardizeCategories(standardized.categories);
    }

    // 合併 Claude 建議
    if (claudeSuggestions) {
      Object.assign(standardized, claudeSuggestions);
    }

    return standardized;
  }

  private standardizeAddress(address: string): string {
    // 移除多餘空格
    return address.trim().replace(/\s+/g, ' ');
  }

  private standardizeCategories(categories: any[]): any[] {
    const categoryMapping: Record<string, string> = {
      節慶活動: '傳統節慶',
      文化活動: '藝術文化',
      美食活動: '美食饗宴',
      自然活動: '自然生態',
      養生活動: '養生樂活',
    };

    return categories.map((cat) => ({
      ...cat,
      name: categoryMapping[cat.name] || cat.name,
    }));
  }

  private createFallbackValidation(data: any): ValidationResult {
    const issues = this.performBasicValidation(data);
    const qualityScore = this.calculateQualityScore(data, issues);

    return {
      id: this.generateUUID(),
      originalData: data,
      validatedData:
        issues.filter((i) => i.severity === 'error').length === 0
          ? this.standardizeData(data)
          : null,
      isValid: issues.filter((i) => i.severity === 'error').length === 0,
      qualityScore,
      issues,
      suggestions: [],
      timestamp: new Date().toISOString(),
    };
  }

  private generateUUID(): string {
    return 'val_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// 驗證結果類型
