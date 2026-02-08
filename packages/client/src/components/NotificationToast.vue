<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useGameSocket } from '../composables/useGameSocket';

const { notifications, dismissNotification } = useGameSocket();

// Auto-dismiss notifications after 5 seconds
let intervalId: ReturnType<typeof setInterval>;

onMounted(() => {
  intervalId = setInterval(() => {
    const now = Date.now();
    notifications.value = notifications.value.filter(
      (n) => now - n.timestamp < 5000
    );
  }, 1000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});

const severityClasses = {
  info: 'bg-blue-600 border-blue-700 text-white',
  warning: 'bg-yellow-500 border-yellow-600 text-white',
  success: 'bg-green-600 border-green-700 text-white',
  error: 'bg-red-600 border-red-700 text-white',
};
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
    <TransitionGroup name="toast">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'px-4 py-3 rounded-lg shadow-lg border cursor-pointer text-sm font-medium',
          severityClasses[notification.severity],
        ]"
        @click="dismissNotification(notification.id)"
      >
        {{ notification.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.3s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
