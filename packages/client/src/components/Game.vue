<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import { PlatformKey } from '../platform';
import SwapPhase from './SwapPhase.vue';
import PlayingPhase from './PlayingPhase.vue';

const router = useRouter();
const platform = inject(PlatformKey);
const { gameView, shitheadNickname, send, onMessage, isSpectator, spectatorGameView } = useGameSocket();
const showLeaveConfirm = ref(false);

// Guard against direct URL access without game state
onMounted(() => {
  if (!gameView.value && !isSpectator.value) {
    router.push('/');
  }
});

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

// Listen for return-to-lobby message to navigate back to lobby (platform-aware)
const unregisterHandler = onMessage((msg) => {
  if (msg.type === 'return-to-lobby') {
    if (platform === 'discord') {
      router.push('/discord-lobby');
    } else {
      router.push(`/room/${msg.room.code}`);
    }
  }
});

onUnmounted(() => {
  unregisterHandler();
});
</script>

<template>
  <!-- Spectator View -->
  <div
    v-if="isSpectator && spectatorGameView"
    class="flex flex-col bg-green-900 text-white overflow-hidden h-full"
  >
    <!-- Spectator Banner -->
    <div class="bg-yellow-600/80 text-center py-2 px-4 text-sm font-medium">
      Spectating &mdash; you'll join next game
    </div>

    <!-- Simplified game view for spectators (public info only) -->
    <div class="flex-1 flex flex-col items-center justify-center px-4">
      <p class="text-gray-300 text-lg mb-4">
        Game in progress
      </p>
      <p class="text-gray-400 text-sm">
        {{ spectatorGameView.opponents.length }} players active
      </p>
    </div>
  </div>

  <!-- Normal Player View -->
  <div v-else-if="gameView">
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
          class="text-3xl font-bold text-yellow-400 mb-4"
        >
          {{ shitheadNickname }} &#128169;
        </div>
        <p class="text-gray-300 text-sm animate-pulse">
          Returning to lobby...
        </p>
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
      <div class="bg-white rounded-xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl">
        <h2 class="text-xl font-bold text-gray-900 mb-2">
          Leave this game?
        </h2>
        <p class="text-gray-500 text-sm mb-6">
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
            class="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-all"
            @click="cancelLeave"
          >
            Stay
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
