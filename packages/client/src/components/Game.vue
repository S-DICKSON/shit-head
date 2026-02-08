<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import SwapPhase from './SwapPhase.vue';
import PlayingPhase from './PlayingPhase.vue';

const router = useRouter();
const { gameView } = useGameSocket();

// Guard against direct URL access without game state
onMounted(() => {
  if (!gameView.value) {
    router.push('/');
  }
});
</script>

<template>
  <div v-if="gameView">
    <!-- Swap Phase -->
    <SwapPhase
      v-if="gameView.phase === 'swapping' || gameView.phase === 'transitioning'"
    />

    <!-- Playing Phase -->
    <PlayingPhase v-else-if="gameView.phase === 'playing'" />

    <!-- Finished Phase -->
    <div
      v-else-if="gameView.phase === 'finished'"
      class="min-h-screen flex items-center justify-center bg-green-900 text-white"
    >
      <div class="text-2xl font-bold">
        Game Over
      </div>
    </div>

    <!-- Fallback -->
    <div
      v-else
      class="min-h-screen flex items-center justify-center bg-green-900 text-white"
    >
      <div class="text-2xl font-bold">
        Loading...
      </div>
    </div>
  </div>
</template>
