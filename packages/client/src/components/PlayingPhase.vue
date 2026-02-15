<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePlayingPhase } from '../composables/usePlayingPhase';
import { useGameSocket } from '../composables/useGameSocket';
import TurnTimer from './TurnTimer.vue';
import TurnBanner from './TurnBanner.vue';
import OpponentCards from './OpponentCards.vue';
import DrawPile from './DrawPile.vue';
import DiscardPile from './DiscardPile.vue';
import PlayerCards from './PlayerCards.vue';

const {
  gameView,
  roomState,
  turnTimeRemaining,
  selectedHandIndices,
  selectedFaceUpIndex,
  isMyTurn,
  activeSource,
  hasSelection,
  toggleHandCard,
  selectFaceUpCard,
  selectFaceDownCard,
  playSelectedCards,
  pickupPile,
} = usePlayingPhase();

// Get send and burnTriggered from useGameSocket
const { send, burnTriggered } = useGameSocket();

function isOpponentCurrentTurn(opponentPlayerId: string): boolean {
  if (!roomState.value || gameView.value?.currentPlayerIndex === undefined) return false;
  const opponentIndex = roomState.value.players.findIndex(p => p.id === opponentPlayerId);
  return opponentIndex === gameView.value.currentPlayerIndex;
}

// Handle grouped card play from mobile view
function handleGroupedPlay(indices: number[]): void {
  send({ type: 'play-cards', cardIndices: indices });
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
  <div class="flex flex-col h-screen bg-green-900 text-white overflow-hidden">
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

    <!-- Center game area: Turn Banner + Draw/Discard Piles -->
    <div class="flex-1 flex flex-col items-center justify-center px-4">
      <!-- Turn Banner (inline within center area) -->
      <TurnBanner :visible="isMyTurn" />

      <!-- Draw Pile + Discard Pile -->
      <div class="flex items-center justify-center gap-6 sm:gap-8 mb-2">
        <DrawPile :count="gameView?.drawPileCount ?? 0" />
        <DiscardPile
          :cards="gameView?.discardPile ?? []"
          :burn-animation="burnTriggered"
        />
      </div>
    </div>

    <!-- Player's cards area (scrollable on mobile with many cards) -->
    <div class="flex-shrink-0 px-2 pb-3 flex flex-col max-h-[45vh]">
      <PlayerCards
        :hand="gameView?.hand ?? []"
        :face-up="gameView?.faceUp ?? []"
        :face-down-count="gameView?.faceDownCount ?? 0"
        :selected-hand-indices="selectedHandIndices"
        :selected-face-up-index="selectedFaceUpIndex"
        :is-my-turn="isMyTurn"
        :active-source="activeSource"
        :has-selection="hasSelection"
        @toggle-hand-card="toggleHandCard"
        @select-face-up="selectFaceUpCard"
        @select-face-down="selectFaceDownCard"
        @play-cards="playSelectedCards"
        @pickup-pile="pickupPile"
        @play-grouped-cards="handleGroupedPlay"
      />
    </div>

    <!-- Turn Timer (fixed overlay in bottom-right) -->
    <TurnTimer
      :time-remaining="turnTimeRemaining"
      :total-time="45"
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
