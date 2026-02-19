<template>
  <div class="flex flex-col h-full">
    <!-- Scrollable card area (mobile only) -->
    <div class="overflow-y-auto max-h-[35vh] sm:max-h-none flex-1">
      <!-- Table cards: face-down underneath face-up (stacked) -->
      <div
        v-if="faceUp.length > 0 || faceDownCount > 0"
        class="mb-3"
      >
        <div class="text-center mb-1">
          <span class="text-xs text-green-300 uppercase tracking-wide">Table</span>
        </div>
        <div class="flex justify-center gap-3 sm:gap-4 flex-wrap">
          <!-- Each table position is a stack: face-down card on bottom, face-up card on top -->
          <div
            v-for="i in Math.max(faceUp.length, faceDownCount)"
            :key="'table-' + i"
            class="relative w-14 h-21 sm:w-16 sm:h-24"
          >
            <!-- Face-down card (bottom layer) -->
            <button
              v-if="i <= faceDownCount"
              class="absolute inset-0 w-14 h-21 sm:w-16 sm:h-24 bg-blue-800 rounded border-2 border-blue-600 flex items-center justify-center text-lg text-blue-300 transition-all"
              :class="[
                i <= faceUp.length ? 'translate-y-1 translate-x-0.5' : '',
                activeSource === 'face-down' ? 'cursor-pointer hover:border-blue-400' : 'opacity-60 cursor-not-allowed'
              ]"
              :style="{ zIndex: 0 }"
              @click="$emit('select-face-down', i - 1)"
            >
              ?
            </button>
            <!-- Face-up card (top layer, overlays the face-down) -->
            <button
              v-if="i <= faceUp.length"
              class="absolute inset-0 w-14 h-21 sm:w-16 sm:h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-xs sm:text-sm transition-all"
              :class="[
                selectedFaceUpIndex === (i - 1)
                  ? 'ring-2 ring-yellow-400 -translate-y-2 border-yellow-400 shadow-lg'
                  : playableFaceUpIndices.size > 0 && playableFaceUpIndices.has(i - 1)
                    ? 'border-green-400 shadow-md shadow-green-400/40'
                    : playableFaceUpIndices.size > 0
                      ? 'border-gray-400 opacity-50'
                      : 'border-gray-300',
                activeSource !== 'face-up'
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer hover:border-gray-400'
              ]"
              :style="{ zIndex: 1 }"
              @click="$emit('select-face-up', i - 1)"
            >
              <span class="font-bold">{{ faceUp[i - 1].kind === 'standard' ? faceUp[i - 1].rank : 'JKR' }}</span>
              <span :class="suitColor(faceUp[i - 1])">
                {{ faceUp[i - 1].kind === 'standard' ? suitSymbol(faceUp[i - 1].suit) : '★' }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Hand cards section -->
      <div
        v-if="hand.length > 0"
        class="mb-3"
      >
        <div class="text-center mb-1">
          <span class="text-xs text-green-300 uppercase tracking-wide">Hand ({{ hand.length }})</span>
        </div>

        <!-- Mobile grouped view (> 5 cards on mobile) with category tabs + carousel -->
        <div
          v-if="shouldShowGrouped"
          class="flex flex-col gap-2 px-2"
        >
          <!-- Category tab bar -->
          <div
            class="flex gap-1"
            role="tablist"
            aria-label="Card categories"
          >
            <button
              role="tab"
              :aria-selected="activeCategory === 'normal'"
              :tabindex="activeCategory === 'normal' ? 0 : -1"
              class="flex-1 min-h-[60px] rounded-lg text-sm font-semibold transition-colors"
              :class="activeCategory === 'normal'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300'"
              @click="switchCategory('normal')"
            >
              Normal ({{ normalCount }})
            </button>
            <button
              role="tab"
              :aria-selected="activeCategory === 'power'"
              :tabindex="activeCategory === 'power' ? 0 : -1"
              class="flex-1 min-h-[60px] rounded-lg text-sm font-semibold transition-colors"
              :class="activeCategory === 'power'
                ? 'bg-yellow-600 text-black'
                : 'bg-gray-700 text-gray-300'"
              @click="switchCategory('power')"
            >
              Power ({{ powerCount }})
            </button>
          </div>

          <!-- Empty category message -->
          <div
            v-if="activeGroups.length === 0"
            class="text-center text-gray-400 text-sm py-6"
          >
            No {{ activeCategory === 'power' ? 'power' : 'normal' }} cards in hand
          </div>

          <!-- Horizontal carousel of card groups -->
          <div
            v-else
            class="flex overflow-x-auto gap-3 px-1 pb-2 snap-x snap-mandatory"
            style="-webkit-overflow-scrolling: touch;"
          >
            <div
              v-for="group in activeGroups"
              :key="group.rank"
              class="snap-start flex-shrink-0 w-[75vw] max-w-[260px] rounded-xl p-3 flex items-center gap-3"
              :class="isPowerGroup(group.cards)
                ? 'bg-yellow-900/30 border border-yellow-500/60'
                : 'bg-gray-800/50 border border-gray-700'"
            >
              <!-- Sample card visual -->
              <div
                class="w-10 h-15 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-xs flex-shrink-0"
                :class="isPowerGroup(group.cards) ? 'border-yellow-400' : 'border-gray-300'"
              >
                <span class="font-bold">{{ group.rank }}</span>
                <span :class="suitColor(group.cards[0])">
                  {{ group.cards[0].kind === 'standard' ? suitSymbol(group.cards[0].suit) : '★' }}
                </span>
              </div>

              <!-- Rank label -->
              <div
                class="flex-1 text-sm"
                :class="isPowerGroup(group.cards) ? 'text-yellow-200' : 'text-green-200'"
              >
                {{ group.count }}× {{ group.rank }}{{ group.count > 1 ? 's' : '' }}
              </div>

              <!-- Quantity selectors -->
              <div class="flex items-center gap-2">
                <button
                  class="w-[60px] h-[60px] rounded-full bg-gray-600 text-white font-bold flex items-center justify-center disabled:opacity-30 transition-colors"
                  :disabled="activeSource !== 'hand' || !isMyTurn || getSelectedCount(group.rank) === 0"
                  @click="decrementSelection(group.rank)"
                >
                  −
                </button>
                <span class="w-6 text-center text-sm font-bold text-yellow-400">
                  {{ getSelectedCount(group.rank) }}
                </span>
                <button
                  class="w-[60px] h-[60px] rounded-full bg-gray-600 text-white font-bold flex items-center justify-center disabled:opacity-30 transition-colors"
                  :disabled="activeSource !== 'hand' || !isMyTurn || getSelectedCount(group.rank) >= group.count"
                  @click="incrementSelection(group.rank)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop/small hand view (normal card buttons) -->
        <TransitionGroup
          v-else
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
                : playableHandIndices.size > 0 && playableHandIndices.has(i)
                  ? 'border-green-400 shadow-md shadow-green-400/40'
                  : playableHandIndices.size > 0
                    ? 'border-gray-400 opacity-50'
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
    </div>

    <!-- Action buttons (always visible below scrollable area) -->
    <div class="flex-shrink-0 bg-green-900 py-2 -mx-2 px-2">
      <div class="flex flex-col items-center gap-2">
        <div class="flex justify-center gap-4">
          <button
            v-if="shouldShowGrouped ? hasGroupSelection : hasSelection"
            class="px-6 py-2 font-bold rounded-lg disabled:opacity-50 transition-colors"
            :class="{
              'animate-pulse bg-red-500 hover:bg-red-400 text-white': shouldShowGrouped && playConfirming,
              'bg-yellow-500 hover:bg-yellow-400 text-black': !(shouldShowGrouped && playConfirming),
            }"
            :disabled="!isMyTurn"
            @click="shouldShowGrouped ? handleGroupedPlayConfirm() : emit('play-cards')"
          >
            {{ shouldShowGrouped && playConfirming ? 'Confirm Play?' : 'Play' }}
          </button>
          <button
            class="px-6 py-2 bg-red-500 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-red-400 transition-colors"
            :class="{ 'ring-4 ring-yellow-400 animate-pulse': pickupConfirming }"
            :disabled="!isMyTurn"
            @click="handlePickupTap"
          >
            {{ pickupConfirming ? 'Tap Again to Pick Up' : 'Pick Up Pile' }}
          </button>
        </div>
        <p
          v-if="isMyTurn"
          class="text-center text-xs text-green-400 mt-1"
        >
          Double-tap to pick up pile
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '@shit-head/shared';
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useDoubleTap } from '../composables/useDoubleTap';
import { useCardCategories, isPowerCard } from '../composables/useCardCategories';

