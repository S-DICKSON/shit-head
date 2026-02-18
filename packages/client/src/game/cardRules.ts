// Client-side copy of server CardRules + CardComparison pure functions. Keep in sync with packages/server/src/game/
import type { Card, Rank } from '@shit-head/shared';

// All 13 ranks in ascending order
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
 * Gets the "effective" top card of the discard pile by looking through 8s.
 *
 * 8s are transparent - they don't count as the "top" card for validation purposes.
 * This function walks backwards from the top of the pile, skipping any 8s,
 * and returns the first non-8 card found.
 *
 * @param discardPile - The current discard pile
 * @returns The effective top card, or null if pile is empty or contains only 8s
 */
export function getEffectiveTopCard(discardPile: Card[]): Card | null {
  for (let i = discardPile.length - 1; i >= 0; i--) {
    const card = discardPile[i];
    if (card.kind === 'standard' && card.rank === '8') continue;
    return card;
  }
  return null;
}

/**
 * Determines if a card can be legally played on the discard pile.
 *
 * Rules in order of precedence:
 * 1. Empty pile: any card can be played
 * 2. Played card is rank 2: always playable (resets pile)
 * 3. Played card is rank 10: always playable (burns pile)
 * 4. Played card is rank 8: always playable (invisible)
 * 5. Effective top is null (pile is all 8s): any card can be played
 * 6. Effective top is rank 7 (7-constraint): must play card with rank <= 7
 * 7. Normal ordering: must play card with rank >= effective top
 *
 * @param playedCard - The card being played
 * @param discardPile - The current discard pile
 * @returns true if the play is legal
 */
export function canPlayOnPile(playedCard: Card, discardPile: Card[]): boolean {
  // Empty pile: anything goes
  if (discardPile.length === 0) return true;

  // Special cards always playable
  if (playedCard.kind === 'standard') {
    if (playedCard.rank === '2') return true;
    if (playedCard.rank === '10') return true;
    if (playedCard.rank === '8') return true;
  }

  // Jokers are always playable
  if (playedCard.kind === 'joker') return true;

  // Get effective top card (looking through 8s)
  const effectiveTop = getEffectiveTopCard(discardPile);

  // If pile is all 8s, anything goes
  if (effectiveTop === null) return true;

  // 7-constraint: if effective top is 7, must play <= 7
  if (effectiveTop.kind === 'standard' && effectiveTop.rank === '7') {
    return getRankValue(playedCard) <= getRankValue(effectiveTop);
  }

  // Normal ordering: played card must be >= effective top
  return getRankValue(playedCard) >= getRankValue(effectiveTop);
}
