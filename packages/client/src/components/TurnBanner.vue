<template>
  <div class="flex justify-center pointer-events-none">
    <div
      class="bg-yellow-400 text-black font-bold text-lg px-6 py-2 rounded-full shadow-lg transition-opacity duration-200"
      :class="visible ? 'opacity-100' : 'opacity-0'"
    >
      YOUR TURN
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useSoundEffects } from '../composables/useSoundEffects';

const props = defineProps<{
  visible: boolean;
}>();

const { playTurnNotification } = useSoundEffects();

// Play notification sound when banner becomes visible
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      playTurnNotification();
    }
  }
);
</script>

<style scoped>
.banner-enter-active {
  transition: transform 300ms ease-out, opacity 300ms ease-out;
}

.banner-leave-active {
  transition: transform 200ms ease-in, opacity 200ms ease-in;
}

.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.banner-enter-to {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .banner-enter-active,
  .banner-leave-active {
    transition-duration: 0ms;
  }
}
</style>
