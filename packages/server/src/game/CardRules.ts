import type { Card } from '@shit-head/shared';
import { getRankValue } from './CardComparison';

const SPECIAL_RANKS: ReadonlySet<string> = new Set(['2', '8', '10']);

/**
 * Determines if a card is a special card (2, 8, or 10).
 *
 * Special cards have unique behaviors:
 * - 2 resets the pile (can be played on anything)
 * - 8 is invisible (can be played on anything, transparent for pile logic)
 * - 10 burns the pile (can be played on anything, triggers immediate burn)
 *
 * Note: 7 is NOT a special card (it follows normal ordering when played),
 * but it creates a constraint for the next player.
 *
 * @param card - The card to check
 * @returns true if card is rank 2, 8, or 10
 */
export function isSpecialCard(card: Card): boolean {
  return card.kind === 'standard' && SPECIAL_RANKS.has(card.rank);
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

/**
 * Detects if the current discard pile should trigger a burn.
 *
 * Burn conditions:
 * 1. Top card is a 10 (10 always burns)
 * 2. Four cards of the same rank are on top (four-of-a-kind)
 *
 * For four-of-a-kind detection:
 * - When counting 8s: only 8s count (8s count themselves)
 * - When counting non-8 ranks: 8s are invisible (skip them in the count)
 *
 * @param discardPile - The current discard pile
 * @returns Object with isBurn flag and optional reason
 */
export function detectBurn(discardPile: Card[]): { isBurn: boolean; reason?: 'ten' | 'four-of-a-kind' } {
  if (discardPile.length === 0) return { isBurn: false };

  const topCard = discardPile[discardPile.length - 1];

  // 10 always burns
  if (topCard.kind === 'standard' && topCard.rank === '10') {
    return { isBurn: true, reason: 'ten' };
  }

  // Four-of-a-kind detection
  if (topCard.kind !== 'standard') return { isBurn: false };

  const targetRank = topCard.rank;
  let count = 0;

  for (let i = discardPile.length - 1; i >= 0; i--) {
    const card = discardPile[i];
    if (card.kind !== 'standard') break;

    if (targetRank === '8') {
      // When counting 8s, only 8s count
      if (card.rank === '8') {
        count++;
      } else {
        break;
      }
    } else {
      // For non-8 ranks, 8s are invisible (skip them)
      if (card.rank === '8') continue;
      if (card.rank === targetRank) {
        count++;
      } else {
        break;
      }
    }
  }

  if (count >= 4) {
    return { isBurn: true, reason: 'four-of-a-kind' };
  }

  return { isBurn: false };
}
