// BotPlayer — deterministic move selection for bot players in Shithead
// Strategy: play the lowest valid rank group; pickup if no valid cards; random face-down index.
import type { GameState, PlayerGameState } from '@shit-head/shared';
import { canPlayOnPile, getRankValue } from '@shit-head/shared';

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
      // Play from hand
      return selectHandMove(player, state, state.firstTurn);
    }

    if (drawPileEmpty && player.faceUp.length > 0) {
      // Play from face-up
      return selectFaceUpMove(player, state);
    }

    if (drawPileEmpty && player.faceUp.length === 0 && player.faceDown.length > 0) {
      // Play random face-down
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
 * On first turn: play all copies of lowest non-2 rank.
 * Otherwise: play lowest valid rank group, or pickup.
 */
function selectHandMove(player: PlayerGameState, state: GameState, firstTurn: boolean): BotMove {
  const { discardPile } = state;

  if (firstTurn) {
    // First turn: must play lowest non-2 card(s)
    const nonTwoCards = player.hand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => card.kind !== 'standard' || card.rank !== '2');

    if (nonTwoCards.length === 0) {
      // All 2s — play lowest (first)
      return { type: 'play', cardIndices: [0] };
    }

    // Find lowest rank among non-2 cards
    const lowestValue = Math.min(...nonTwoCards.map(({ card }) => getRankValue(card)));
    const lowestGroup = nonTwoCards.filter(({ card }) => getRankValue(card) === lowestValue);
    return { type: 'play', cardIndices: lowestGroup.map(({ idx }) => idx) };
  }

  // Normal play: find valid cards
  const validCards = player.hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => canPlayOnPile(card, discardPile));

  if (validCards.length === 0) {
    return { type: 'pickup' };
  }

  // Find lowest valid rank group
  const lowestValue = Math.min(...validCards.map(({ card }) => getRankValue(card)));
  const lowestGroup = validCards.filter(({ card }) => getRankValue(card) === lowestValue);
  return { type: 'play', cardIndices: lowestGroup.map(({ idx }) => idx) };
}

/**
 * Select move from face-up cards (hand empty, draw pile empty).
 * Plays lowest valid rank group, or pickup.
 */
function selectFaceUpMove(player: PlayerGameState, state: GameState): BotMove {
  const { discardPile } = state;

  const validCards = player.faceUp
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => canPlayOnPile(card, discardPile));

  if (validCards.length === 0) {
    return { type: 'pickup' };
  }

  // Find lowest valid rank group
  const lowestValue = Math.min(...validCards.map(({ card }) => getRankValue(card)));
  const lowestGroup = validCards.filter(({ card }) => getRankValue(card) === lowestValue);
  return { type: 'play', cardIndices: lowestGroup.map(({ idx }) => idx) };
}
