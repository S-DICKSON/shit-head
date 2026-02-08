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
  <div class="flex flex-col h-screen bg-green-900 text-white overflow-hidden">
    <!-- Top bar: Turn Timer + Opponents -->
    <div class="flex-shrink-0 pt-2">
      <div class="flex justify-center mb-1">
        <TurnTimer
          :time-remaining="turnTimeRemaining"
          :total-time="45"
        />
      </div>
      <div class="flex flex-wrap justify-center gap-2 sm:gap-4 px-2 mb-1">
        <OpponentCards
          v-for="opponent in gameView?.opponents"
          :key="opponent.playerId"
          :opponent="opponent"
          :is-current-turn="isOpponentCurrentTurn(opponent.playerId)"
        />
      </div>
    </div>

    <!-- Center game area: Draw Pile + Discard Pile -->
    <div class="flex-1 flex items-center justify-center gap-6 sm:gap-8 px-4">
      <DrawPile :count="gameView?.drawPileCount ?? 0" />
      <DiscardPile :cards="gameView?.discardPile ?? []" />
    </div>

    <!-- Player's cards area (bottom of screen, no scroll needed) -->
    <div class="flex-shrink-0 px-2 pb-3">
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
