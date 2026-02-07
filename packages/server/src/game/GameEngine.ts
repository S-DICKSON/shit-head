import type { Card, GameState, PlayerGameView, PlayerGameState, OpponentView } from '@shit-head/shared';
import { createDeck } from '@shit-head/shared';
import { shuffleDeck } from './Deck';

type OperationResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; code: string };

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

  /**
   * Swaps a hand card with a face-up card for a given player.
   * @param state - Current game state
   * @param playerId - ID of the player performing the swap
   * @param handIndex - Index of the card in the player's hand
   * @param faceUpIndex - Index of the card in the player's face-up cards
   * @returns OperationResult with updated GameState on success
   */
  static swapCards(
    state: GameState,
    playerId: string,
    handIndex: number,
    faceUpIndex: number
  ): OperationResult<GameState> {
    // Validate phase
    if (state.phase !== 'swapping') {
      return {
        success: false,
        error: 'Can only swap cards during swapping phase',
        code: 'INVALID_ACTION',
      };
    }

    // Find player
    const playerIndex = state.players.findIndex(p => p.playerId === playerId);
    if (playerIndex === -1) {
      return {
        success: false,
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      };
    }

    const player = state.players[playerIndex];

    // Validate indices
    if (handIndex < 0 || handIndex >= player.hand.length) {
      return {
        success: false,
        error: 'Invalid hand index',
        code: 'INVALID_ACTION',
      };
    }

    if (faceUpIndex < 0 || faceUpIndex >= player.faceUp.length) {
      return {
        success: false,
        error: 'Invalid face-up index',
        code: 'INVALID_ACTION',
      };
    }

    // Perform the swap immutably
    const updatedHand = [...player.hand];
    const updatedFaceUp = [...player.faceUp];

    const temp = updatedHand[handIndex];
    updatedHand[handIndex] = updatedFaceUp[faceUpIndex];
    updatedFaceUp[faceUpIndex] = temp;

    // Create updated player state
    const updatedPlayer: PlayerGameState = {
      ...player,
      hand: updatedHand,
      faceUp: updatedFaceUp,
    };

    // Create new game state with updated player
    const updatedPlayers = state.players.map((p, i) =>
      i === playerIndex ? updatedPlayer : p
    );

    const newState: GameState = {
      ...state,
      players: updatedPlayers,
    };

    return {
      success: true,
      data: newState,
    };
  }
}
