<script setup lang="ts">
import NotificationToast from './components/NotificationToast.vue';
import ConnectionStatus from './components/ConnectionStatus.vue';
</script>

<template>
  <div
    class="bg-green-900"
    style="height: 100vh; height: 100dvh; overflow: hidden; padding-top: var(--safe-top); padding-bottom: var(--safe-bottom); padding-left: var(--safe-left); padding-right: var(--safe-right);"
  >
    <RouterView />
    <NotificationToast />
    <ConnectionStatus />
  </div>
</template>
