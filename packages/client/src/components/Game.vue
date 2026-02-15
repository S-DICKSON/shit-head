<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import SwapPhase from './SwapPhase.vue';
import PlayingPhase from './PlayingPhase.vue';

const router = useRouter();
const { gameView, shitheadNickname, send, onMessage } = useGameSocket();
const playAgainClicked = ref(false);
const showLeaveConfirm = ref(false);

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

// Handle leave request (shows confirmation modal)
const requestLeave = () => {
  showLeaveConfirm.value = true;
};

// Cancel leave (dismisses modal)
const cancelLeave = () => {
  showLeaveConfirm.value = false;
};

// Confirm leave (executes leave and dismisses modal)
const confirmLeave = () => {
  showLeaveConfirm.value = false;
  handleLeave();
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
      @leave="requestLeave"
    />

    <!-- Playing Phase -->
    <PlayingPhase
      v-else-if="gameView.phase === 'playing'"
      @leave="requestLeave"
    />

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

    <!-- Leave Confirmation Modal -->
    <div
      v-if="showLeaveConfirm"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    >
      <div class="bg-gray-800 rounded-xl p-6 mx-4 max-w-sm w-full text-center">
        <h2 class="text-xl font-bold mb-2">
          Leave this game?
        </h2>
        <p class="text-gray-300 text-sm mb-6">
          You'll lose your place in this game.
        </p>
        <div class="flex gap-3 justify-center">
          <button
            class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all"
            @click="confirmLeave"
          >
            Leave
          </button>
          <button
            class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all"
            @click="cancelLeave"
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
