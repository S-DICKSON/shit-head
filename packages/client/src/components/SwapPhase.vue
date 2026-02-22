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
    class="flex flex-col bg-green-900 text-white h-full"
  >
    <!-- Opponents -->
    <div class="flex-shrink-0 overflow-x-auto snap-x snap-mandatory sm:overflow-x-visible sm:snap-none">
      <div class="flex gap-2 tall:gap-4 px-2 mb-1 w-fit mx-auto sm:flex-wrap sm:justify-center sm:w-auto">
        <div
          v-for="opponent in gameView?.opponents"
          :key="opponent.playerId"
          class="text-center snap-start"
        >
          <div class="flex items-center justify-center gap-1 mb-1">
            <span class="text-sm font-medium">{{ opponent.nickname }}</span>
            <span
              v-if="readyPlayers.includes(opponent.playerId)"
              class="text-green-400"
            >&#10003;</span>
          </div>
          <div class="flex gap-1">
            <div
              v-for="(card, i) in opponent.faceUp"
              :key="i"
              class="w-14 h-20 bg-white text-black rounded border border-gray-300 flex flex-col items-center justify-center text-xs"
            >
              <span>{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
              <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
                {{ card.kind === 'standard' ? suitSymbol(card.suit) : '&#9733;' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Spacer pushes cards to bottom -->
    <div class="flex-1 min-h-0" />

    <!-- Player cards area (anchored to bottom like playing phase) -->
    <div class="px-2 pb-2 tall:pb-3">
      <!-- Face-up cards -->
      <div class="mb-1 tall:mb-3">
        <div class="text-center mb-1">
          <span class="text-xs text-green-300 uppercase tracking-wide">Face Up</span>
        </div>
        <div class="flex gap-1 sm:gap-2 justify-center flex-wrap sm:px-3 px-1">
          <button
            v-for="(card, i) in gameView?.faceUp"
            :key="'fu-' + i"
            class="w-14 h-21 tall:w-16 tall:h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-xs tall:text-sm cursor-pointer transition-all flex-shrink-0"
            :class="selectedFaceUpIndices.has(i) ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
            @click="selectFaceUpCard(i)"
          >
            <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
            <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
              {{ card.kind === 'standard' ? suitSymbol(card.suit) : '&#9733;' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Hand cards -->
      <div class="mb-1 tall:mb-3">
        <div class="text-center mb-1">
          <span class="text-xs text-green-300 uppercase tracking-wide">Your Hand</span>
        </div>
        <div class="flex gap-1 sm:gap-2 justify-center flex-wrap sm:px-3 px-1">
          <button
            v-for="(card, i) in gameView?.hand"
            :key="'h-' + i"
            class="w-14 h-21 tall:w-16 tall:h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-xs tall:text-sm cursor-pointer transition-all flex-shrink-0"
            :class="selectedHandIndices.has(i) ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
            @click="selectHandCard(i)"
          >
            <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
            <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
              {{ card.kind === 'standard' ? suitSymbol(card.suit) : '&#9733;' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Ready button -->
      <div class="flex-shrink-0 text-center py-1 tall:py-3">
        <button
          :disabled="isTransitioning"
          class="px-8 py-3 rounded-full text-lg font-bold transition-all"
          :class="isReady
            ? 'bg-green-600 text-white cursor-default'
            : 'bg-white text-green-900 hover:bg-green-100 cursor-pointer'"
          @click="toggleReady"
        >
          {{ isReady ? 'Ready! &#10003;' : 'Ready' }}
        </button>
      </div>
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
