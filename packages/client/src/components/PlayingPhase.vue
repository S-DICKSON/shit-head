<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePlayingPhase } from '../composables/usePlayingPhase';
import { useGameSocket } from '../composables/useGameSocket';
import TurnTimer from './TurnTimer.vue';
import TurnBanner from './TurnBanner.vue';
import MuteButton from './MuteButton.vue';
import OpponentCards from './OpponentCards.vue';
import DrawPile from './DrawPile.vue';
import DiscardPile from './DiscardPile.vue';
import PlayerCards from './PlayerCards.vue';

const emit = defineEmits<{
  leave: [];
}>();

const {
  gameView,
  roomState,
  turnTimeRemaining,
  selectedHandIndices,
  selectedFaceUpIndex,
  isMyTurn,
  isFirstTurn,
  activeSource,
  hasSelection,
  playableHandIndices,
  playableFaceUpIndices,
  toggleHandCard,
  selectFaceUpCard,
  selectFaceDownCard,
  playSelectedCards,
  pickupPile,
} = usePlayingPhase();

// Get burnTriggered and spectatorCount from useGameSocket
const { burnTriggered, spectatorCount } = useGameSocket();

function isOpponentCurrentTurn(opponentPlayerId: string): boolean {
  if (!roomState.value || gameView.value?.currentPlayerIndex === undefined) return false;
  const opponentIndex = roomState.value.players.findIndex(p => p.id === opponentPlayerId);
  return opponentIndex === gameView.value.currentPlayerIndex;
}

// ARIA live region for turn announcements
const turnAnnouncement = ref('');

watch(
  () => gameView.value?.currentPlayerIndex,
  () => {
    if (isMyTurn.value) {
      turnAnnouncement.value = "It's your turn";
    } else if (gameView.value?.currentPlayerIndex !== undefined && roomState.value) {
      const currentPlayer = roomState.value.players[gameView.value.currentPlayerIndex];
      turnAnnouncement.value = currentPlayer ? `It's ${currentPlayer.nickname}'s turn` : '';
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="flex flex-col bg-green-900 text-white overflow-hidden h-full"
  >
    <!-- Leave button -->
    <button
      class="fixed top-2 left-2 z-40 px-3 py-1 text-xs font-medium bg-gray-800/70 hover:bg-gray-800/90 text-gray-300 hover:text-white rounded-full backdrop-blur-sm transition-all"
      @click="emit('leave')"
    >
      Leave
    </button>

    <!-- Spectator count (visible to active players) -->
    <span
      v-if="spectatorCount > 0"
      class="fixed top-2 right-2 z-40 px-3 py-1 text-xs font-medium bg-gray-800/70 text-gray-300 rounded-full backdrop-blur-sm"
    >
      &#128065; {{ spectatorCount }}
    </span>

    <!-- Top bar: Opponents -->
    <div class="flex-shrink-0 pt-2">
      <div class="flex flex-wrap justify-center gap-2 sm:gap-4 px-2 mb-1">
        <OpponentCards
          v-for="opponent in gameView?.opponents"
          :key="opponent.playerId"
          :opponent="opponent"
          :is-current-turn="isOpponentCurrentTurn(opponent.playerId)"
        />
      </div>
    </div>

    <!-- Center game area: Draw/Discard Piles + Turn Banner below -->
    <div class="flex-shrink-0 flex flex-col items-center justify-center px-4 py-2 sm:py-4">
      <div class="flex items-center justify-center gap-6 sm:gap-8">
        <DrawPile :count="gameView?.drawPileCount ?? 0" />
        <DiscardPile
          :cards="gameView?.discardPile ?? []"
          :burn-animation="burnTriggered"
        />
      </div>
      <div class="mt-1">
        <TurnBanner :visible="isMyTurn" />
        <p
          v-if="isFirstTurn && isMyTurn"
          class="text-yellow-300 text-xs text-center animate-pulse mt-1"
        >
          You must play your lowest card(s)!
        </p>
      </div>
    </div>

    <!-- Player's cards area (takes remaining space) -->
    <div class="flex-1 min-h-0 px-2 pb-3 flex flex-col">
      <PlayerCards
        :hand="gameView?.hand ?? []"
        :face-up="gameView?.faceUp ?? []"
        :face-down-count="gameView?.faceDownCount ?? 0"
        :selected-hand-indices="selectedHandIndices"
        :selected-face-up-index="selectedFaceUpIndex"
        :is-my-turn="isMyTurn"
        :active-source="activeSource"
        :has-selection="hasSelection"
        :playable-hand-indices="playableHandIndices"
        :playable-face-up-indices="playableFaceUpIndices"
        @toggle-hand-card="toggleHandCard"
        @select-face-up="selectFaceUpCard"
        @select-face-down="selectFaceDownCard"
        @play-cards="playSelectedCards"
        @pickup-pile="pickupPile"
      />
    </div>

    <!-- Mute Button (fixed overlay) -->
    <MuteButton />

    <!-- Turn Timer (fixed overlay in bottom-right) -->
    <TurnTimer
      :time-remaining="turnTimeRemaining"
      :total-time="roomState?.roundTime ?? 45"
    />

    <!-- ARIA live region for screen readers -->
    <div
      class="sr-only"
      aria-live="polite"
      role="status"
    >
      {{ turnAnnouncement }}
    </div>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
