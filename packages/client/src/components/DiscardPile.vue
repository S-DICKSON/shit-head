<template>
  <div class="flex flex-col items-center">
    <div class="relative w-16 h-24 sm:w-20 sm:h-30 overflow-visible">
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
        class="relative w-full h-full overflow-visible"
      >
        <div
          v-for="(card, i) in visibleCards"
          :key="cardKey(card)"
          :style="{ transform: getCardTransform(card, i), zIndex: Math.min(i, 10) }"
          class="absolute top-0 left-0 w-14 h-21 sm:w-16 sm:h-24 bg-white text-black rounded flex flex-col items-center justify-center text-xs sm:text-sm shadow-sm transition-transform duration-300 ease-in-out"
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
      <!-- Burn fire animation overlay -->
      <div
        v-if="burnAnimation"
        class="burn-fire"
        aria-hidden="true"
      >
        <div
          v-for="p in 12"
          :key="p"
          class="fire-particle"
          :style="{
            animationDelay: `${(p - 1) * 0.1}s`,
            left: `calc((100% - 3.5em) * ${(p - 1) / 11})`,
          }"
        />
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
      <div
        v-if="effectiveTopIsSeven"
        class="text-amber-300 mt-0.5"
      >
        Play 7 or lower
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

// Count consecutive 8s at the end of the full pile
const trailingEightCount = computed(() => {
  let count = 0;
  for (let i = props.cards.length - 1; i >= 0; i--) {
    const card = props.cards[i];
    if (card?.kind === 'standard' && card.rank === '8') {
      count++;
    } else {
      break;
    }
  }
  return count;
});

// Show enough cards to display the effective card underneath trailing 8s
const visibleCards = computed(() => {
  const trailing8s = trailingEightCount.value;
  // Show base 3 cards + trailing 8s, but cap at 6 total to prevent overflow
  const numVisible = Math.min(3 + trailing8s, props.cards.length, 6);
  return props.cards.slice(-numVisible);
});

const isEmpty = computed(() => props.cards.length === 0);
const pileCount = computed(() => props.cards.length);

const topCardIsEight = computed(() => {
  const topCard = props.cards[props.cards.length - 1];
  return topCard?.kind === 'standard' && topCard.rank === '8';
});

// The effective top card (skip trailing 8s — they're invisible)
const effectiveTopIsSeven = computed(() => {
  for (let i = props.cards.length - 1; i >= 0; i--) {
    const card = props.cards[i];
    if (card?.kind === 'standard' && card.rank === '8') continue;
    return card?.kind === 'standard' && card.rank === '7';
  }
  return false;
});

// Count consecutive trailing 8s within visible cards
function countTrailingEightsInVisible(): number {
  let count = 0;
  for (let i = visibleCards.value.length - 1; i >= 0; i--) {
    const card = visibleCards.value[i];
    if (card?.kind === 'standard' && card.rank === '8') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function isTransparentEight(card: Card, index: number): boolean {
  // All trailing 8s in visible cards should be semi-transparent
  const trailing8Count = countTrailingEightsInVisible();
  const startIndex = visibleCards.value.length - trailing8Count;
  return index >= startIndex && card.kind === 'standard' && card.rank === '8';
}

function getCardTransform(card: Card, index: number): string {
  const trailing8Count = countTrailingEightsInVisible();
  const isTrailing8 = index >= visibleCards.value.length - trailing8Count && card.kind === 'standard' && card.rank === '8';

  if (!isTrailing8) {
    // Non-8 cards use normal stacking offset
    return `translate(${index * 3}px, ${index * 3}px)`;
  } else {
    // Trailing 8s offset to the top-right
    const lastNon8Index = visibleCards.value.length - trailing8Count - 1;
    const baseX = lastNon8Index >= 0 ? lastNon8Index * 3 : 0;
    const baseY = lastNon8Index >= 0 ? lastNon8Index * 3 : 0;

    const eightIndex = index - (visibleCards.value.length - trailing8Count);
    const offsetX = baseX + 20 + (eightIndex * 4);
    const offsetY = baseY + 0 + (eightIndex * 2);

    return `translate(${offsetX}px, ${offsetY}px)`;
  }
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

<style scoped>
.burn-fire {
  position: absolute;
  top: -60%;
  left: -50%;
  width: 200%;
  height: 220%;
  z-index: 50;
  pointer-events: none;
  filter: blur(1px);
}

.fire-particle {
  animation: rise 1.5s ease-in forwards;
  background-image: radial-gradient(rgb(255, 80, 0) 20%, rgba(255, 80, 0, 0) 70%);
  border-radius: 50%;
  mix-blend-mode: screen;
  opacity: 0;
  position: absolute;
  bottom: 0;
  width: 3.5em;
  height: 3.5em;
}

@keyframes rise {
  0% {
    opacity: 0;
    transform: translateY(0) scale(1);
  }
  25% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-7em) scale(0);
  }
}
</style>
