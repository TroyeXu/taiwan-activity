# CSS 警告說明

## 問題描述

運行開發服務器時出現以下警告：
```
[@vue/compiler-sfc] the >>> and /deep/ combinators have been deprecated. Use :deep() instead.
```

## 原因

這些警告通常來自第三方套件（如 Element Plus）內部使用了過時的 CSS 深層選擇器語法。

- 舊語法：`>>>` 和 `/deep/`
- 新語法：`:deep()`

## 影響

這些警告**不會影響**應用程式的功能，只是提醒開發者使用新的語法。

## 解決方案

### 方案 1：更新依賴（推薦）
```bash
npm update element-plus @element-plus/nuxt
```

### 方案 2：抑制警告
在 `nuxt.config.ts` 中添加：
```typescript
export default defineNuxtConfig({
  vite: {
    vue: {
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('el-')
        }
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true
        }
      }
    }
  }
})
```

### 方案 3：等待上游修復
由於這是第三方套件的問題，可以等待 Element Plus 在新版本中修復。

## 如果你的代碼中使用了過時語法

將：
```css
/* 舊語法 */
.parent >>> .child { }
.parent /deep/ .child { }

/* 改為新語法 */
.parent :deep(.child) { }
```

在 Vue 3 的 `<style scoped>` 中：
```vue
<style scoped>
/* 舊語法 */
.parent >>> .child {
  color: red;
}

/* 新語法 */
.parent :deep(.child) {
  color: red;
}
</style>
```

## 結論

目前這些警告來自 Element Plus 內部，不影響使用。建議：
1. 定期更新依賴
2. 在自己的代碼中使用 `:deep()` 語法
3. 可以暫時忽略這些警告