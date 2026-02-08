<script setup lang="ts">
import { usePlayingPhase } from '../composables/usePlayingPhase';
import TurnTimer from './TurnTimer.vue';
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

function isOpponentCurrentTurn(opponentPlayerId: string): boolean {
  if (!roomState.value || gameView.value?.currentPlayerIndex === undefined) return false;
  const opponentIndex = roomState.value.players.findIndex(p => p.id === opponentPlayerId);
  return opponentIndex === gameView.value.currentPlayerIndex;
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-green-900 text-white">
    <!-- Top bar: Turn Timer (centered) -->
    <div class="flex justify-center py-2">
      <TurnTimer
        :time-remaining="turnTimeRemaining"
        :total-time="45"
      />
    </div>

    <!-- Opponents row (scrollable horizontally if many) -->
    <div class="flex flex-wrap justify-center gap-2 sm:gap-4 px-2 mb-2">
      <OpponentCards
        v-for="opponent in gameView?.opponents"
        :key="opponent.playerId"
        :opponent="opponent"
        :is-current-turn="isOpponentCurrentTurn(opponent.playerId)"
      />
    </div>

    <!-- Spacer to push game area toward center -->
    <div class="flex-1" />

    <!-- Center game area: Draw Pile + Discard Pile side by side -->
    <div class="flex justify-center items-end gap-6 sm:gap-8 px-4 mb-4">
      <DrawPile :count="gameView?.drawPileCount ?? 0" />
      <DiscardPile :cards="gameView?.discardPile ?? []" />
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Player's cards area (bottom of screen) -->
    <div class="px-2 pb-4">
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
      />
    </div>
  </div>
</template>
