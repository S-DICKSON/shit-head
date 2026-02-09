<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  timeRemaining: number;
  totalTime: number;
}>();

const radius = 28;
const circumference = 2 * Math.PI * radius;

const strokeOffset = computed(() => {
  const progress = props.timeRemaining / props.totalTime;
  return circumference * (1 - progress);
});
</script>

<template>
  <div class="timer-fixed w-12 h-12 sm:w-16 sm:h-16">
    <svg
      class="w-full h-full"
      viewBox="0 0 64 64"
    >
      <!-- Background circle (track) -->
      <circle
        cx="32"
        cy="32"
        :r="radius"
        stroke="#374151"
        stroke-width="4"
        fill="none"
      />
      <!-- Progress circle (depletes as time runs out) -->
      <circle
        cx="32"
        cy="32"
        :r="radius"
        stroke="#3b82f6"
        stroke-width="4"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeOffset"
        stroke-linecap="round"
        transform="rotate(-90 32 32)"
        class="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
    <!-- Centered text showing seconds -->
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-xs sm:text-sm font-bold text-white">{{ timeRemaining }}</span>
    </div>
  </div>
</template>

<style scoped>
.timer-fixed {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 40;
}

@supports (padding: env(safe-area-inset-bottom)) {
  .timer-fixed {
    bottom: max(1rem, env(safe-area-inset-bottom));
    right: max(1rem, env(safe-area-inset-right));
  }
}
</style>
