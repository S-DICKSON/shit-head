import { describe, test, expect } from 'vitest';
import type { Card, Rank, Suit } from '@shit-head/shared';
import { isSpecialCard, getEffectiveTopCard, canPlayOnPile, detectBurn } from '../game/CardRules';

// Helper to create standard cards concisely
function c(rank: Rank, suit: Suit = 'hearts'): Card {
  return { kind: 'standard', suit, rank };
}

// Helper to create jokers
function joker(id: 1 | 2 = 1): Card {
  return { kind: 'joker', id };
}

describe('CardRules', () => {
  describe('isSpecialCard', () => {
    test.each([
      [c('2'), true, '2 is special'],
      [c('3'), false, '3 is not special'],
      [c('4'), false, '4 is not special'],
      [c('5'), false, '5 is not special'],
      [c('6'), false, '6 is not special'],
      [c('7'), false, '7 is not special'],
      [c('8'), true, '8 is special'],
      [c('9'), false, '9 is not special'],
      [c('10'), true, '10 is special'],
      [c('J'), false, 'J is not special'],
      [c('Q'), false, 'Q is not special'],
      [c('K'), false, 'K is not special'],
      [c('A'), false, 'A is not special'],
      [joker(), false, 'Joker is not special'],
    ])('isSpecialCard(%s) === %s (%s)', (card, expected, _desc) => {
      expect(isSpecialCard(card)).toBe(expected);
    });
  });

  describe('getEffectiveTopCard', () => {
    test.each([
      [[], null, 'empty pile'],
      [[c('7')], c('7'), 'single non-8 card'],
      [[c('5'), c('8')], c('5'), 'look through one 8'],
      [[c('K', 'diamonds'), c('8'), c('8', 'spades')], c('K', 'diamonds'), 'look through two 8s'],
      [[c('8'), c('8', 'spades'), c('8', 'clubs')], null, 'all 8s returns null'],
      [[c('7'), c('K', 'diamonds')], c('K', 'diamonds'), 'top is non-8, return directly'],
      [[c('3'), c('8'), c('8', 'spades'), c('8', 'clubs'), c('8', 'diamonds')], c('3'), 'look through four 8s'],
    ])('getEffectiveTopCard(%j) === %s (%s)', (pile, expected, _desc) => {
      expect(getEffectiveTopCard(pile)).toEqual(expected);
    });
  });

  describe('canPlayOnPile', () => {
    test.each([
      // Empty pile - anything goes
      [c('K', 'diamonds'), [], true, 'empty pile accepts any card'],

      // Special cards always playable
      [c('2'), [c('K', 'diamonds')], true, '2 resets pile (on K)'],
      [c('2'), [c('A')], true, '2 resets pile (on A)'],
      [c('10'), [c('A', 'diamonds')], true, '10 burns pile (on A)'],
      [c('10'), [c('K')], true, '10 burns pile (on K)'],
      [c('8', 'spades'), [c('3')], true, '8 always playable (on 3)'],
      [c('8'), [c('K')], true, '8 always playable (on K)'],

      // 7-constraint scenarios
      [c('5'), [c('7', 'diamonds')], true, '5 <= 7, satisfies 7-constraint'],
      [c('9'), [c('7', 'diamonds')], false, '9 > 7, fails 7-constraint'],
      [c('J'), [c('7', 'diamonds')], false, 'J > 7, fails 7-constraint'],
      [c('7'), [c('7', 'diamonds')], true, '7 <= 7, same value allowed'],
      [c('A'), [c('7', 'diamonds')], false, 'A > 7, fails 7-constraint'],
      [c('3'), [c('7', 'diamonds')], true, '3 < 7, satisfies 7-constraint'],
      [joker(), [c('7', 'diamonds')], false, 'Joker > 7, fails 7-constraint'],

      // 7-constraint with 8s on pile
      [c('K', 'diamonds'), [c('7'), c('8', 'spades')], false, 'effective top is 7 (through 8), K fails 7-constraint'],
      [c('5'), [c('7'), c('8', 'spades')], true, 'effective top is 7 (through 8), 5 satisfies 7-constraint'],

      // Normal ordering
      [c('K', 'diamonds'), [c('8'), c('5', 'spades')], true, 'effective top is 5, K >= 5'],
      [c('3'), [c('8'), c('5', 'spades')], false, 'effective top is 5, 3 < 5'],
      [c('K', 'diamonds'), [c('K', 'spades')], true, 'K >= K, equal allowed'],
      [c('Q'), [c('K', 'spades')], false, 'Q < K'],
      [joker(), [c('A', 'diamonds')], true, 'Joker >= A'],
      [c('3'), [joker()], false, '3 < Joker'],

      // Pile is all 8s - anything goes
      [c('K', 'diamonds'), [c('8'), c('8', 'spades'), c('8', 'clubs')], true, 'pile all 8s, K playable'],
      [c('3'), [c('8'), c('8', 'spades')], true, 'pile all 8s, 3 playable'],
    ])('canPlayOnPile(%s, %j) === %s (%s)', (card, pile, expected, _desc) => {
      expect(canPlayOnPile(card, pile)).toBe(expected);
    });
  });

  describe('detectBurn', () => {
    test.each([
      // Empty pile
      [[], { isBurn: false }, 'empty pile'],

      // 10 burns
      [[c('3'), c('10', 'spades')], { isBurn: true, reason: 'ten' }, '10 on top burns'],
      [[c('10')], { isBurn: true, reason: 'ten' }, 'single 10 burns'],

      // Four-of-a-kind basic
      [[c('K'), c('K', 'diamonds'), c('K', 'clubs'), c('K', 'spades')], { isBurn: true, reason: 'four-of-a-kind' }, 'four kings burns'],
      [[c('3'), c('K'), c('K', 'diamonds'), c('K', 'clubs'), c('K', 'spades')], { isBurn: true, reason: 'four-of-a-kind' }, 'four kings on top burns'],
      [[c('K'), c('K', 'diamonds'), c('K', 'clubs')], { isBurn: false }, 'only three kings (no burn)'],

      // Four 8s
      [[c('8'), c('8', 'diamonds'), c('8', 'clubs'), c('8', 'spades')], { isBurn: true, reason: 'four-of-a-kind' }, 'four 8s burns'],
      [[c('8'), c('8', 'diamonds'), c('8', 'clubs')], { isBurn: false }, 'only three 8s (no burn)'],

      // Four-of-a-kind with 8s invisible
      [[c('2'), c('8', 'spades'), c('2', 'diamonds'), c('8', 'clubs'), c('2', 'spades'), c('2', 'clubs')], { isBurn: true, reason: 'four-of-a-kind' }, 'four 2s with 8s invisible'],
      [[c('5'), c('2'), c('2', 'diamonds'), c('8', 'spades'), c('2', 'spades'), c('2', 'clubs')], { isBurn: true, reason: 'four-of-a-kind' }, 'four 2s with 8 in middle'],
      [[c('K'), c('K', 'diamonds'), c('8', 'spades'), c('K', 'clubs'), c('K', 'spades')], { isBurn: true, reason: 'four-of-a-kind' }, 'four kings with 8 invisible'],
      [[c('K'), c('K', 'diamonds'), c('8', 'spades'), c('K', 'clubs')], { isBurn: false }, 'only three kings visible (8 invisible, no burn)'],

      // Edge cases
      [[c('Q'), c('8', 'spades'), c('8', 'clubs'), c('K')], { isBurn: false }, 'K on top, only 1 king (no burn)'],
      [[joker()], { isBurn: false }, 'single joker (no burn)'],
    ])('detectBurn(%j) === %j (%s)', (pile, expected, _desc) => {
      expect(detectBurn(pile)).toEqual(expected);
    });
  });
});
