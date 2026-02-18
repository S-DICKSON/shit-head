<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSocket } from '../composables/useGameSocket';
import {
  AuthAdapterKey,
} from '../platform';
import type { DiscordAuthAdapter } from '../platform/adapters/discord/DiscordAuthAdapter';

const router = useRouter();
const {
  send,
  onMessage,
  roomState,
  playerId,
  status,
  isSpectator,
  spectatorCount,
  spectatorGameView,
} = useGameSocket();

const authAdapter = inject(AuthAdapterKey);

// State
const isAuthenticating = ref(true);
const countdown = ref<number | null>(null);

// Computed
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

// Discord avatar URL helper
function getAvatarUrl(avatarHash: string | null | undefined, userId: string, size = 64): string {
  if (!avatarHash) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    const defaultIndex = ((hash % 5) + 5) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  const extension = avatarHash.startsWith('a_') ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
}

// Retry helper with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// Auto-join flow
onMounted(async () => {
  if (!authAdapter) {
    // No auth adapter — stay in authenticating state with spinner (silent)
    return;
  }

  try {
    // Step 1: Authenticate with retry (silent retries per locked decision)
    if (!authAdapter.isAuthenticated()) {
      await withRetry(() => authAdapter.authenticate());
    }

    // Step 2: Get Discord user info and SDK
    const user = await authAdapter.getCurrentUser();
    if (!user) {
      // Stay in authenticating state — do not show error screen
      return;
    }

    // Step 3: Get SDK for instanceId
    const discordAuth = authAdapter as DiscordAuthAdapter;
    const sdk = discordAuth.getSdk();
    const instanceId = sdk.instanceId;
    const discordUser = discordAuth.getDiscordUser();

    isAuthenticating.value = false;

    // Step 4: Wait for WebSocket to be open, then send join-or-create
    const doJoin = () => {
      send({
        type: 'join-or-create',
        instanceId,
        nickname: user.name,
        avatarHash: discordUser?.avatar ?? null,
      });
    };

    if (status.value === 'OPEN') {
      doJoin();
    } else {
      // Wait for connection
      const checkInterval = setInterval(() => {
        if (status.value === 'OPEN') {
          clearInterval(checkInterval);
          doJoin();
        }
      }, 100);
      // Timeout after 10s
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
  } catch (err) {
    // All retries exhausted — stay in authenticating/spinner state (no error screen per locked decision)
    // The spinner will persist, which is better than a hard error screen
    console.error('Discord auth failed after retries:', err);
  }
});

// Start game action
const startGame = () => {
  if (!isHost.value || !canStartGame.value) return;
  send({ type: 'start-game' });
};

// Message handlers
const unregister = onMessage((msg) => {
  if (msg.type === 'game-starting') {
    countdown.value = msg.countdown;
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

  if (msg.type === 'return-to-lobby') {
    // Stay on this page — room state already updated by useGameSocket
  }
});

onUnmounted(() => {
  unregister();
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
      <!-- Authenticating/connecting state (spinner, no error screen) -->
      <div
        v-if="isAuthenticating"
        class="text-center py-8"
      >
        <div class="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p class="text-gray-600 text-lg">
          Connecting to Discord...
        </p>
      </div>

      <!-- Spectator state (watching active game) -->
      <div
        v-else-if="isSpectator && spectatorGameView"
        class="text-center py-8"
      >
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-6">
          <p class="text-yellow-800 font-medium">
            Spectating — you'll join next game
          </p>
        </div>
        <p class="text-gray-600">
          A game is in progress. You'll be added to the lobby when it finishes.
        </p>
      </div>

      <!-- Lobby state -->
      <template v-else-if="roomState">
        <!-- Players Section -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">
              Players {{ playerCount }}
            </h2>
            <!-- Spectator count indicator (when active players see spectators) -->
            <span
              v-if="spectatorCount > 0"
              class="text-sm text-gray-500"
              title="Spectators watching"
            >
              &#128065; {{ spectatorCount }} watching
            </span>
          </div>

          <!-- Player List -->
          <div class="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <div
              v-for="player in roomState.players"
              :key="player.id"
              class="py-3 px-4 flex items-center gap-3"
            >
              <!-- Discord Avatar -->
              <img
                :src="getAvatarUrl(player.avatarHash, player.id)"
                :alt="player.nickname"
                class="w-8 h-8 rounded-full"
              >

              <!-- Host Icon -->
              <span
                v-if="player.isHost"
                class="text-yellow-500 text-lg"
                title="Host"
              >&#9733;</span>

              <!-- Player Nickname -->
              <span
                :class="{ 'font-bold': player.isHost }"
                class="text-gray-800 flex-1"
              >
                {{ player.nickname }}
                <span
                  v-if="player.id === playerId"
                  class="text-gray-500 text-sm"
                >(You)</span>
              </span>

              <!-- Shithead marker -->
              <span
                v-if="roomState.shitheadPlayerId === player.id"
                class="text-2xl"
                title="Lost last game"
              >&#128169;</span>
            </div>
          </div>
        </div>

        <!-- Host Controls / Waiting Message -->
        <div
          v-if="isHost"
          class="mt-6"
        >
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
          Waiting for host to start...
        </div>
      </template>

      <!-- Waiting for join response -->
      <div
        v-else
        class="text-center py-8"
      >
        <div class="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p class="text-gray-600 text-lg">
          Joining game...
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
