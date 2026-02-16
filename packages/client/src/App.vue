<script setup lang="ts">
import NotificationToast from './components/NotificationToast.vue';
import ConnectionStatus from './components/ConnectionStatus.vue';
</script>

<template>
  <div class="min-h-screen bg-green-900">
    <RouterView />
    <NotificationToast />
    <ConnectionStatus />
  </div>
</template>
