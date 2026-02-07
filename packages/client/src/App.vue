<script setup lang="ts">
import { APP_VERSION } from '@shit-head/shared'

const version = APP_VERSION
</script>

<template>
  <div class="min-h-screen bg-green-900 flex items-center justify-center">
    <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
      <h1 class="text-4xl font-bold text-gray-800">Shithead Online</h1>
      <p class="text-gray-500 mt-2">v{{ version }}</p>
    </div>
  </div>
</template>
