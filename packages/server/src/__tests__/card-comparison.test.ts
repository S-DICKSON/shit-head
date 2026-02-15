import { describe, test, expect } from 'vitest';
import type { Card } from '@shit-head/shared';
import { getRankValue, canPlayOn, sortHand, RANK_ORDER } from '../game/CardComparison';

describe('CardComparison', () => {
  describe('getRankValue', () => {
    test('returns correct values for all 13 ranks', () => {
      const testCases: [Card, number][] = [
        [{ kind: 'standard', suit: 'hearts', rank: '2' }, -1],
        [{ kind: 'standard', suit: 'hearts', rank: '3' }, 0],
        [{ kind: 'standard', suit: 'hearts', rank: '4' }, 1],
        [{ kind: 'standard', suit: 'hearts', rank: '5' }, 2],
        [{ kind: 'standard', suit: 'hearts', rank: '6' }, 3],
        [{ kind: 'standard', suit: 'hearts', rank: '7' }, 4],
        [{ kind: 'standard', suit: 'hearts', rank: '8' }, 5],
        [{ kind: 'standard', suit: 'hearts', rank: '9' }, 6],
        [{ kind: 'standard', suit: 'hearts', rank: '10' }, 7],
        [{ kind: 'standard', suit: 'hearts', rank: 'J' }, 8],
        [{ kind: 'standard', suit: 'hearts', rank: 'Q' }, 9],
        [{ kind: 'standard', suit: 'hearts', rank: 'K' }, 10],
        [{ kind: 'standard', suit: 'hearts', rank: 'A' }, 11],
      ];

      testCases.forEach(([card, expected]) => {
        expect(getRankValue(card)).toBe(expected);
      });
    });

    test('returns 999 for jokers', () => {
      expect(getRankValue({ kind: 'joker', id: 1 })).toBe(999);
      expect(getRankValue({ kind: 'joker', id: 2 })).toBe(999);
    });

    test('suit does not affect rank value', () => {
      const suits: ('hearts' | 'diamonds' | 'clubs' | 'spades')[] = ['hearts', 'diamonds', 'clubs', 'spades'];

      suits.forEach(suit => {
        expect(getRankValue({ kind: 'standard', suit, rank: '7' })).toBe(4);
      });
    });

    test('throws error for unknown rank', () => {
      const invalidCard = { kind: 'standard', suit: 'hearts', rank: 'X' } as any;
      expect(() => getRankValue(invalidCard)).toThrow('Unknown rank');
    });
  });

  describe('canPlayOn', () => {
    test('returns true when played card rank is higher than top card', () => {
      const king: Card = { kind: 'standard', suit: 'hearts', rank: 'K' };
      const queen: Card = { kind: 'standard', suit: 'diamonds', rank: 'Q' };

      expect(canPlayOn(king, queen)).toBe(true);
    });

    test('returns false when played card rank is lower than top card', () => {
      const queen: Card = { kind: 'standard', suit: 'hearts', rank: 'Q' };
      const king: Card = { kind: 'standard', suit: 'diamonds', rank: 'K' };

      expect(canPlayOn(queen, king)).toBe(false);
    });

    test('returns true when played card rank equals top card', () => {
      const ace1: Card = { kind: 'standard', suit: 'hearts', rank: 'A' };
      const ace2: Card = { kind: 'standard', suit: 'diamonds', rank: 'A' };

      expect(canPlayOn(ace1, ace2)).toBe(true);
    });

    test('returns true for joker on any card', () => {
      const joker: Card = { kind: 'joker', id: 1 };
      const ace: Card = { kind: 'standard', suit: 'hearts', rank: 'A' };
      const three: Card = { kind: 'standard', suit: 'hearts', rank: '3' };

      expect(canPlayOn(joker, ace)).toBe(true);
      expect(canPlayOn(joker, three)).toBe(true);
    });

    test('returns false when playing low card on high card', () => {
      const three: Card = { kind: 'standard', suit: 'hearts', rank: '3' };
      const ace: Card = { kind: 'standard', suit: 'diamonds', rank: 'A' };

      expect(canPlayOn(three, ace)).toBe(false);
    });

    test('returns true when playing same rank', () => {
      const seven1: Card = { kind: 'standard', suit: 'hearts', rank: '7' };
      const seven2: Card = { kind: 'standard', suit: 'clubs', rank: '7' };

      expect(canPlayOn(seven1, seven2)).toBe(true);
    });
  });

  describe('RANK_ORDER', () => {
    test('contains all 13 ranks in ascending order', () => {
      expect(RANK_ORDER).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
    });

    test('has 13 ranks', () => {
      expect(RANK_ORDER).toHaveLength(13);
    });
  });

  describe('sortHand', () => {
    test('sorts normal cards in ascending order (3,4,5,6,9,J,Q,K,A)', () => {
      const hand: Card[] = [
        { kind: 'standard', suit: 'hearts', rank: 'K' },
        { kind: 'standard', suit: 'diamonds', rank: '3' },
        { kind: 'standard', suit: 'clubs', rank: '9' },
        { kind: 'standard', suit: 'spades', rank: '5' },
        { kind: 'standard', suit: 'hearts', rank: 'A' },
      ];

      const sorted = sortHand(hand);

      expect(sorted.map(c => c.kind === 'standard' ? c.rank : 'joker')).toEqual([
        '3', '5', '9', 'K', 'A'
      ]);
    });

    test('places special cards (2,7,8,10) after normal cards', () => {
      const hand: Card[] = [
        { kind: 'standard', suit: 'hearts', rank: '10' },
        { kind: 'standard', suit: 'diamonds', rank: '3' },
        { kind: 'standard', suit: 'clubs', rank: '2' },
        { kind: 'standard', suit: 'spades', rank: '7' },
        { kind: 'standard', suit: 'hearts', rank: 'K' },
      ];

      const sorted = sortHand(hand);

      expect(sorted.map(c => c.kind === 'standard' ? c.rank : 'joker')).toEqual([
        '3', 'K', '2', '7', '10'
      ]);
    });

    test('places jokers between normal and special cards', () => {
      const hand: Card[] = [
        { kind: 'standard', suit: 'hearts', rank: '10' },
        { kind: 'joker', id: 1 },
        { kind: 'standard', suit: 'diamonds', rank: '3' },
        { kind: 'standard', suit: 'clubs', rank: '2' },
        { kind: 'standard', suit: 'hearts', rank: 'K' },
      ];

      const sorted = sortHand(hand);

      expect(sorted.map(c => c.kind === 'joker' ? 'joker' : c.rank)).toEqual([
        '3', 'K', 'joker', '2', '10'
      ]);
    });

    test('sorts mixed hand correctly', () => {
      const hand: Card[] = [
        { kind: 'standard', suit: 'hearts', rank: '10' },
        { kind: 'standard', suit: 'spades', rank: '3' },
        { kind: 'standard', suit: 'clubs', rank: '2' },
        { kind: 'standard', suit: 'diamonds', rank: '7' },
        { kind: 'standard', suit: 'hearts', rank: 'K' },
        { kind: 'joker', id: 1 },
      ];

      const sorted = sortHand(hand);

      expect(sorted.map(c => c.kind === 'joker' ? 'joker' : c.rank)).toEqual([
        '3', 'K', 'joker', '2', '7', '10'
      ]);
    });

    test('returns empty array for empty hand', () => {
      const hand: Card[] = [];
      const sorted = sortHand(hand);
      expect(sorted).toEqual([]);
    });

    test('sorts hand with only special cards correctly (2,7,8,10)', () => {
      const hand: Card[] = [
        { kind: 'standard', suit: 'hearts', rank: '10' },
        { kind: 'standard', suit: 'diamonds', rank: '7' },
        { kind: 'standard', suit: 'clubs', rank: '2' },
        { kind: 'standard', suit: 'spades', rank: '8' },
      ];

      const sorted = sortHand(hand);

      expect(sorted.map(c => c.kind === 'standard' ? c.rank : 'joker')).toEqual([
        '2', '7', '8', '10'
      ]);
    });

    test('uses suit as secondary sort for same rank (hearts < diamonds < clubs < spades)', () => {
      const hand: Card[] = [
        { kind: 'standard', suit: 'spades', rank: '5' },
        { kind: 'standard', suit: 'hearts', rank: '5' },
        { kind: 'standard', suit: 'clubs', rank: '5' },
        { kind: 'standard', suit: 'diamonds', rank: '5' },
      ];

      const sorted = sortHand(hand);

      expect(sorted.map(c => c.kind === 'standard' ? c.suit : 'joker')).toEqual([
        'hearts', 'diamonds', 'clubs', 'spades'
      ]);
    });

    test('sorts jokers by id (1 before 2)', () => {
      const hand: Card[] = [
        { kind: 'joker', id: 2 },
        { kind: 'joker', id: 1 },
        { kind: 'standard', suit: 'hearts', rank: '3' },
      ];

      const sorted = sortHand(hand);

      expect(sorted).toEqual([
        { kind: 'standard', suit: 'hearts', rank: '3' },
        { kind: 'joker', id: 1 },
        { kind: 'joker', id: 2 },
      ]);
    });

    test('does not mutate input array', () => {
      const hand: Card[] = [
        { kind: 'standard', suit: 'hearts', rank: 'K' },
        { kind: 'standard', suit: 'diamonds', rank: '3' },
      ];

      const originalHand = [...hand];
      sortHand(hand);

      expect(hand).toEqual(originalHand);
    });
  });
});
