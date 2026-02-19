<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import RoomCode from './RoomCode.vue';

const router = useRouter();
const route = useRoute();
const { send, onMessage, roomState, playerId, gameView, status } = useGameSocket();

// Component state
const countdown = ref<number | null>(null);
const isRenaming = ref(false);
const newNickname = ref('');

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

const setRoundTime = (time: 30 | 45 | 60) => {
  send({ type: 'set-round-time', roundTime: time });
};

// Rename actions
const startRenaming = () => {
  const currentPlayer = roomState.value?.players.find(p => p.id === playerId.value);
  if (currentPlayer) {
    newNickname.value = currentPlayer.nickname;
    isRenaming.value = true;
  }
};

const cancelRenaming = () => {
  isRenaming.value = false;
  newNickname.value = '';
};

const confirmRename = () => {
  const trimmed = newNickname.value.trim();
  if (trimmed.length === 0 || trimmed.length > 20) {
    return;
  }
  send({ type: 'rename-player', nickname: trimmed });
  isRenaming.value = false;
  newNickname.value = '';
};

// Share link auto-join state
const isJoining = ref(false);
const joinError = ref('');

// Auto-join as Guest when arriving via share link
const joinAsGuest = (code: string) => {
  if (isJoining.value) return;
  isJoining.value = true;
  joinError.value = '';
  const guestName = `Guest ${Math.floor(Math.random() * 900) + 100}`;
  send({ type: 'join-room', code, nickname: guestName });
};

// Check if player has joined a room on mount
onMounted(() => {
  // Reset countdown in case returning from game
  countdown.value = null;

  if (!roomState.value || !playerId.value) {
    // If reconnecting, wait for reconnect to complete instead of joining as guest
    const storedPlayerId = localStorage.getItem('shithead-player-id');
    const storedRoomCode = localStorage.getItem('shithead-room-code');
    if (storedPlayerId && storedRoomCode) {
      // Reconnect flow will handle restoring the session — wait for it
      const unwatch = watch(roomState, (state) => {
        if (state) {
          unwatch();
        }
      });
      // Timeout: if reconnect fails within 5s, redirect to landing
      setTimeout(() => { unwatch(); if (!roomState.value) { router.push('/'); } }, 5000);
      return;
    }

    // Share link: auto-join if route has a room code (new player, no stored session)
    const code = route.params.code as string | undefined;
    if (code) {
      if (status.value === 'OPEN') {
        joinAsGuest(code);
      } else {
        // Wait for WebSocket to connect, then join
        const unwatch = watch(status, (val) => {
          if (val === 'OPEN') {
            unwatch();
            joinAsGuest(code);
          }
        });
        // Timeout after 5s
        setTimeout(() => { unwatch(); if (!roomState.value) { router.push('/'); } }, 5000);
      }
      return;
    }
    // No room code and no state — redirect to landing
    router.push('/');
    return;
  }
  // Gap 5 fix: If game is already in progress (reconnect race condition),
  // navigate forward to /game immediately
  if (gameView.value) {
    router.push('/game');
  }
});

// Register message handlers
const unregister = onMessage((msg) => {
  if (msg.type === 'error' && (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'ROOM_FULL')) {
    isJoining.value = false;
    roomState.value = null;
    router.push('/');
    return;
  }

  // Ignore ALREADY_IN_ROOM — happens during reconnect race condition, harmless
  if (msg.type === 'error' && msg.code === 'ALREADY_IN_ROOM') {
    isJoining.value = false;
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
      <!-- Joining state (share link) -->
      <div
        v-if="isJoining && !roomState"
        class="text-center py-8"
      >
        <p class="text-gray-600 text-lg animate-pulse">
          Joining room...
        </p>
      </div>

      <!-- Room Code Section -->
      <RoomCode
        v-if="roomState"
        :code="roomState.code"
      />

      <!-- Divider -->
      <div class="my-6 border-t border-gray-300" />

      <!-- Players Section -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-gray-800">
              Players {{ playerCount }}
            </h2>
            <span
              v-if="roomState?.spectatorCount && roomState.spectatorCount > 0"
              class="text-sm text-gray-500"
              title="Spectators watching"
            >&#128065; {{ roomState.spectatorCount }} watching</span>
          </div>
          <button
            class="text-sm text-red-600 hover:text-red-700 hover:underline"
            @click="leaveRoom"
          >
            Leave Room
          </button>
        </div>

        <!-- Player List -->
        <div
          v-if="roomState"
          class="divide-y divide-gray-200 border border-gray-200 rounded-lg"
        >
          <div
            v-for="player in roomState.players"
            :key="player.id"
            class="py-3 px-4 flex items-center gap-2"
          >
            <!-- Host Icon (crown/star) -->
            <span
              v-if="player.isHost"
              class="text-yellow-500 text-xl"
              title="Host"
            >★</span>
            <span
              v-else
              class="text-transparent text-xl"
            >★</span>

            <!-- Player Nickname -->
            <div
              class="flex-1 flex items-center gap-2"
            >
              <!-- Default state: show nickname -->
              <span
                v-if="player.id !== playerId || !isRenaming"
                :class="{ 'font-bold': player.isHost }"
                class="text-gray-800"
              >
                {{ player.nickname }}
                <span
                  v-if="player.id === playerId"
                  class="text-gray-500 text-sm"
                >(You)</span>
              </span>

              <!-- Shithead marker -->
              <span
                v-if="(player.id !== playerId || !isRenaming) && roomState?.shitheadPlayerId === player.id"
                class="text-2xl"
                title="Lost last game"
              >&#128169;</span>

              <!-- Rename button for current player -->
              <button
                v-if="player.id === playerId && !isRenaming"
                class="px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                @click="startRenaming"
              >
                Rename
              </button>

              <!-- Editing state: show input -->
              <div
                v-if="player.id === playerId && isRenaming"
                class="flex items-center gap-2 flex-1"
              >
                <input
                  v-model="newNickname"
                  type="text"
                  maxlength="20"
                  class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @keyup.enter="confirmRename"
                  @keyup.escape="cancelRenaming"
                >
                <button
                  class="text-xs text-green-600 hover:text-green-700 font-semibold"
                  @click="confirmRename"
                >
                  ✓
                </button>
                <button
                  class="text-xs text-red-600 hover:text-red-700 font-semibold"
                  @click="cancelRenaming"
                >
                  ✗
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Host Controls / Waiting Message -->
      <div
        v-if="isHost"
        class="mt-6"
      >
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-2">Round Time</label>
          <div class="flex gap-2">
            <button
              v-for="time in [30, 45, 60]"
              :key="time"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                roomState?.roundTime === time
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              ]"
              @click="setRoundTime(time as 30 | 45 | 60)"
            >
              {{ time }}s
            </button>
          </div>
        </div>
        <button
          :disabled="!canStartGame"
          class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-md hover:shadow-lg text-lg"
          @click="startGame"
        >
          <span v-if="!canStartGame">Waiting for players...</span>
          <span v-else>Start Game</span>
        </button>
      </div>
      <div
        v-else
        class="mt-6 text-center text-gray-600 italic"
      >
        <p>Waiting for host to start...</p>
        <p
          v-if="roomState?.roundTime"
          class="text-sm mt-1"
        >
          Round time: {{ roomState.roundTime }}s
        </p>
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
