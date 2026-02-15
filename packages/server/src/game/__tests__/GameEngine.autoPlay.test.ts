import { describe, expect, test } from 'vitest';
import { GameEngine } from '../GameEngine';
import type { GameState } from '@shit-head/shared';

describe('GameEngine.autoPlayOnTimeout', () => {
  // Helper to create minimal game state
  function createTestGameState(overrides?: Partial<GameState>): GameState {
    const defaultState: GameState = {
      phase: 'playing',
      players: [
        {
          playerId: 'player-1',
          nickname: 'Alice',
          hand: [
            { kind: 'standard', suit: 'hearts', rank: '5' },
            { kind: 'standard', suit: 'diamonds', rank: '6' },
          ],
          faceUp: [],
          faceDown: [],
        },
        {
          playerId: 'player-2',
          nickname: 'Bob',
          hand: [{ kind: 'standard', suit: 'clubs', rank: '7' }],
          faceUp: [],
          faceDown: [],
        },
      ],
      drawPile: [],
      discardPile: [{ kind: 'standard', suit: 'spades', rank: '4' }],
      currentPlayerIndex: 0,
      dealerIndex: 0,
      firstTurn: false,
    };

    return { ...defaultState, ...overrides };
  }

  test('returns error if phase is not playing', () => {
    const state = createTestGameState({ phase: 'swapping' });
    const result = GameEngine.autoPlayOnTimeout(state, 'player-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_ACTION');
    }
  });

  test('returns error if player not found', () => {
    const state = createTestGameState();
    const result = GameEngine.autoPlayOnTimeout(state, 'non-existent-player');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('PLAYER_NOT_FOUND');
    }
  });

  test('plays a valid card from hand when valid cards exist', () => {
    const state = createTestGameState({
      discardPile: [{ kind: 'standard', suit: 'spades', rank: '4' }],
    });

    const result = GameEngine.autoPlayOnTimeout(state, 'player-1');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      const { state: newState, wasBlindPlay } = result.data;

      // Should not be blind play (hand cards are visible)
      expect(wasBlindPlay).toBe(false);

      // One card should have been played from hand (2 cards -> 1 card)
      const player = newState.players[0];
      expect(player.hand.length).toBe(1);

      // Discard pile should have grown by 1 (unless burn occurred)
      // Either pile has 2 cards, or burn cleared it to 0
      const validPileSize = newState.discardPile.length === 2 || newState.discardPile.length === 0;
      expect(validPileSize).toBe(true);
    }
  });

  test('picks up pile when no valid hand cards exist', () => {
    const state = createTestGameState({
      players: [
        {
          playerId: 'player-1',
          nickname: 'Alice',
          hand: [
            { kind: 'standard', suit: 'hearts', rank: '3' },
            { kind: 'standard', suit: 'diamonds', rank: '4' },
          ],
          faceUp: [],
          faceDown: [],
        },
        {
          playerId: 'player-2',
          nickname: 'Bob',
          hand: [{ kind: 'standard', suit: 'clubs', rank: '7' }],
          faceUp: [],
          faceDown: [],
        },
      ],
      discardPile: [{ kind: 'standard', suit: 'spades', rank: 'K' }],
      currentPlayerIndex: 0,
    });

    const result = GameEngine.autoPlayOnTimeout(state, 'player-1');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      const { state: newState, wasBlindPlay } = result.data;

      expect(wasBlindPlay).toBe(false);

      // Player should have picked up the pile
      const player = newState.players[0];
      expect(player.hand.length).toBe(3); // 2 original + 1 from pile

      // Discard pile should be empty
      expect(newState.discardPile.length).toBe(0);

      // Turn should advance
      expect(newState.currentPlayerIndex).toBe(1);
    }
  });

  test('plays a valid face-up card when in face-up phase', () => {
    const state = createTestGameState({
      players: [
        {
          playerId: 'player-1',
          nickname: 'Alice',
          hand: [],
          faceUp: [
            { kind: 'standard', suit: 'hearts', rank: '6' },
            { kind: 'standard', suit: 'diamonds', rank: '7' },
          ],
          faceDown: [],
        },
        {
          playerId: 'player-2',
          nickname: 'Bob',
          hand: [],
          faceUp: [{ kind: 'standard', suit: 'clubs', rank: '5' }],
          faceDown: [],
        },
      ],
      drawPile: [],
      discardPile: [{ kind: 'standard', suit: 'spades', rank: '5' }],
      currentPlayerIndex: 0,
    });

    const result = GameEngine.autoPlayOnTimeout(state, 'player-1');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      const { state: newState, wasBlindPlay } = result.data;

      expect(wasBlindPlay).toBe(false);

      // One face-up card should have been played
      const player = newState.players[0];
      expect(player.faceUp.length).toBe(1);
    }
  });

  test('picks up pile when no valid face-up cards exist', () => {
    const state = createTestGameState({
      players: [
        {
          playerId: 'player-1',
          nickname: 'Alice',
          hand: [],
          faceUp: [
            { kind: 'standard', suit: 'hearts', rank: '3' },
            { kind: 'standard', suit: 'diamonds', rank: '4' },
          ],
          faceDown: [],
        },
        {
          playerId: 'player-2',
          nickname: 'Bob',
          hand: [],
          faceUp: [{ kind: 'standard', suit: 'clubs', rank: '7' }],
          faceDown: [],
        },
      ],
      drawPile: [],
      discardPile: [{ kind: 'standard', suit: 'spades', rank: 'K' }],
      currentPlayerIndex: 0,
    });

    const result = GameEngine.autoPlayOnTimeout(state, 'player-1');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      const { state: newState, wasBlindPlay } = result.data;

      expect(wasBlindPlay).toBe(false);

      // Player should have picked up the pile into hand
      const player = newState.players[0];
      expect(player.hand.length).toBe(1);
      expect(player.faceUp.length).toBe(2); // Face-up unchanged

      // Discard pile should be empty
      expect(newState.discardPile.length).toBe(0);
    }
  });

  test('plays random face-down card blindly', () => {
    const state = createTestGameState({
      players: [
        {
          playerId: 'player-1',
          nickname: 'Alice',
          hand: [],
          faceUp: [],
          faceDown: [
            { kind: 'standard', suit: 'hearts', rank: '6' },
            { kind: 'standard', suit: 'diamonds', rank: '7' },
          ],
        },
        {
          playerId: 'player-2',
          nickname: 'Bob',
          hand: [],
          faceUp: [],
          faceDown: [{ kind: 'standard', suit: 'clubs', rank: '5' }],
        },
      ],
      drawPile: [],
      discardPile: [{ kind: 'standard', suit: 'spades', rank: '5' }],
      currentPlayerIndex: 0,
    });

    const result = GameEngine.autoPlayOnTimeout(state, 'player-1');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      const { state: newState, wasBlindPlay, blindCard, blindPlayable } = result.data;

      // Should be a blind play
      expect(wasBlindPlay).toBe(true);

      // Should have card and playable flag
      expect(blindCard).toBeDefined();
      expect(typeof blindPlayable).toBe('boolean');

      // One face-down card should have been removed
      const player = newState.players[0];
      expect(player.faceDown.length).toBe(1);
    }
  });

  test('after auto-play burn (10), same player goes again', () => {
    const state = createTestGameState({
      players: [
        {
          playerId: 'player-1',
          nickname: 'Alice',
          hand: [{ kind: 'standard', suit: 'hearts', rank: '10' }],
          faceUp: [],
          faceDown: [],
        },
        {
          playerId: 'player-2',
          nickname: 'Bob',
          hand: [{ kind: 'standard', suit: 'clubs', rank: '7' }],
          faceUp: [],
          faceDown: [],
        },
      ],
      drawPile: [],
      discardPile: [{ kind: 'standard', suit: 'spades', rank: '5' }],
      currentPlayerIndex: 0,
    });

    const result = GameEngine.autoPlayOnTimeout(state, 'player-1');

    expect(result.success).toBe(true);
    if (result.success && result.data) {
      const { state: newState } = result.data;

      // Same player should still be current (burn = same player goes again)
      expect(newState.currentPlayerIndex).toBe(0);

      // Discard pile should be cleared (burn)
      expect(newState.discardPile.length).toBe(0);
    }
  });
});
