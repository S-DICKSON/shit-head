/**
 * Card category composable for mobile hand display
 * Splits grouped cards into power/normal categories with active tab state
 *
 * Power cards: 2, 7, 8, 10, and Joker (differs from server isSpecialCard which covers 2, 8, 10 only)
 */

import type { Card } from '@shit-head/shared';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { type CardGroup, useCardGrouping } from './useCardGrouping';

export type CardCategory = 'power' | 'normal';

const POWER_RANKS = new Set(['2', '7', '8', '10']);

/**
 * Pure function: classify a card as power or normal
 * Power cards are: 2, 7, 8, 10, and Joker
 */
export function isPowerCard(card: Card): boolean {
  if (card.kind === 'joker') return true;
  return POWER_RANKS.has(card.rank);
}

/**
 * Composable that layers category filtering on top of useCardGrouping.
 * Splits grouped cards into power/normal categories with reactive active tab state.
 */
export function useCardCategories(hand: Ref<Card[]>) {
  const {
    groupedCards,
    selectedCounts,
    incrementSelection,
    decrementSelection,
    selectedIndices,
    hasGroupSelection,
    clearGroupSelection,
    getSelectedCount,
  } = useCardGrouping(hand);

  const activeCategory = ref<CardCategory>('normal');

  /**
   * Groups where at least one card is a power card.
   * Since groups are by rank, all cards in a group share the same rank —
   * so checking any card is equivalent to checking all.
   */
  const powerGroups: ComputedRef<CardGroup[]> = computed(() =>
    groupedCards.value.filter((g) => g.cards.some((c) => isPowerCard(c))),
  );

  /**
   * Groups where every card is a normal (non-power) card.
   */
  const normalGroups: ComputedRef<CardGroup[]> = computed(() =>
    groupedCards.value.filter((g) => g.cards.every((c) => !isPowerCard(c))),
  );

  /**
   * Total card count across all power groups.
   */
  const powerCount: ComputedRef<number> = computed(() =>
    powerGroups.value.reduce((acc, g) => acc + g.count, 0),
  );

  /**
   * Total card count across all normal groups.
   */
  const normalCount: ComputedRef<number> = computed(() =>
    normalGroups.value.reduce((acc, g) => acc + g.count, 0),
  );

  /**
   * Currently visible groups based on active category.
   */
  const activeGroups: ComputedRef<CardGroup[]> = computed(() =>
    activeCategory.value === 'power' ? powerGroups.value : normalGroups.value,
  );

  /**
   * Switch the active category tab.
   * Note: selection clearing on switch is wired in the component (PlayerCards.vue)
   * because clearGroupSelection is re-exported from useCardGrouping.
   */
  function switchCategory(cat: CardCategory): void {
    activeCategory.value = cat;
  }

  return {
    // Pass-through from useCardGrouping
    groupedCards,
    selectedCounts,
    incrementSelection,
    decrementSelection,
    selectedIndices,
    hasGroupSelection,
    clearGroupSelection,
    getSelectedCount,
    // Category additions
    activeCategory,
    powerGroups,
    normalGroups,
    powerCount,
    normalCount,
    activeGroups,
    switchCategory,
  };
}
