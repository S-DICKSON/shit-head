import type { Card, GameState, PlayerGameView, PlayerGameState, OpponentView } from '@shit-head/shared';
import { createDeck } from '@shit-head/shared';
import { shuffleDeck } from './Deck';

export class GameEngine {
  /**
   * Creates a new game with shuffled and dealt cards.
   * @param players - Array of player info (id and nickname)
   * @param dealerIndex - Index of the dealer (0 to playerCount-1)
   * @returns Complete game state
   */
  static createGame(
    players: { id: string; nickname: string }[],
    dealerIndex: number
  ): GameState {
    // Create and shuffle deck
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);

    // Initialize player states
    const playerStates: PlayerGameState[] = [];
    let cardIndex = 0;

    // Deal cards sequentially: face-down, then face-up, then hand
    // Each player gets 3 cards in each category

    // Deal face-down cards (3 per player)
    for (const player of players) {
      playerStates.push({
        playerId: player.id,
        nickname: player.nickname,
        faceDown: shuffled.slice(cardIndex, cardIndex + 3),
        faceUp: [],
        hand: [],
      });
      cardIndex += 3;
    }

    // Deal face-up cards (3 per player)
    for (let i = 0; i < players.length; i++) {
      playerStates[i].faceUp = shuffled.slice(cardIndex, cardIndex + 3);
      cardIndex += 3;
    }

    // Deal hand cards (3 per player)
    for (let i = 0; i < players.length; i++) {
      playerStates[i].hand = shuffled.slice(cardIndex, cardIndex + 3);
      cardIndex += 3;
    }

    // Remaining cards become draw pile
    const drawPile = shuffled.slice(cardIndex);

    // Calculate current player (next after dealer)
    const currentPlayerIndex = (dealerIndex + 1) % players.length;

    return {
      phase: 'swapping',
      players: playerStates,
      drawPile,
      discardPile: [],
      currentPlayerIndex,
      dealerIndex,
    };
  }

  /**
   * Gets a player-specific view of the game state.
   * @param state - Complete game state
   * @param playerId - ID of the player requesting the view
   * @returns Player-specific view with hidden information for opponents
   */
  static getPlayerView(state: GameState, playerId: string): PlayerGameView {
    // Find the player
    const player = state.players.find(p => p.playerId === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found in game state`);
    }

    // Create opponent views (all players except the requesting player)
    const opponents: OpponentView[] = state.players
      .filter(p => p.playerId !== playerId)
      .map(p => ({
        playerId: p.playerId,
        nickname: p.nickname,
        faceDownCount: p.faceDown.length,
        faceUp: p.faceUp,
        handCount: p.hand.length,
      }));

    return {
      phase: state.phase,
      hand: player.hand,
      faceUp: player.faceUp,
      faceDownCount: player.faceDown.length,
      opponents,
      drawPileCount: state.drawPile.length,
      discardPile: state.discardPile,
      currentPlayerIndex: state.currentPlayerIndex,
      dealerIndex: state.dealerIndex,
    };
  }

  /**
   * Calculates the next dealer index (rotates clockwise).
   * @param currentDealerIndex - Current dealer index
   * @param playerCount - Total number of players
   * @returns Next dealer index
   */
  static nextDealerIndex(currentDealerIndex: number, playerCount: number): number {
    return (currentDealerIndex + 1) % playerCount;
  }
}
