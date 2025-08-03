<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
      <h1 class="text-2xl font-bold text-red-600 mb-4">錯誤發生</h1>
      <div class="text-gray-600 mb-4">
        <p>{{ error.message || '發生了未知錯誤' }}</p>
        <p class="text-sm mt-2" v-if="error.statusCode">錯誤代碼: {{ error.statusCode }}</p>
      </div>
      <div class="flex gap-4">
        <button
          @click="handleError"
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          返回首頁
        </button>
        <button
          @click="clearError({ redirect: '/' })"
          class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          清除錯誤
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: Object,
});

const handleError = () => clearError({ redirect: '/' });
</script>
