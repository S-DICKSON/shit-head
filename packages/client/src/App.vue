<script setup lang="ts">
import NotificationToast from './components/NotificationToast.vue'
import CustomCursor from './components/CustomCursor.vue';
</script>

<template>
  <div class="min-h-screen bg-green-900">
    <CustomCursor />
    <RouterView />
    <NotificationToast />
  </div>
</template>