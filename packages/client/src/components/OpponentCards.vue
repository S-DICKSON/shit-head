<template>
  <div
    class="text-center p-2 rounded-lg transition-all"
    :class="isCurrentTurn ? 'bg-yellow-900/40 ring-2 ring-yellow-400' : ''"
  >
    <!-- Nickname row -->
    <div class="flex items-center justify-center gap-1 mb-1">
      <span class="text-sm font-medium truncate max-w-[100px]">{{ opponent.nickname }}</span>
      <span
        v-if="isCurrentTurn"
        class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
      />
      <span
        v-if="isDisconnected"
        class="text-red-400 text-xs"
      >(DC)</span>
    </div>

    <!-- Face-up cards -->
    <div class="flex gap-1 justify-center mb-1">
      <div
        v-for="card in opponent.faceUp"
        :key="cardKey(card)"
        class="w-10 h-15 sm:w-12 sm:h-18 bg-white text-black rounded border border-gray-300 flex flex-col items-center justify-center text-[10px] sm:text-xs"
      >
        <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
        <span
          :class="card.kind === 'standard' && ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'"
        >
          {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
        </span>
      </div>
    </div>

    <!-- Hidden card indicators -->
    <div class="flex gap-1 justify-center text-[10px] text-green-300">
      <span v-if="opponent.handCount > 0">Hand: {{ opponent.handCount }}</span>
      <span v-if="opponent.faceDownCount > 0">Down: {{ opponent.faceDownCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card, OpponentView } from '@shit-head/shared';

interface Props {
  opponent: OpponentView;
  isCurrentTurn: boolean;
  isDisconnected?: boolean;
}

withDefaults(defineProps<Props>(), {
  isDisconnected: false,
});

function suitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  };
  return symbols[suit] ?? suit;
}

function cardKey(card: Card): string {
  return card.kind === 'standard' ? `${card.suit}-${card.rank}` : `joker-${card.id}`;
}
</script>
