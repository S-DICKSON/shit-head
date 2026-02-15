<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import SwapPhase from './SwapPhase.vue';
import PlayingPhase from './PlayingPhase.vue';

const router = useRouter();
const { gameView, shitheadNickname, send, onMessage } = useGameSocket();
const playAgainClicked = ref(false);

// Guard against direct URL access without game state
onMounted(() => {
  if (!gameView.value) {
    router.push('/');
  }
});

// Handle play again
const handlePlayAgain = () => {
  playAgainClicked.value = true;
  send({ type: 'play-again' });
};

// Handle leave
const handleLeave = () => {
  send({ type: 'leave-room' });
  localStorage.removeItem('shithead-room-code');
  router.push('/');
};

// Listen for return-to-lobby message to navigate back to lobby
const unregisterHandler = onMessage((msg) => {
  if (msg.type === 'return-to-lobby') {
    router.push(`/room/${msg.room.code}`);
  }
});

onUnmounted(() => {
  unregisterHandler();
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
      <div class="text-center">
        <div class="text-4xl font-bold mb-4">
          Game Over
        </div>
        <div
          v-if="shitheadNickname"
          class="text-3xl font-bold text-yellow-400 mb-8"
        >
          Loser! {{ shitheadNickname }} 💩
        </div>
        <div class="flex flex-col gap-4 items-center">
          <button
            :disabled="playAgainClicked"
            class="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-60
                   text-white font-bold text-lg rounded-lg transition-all shadow-md"
            @click="handlePlayAgain"
          >
            {{ playAgainClicked ? 'Waiting for others...' : 'Play Again' }}
          </button>
          <button
            class="px-6 py-2 text-red-300 hover:text-red-100 hover:underline text-sm"
            @click="handleLeave"
          >
            Leave Room
          </button>
        </div>
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
