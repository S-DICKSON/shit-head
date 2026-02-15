<template>
  <!-- Leave button -->
  <button
    class="fixed top-2 left-2 z-40 px-3 py-1 text-xs font-medium bg-gray-800/70 hover:bg-gray-800/90 text-gray-300 hover:text-white rounded-full backdrop-blur-sm transition-all"
    @click="emit('leave')"
  >
    Leave
  </button>

  <!-- Transition overlay -->
  <div
    v-if="isTransitioning"
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
  >
    <h1 class="text-white text-5xl font-bold">
      {{ transitionMessage }}
    </h1>
  </div>

  <div class="flex flex-col min-h-screen bg-green-900 text-white p-4">
    <!-- Timer -->
    <div class="text-center text-4xl font-mono mb-4">
      {{ timerDisplay }}
    </div>

    <!-- Opponents -->
    <div class="flex flex-wrap justify-center gap-4 mb-6">
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

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Player's face-up cards -->
    <div class="text-center mb-2">
      <span class="text-xs text-green-300 uppercase tracking-wide">Face Up</span>
    </div>
    <div class="flex justify-center gap-2 mb-4">
      <button
        v-for="(card, i) in gameView?.faceUp"
        :key="'fu-' + i"
        class="w-16 h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-sm cursor-pointer transition-all"
        :class="selectedFaceUpIndex === i ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
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
        :class="selectedHandIndex === i ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
        @click="selectHandCard(i)"
      >
        <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
        <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
          {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
        </span>
      </button>
    </div>

    <!-- Ready button -->
    <div class="text-center pb-4">
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

const emit = defineEmits<{
  leave: [];
}>();

const {
  gameView,
  selectedHandIndex,
  selectedFaceUpIndex,
  selectHandCard,
  selectFaceUpCard,
  toggleReady,
  isReady,
  readyPlayers,
  timerDisplay,
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
