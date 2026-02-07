import { describe, it, expect } from 'vitest';
import { shuffleDeck } from '../game/Deck';
import { createDeck, cardEquals } from '@shit-head/shared';

describe('Deck utilities', () => {
  describe('shuffleDeck', () => {
    it('returns 54 cards when shuffling a full deck', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);

      expect(shuffled).toHaveLength(54);
    });

    it('does not mutate the original array', () => {
      const deck = createDeck();
      const original = [...deck];

      shuffleDeck(deck);

      expect(deck).toEqual(original);
    });

    it('produces different order from input (statistical test)', () => {
      const deck = createDeck();
      const shuffled1 = shuffleDeck(deck);
      const shuffled2 = shuffleDeck(deck);

      // At least one of the shuffles should differ from the original
      const shuffled1Different = shuffled1.some((card, i) => !cardEquals(card, deck[i]));
      const shuffled2Different = shuffled2.some((card, i) => !cardEquals(card, deck[i]));

      expect(shuffled1Different || shuffled2Different).toBe(true);
    });

    it('contains all original cards (same set, different order)', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);

      // Every card in original should be in shuffled
      for (const originalCard of deck) {
        const found = shuffled.some(shuffledCard => cardEquals(shuffledCard, originalCard));
        expect(found).toBe(true);
      }

      // Every card in shuffled should be in original
      for (const shuffledCard of shuffled) {
        const found = deck.some(originalCard => cardEquals(originalCard, shuffledCard));
        expect(found).toBe(true);
      }
    });
  });
});
