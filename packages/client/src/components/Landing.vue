<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';

const router = useRouter();
const { send, onMessage, status, roomState, gameView, error: socketError } = useGameSocket();

// Form state
const nickname = ref('');
const roomCode = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

// Computed states
const isConnecting = computed(() => status.value === 'CONNECTING');
const isConnected = computed(() => status.value === 'OPEN');
const canCreate = computed(() =>
  nickname.value.trim().length > 0 &&
  nickname.value.trim().length <= 20 &&
  !isLoading.value &&
  isConnected.value
);
const canJoin = computed(() =>
  nickname.value.trim().length > 0 &&
  nickname.value.trim().length <= 20 &&
  roomCode.value.length === 6 &&
  !isLoading.value &&
  isConnected.value
);

// Watch for socket errors
watch(socketError, (err) => {
  if (err) {
    errorMessage.value = err;
    isLoading.value = false;
  }
});

// Watch for successful room creation/join
watch(roomState, (state) => {
  if (state && state.code) {
    // If game is in progress, skip lobby and go directly to game
    if (gameView.value) {
      router.push('/game');
    } else {
      router.push(`/room/${state.code}`);
    }
  }
});

// Handle room code input - auto-uppercase and limit to 6 alphanumeric chars
const handleRoomCodeInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  let value = input.value.toUpperCase();
  // Strip non-alphanumeric
  value = value.replace(/[^A-Z0-9]/g, '');
  // Limit to 6 chars
  value = value.slice(0, 6);
  roomCode.value = value;
};

// Create room
const createRoom = () => {
  if (!canCreate.value) return;

  errorMessage.value = '';
  isLoading.value = true;

  send({
    type: 'create-room',
    nickname: nickname.value.trim(),
  });
};

// Join room
const joinRoom = () => {
  if (!canJoin.value) return;

  errorMessage.value = '';
  isLoading.value = true;

  send({
    type: 'join-room',
    code: roomCode.value,
    nickname: nickname.value.trim(),
  });
};

// Register message handler for errors
onMessage((msg) => {
  if (msg.type === 'error') {
    errorMessage.value = msg.message;
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-2">
          Karma
        </h1>
        <p class="text-gray-500 text-sm">
          Play the classic card game with friends
        </p>
      </div>

      <!-- Connection status -->
      <div
        v-if="isConnecting"
        class="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm text-center"
      >
        Connecting to server...
      </div>
      <div
        v-else-if="!isConnected"
        class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm text-center"
      >
        Not connected to server
      </div>

      <!-- Nickname input -->
      <div class="mb-6">
        <label
          for="nickname"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Your Nickname
        </label>
        <input
          id="nickname"
          v-model="nickname"
          type="text"
          placeholder="Enter your nickname"
          maxlength="20"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          @keyup.enter="canCreate ? createRoom() : null"
        >
        <p class="text-xs text-gray-500 mt-1">
          Maximum 20 characters
        </p>
      </div>

      <!-- Create room section -->
      <div class="mb-6">
        <button
          :disabled="!canCreate"
          class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
          @click="createRoom"
        >
          <span v-if="isLoading">Creating...</span>
          <span v-else>Create New Room</span>
        </button>
      </div>

      <!-- Divider -->
      <div class="relative mb-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <!-- Join room section -->
      <div class="mb-6">
        <label
          for="roomCode"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Room Code
        </label>
        <input
          id="roomCode"
          :value="roomCode"
          type="text"
          placeholder="ABC123"
          maxlength="6"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-lg text-center tracking-wider"
          @input="handleRoomCodeInput"
          @keyup.enter="canJoin ? joinRoom() : null"
        >
        <p class="text-xs text-gray-500 mt-1">
          Enter the 6-character room code
        </p>
      </div>

      <button
        :disabled="!canJoin"
        class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg"
        @click="joinRoom"
      >
        <span v-if="isLoading">Joining...</span>
        <span v-else>Join Room</span>
      </button>

      <!-- Error message -->
      <div
        v-if="errorMessage"
        class="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
      >
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>
