// BotPlayer — deterministic move selection for bot players in Shithead
// Strategy: play the lowest valid rank group; pickup if no valid cards; random face-down index.
import type { GameState, PlayerGameState, Card } from '@shit-head/shared';
import { canPlayOnPile, getRankValue, RANK_ORDER } from '@shit-head/shared';

// ---------------------------------------------------------------------------
// Move types
// ---------------------------------------------------------------------------

export type BotMove =
  | { type: 'play'; cardIndices: number[] }
  | { type: 'pickup' }
  | { type: 'face-down'; faceDownIndex: number };

// ---------------------------------------------------------------------------
// BotPlayer
// ---------------------------------------------------------------------------

export const BotPlayer = {
  /**
   * Selects the best deterministic move for a bot player.
   *
   * Priority:
   *  1. If player has hand cards: play lowest valid rank group, else pickup
   *  2. If hand empty and draw pile empty, face-up cards available: play lowest valid face-up group, else pickup
   *  3. If hand empty, face-up empty, face-down available: play random face-down card
   *
   * @param state - Current game state
   * @param botPlayerId - The bot player's ID
   * @returns A BotMove describing what the bot should do
   */
  selectMove(state: GameState, botPlayerId: string): BotMove {
    const player = state.players.find(p => p.playerId === botPlayerId);
    if (!player) {
      throw new Error(`Bot player not found in state: ${botPlayerId}`);
    }

    const drawPileEmpty = state.drawPile.length === 0;

    // Determine play source
    if (player.hand.length > 0) {
      return selectHandMove(player, state, state.firstTurn);
    }

    if (drawPileEmpty && player.faceUp.length > 0) {
      return selectLowestValidGroup(player.faceUp, state.discardPile);
    }

    if (drawPileEmpty && player.faceUp.length === 0 && player.faceDown.length > 0) {
      const faceDownIndex = Math.floor(Math.random() * player.faceDown.length);
      return { type: 'face-down', faceDownIndex };
    }

    // Fallback: pickup (should not normally reach here)
    return { type: 'pickup' };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Select move from hand cards.
 * On first turn: play all copies of lowest non-2 rank (scans RANK_ORDER from '3' upward).
 * Otherwise: play lowest valid rank group, or pickup.
 */
function selectHandMove(player: PlayerGameState, state: GameState, firstTurn: boolean): BotMove {
  if (firstTurn) {
    // Scan RANK_ORDER from '3' upward (skip '2' at index 0) to find lowest non-2 rank in hand
    const scanOrder = RANK_ORDER.slice(1); // ['3', '4', '5', ..., 'A']
    for (const rank of scanOrder) {
      const indices = player.hand
        .map((c, i) => (c.kind === 'standard' && c.rank === rank ? i : -1))
        .filter(i => i !== -1);
      if (indices.length > 0) {
        return { type: 'play', cardIndices: indices };
      }
    }
    // Fallback: hand contains only 2s — play first card
    return { type: 'play', cardIndices: [0] };
  }

  return selectLowestValidGroup(player.hand, state.discardPile);
}

/**
 * From a set of cards, find all cards valid to play on the discard pile,
 * group them by rank value, and return the group with the lowest rank value.
 * Returns pickup if no cards are valid.
 */
function selectLowestValidGroup(cards: Card[], discardPile: Card[]): BotMove {
  const validCards = cards
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => canPlayOnPile(card, discardPile));

  if (validCards.length === 0) {
    return { type: 'pickup' };
  }

  const lowestValue = Math.min(...validCards.map(({ card }) => getRankValue(card)));
  const lowestGroup = validCards.filter(({ card }) => getRankValue(card) === lowestValue);
  return { type: 'play', cardIndices: lowestGroup.map(({ idx }) => idx) };
}
