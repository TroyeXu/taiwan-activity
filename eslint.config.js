import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/database/**',
      '**/*.min.js',
      '**/coverage/**',
      '**/.nitro/**',
      '**/logs/**',
      '**/.git/**',
    ],
  },

  // Base configuration for all files
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.vue'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        // Nuxt auto-imports
        $fetch: 'readonly',
        defineNuxtConfig: 'readonly',
        defineNuxtPlugin: 'readonly',
        definePageMeta: 'readonly',
        defineRouteRules: 'readonly',
        navigateTo: 'readonly',
        useAsyncData: 'readonly',
        useCookie: 'readonly',
        useError: 'readonly',
        useFetch: 'readonly',
        useHead: 'readonly',
        useLazyAsyncData: 'readonly',
        useLazyFetch: 'readonly',
        useNuxtApp: 'readonly',
        useNuxtData: 'readonly',
        useRoute: 'readonly',
        useRouter: 'readonly',
        useRuntimeConfig: 'readonly',
        useState: 'readonly',
        clearError: 'readonly',
        createError: 'readonly',
        preloadRouteComponents: 'readonly',
        refreshNuxtData: 'readonly',
        abortNavigation: 'readonly',
        setPageLayout: 'readonly',
        showError: 'readonly',
        // Vue auto-imports
        computed: 'readonly',
        defineComponent: 'readonly',
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        defineSlots: 'readonly',
        h: 'readonly',
        inject: 'readonly',
        nextTick: 'readonly',
        onBeforeMount: 'readonly',
        onBeforeUnmount: 'readonly',
        onBeforeUpdate: 'readonly',
        onErrorCaptured: 'readonly',
        onMounted: 'readonly',
        onServerPrefetch: 'readonly',
        onUnmounted: 'readonly',
        onUpdated: 'readonly',
        provide: 'readonly',
        reactive: 'readonly',
        readonly: 'readonly',
        ref: 'readonly',
        resolveComponent: 'readonly',
        shallowReactive: 'readonly',
        shallowReadonly: 'readonly',
        shallowRef: 'readonly',
        toRaw: 'readonly',
        toRef: 'readonly',
        toRefs: 'readonly',
        triggerRef: 'readonly',
        unref: 'readonly',
        useAttrs: 'readonly',
        useCssModule: 'readonly',
        useCssVars: 'readonly',
        useSlots: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        watchPostEffect: 'readonly',
        watchSyncEffect: 'readonly',
        isProxy: 'readonly',
        isReactive: 'readonly',
        isReadonly: 'readonly',
        isRef: 'readonly',
        markRaw: 'readonly',
        // VueUse auto-imports
        useGeolocation: 'readonly',
        // Element Plus auto-imports
        ElMessage: 'readonly',
        ElMessageBox: 'readonly',
        ElNotification: 'readonly',
        ElLoading: 'readonly',
        // Custom composables
        useActivitiesClient: 'readonly',
        useCategoriesClient: 'readonly',
        useFavorites: 'readonly',
        useFilters: 'readonly',
        // NodeJS
        NodeJS: 'readonly',
        // Nuxt server auto-imports
        defineEventHandler: 'readonly',
        getQuery: 'readonly',
        getRouterParam: 'readonly',
        getRouterParams: 'readonly',
        readBody: 'readonly',
        getHeader: 'readonly',
        getHeaders: 'readonly',
        setHeader: 'readonly',
        setHeaders: 'readonly',
        setCookie: 'readonly',
        parseCookies: 'readonly',
        deleteCookie: 'readonly',
        sendRedirect: 'readonly',
        sendError: 'readonly',
        getClientIP: 'readonly',
        setResponseStatus: 'readonly',
        defineNitroPlugin: 'readonly',
        defineCachedEventHandler: 'readonly',
        defineCachedFunction: 'readonly',
        cachedEventHandler: 'readonly',
        cachedFunction: 'readonly',
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Use TypeScript ESLint recommended rules
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
        },
      ],
    },
  },

  // Vue configuration
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      vue,
      '@typescript-eslint': typescript,
    },
    rules: {
      // Vue rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/html-indent': ['error', 2],
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
            normal: 'never',
            component: 'always',
          },
        },
      ],

      // TypeScript rules for Vue files
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Prettier config (disables conflicting rules)
  prettierConfig,
];
