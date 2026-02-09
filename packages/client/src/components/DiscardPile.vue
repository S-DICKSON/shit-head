<template>
  <div class="flex flex-col items-center">
    <div class="relative w-16 h-24 sm:w-20 sm:h-30">
      <!-- Empty state -->
      <div
        v-if="isEmpty"
        class="w-full h-full border-2 border-dashed border-green-600 rounded flex items-center justify-center text-green-500 text-xs"
      >
        Pile
      </div>

      <!-- Stacked cards -->
      <div
        v-else
        class="relative w-full h-full"
      >
        <div
          v-for="(card, i) in visibleCards"
          :key="cardKey(card)"
          :style="{ transform: `translate(${i * 3}px, ${i * 3}px)`, zIndex: i }"
          class="absolute top-0 left-0 w-14 h-21 sm:w-16 sm:h-24 bg-white text-black rounded flex flex-col items-center justify-center text-xs sm:text-sm shadow-sm"
          :class="isTransparentEight(card, i) ? 'opacity-50 border-dashed border-2 border-purple-400' : 'border border-gray-300'"
        >
          <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
          <span
            :class="card.kind === 'standard' && ['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'"
          >
            {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
          </span>
        </div>

        <!-- Pile count badge -->
        <span
          class="absolute -top-2 -right-2 bg-green-700 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center"
        >
          {{ pileCount }}
        </span>
      </div>
    </div>

    <!-- Label -->
    <div class="text-center text-xs mt-1">
      <span class="text-green-300">Discard</span>
      <div
        v-if="topCardIsEight"
        class="text-purple-300 mt-0.5"
      >
        8 is invisible
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@shit-head/shared';

interface Props {
  cards: Card[];
  burnAnimation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  burnAnimation: false,
});

const visibleCards = computed(() => props.cards.slice(-3));
const isEmpty = computed(() => props.cards.length === 0);
const pileCount = computed(() => props.cards.length);

const topCardIsEight = computed(() => {
  const topCard = props.cards[props.cards.length - 1];
  return topCard?.kind === 'standard' && topCard.rank === '8';
});

function isTransparentEight(card: Card, index: number): boolean {
  return index === visibleCards.value.length - 1 && card.kind === 'standard' && card.rank === '8';
}

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
