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
