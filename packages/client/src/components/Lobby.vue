<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import RoomCode from './RoomCode.vue';

const route = useRoute();
const router = useRouter();
const { send, onMessage, roomState, playerId } = useGameSocket();

// Component state
const countdown = ref<number | null>(null);

// Computed states
const isHost = computed(() => {
  if (!roomState.value || !playerId.value) return false;
  return roomState.value.hostId === playerId.value;
});

const canStartGame = computed(() => {
  if (!roomState.value) return false;
  return roomState.value.players.length >= roomState.value.minPlayers;
});

const playerCount = computed(() => {
  if (!roomState.value) return '0';
  return `${roomState.value.players.length}/${roomState.value.maxPlayers}`;
});

// Actions
const startGame = () => {
  if (!isHost.value || !canStartGame.value) return;
  send({ type: 'start-game' });
};

const leaveRoom = () => {
  send({ type: 'leave-room' });
  router.push('/');
};

// Check if player has joined a room on mount
onMounted(() => {
  if (!roomState.value || !playerId.value) {
    // No room state, redirect to landing
    router.push('/');
  }
});

// Register message handlers
const unregister = onMessage((msg) => {
  if (msg.type === 'error' && msg.code === 'ROOM_NOT_FOUND') {
    roomState.value = null;
    router.push('/');
    return;
  }

  if (msg.type === 'game-starting') {
    countdown.value = msg.countdown;
    // Countdown timer
    const timer = setInterval(() => {
      if (countdown.value !== null && countdown.value > 0) {
        countdown.value--;
      } else {
        clearInterval(timer);
      }
    }, 1000);
  }

  if (msg.type === 'game-dealt') {
    countdown.value = null;
    router.push('/game');
  }
});

// Cleanup on unmount
onUnmounted(() => {
  unregister();
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
      <!-- Room Code Section -->
      <RoomCode v-if="roomState" :code="roomState.code" />

      <!-- Divider -->
      <div class="my-6 border-t border-gray-300"></div>

      <!-- Players Section -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800">Players {{ playerCount }}</h2>
          <button
            @click="leaveRoom"
            class="text-sm text-red-600 hover:text-red-700 hover:underline"
          >
            Leave Room
          </button>
        </div>

        <!-- Player List -->
        <div v-if="roomState" class="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <div
            v-for="player in roomState.players"
            :key="player.id"
            class="py-3 px-4 flex items-center gap-2"
          >
            <!-- Host Icon (crown/star) -->
            <span v-if="player.isHost" class="text-yellow-500 text-xl" title="Host">★</span>
            <span v-else class="text-transparent text-xl">★</span>

            <!-- Player Nickname -->
            <span
              :class="{ 'font-bold': player.isHost }"
              class="flex-1 text-gray-800"
            >
              {{ player.nickname }}
              <span v-if="player.id === playerId" class="text-gray-500 text-sm">(You)</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Host Controls / Waiting Message -->
      <div v-if="isHost" class="mt-6">
        <button
          @click="startGame"
          :disabled="!canStartGame"
          class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-md hover:shadow-lg text-lg"
        >
          <span v-if="!canStartGame">Waiting for players...</span>
          <span v-else>Start Game</span>
        </button>
      </div>
      <div v-else class="mt-6 text-center text-gray-600 italic">
        Waiting for host to start...
      </div>
    </div>

    <!-- Countdown Overlay -->
    <div
      v-if="countdown !== null"
      class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
    >
      <div class="text-white text-8xl font-bold animate-pulse">
        {{ countdown }}
      </div>
    </div>
  </div>
</template>