const props = defineProps<{
  hand: Card[];
  faceUp: Card[];
  faceDownCount: number;
  selectedHandIndices: Set<number>;
  selectedFaceUpIndex: number | null;
  isMyTurn: boolean;
  activeSource: 'hand' | 'face-up' | 'face-down';
  hasSelection: boolean;
  playableHandIndices: Set<number>;
  playableFaceUpIndices: Set<number>;
}>();

const emit = defineEmits<{
  'toggle-hand-card': [index: number];
  'select-face-up': [index: number];
  'select-face-down': [index: number];
  'play-cards': [];
  'pickup-pile': [];
  'play-grouped-cards': [indices: number[]];
}>();

// Double-tap handler for pickup pile
const { handleTap: handlePickupTap, isWaitingForSecondTap: pickupConfirming } = useDoubleTap(
  () => emit('pickup-pile'),
  300
);

// Mobile detection
const windowWidth = ref(window.innerWidth);

function updateWidth() {
  windowWidth.value = window.innerWidth;
}

onMounted(() => {
  window.addEventListener('resize', updateWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth);
});

const isMobile = computed(() => windowWidth.value < 640);

// Card grouping + category split for mobile
const handRef = computed(() => props.hand);
const {
  incrementSelection,
  decrementSelection,
  selectedIndices,
  hasGroupSelection,
  clearGroupSelection,
  getSelectedCount,
  activeCategory,
  activeGroups,
  powerCount,
  normalCount,
  switchCategory,
} = useCardCategories(handRef);

