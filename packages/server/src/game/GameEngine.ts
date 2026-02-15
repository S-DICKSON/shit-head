import type { Card, GameState, PlayerGameView, PlayerGameState, OpponentView, PlaySource, ErrorCode } from '@shit-head/shared';
import { createDeck } from '@shit-head/shared';
import { shuffleDeck } from './Deck';
import { RANK_ORDER } from './CardComparison';
import { canPlayOnPile, detectBurn } from './CardRules';

type OperationResult<T = void> = T extends void
  ? { success: true } | { success: false; error: string; code: ErrorCode }
  : { success: true; data: T } | { success: false; error: string; code: ErrorCode };

export type BlindPlayResult = { state: GameState; card: Card; playable: boolean };

export type AutoPlayResult = {
  state: GameState;
  wasBlindPlay: boolean;
  blindCard?: Card;
  blindPlayable?: boolean;
};

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
    const updatedHand = [...player.hand];
    for (const idx of sortedIndices) {
      updatedHand.splice(idx, 1);
    }

    // Add played cards to discard pile
    const updatedDiscardPile = [...state.discardPile, ...cardsToPlay];

    // Auto-draw: if hand < 3 and draw pile has cards, draw until hand is 3 or pile empty
    const updatedDrawPile = [...state.drawPile];
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
    const nextPlayerIndex = this.nextActivePlayerIndex(state, state.currentPlayerIndex);

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

  /**
   * Determines which card source a player should play from based on current state.
   * Progression: hand → face-up → face-down → eliminated (null)
   *
   * @param player - Player's game state
   * @param drawPileEmpty - Whether the draw pile is empty
   * @returns PlaySource indicating where to play from, or null if eliminated
   */
  static determinePlaySource(player: PlayerGameState, drawPileEmpty: boolean): PlaySource | null {
    // Hand has priority if not empty
    if (player.hand.length > 0) {
      return 'hand';
    }

    // If draw pile has cards, player must draw (not endgame yet)
    if (!drawPileEmpty) {
      return 'hand'; // Will auto-draw before playing
    }

    // Endgame progression: hand empty AND draw pile empty
    if (player.faceUp.length > 0) {
      return 'face-up';
    }

    if (player.faceDown.length > 0) {
      return 'face-down';
    }

    // Player eliminated (no cards)
    return null;
  }

  /**
   * Checks if a player is eliminated (has no cards remaining).
   *
   * @param player - Player's game state
   * @returns true if player has zero cards across all arrays
   */
  static checkPlayerElimination(player: PlayerGameState): boolean {
    const totalCards =
      player.hand.length +
      player.faceUp.length +
      player.faceDown.length;

    return totalCards === 0;
  }

  /**
   * Finds the next active player index, skipping eliminated players.
   * Has loop limit to prevent infinite loops.
   *
   * @param state - Current game state
   * @param currentIndex - Current player index
   * @returns Next active player index, or current if all eliminated
   */
  static nextActivePlayerIndex(state: GameState, currentIndex: number): number {
    const playerCount = state.players.length;
    let nextIndex = (currentIndex + 1) % playerCount;
    let attempts = 0;

    while (attempts < playerCount) {
      const player = state.players[nextIndex];
      const isEliminated = this.checkPlayerElimination(player);

      if (!isEliminated) {
        return nextIndex; // Found active player
      }

      // This player eliminated, try next
      nextIndex = (nextIndex + 1) % playerCount;
      attempts++;
    }

    // All players eliminated except current - return current as fallback
    return currentIndex;
  }

  /**
   * Finds the shithead (loser) when only one player has cards remaining.
   *
   * @param state - Current game state
   * @returns playerId of the last player with cards, or null if game continues
   */
  static findShithead(state: GameState): string | null {
    const playersWithCards = state.players.filter(player => {
      const totalCards = player.hand.length + player.faceUp.length + player.faceDown.length;
      return totalCards > 0;
    });

    if (playersWithCards.length === 1) {
      // Last player with cards is the shithead (loser)
      return playersWithCards[0].playerId;
    }

    return null; // Game continues
  }

  /**
   * Plays cards from player's face-up array onto the discard pile.
   * Validates source is face-up, validates indices, moves cards to discard, checks elimination.
   * Supports multi-card play (multiple same-rank face-up cards).
   * Does NOT auto-draw (draw pile is empty by definition in endgame).
   *
   * @param state - Current game state
   * @param playerId - ID of the player playing cards
   * @param cardIndices - Array of indices of cards in player's faceUp to play
   * @returns OperationResult with updated GameState on success
   */
  static playFromFaceUp(
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

    const player = state.players[playerIndex];

    // Validate play source is face-up
    const playSource = this.determinePlaySource(player, state.drawPile.length === 0);
    if (playSource !== 'face-up') {
      return {
        success: false,
        error: 'Must play from correct source',
        code: 'INVALID_ACTION',
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

    // Validate all indices are within bounds
    for (const idx of cardIndices) {
      if (idx < 0 || idx >= player.faceUp.length) {
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
    const cardsToPlay = cardIndices.map(idx => player.faceUp[idx]);

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

    // Remove played cards from faceUp (use filter with Set for O(1) lookup)
    const indicesSetForFilter = new Set(cardIndices);
    const updatedFaceUp = player.faceUp.filter((_, idx) => !indicesSetForFilter.has(idx));

    // Add played cards to discard pile
    const updatedDiscardPile = [...state.discardPile, ...cardsToPlay];

    // Check for burn after cards are added to pile
    const burnResult = detectBurn(updatedDiscardPile);
    let finalDiscardPile = updatedDiscardPile;
    let nextPlayerIndex: number;

    // Update player state
    const updatedPlayer: PlayerGameState = {
      ...player,
      faceUp: updatedFaceUp,
    };

    // Check if player eliminated after play
    const isEliminated = this.checkPlayerElimination(updatedPlayer);

    if (burnResult.isBurn) {
      // Clear pile and same player goes again
      finalDiscardPile = [];
      nextPlayerIndex = playerIndex; // Same player (no advancement)
    } else if (isEliminated) {
      // Player eliminated, skip to next active player
      nextPlayerIndex = this.nextActivePlayerIndex(state, playerIndex);
    } else {
      // Normal turn advancement
      nextPlayerIndex = this.nextActivePlayerIndex(state, playerIndex);
    }

    // Create new game state
    const updatedPlayers = state.players.map((p, i) =>
      i === playerIndex ? updatedPlayer : p
    );

    let newState: GameState = {
      ...state,
      players: updatedPlayers,
      discardPile: finalDiscardPile,
      currentPlayerIndex: nextPlayerIndex,
    };

    // Check for game end
    const shitheadId = this.findShithead(newState);
    if (shitheadId) {
      newState = {
        ...newState,
        phase: 'finished',
      };
    }

    return {
      success: true,
      data: newState,
    };
  }

  /**
   * Plays a face-down card blind (without seeing it first).
   * The card is revealed and checked for playability.
   * If playable: card moves to discard pile, turn advances.
   * If not playable: entire discard pile + flipped card go into player's hand.
   *
   * @param state - Current game state
   * @param playerId - ID of the player playing blind
   * @param faceDownIndex - Index of the face-down card to flip
   * @returns OperationResult with BlindPlayResult (state, card, playable flag)
   */
  static playFaceDownBlind(
    state: GameState,
    playerId: string,
    faceDownIndex: number
  ): OperationResult<BlindPlayResult> {
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

    const player = state.players[playerIndex];

    // Validate play source is face-down
    const playSource = this.determinePlaySource(player, state.drawPile.length === 0);
    if (playSource !== 'face-down') {
      return {
        success: false,
        error: 'Must play from correct source',
        code: 'INVALID_ACTION',
      };
    }

    // Validate faceDownIndex bounds
    if (faceDownIndex < 0 || faceDownIndex >= player.faceDown.length) {
      return {
        success: false,
        error: 'Invalid face-down index',
        code: 'INVALID_ACTION',
      };
    }

    // Extract the flipped card
    const flippedCard = player.faceDown[faceDownIndex];

    // Determine if card is playable
    const isPlayable = canPlayOnPile(flippedCard, state.discardPile);

    // Remove card from faceDown
    const updatedFaceDown = player.faceDown.filter((_, idx) => idx !== faceDownIndex);

    let updatedHand: Card[];
    let updatedDiscardPile: Card[];
    let nextPlayerIndex: number;
    let updatedPhase: GameState['phase'] = state.phase;

    if (isPlayable) {
      // PATH A: Card is playable
      // Add flipped card to discard pile
      updatedDiscardPile = [...state.discardPile, flippedCard];

      // Update player state
      const updatedPlayer: PlayerGameState = {
        ...player,
        faceDown: updatedFaceDown,
      };

      // Check if player eliminated
      const isEliminated = this.checkPlayerElimination(updatedPlayer);

      // Create intermediate state for turn advancement
      const updatedPlayers = state.players.map((p, i) =>
        i === playerIndex ? updatedPlayer : p
      );

      const intermediateState: GameState = {
        ...state,
        players: updatedPlayers,
        discardPile: updatedDiscardPile,
      };

      // Advance turn
      if (isEliminated) {
        // Player eliminated, skip to next active player
        nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);

        // Check for game end
        const shitheadId = this.findShithead(intermediateState);
        if (shitheadId) {
          updatedPhase = 'finished';
        }
      } else {
        // Normal turn advancement
        nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);
      }

      const finalState: GameState = {
        ...intermediateState,
        currentPlayerIndex: nextPlayerIndex,
        phase: updatedPhase,
      };

      return {
        success: true,
        data: {
          state: finalState,
          card: flippedCard,
          playable: true,
        },
      };
    } else {
      // PATH B: Card is NOT playable
      // Player picks up entire discard pile + flipped card
      updatedHand = [...state.discardPile, flippedCard];
      updatedDiscardPile = [];

      // Update player state
      const updatedPlayer: PlayerGameState = {
        ...player,
        hand: updatedHand,
        faceDown: updatedFaceDown,
      };

      // Create intermediate state for turn advancement
      const updatedPlayers = state.players.map((p, i) =>
        i === playerIndex ? updatedPlayer : p
      );

      const intermediateState: GameState = {
        ...state,
        players: updatedPlayers,
        discardPile: updatedDiscardPile,
      };

      // Advance turn to next active player
      nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);

      const finalState: GameState = {
        ...intermediateState,
        currentPlayerIndex: nextPlayerIndex,
      };

      return {
        success: true,
        data: {
          state: finalState,
          card: flippedCard,
          playable: false,
        },
      };
    }
  }

  /**
   * Automatically plays a random valid card for a player on timeout.
   * If no valid cards exist, picks up the pile.
   * Handles all three play sources: hand, face-up, face-down.
   *
   * @param state - Current game state
   * @param playerId - ID of the player who timed out
   * @returns OperationResult with AutoPlayResult (state, wasBlindPlay flag, optional blind card info)
   */
  static autoPlayOnTimeout(
    state: GameState,
    playerId: string
  ): OperationResult<AutoPlayResult> {
    // Validate phase
    if (state.phase !== 'playing') {
      return {
        success: false,
        error: 'Can only auto-play during playing phase',
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
    const playSource = this.determinePlaySource(player, state.drawPile.length === 0);

    if (playSource === 'hand') {
      // Find all valid cards in hand
      const validIndices: number[] = [];
      for (let i = 0; i < player.hand.length; i++) {
        if (canPlayOnPile(player.hand[i], state.discardPile)) {
          validIndices.push(i);
        }
      }

      if (validIndices.length > 0) {
        // Pick random valid card
        const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
        const playResult = this.playCards(state, playerId, [randomIndex]);

        if (!playResult.success) {
          return playResult;
        }

        return {
          success: true,
          data: {
            state: playResult.data,
            wasBlindPlay: false,
          },
        };
      } else {
        // No valid cards - must pickup pile
        const pickupResult = this.pickupPile(state, playerId);

        if (!pickupResult.success) {
          return pickupResult;
        }

        return {
          success: true,
          data: {
            state: pickupResult.data,
            wasBlindPlay: false,
          },
        };
      }
    } else if (playSource === 'face-up') {
      // Find all valid face-up cards
      const validIndices: number[] = [];
      for (let i = 0; i < player.faceUp.length; i++) {
        if (canPlayOnPile(player.faceUp[i], state.discardPile)) {
          validIndices.push(i);
        }
      }

      if (validIndices.length > 0) {
        // Pick random valid face-up card
        const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
        const playResult = this.playFromFaceUp(state, playerId, [randomIndex]);

        if (!playResult.success) {
          return playResult;
        }

        return {
          success: true,
          data: {
            state: playResult.data,
            wasBlindPlay: false,
          },
        };
      } else {
        // No valid face-up cards - must pickup pile
        const pickupResult = this.pickupPile(state, playerId);

        if (!pickupResult.success) {
          return pickupResult;
        }

        return {
          success: true,
          data: {
            state: pickupResult.data,
            wasBlindPlay: false,
          },
        };
      }
    } else if (playSource === 'face-down') {
      // Random blind play (consistent with Phase 7 blind mechanics)
      const randomIndex = Math.floor(Math.random() * player.faceDown.length);
      const blindResult = this.playFaceDownBlind(state, playerId, randomIndex);

      if (!blindResult.success) {
        return blindResult;
      }

      return {
        success: true,
        data: {
          state: blindResult.data.state,
          wasBlindPlay: true,
          blindCard: blindResult.data.card,
          blindPlayable: blindResult.data.playable,
        },
      };
    }

    // Player eliminated (no cards) - should not happen during their turn
    return {
      success: false,
      error: 'Player has no cards to play',
      code: 'INVALID_ACTION',
    };
  }
}
