<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  timeRemaining: number;
  totalTime: number;
}>();

const radius = 36;
const circumference = 2 * Math.PI * radius;

const strokeOffset = computed(() => {
  const progress = props.timeRemaining / props.totalTime;
  return circumference * (1 - progress);
});
</script>

<template>
  <div class="relative inline-block w-20 h-20">
    <svg width="80" height="80" viewBox="0 0 80 80">
      <!-- Background circle (track) -->
      <circle
        cx="40"
        cy="40"
        :r="radius"
        stroke="#374151"
        stroke-width="6"
        fill="none"
      />
      <!-- Progress circle (depletes as time runs out) -->
      <circle
        cx="40"
        cy="40"
        :r="radius"
        stroke="#3b82f6"
        stroke-width="6"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeOffset"
        stroke-linecap="round"
        transform="rotate(-90 40 40)"
        class="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
    <!-- Centered text showing seconds -->
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-xl font-bold text-white">{{ timeRemaining }}s</span>
    </div>
  </div>
</template>
