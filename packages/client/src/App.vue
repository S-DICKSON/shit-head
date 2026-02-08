<script setup lang="ts">
import NotificationToast from './components/NotificationToast.vue';
</script>

<template>
  <div class="min-h-screen bg-green-900">
    <RouterView />
    <NotificationToast />
  </div>
</template>
