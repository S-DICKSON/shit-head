import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useCardGrouping } from './useCardGrouping';
import type { Card } from '@shit-head/shared';

describe('useCardGrouping', () => {
  describe('grouping logic', () => {
    it('groups cards by rank', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
        { kind: 'standard', rank: '7', suit: 'D' },
        { kind: 'standard', rank: 'K', suit: 'S' },
        { kind: 'standard', rank: '7', suit: 'C' },
      ]);

      const { groupedCards } = useCardGrouping(hand);

      expect(groupedCards.value).toHaveLength(2);
      expect(groupedCards.value[0].rank).toBe('7');
      expect(groupedCards.value[0].count).toBe(3);
      expect(groupedCards.value[1].rank).toBe('K');
      expect(groupedCards.value[1].count).toBe(1);
    });

    it('groups jokers as "JKR"', () => {
      const hand = ref<Card[]>([
        { kind: 'joker', id: 1 },
        { kind: 'standard', rank: '3', suit: 'H' },
        { kind: 'joker', id: 2 },
      ]);

      const { groupedCards } = useCardGrouping(hand);

      expect(groupedCards.value).toHaveLength(2);
      expect(groupedCards.value[0].rank).toBe('JKR');
      expect(groupedCards.value[0].count).toBe(2);
      expect(groupedCards.value[1].rank).toBe('3');
      expect(groupedCards.value[1].count).toBe(1);
    });

    it('maintains order of first occurrence', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: 'K', suit: 'H' },
        { kind: 'standard', rank: '3', suit: 'D' },
        { kind: 'standard', rank: '7', suit: 'S' },
        { kind: 'standard', rank: '3', suit: 'C' },
      ]);

      const { groupedCards } = useCardGrouping(hand);

      expect(groupedCards.value).toHaveLength(3);
      expect(groupedCards.value[0].rank).toBe('K');
      expect(groupedCards.value[1].rank).toBe('3');
      expect(groupedCards.value[2].rank).toBe('7');
    });

    it('handles empty hand', () => {
      const hand = ref<Card[]>([]);

      const { groupedCards } = useCardGrouping(hand);

      expect(groupedCards.value).toHaveLength(0);
    });

    it('correctly tracks indices for each group', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' }, // index 0
        { kind: 'standard', rank: 'K', suit: 'D' }, // index 1
        { kind: 'standard', rank: '7', suit: 'S' }, // index 2
        { kind: 'standard', rank: '7', suit: 'C' }, // index 3
      ]);

      const { groupedCards } = useCardGrouping(hand);

      expect(groupedCards.value[0].rank).toBe('7');
      expect(groupedCards.value[0].indices).toEqual([0, 2, 3]);
      expect(groupedCards.value[1].rank).toBe('K');
      expect(groupedCards.value[1].indices).toEqual([1]);
    });
  });

  describe('selection tracking', () => {
    it('incrementSelection increases count up to group max', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
        { kind: 'standard', rank: '7', suit: 'D' },
      ]);

      const { incrementSelection, getSelectedCount } = useCardGrouping(hand);

      expect(getSelectedCount('7')).toBe(0);

      incrementSelection('7');
      expect(getSelectedCount('7')).toBe(1);

      incrementSelection('7');
      expect(getSelectedCount('7')).toBe(2);
    });

    it('cannot increment beyond group count', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
        { kind: 'standard', rank: '7', suit: 'D' },
      ]);

      const { incrementSelection, getSelectedCount } = useCardGrouping(hand);

      incrementSelection('7');
      incrementSelection('7');
      incrementSelection('7'); // Should not go above 2

      expect(getSelectedCount('7')).toBe(2);
    });

    it('decrementSelection decreases count down to 0', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
        { kind: 'standard', rank: '7', suit: 'D' },
      ]);

      const { incrementSelection, decrementSelection, getSelectedCount } =
        useCardGrouping(hand);

      incrementSelection('7');
      incrementSelection('7');
      expect(getSelectedCount('7')).toBe(2);

      decrementSelection('7');
      expect(getSelectedCount('7')).toBe(1);

      decrementSelection('7');
      expect(getSelectedCount('7')).toBe(0);
    });

    it('cannot decrement below 0', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
      ]);

      const { decrementSelection, getSelectedCount } = useCardGrouping(hand);

      decrementSelection('7');
      expect(getSelectedCount('7')).toBe(0);

      decrementSelection('7');
      expect(getSelectedCount('7')).toBe(0);
    });

    it('getSelectedCount returns 0 for unselected ranks', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
      ]);

      const { getSelectedCount } = useCardGrouping(hand);

      expect(getSelectedCount('K')).toBe(0);
    });
  });

  describe('selected indices computation', () => {
    it('returns correct array of card indices based on selections', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' }, // index 0
        { kind: 'standard', rank: '7', suit: 'D' }, // index 1
        { kind: 'standard', rank: 'K', suit: 'S' }, // index 2
        { kind: 'standard', rank: '7', suit: 'C' }, // index 3
      ]);

      const { incrementSelection, selectedIndices } = useCardGrouping(hand);

      incrementSelection('7'); // Select 1 of 3 sevens
      incrementSelection('K'); // Select 1 of 1 king

      expect(selectedIndices.value).toEqual([0, 2]); // First 7 and the K
    });

    it('takes first N cards from each rank group', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' }, // index 0
        { kind: 'standard', rank: '7', suit: 'D' }, // index 1
        { kind: 'standard', rank: '7', suit: 'S' }, // index 2
      ]);

      const { incrementSelection, selectedIndices } = useCardGrouping(hand);

      incrementSelection('7');
      incrementSelection('7');

      expect(selectedIndices.value).toEqual([0, 1]);
    });

    it('returns empty array when no selections', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
      ]);

      const { selectedIndices } = useCardGrouping(hand);

      expect(selectedIndices.value).toEqual([]);
    });

    it('hasGroupSelection returns true when selections exist', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
      ]);

      const { incrementSelection, hasGroupSelection } = useCardGrouping(hand);

      expect(hasGroupSelection.value).toBe(false);

      incrementSelection('7');
      expect(hasGroupSelection.value).toBe(true);
    });

    it('hasGroupSelection returns false when no selections', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
      ]);

      const { hasGroupSelection } = useCardGrouping(hand);

      expect(hasGroupSelection.value).toBe(false);
    });
  });

  describe('clear selections', () => {
    it('clearGroupSelection resets all selections to empty', () => {
      const hand = ref<Card[]>([
        { kind: 'standard', rank: '7', suit: 'H' },
        { kind: 'standard', rank: 'K', suit: 'D' },
      ]);

      const {
        incrementSelection,
        clearGroupSelection,
        getSelectedCount,
        hasGroupSelection,
      } = useCardGrouping(hand);

      incrementSelection('7');
      incrementSelection('K');
      expect(hasGroupSelection.value).toBe(true);

      clearGroupSelection();
      expect(getSelectedCount('7')).toBe(0);
      expect(getSelectedCount('K')).toBe(0);
      expect(hasGroupSelection.value).toBe(false);
    });
  });
});