// Determine if we should show grouped view
const shouldShowGrouped = computed(() => isMobile.value && props.hand.length > 5);

// Two-step play confirmation to prevent accidental mis-taps in grouped mode
const playConfirming = ref(false);
let confirmTimer: ReturnType<typeof setTimeout> | null = null;

function handleGroupedPlayConfirm() {
  if (playConfirming.value) {
    // Second tap — fire the play
    playConfirming.value = false;
    if (confirmTimer) {
      clearTimeout(confirmTimer);
      confirmTimer = null;
    }
    emit('play-grouped-cards', selectedIndices.value);
    clearGroupSelection();
  } else {
    // First tap — enter confirm state, auto-cancel after 3s
    playConfirming.value = true;
    confirmTimer = setTimeout(() => {
      playConfirming.value = false;
    }, 3000);
  }
}

// Clear selection and cancel confirm state when switching categories
watch(activeCategory, () => {
  clearGroupSelection();
  playConfirming.value = false;
  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
});

// Helper: check if a group contains power cards (first card is representative since groups are by rank)
function isPowerGroup(cards: Card[]): boolean {
  return cards.length > 0 && isPowerCard(cards[0]);
}

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

/* Hide scrollbar on horizontal carousel */
.snap-x::-webkit-scrollbar {
  display: none;
}
.snap-x {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
