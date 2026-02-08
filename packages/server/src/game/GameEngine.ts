import type { Card, GameState, PlayerGameView, PlayerGameState, OpponentView } from '@shit-head/shared';
import { createDeck } from '@shit-head/shared';
import { shuffleDeck } from './Deck';
import { RANK_ORDER, canPlayOn } from './CardComparison';
import { canPlayOnPile, detectBurn } from './CardRules';

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
   * Determines which player should go first based on lowest card in hand.
   * Scans from rank 3 upward (2s are excluded from first-player detection).
   * Returns the index of the first player found with the lowest rank.
   *
   * @param state - Current game state
   * @returns Player index (0 to playerCount-1) of the first player
   */
  static determineFirstPlayer(state: GameState): number {
    // Scan ranks starting from 3 upward (skip 2s per game rules)
    const scanOrder = RANK_ORDER.slice(1); // Skip '2', start from '3'

    for (const rank of scanOrder) {
      // Check each player's hand for this rank
      for (let i = 0; i < state.players.length; i++) {
        const player = state.players[i];

        // Check if player has this rank in their hand
        const hasRank = player.hand.some(
          card => card.kind === 'standard' && card.rank === rank
        );

        if (hasRank) {
          return i; // Found first player with lowest card
        }
      }
    }

    // Fallback: if no standard cards found (extremely unlikely), return player 0
    return 0;
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

    // Perform the swap immutably using destructuring assignment
    const updatedHand = [...player.hand];
    const updatedFaceUp = [...player.faceUp];

    [updatedHand[handIndex], updatedFaceUp[faceUpIndex]] = [
      updatedFaceUp[faceUpIndex],
      updatedHand[handIndex],
    ];

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

  /**
   * Plays cards from a player's hand onto the discard pile.
   * Validates phase, turn, card indices, rank consistency, and playability using special card rules.
   * Auto-draws cards after play to maintain hand size of 3 if possible.
   * Detects burns (10 or four-of-a-kind) and handles accordingly:
   * - On burn: clears pile and same player goes again
   * - No burn: advances turn to next player
   *
   * @param state - Current game state
   * @param playerId - ID of the player playing cards
   * @param cardIndices - Array of indices of cards in player's hand to play
   * @returns OperationResult with updated GameState on success
   */
  static playCards(
    state: GameState,
    playerId: string,
    cardIndices: number[]
  ): OperationResult<GameState> {
    // Validate phase
    if (state.phase !== 'playing') {
      return {
        success: false,
        error: 'Can only play cards during playing phase',
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

    // Validate turn
    if (playerIndex !== state.currentPlayerIndex) {
      return {
        success: false,
        error: 'Not your turn',
        code: 'NOT_YOUR_TURN',
      };
    }

    // Validate cardIndices not empty
    if (cardIndices.length === 0) {
      return {
        success: false,
        error: 'Must play at least one card',
        code: 'INVALID_ACTION',
      };
    }

    const player = state.players[playerIndex];

    // Validate all indices are within bounds
    for (const idx of cardIndices) {
      if (idx < 0 || idx >= player.hand.length) {
        return {
          success: false,
          error: 'Invalid card index',
          code: 'INVALID_ACTION',
        };
      }
    }

    // Validate no duplicate indices
    const indicesSet = new Set(cardIndices);
    if (indicesSet.size !== cardIndices.length) {
      return {
        success: false,
        error: 'Duplicate card indices',
        code: 'INVALID_ACTION',
      };
    }

    // Get the cards being played
    const cardsToPlay = cardIndices.map(idx => player.hand[idx]);

    // Validate all cards have same rank (for multi-card plays)
    if (cardsToPlay.length > 1) {
      const firstRank = cardsToPlay[0].kind === 'standard' ? cardsToPlay[0].rank : null;
      for (const card of cardsToPlay) {
        const cardRank = card.kind === 'standard' ? card.rank : null;
        if (cardRank !== firstRank) {
          return {
            success: false,
            error: 'All cards must have same rank',
            code: 'INVALID_ACTION',
          };
        }
      }
    }

    // Validate play is legal using full special card rules
    const firstPlayedCard = cardsToPlay[0]; // All cards same rank, just check first
    if (!canPlayOnPile(firstPlayedCard, state.discardPile)) {
      return {
        success: false,
        error: 'Card cannot be played on current pile',
        code: 'INVALID_ACTION',
      };
    }

    // All validations passed - perform the play

    // Remove played cards from hand (sort indices descending to avoid index shifting)
    const sortedIndices = [...cardIndices].sort((a, b) => b - a);
    let updatedHand = [...player.hand];
    for (const idx of sortedIndices) {
      updatedHand.splice(idx, 1);
    }

    // Add played cards to discard pile
    let updatedDiscardPile = [...state.discardPile, ...cardsToPlay];

    // Auto-draw: if hand < 3 and draw pile has cards, draw until hand is 3 or pile empty
    let updatedDrawPile = [...state.drawPile];
    while (updatedHand.length < 3 && updatedDrawPile.length > 0) {
      const drawnCard = updatedDrawPile.shift()!;
      updatedHand.push(drawnCard);
    }

    // Check for burn after cards are added to pile
    const burnResult = detectBurn(updatedDiscardPile);
    let finalDiscardPile = updatedDiscardPile;
    let nextPlayerIndex: number;

    if (burnResult.isBurn) {
      // Clear pile and same player goes again
      finalDiscardPile = [];
      nextPlayerIndex = playerIndex; // Same player (no advancement)
    } else {
      // Normal turn advancement
      nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }

    // Update player state
    const updatedPlayer: PlayerGameState = {
      ...player,
      hand: updatedHand,
    };

    // Create new game state
    const updatedPlayers = state.players.map((p, i) =>
      i === playerIndex ? updatedPlayer : p
    );

    const newState: GameState = {
      ...state,
      players: updatedPlayers,
      discardPile: finalDiscardPile,
      drawPile: updatedDrawPile,
      currentPlayerIndex: nextPlayerIndex,
    };

    return {
      success: true,
      data: newState,
    };
  }

  /**
   * Picks up the entire discard pile and adds it to the player's hand.
   * Advances turn to next player on success.
   *
   * @param state - Current game state
   * @param playerId - ID of the player picking up the pile
   * @returns OperationResult with updated GameState on success
   */
  static pickupPile(
    state: GameState,
    playerId: string
  ): OperationResult<GameState> {
    // Validate phase
    if (state.phase !== 'playing') {
      return {
        success: false,
        error: 'Can only pick up during playing phase',
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

    // Validate turn
    if (playerIndex !== state.currentPlayerIndex) {
      return {
        success: false,
        error: 'Not your turn',
        code: 'NOT_YOUR_TURN',
      };
    }

    // Validate discard pile not empty
    if (state.discardPile.length === 0) {
      return {
        success: false,
        error: 'No cards to pick up',
        code: 'INVALID_ACTION',
      };
    }

    const player = state.players[playerIndex];

    // Add all discard pile cards to player's hand
    const updatedHand = [...player.hand, ...state.discardPile];

    // Update player state
    const updatedPlayer: PlayerGameState = {
      ...player,
      hand: updatedHand,
    };

    // Advance turn
    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

    // Create new game state
    const updatedPlayers = state.players.map((p, i) =>
      i === playerIndex ? updatedPlayer : p
    );

    const newState: GameState = {
      ...state,
      players: updatedPlayers,
      discardPile: [],
      currentPlayerIndex: nextPlayerIndex,
    };

    return {
      success: true,
      data: newState,
    };
  }
}
