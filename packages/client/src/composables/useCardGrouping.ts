/**
 * Card grouping composable for mobile hand display
 * Groups cards by rank with quantity selectors for easier mobile play
 */

import type { Card } from '@shit-head/shared';
import { computed, ref, type Ref } from 'vue';

export interface CardGroup {
  rank: string;
  count: number;
  cards: Card[];
  indices: number[];
}

export function useCardGrouping(hand: Ref<Card[]>) {
  // Track selected count for each rank
  const selectedCounts = ref<Record<string, number>>({});

  /**
   * Group cards by rank, maintaining order of first occurrence
   */
  const groupedCards = computed<CardGroup[]>(() => {
    const groups = new Map<string, CardGroup>();

    hand.value.forEach((card, index) => {
      const rank = card.kind === 'standard' ? card.rank : 'JKR';

      if (!groups.has(rank)) {
        groups.set(rank, {
          rank,
          count: 0,
          cards: [],
          indices: [],
        });
      }

      const group = groups.get(rank)!;
      group.count++;
      group.cards.push(card);
      group.indices.push(index);
    });

    return Array.from(groups.values());
  });

  /**
   * Increment selection count for a rank (up to max count)
   */
  function incrementSelection(rank: string): void {
    const group = groupedCards.value.find((g) => g.rank === rank);
    if (!group) return;

    const current = selectedCounts.value[rank] || 0;
    if (current < group.count) {
      selectedCounts.value = {
        ...selectedCounts.value,
        [rank]: current + 1,
      };
    }
  }

  /**
   * Decrement selection count for a rank (down to 0)
   */
  function decrementSelection(rank: string): void {
    const current = selectedCounts.value[rank] || 0;
    if (current > 0) {
      selectedCounts.value = {
        ...selectedCounts.value,
        [rank]: current - 1,
      };
    }
  }

  /**
   * Get currently selected count for a rank
   */
  function getSelectedCount(rank: string): number {
    return selectedCounts.value[rank] || 0;
  }

  /**
   * Get array of card indices based on selected counts
   * Takes the first N cards from each rank group
   */
  const selectedIndices = computed<number[]>(() => {
    const indices: number[] = [];

    groupedCards.value.forEach((group) => {
      const count = selectedCounts.value[group.rank] || 0;
      if (count > 0) {
        // Take first N indices from this group
        indices.push(...group.indices.slice(0, count));
      }
    });

    return indices;
  });

  /**
   * Check if any cards are selected
   */
  const hasGroupSelection = computed<boolean>(() => {
    return selectedIndices.value.length > 0;
  });

  /**
   * Clear all selections
   */
  function clearGroupSelection(): void {
    selectedCounts.value = {};
  }

  return {
    groupedCards,
    selectedCounts,
    incrementSelection,
    decrementSelection,
    selectedIndices,
    hasGroupSelection,
    clearGroupSelection,
    getSelectedCount,
  };
}
