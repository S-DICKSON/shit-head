import type { Card, Rank } from '@shit-head/shared';

// All 13 ranks in ascending order for Phase 5
// In Phase 6, special cards (2, 8, 10) will get override behavior
export const RANK_ORDER: readonly Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Map each rank to its numeric value
// 2=-1, 3=0, 4=1, 5=2, 6=3, 7=4, 8=5, 9=6, 10=7, J=8, Q=9, K=10, A=11
const RANK_MAP = new Map(RANK_ORDER.map((rank, idx) => [rank, idx - 1]));

/**
 * Gets the numeric value of a card for comparison purposes.
 * Higher values are stronger.
 *
 * Standard cards: 2=-1, 3=0, 4=1, ..., A=11
 * Jokers: 999 (highest)
 *
 * @param card - The card to evaluate
 * @returns Numeric rank value
 * @throws Error if rank is unknown
 */
export function getRankValue(card: Card): number {
  if (card.kind === 'joker') return 999;

  const value = RANK_MAP.get(card.rank);
  if (value === undefined) {
    throw new Error(`Unknown rank: ${card.rank}`);
  }

  return value;
}

/**
 * Determines if a played card can be legally played on top of another card.
 * A card can be played if its rank value is greater than or equal to the top card.
 *
 * @param playedCard - The card being played
 * @param topCard - The current top card on the discard pile
 * @returns true if the play is valid
 */
export function canPlayOn(playedCard: Card, topCard: Card): boolean {
  return getRankValue(playedCard) >= getRankValue(topCard);
}

// Hand sorting order (different from gameplay RANK_ORDER)
// Normal cards ascending: 3,4,5,6,9,J,Q,K,A (positions 0-8)
// Jokers: position 9
// Special cards grouped: 2,7,8,10 (positions 10-13)
const HAND_SORT_ORDER = new Map<string, number>([
  ['3', 0],
  ['4', 1],
  ['5', 2],
  ['6', 3],
  ['9', 4],
  ['J', 5],
  ['Q', 6],
  ['K', 7],
  ['A', 8],
  // joker handled separately -> 9
  ['2', 10],
  ['7', 11],
  ['8', 12],
  ['10', 13],
]);

const SUIT_ORDER = new Map<string, number>([
  ['hearts', 0],
  ['diamonds', 1],
  ['clubs', 2],
  ['spades', 3],
]);

/**
 * Sorts a hand of cards for display purposes.
 * Returns a new sorted array (does not mutate input).
 *
 * Sort order:
 * - Normal cards ascending: 3,4,5,6,9,J,Q,K,A
 * - Jokers
 * - Special cards grouped: 2,7,8,10
 *
 * Within same rank, cards are sorted by suit (hearts < diamonds < clubs < spades).
 * Jokers are sorted by id (1 before 2).
 *
 * @param hand - Array of cards to sort
 * @returns New array with cards sorted by display order
 */
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    // Get sort keys
    const aKey = a.kind === 'joker' ? 9 : HAND_SORT_ORDER.get(a.rank) ?? 999;
    const bKey = b.kind === 'joker' ? 9 : HAND_SORT_ORDER.get(b.rank) ?? 999;

    // Primary sort by rank position
    if (aKey !== bKey) {
      return aKey - bKey;
    }

    // Secondary sort for same rank
    if (a.kind === 'joker' && b.kind === 'joker') {
      return a.id - b.id;
    }

    if (a.kind === 'standard' && b.kind === 'standard') {
      const aSuit = SUIT_ORDER.get(a.suit) ?? 0;
      const bSuit = SUIT_ORDER.get(b.suit) ?? 0;
      return aSuit - bSuit;
    }

    return 0;
  });
}
