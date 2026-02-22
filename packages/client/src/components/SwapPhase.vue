<template>
  <!-- Leave button -->
  <button
    class="fixed top-2 left-2 z-40 px-4 py-2 text-xs font-medium bg-gray-800/70 hover:bg-gray-800/90 text-gray-100 hover:text-white rounded-full backdrop-blur-sm transition-all"
    aria-label="Leave game"
    @click="emit('leave')"
  >
    Leave
  </button>

  <!-- Mute button -->
  <MuteButton />

  <!-- Turn Timer (fixed overlay in bottom-right) -->
  <TurnTimer
    :time-remaining="swapTimeRemaining"
    :total-time="30"
  />

  <!-- Transition overlay -->
  <div
    v-if="isTransitioning"
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
  >
    <h1 class="text-white text-5xl font-bold">
      {{ transitionMessage }}
    </h1>
  </div>

  <div
    class="flex flex-col bg-green-900 text-white p-4 overflow-hidden h-full"
  >
    <!-- Opponents -->
    <div class="flex-shrink-0 flex flex-wrap justify-center gap-4 mb-4">
      <div
        v-for="opponent in gameView?.opponents"
        :key="opponent.playerId"
        class="text-center"
      >
        <div class="flex items-center justify-center gap-1 mb-1">
          <span class="text-sm font-medium">{{ opponent.nickname }}</span>
          <span
            v-if="readyPlayers.includes(opponent.playerId)"
            class="text-green-400"
          >✓</span>
        </div>
        <div class="flex gap-1">
          <div
            v-for="(card, i) in opponent.faceUp"
            :key="i"
            class="w-14 h-20 bg-white text-black rounded border border-gray-300 flex flex-col items-center justify-center text-xs"
          >
            <span>{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
            <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
              {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Card area -->
    <div class="flex-1 min-h-0">
      <!-- Player's face-up cards -->
      <div class="text-center mb-2">
        <span class="text-xs text-green-300 uppercase tracking-wide">Face Up</span>
      </div>
      <div class="flex justify-center gap-2 mb-4">
        <button
          v-for="(card, i) in gameView?.faceUp"
          :key="'fu-' + i"
          class="w-16 h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-sm cursor-pointer transition-all"
          :class="selectedFaceUpIndices.has(i) ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
          @click="selectFaceUpCard(i)"
        >
          <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
          <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
            {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
          </span>
        </button>
      </div>

      <!-- Player's face-down cards (non-interactive) -->
      <div class="text-center mb-2">
        <span class="text-xs text-green-300 uppercase tracking-wide">Face Down</span>
      </div>
      <div class="flex justify-center gap-2 mb-4">
        <div
          v-for="n in (gameView?.faceDownCount ?? 0)"
          :key="'fd-' + n"
          class="w-16 h-24 bg-blue-800 rounded border-2 border-blue-600 flex items-center justify-center text-lg text-blue-400"
        >
          ?
        </div>
      </div>

      <!-- Player's hand cards -->
      <div class="text-center mb-2">
        <span class="text-xs text-green-300 uppercase tracking-wide">Your Hand</span>
      </div>
      <div class="flex justify-center gap-2 mb-4">
        <button
          v-for="(card, i) in gameView?.hand"
          :key="'h-' + i"
          class="w-16 h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-sm cursor-pointer transition-all"
          :class="selectedHandIndices.has(i) ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
          @click="selectHandCard(i)"
        >
          <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
          <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
            {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Ready button (always visible at bottom) -->
    <div class="flex-shrink-0 text-center py-3">
      <button
        :disabled="isTransitioning"
        class="px-8 py-3 rounded-full text-lg font-bold transition-all"
        :class="isReady
          ? 'bg-green-600 text-white cursor-default'
          : 'bg-white text-green-900 hover:bg-green-100 cursor-pointer'"
        @click="toggleReady"
      >
        {{ isReady ? 'Ready! ✓' : 'Ready' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSwapPhase } from '../composables/useSwapPhase';
import MuteButton from './MuteButton.vue';
import TurnTimer from './TurnTimer.vue';

const emit = defineEmits<{
  leave: [];
}>();

const {
  gameView,
  selectedHandIndices,
  selectedFaceUpIndices,
  selectHandCard,
  selectFaceUpCard,
  toggleReady,
  isReady,
  readyPlayers,
  swapTimeRemaining,
  isTransitioning,
  transitionMessage,
} = useSwapPhase();

function suitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  };
  return symbols[suit] ?? suit;
}
</script>
