<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import SwapPhase from './SwapPhase.vue';
import TurnTimer from './TurnTimer.vue';

const router = useRouter();
const { gameView, turnTimeRemaining } = useGameSocket();

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
    <div
      v-else-if="gameView.phase === 'playing'"
      class="min-h-screen flex flex-col items-center justify-center bg-green-900 text-white gap-4"
    >
      <TurnTimer
        :time-remaining="turnTimeRemaining"
        :total-time="45"
      />
      <div class="text-2xl font-bold">
        Game in progress...
      </div>
    </div>

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
