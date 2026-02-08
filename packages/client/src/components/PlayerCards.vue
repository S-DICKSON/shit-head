<template>
  <div class="flex flex-col">
    <!-- Your Turn indicator -->
    <div
      v-if="isMyTurn"
      class="text-center text-yellow-300 font-bold text-sm mb-2 animate-pulse"
    >
      Your Turn!
    </div>

    <!-- Hand cards section -->
    <div class="mb-4">
      <div class="text-center mb-2">
        <span class="text-xs text-green-300 uppercase tracking-wide">Hand ({{ hand.length }})</span>
      </div>
      <TransitionGroup
        name="card-list"
        tag="div"
        class="flex justify-center gap-1 sm:gap-2 flex-wrap"
      >
        <button
          v-for="(card, i) in hand"
          :key="cardKey(card)"
          class="w-14 h-21 sm:w-16 sm:h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-xs sm:text-sm transition-all"
          :class="[
            selectedHandIndices.has(i)
              ? 'ring-2 ring-yellow-400 -translate-y-2 border-yellow-400 shadow-lg'
              : 'border-gray-300',
            activeSource !== 'hand'
              ? 'opacity-40 cursor-not-allowed'
              : 'cursor-pointer hover:border-gray-400'
          ]"
          @click="$emit('toggle-hand-card', i)"
        >
          <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
          <span :class="suitColor(card)">
            {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
          </span>
        </button>
      </TransitionGroup>
    </div>

    <!-- Face-up cards section -->
    <div class="mb-4">
      <div class="text-center mb-2">
        <span class="text-xs text-green-300 uppercase tracking-wide">Face Up ({{ faceUp.length }})</span>
      </div>
      <div class="flex justify-center gap-1 sm:gap-2 flex-wrap">
        <button
          v-for="(card, i) in faceUp"
          :key="cardKey(card)"
          class="w-14 h-21 sm:w-16 sm:h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-xs sm:text-sm transition-all"
          :class="[
            selectedFaceUpIndex === i
              ? 'ring-2 ring-yellow-400 -translate-y-2 border-yellow-400 shadow-lg'
              : 'border-gray-300',
            activeSource !== 'face-up'
              ? 'opacity-40 cursor-not-allowed'
              : 'cursor-pointer hover:border-gray-400'
          ]"
          @click="$emit('select-face-up', i)"
        >
          <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
          <span :class="suitColor(card)">
            {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Face-down cards section -->
    <div class="mb-4">
      <div class="text-center mb-2">
        <span class="text-xs text-green-300 uppercase tracking-wide">Face Down ({{ faceDownCount }})</span>
      </div>
      <div class="flex justify-center gap-1 sm:gap-2 flex-wrap">
        <button
          v-for="n in faceDownCount"
          :key="'fd-' + n"
          class="w-14 h-21 sm:w-16 sm:h-24 bg-blue-800 rounded border-2 border-blue-600 flex items-center justify-center text-lg text-blue-300 transition-all"
          :class="activeSource !== 'face-down' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'"
          @click="$emit('select-face-down', n - 1)"
        >
          ?
        </button>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex justify-center gap-4 mt-2">
      <button
        v-if="hasSelection"
        class="px-6 py-2 bg-yellow-500 text-black font-bold rounded-lg disabled:opacity-50 hover:bg-yellow-400 transition-colors"
        :disabled="!isMyTurn"
        @click="$emit('play-cards')"
      >
        Play
      </button>
      <button
        class="px-6 py-2 bg-red-500 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-red-400 transition-colors"
        :disabled="!isMyTurn"
        @click="$emit('pickup-pile')"
      >
        Pick Up Pile
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '@shit-head/shared';

defineProps<{
  hand: Card[];
  faceUp: Card[];
  faceDownCount: number;
  selectedHandIndices: Set<number>;
  selectedFaceUpIndex: number | null;
  isMyTurn: boolean;
  activeSource: 'hand' | 'face-up' | 'face-down';
  hasSelection: boolean;
}>();

defineEmits<{
  'toggle-hand-card': [index: number];
  'select-face-up': [index: number];
  'select-face-down': [index: number];
  'play-cards': [];
  'pickup-pile': [];
}>();

// Helper: suit symbol
function suitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  };
  return symbols[suit] ?? suit;
}

// Helper: suit color
function suitColor(card: Card): string {
  if (card.kind === 'joker') return 'text-purple-600';
  return ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black';
}

// Helper: stable card key for TransitionGroup
function cardKey(card: Card): string {
  return card.kind === 'standard' ? `${card.suit}-${card.rank}` : `joker-${card.id}`;
}
</script>

<style scoped>
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.3s ease;
}
.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
.card-list-move {
  transition: transform 0.3s ease;
}
.card-list-leave-active {
  position: absolute;
}
</style>
