import { describe, it, expect } from 'vitest';
import { GameEngine } from '../game/GameEngine';
import { cardEquals } from '@shit-head/shared';
import type { Card } from '@shit-head/shared';

describe('GameEngine', () => {
  const players2 = [
    { id: 'p1', nickname: 'Alice' },
    { id: 'p2', nickname: 'Bob' },
  ];

  const players3 = [
    { id: 'p1', nickname: 'Alice' },
    { id: 'p2', nickname: 'Bob' },
    { id: 'p3', nickname: 'Charlie' },
  ];

  const players4 = [
    { id: 'p1', nickname: 'Alice' },
    { id: 'p2', nickname: 'Bob' },
    { id: 'p3', nickname: 'Charlie' },
    { id: 'p4', nickname: 'Diana' },
  ];

  describe('createGame', () => {
    it('creates game with 2 players: drawPile has 36 cards', () => {
      const state = GameEngine.createGame(players2, 0);

      expect(state.drawPile).toHaveLength(36);
    });

    it('creates game with 3 players: drawPile has 27 cards', () => {
      const state = GameEngine.createGame(players3, 0);

      expect(state.drawPile).toHaveLength(27);
    });

    it('creates game with 4 players: drawPile has 18 cards', () => {
      const state = GameEngine.createGame(players4, 0);

      expect(state.drawPile).toHaveLength(18);
    });

    it('sets phase to "swapping"', () => {
      const state = GameEngine.createGame(players2, 0);

      expect(state.phase).toBe('swapping');
    });

    it('sets discardPile to empty array', () => {
      const state = GameEngine.createGame(players2, 0);

      expect(state.discardPile).toEqual([]);
    });

    it('sets currentPlayerIndex to (dealerIndex + 1) % playerCount', () => {
      const state1 = GameEngine.createGame(players2, 0);
      expect(state1.currentPlayerIndex).toBe(1);

      const state2 = GameEngine.createGame(players2, 1);
      expect(state2.currentPlayerIndex).toBe(0);

      const state3 = GameEngine.createGame(players3, 2);
      expect(state3.currentPlayerIndex).toBe(0);
    });

    it('gives each player exactly 3 face-down cards', () => {
      const state = GameEngine.createGame(players3, 0);

      for (const player of state.players) {
        expect(player.faceDown).toHaveLength(3);
      }
    });

    it('gives each player exactly 3 face-up cards', () => {
      const state = GameEngine.createGame(players3, 0);

      for (const player of state.players) {
        expect(player.faceUp).toHaveLength(3);
      }
    });

    it('gives each player exactly 3 hand cards', () => {
      const state = GameEngine.createGame(players3, 0);

      for (const player of state.players) {
        expect(player.hand).toHaveLength(3);
      }
    });

    it('accounts for all 54 cards (player cards + drawPile = 54)', () => {
      const state = GameEngine.createGame(players3, 0);

      let totalCards = 0;

      // Count player cards
      for (const player of state.players) {
        totalCards += player.faceDown.length;
        totalCards += player.faceUp.length;
        totalCards += player.hand.length;
      }

      // Add draw pile
      totalCards += state.drawPile.length;

      expect(totalCards).toBe(54);
    });

    it('has no duplicate cards across all players and drawPile', () => {
      const state = GameEngine.createGame(players4, 0);

      const allCards: Card[] = [];

      // Collect all cards
      for (const player of state.players) {
        allCards.push(...player.faceDown);
        allCards.push(...player.faceUp);
        allCards.push(...player.hand);
      }
      allCards.push(...state.drawPile);

      // Check for duplicates using cardEquals
      for (let i = 0; i < allCards.length; i++) {
        for (let j = i + 1; j < allCards.length; j++) {
          expect(cardEquals(allCards[i], allCards[j])).toBe(false);
        }
      }
    });

    it('preserves player ids and nicknames', () => {
      const state = GameEngine.createGame(players3, 0);

      expect(state.players[0].playerId).toBe('p1');
      expect(state.players[0].nickname).toBe('Alice');
      expect(state.players[1].playerId).toBe('p2');
      expect(state.players[1].nickname).toBe('Bob');
      expect(state.players[2].playerId).toBe('p3');
      expect(state.players[2].nickname).toBe('Charlie');
    });

    it('sets dealerIndex to the provided value', () => {
      const state1 = GameEngine.createGame(players3, 0);
      expect(state1.dealerIndex).toBe(0);

      const state2 = GameEngine.createGame(players3, 2);
      expect(state2.dealerIndex).toBe(2);
    });
  });

  describe('getPlayerView', () => {
    it('returns correct hand for requesting player', () => {
      const state = GameEngine.createGame(players2, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.hand).toEqual(state.players[0].hand);
    });

    it('returns correct faceUp for requesting player', () => {
      const state = GameEngine.createGame(players2, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.faceUp).toEqual(state.players[0].faceUp);
    });

    it('returns faceDownCount (not actual cards) for requesting player', () => {
      const state = GameEngine.createGame(players2, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.faceDownCount).toBe(3);
      expect('faceDown' in view).toBe(false);
    });

    it('returns opponents with faceUp visible', () => {
      const state = GameEngine.createGame(players3, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.opponents).toHaveLength(2);
      expect(view.opponents[0].playerId).toBe('p2');
      expect(view.opponents[0].faceUp).toEqual(state.players[1].faceUp);
      expect(view.opponents[1].playerId).toBe('p3');
      expect(view.opponents[1].faceUp).toEqual(state.players[2].faceUp);
    });

    it('returns opponents with handCount (not actual cards)', () => {
      const state = GameEngine.createGame(players3, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.opponents[0].handCount).toBe(3);
      expect(view.opponents[1].handCount).toBe(3);
    });

    it('returns opponents with faceDownCount (not actual cards)', () => {
      const state = GameEngine.createGame(players3, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.opponents[0].faceDownCount).toBe(3);
      expect(view.opponents[1].faceDownCount).toBe(3);
    });

    it('returns opponent nicknames', () => {
      const state = GameEngine.createGame(players3, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.opponents[0].nickname).toBe('Bob');
      expect(view.opponents[1].nickname).toBe('Charlie');
    });

    it('throws for unknown playerId', () => {
      const state = GameEngine.createGame(players2, 0);

      expect(() => GameEngine.getPlayerView(state, 'unknown')).toThrow();
    });

    it('returns drawPileCount (not actual cards)', () => {
      const state = GameEngine.createGame(players2, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.drawPileCount).toBe(36);
    });

    it('returns discardPile cards (visible to all)', () => {
      const state = GameEngine.createGame(players2, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.discardPile).toEqual(state.discardPile);
    });

    it('returns phase', () => {
      const state = GameEngine.createGame(players2, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.phase).toBe('swapping');
    });

    it('returns currentPlayerIndex', () => {
      const state = GameEngine.createGame(players2, 0);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.currentPlayerIndex).toBe(1);
    });

    it('returns dealerIndex', () => {
      const state = GameEngine.createGame(players2, 1);
      const view = GameEngine.getPlayerView(state, 'p1');

      expect(view.dealerIndex).toBe(1);
    });
  });

  describe('nextDealerIndex', () => {
    it('increments dealer index', () => {
      expect(GameEngine.nextDealerIndex(0, 4)).toBe(1);
      expect(GameEngine.nextDealerIndex(1, 4)).toBe(2);
      expect(GameEngine.nextDealerIndex(2, 4)).toBe(3);
    });

    it('wraps around to 0', () => {
      expect(GameEngine.nextDealerIndex(3, 4)).toBe(0);
      expect(GameEngine.nextDealerIndex(1, 2)).toBe(0);
    });
  });

  describe('determineFirstPlayer', () => {
    it('returns player index with lowest card starting from 3', () => {
      // Create a game state and manually set hand cards for testing
      const state = GameEngine.createGame(players2, 0);

      // P0 has [5, K, A], P1 has [3, 7, Q]
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: '5' },
        { kind: 'standard', suit: 'diamonds', rank: 'K' },
        { kind: 'standard', suit: 'clubs', rank: 'A' },
      ];
      state.players[1].hand = [
        { kind: 'standard', suit: 'spades', rank: '3' },
        { kind: 'standard', suit: 'hearts', rank: '7' },
        { kind: 'standard', suit: 'diamonds', rank: 'Q' },
      ];

      const firstPlayer = GameEngine.determineFirstPlayer(state);
      expect(firstPlayer).toBe(1); // P1 has 3
    });

    it('returns first player when both have same lowest card', () => {
      const state = GameEngine.createGame(players2, 0);

      // P0 has [3, 4, 5], P1 has [3, 6, 7]
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: '3' },
        { kind: 'standard', suit: 'diamonds', rank: '4' },
        { kind: 'standard', suit: 'clubs', rank: '5' },
      ];
      state.players[1].hand = [
        { kind: 'standard', suit: 'spades', rank: '3' },
        { kind: 'standard', suit: 'hearts', rank: '6' },
        { kind: 'standard', suit: 'diamonds', rank: '7' },
      ];

      const firstPlayer = GameEngine.determineFirstPlayer(state);
      expect(firstPlayer).toBe(0); // First player in order with 3
    });

    it('returns correct player when lowest card is not 3', () => {
      const state = GameEngine.createGame(players2, 0);

      // P0 has [4, 6, 8], P1 has [5, J, Q]
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: '4' },
        { kind: 'standard', suit: 'diamonds', rank: '6' },
        { kind: 'standard', suit: 'clubs', rank: '8' },
      ];
      state.players[1].hand = [
        { kind: 'standard', suit: 'spades', rank: '5' },
        { kind: 'standard', suit: 'hearts', rank: 'J' },
        { kind: 'standard', suit: 'diamonds', rank: 'Q' },
      ];

      const firstPlayer = GameEngine.determineFirstPlayer(state);
      expect(firstPlayer).toBe(0); // P0 has 4
    });

    it('returns player with jack when all have high cards', () => {
      const state = GameEngine.createGame(players3, 0);

      // All players have J or higher
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: 'Q' },
        { kind: 'standard', suit: 'diamonds', rank: 'K' },
        { kind: 'standard', suit: 'clubs', rank: 'A' },
      ];
      state.players[1].hand = [
        { kind: 'standard', suit: 'spades', rank: 'J' },
        { kind: 'standard', suit: 'hearts', rank: 'Q' },
        { kind: 'standard', suit: 'diamonds', rank: 'K' },
      ];
      state.players[2].hand = [
        { kind: 'standard', suit: 'clubs', rank: 'Q' },
        { kind: 'standard', suit: 'spades', rank: 'K' },
        { kind: 'standard', suit: 'hearts', rank: 'A' },
      ];

      const firstPlayer = GameEngine.determineFirstPlayer(state);
      expect(firstPlayer).toBe(1); // P1 has J
    });

    it('only scans hand cards, not face-up or face-down', () => {
      const state = GameEngine.createGame(players2, 0);

      // P0 has 3 in face-up but not in hand
      state.players[0].faceUp = [
        { kind: 'standard', suit: 'hearts', rank: '3' },
        { kind: 'standard', suit: 'diamonds', rank: '4' },
        { kind: 'standard', suit: 'clubs', rank: '5' },
      ];
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: '7' },
        { kind: 'standard', suit: 'diamonds', rank: '8' },
        { kind: 'standard', suit: 'clubs', rank: '9' },
      ];

      // P1 has 4 in hand
      state.players[1].hand = [
        { kind: 'standard', suit: 'spades', rank: '4' },
        { kind: 'standard', suit: 'hearts', rank: 'J' },
        { kind: 'standard', suit: 'diamonds', rank: 'Q' },
      ];

      const firstPlayer = GameEngine.determineFirstPlayer(state);
      expect(firstPlayer).toBe(1); // P1 has 4 in hand, even though P0 has 3 face-up
    });

    it('returns player 0 as fallback when all hands are empty or only jokers', () => {
      const state = GameEngine.createGame(players2, 0);

      // Both players have only jokers (edge case)
      state.players[0].hand = [{ kind: 'joker', id: 1 }];
      state.players[1].hand = [{ kind: 'joker', id: 2 }];

      const firstPlayer = GameEngine.determineFirstPlayer(state);
      expect(firstPlayer).toBe(0); // Fallback
    });
  });

  // Helper to create test game state for playing phase
  function createTestState(overrides?: Partial<any>): any {
    const baseState = {
      phase: 'playing' as const,
      players: [
        {
          playerId: 'p1',
          nickname: 'Alice',
          hand: [
            { kind: 'standard' as const, suit: 'hearts' as const, rank: '5' as const },
            { kind: 'standard' as const, suit: 'diamonds' as const, rank: '7' as const },
            { kind: 'standard' as const, suit: 'clubs' as const, rank: '9' as const },
          ],
          faceUp: [
            { kind: 'standard' as const, suit: 'spades' as const, rank: '4' as const },
            { kind: 'standard' as const, suit: 'hearts' as const, rank: '6' as const },
            { kind: 'standard' as const, suit: 'diamonds' as const, rank: '8' as const },
          ],
          faceDown: [
            { kind: 'standard' as const, suit: 'clubs' as const, rank: '3' as const },
            { kind: 'standard' as const, suit: 'spades' as const, rank: 'K' as const },
            { kind: 'standard' as const, suit: 'hearts' as const, rank: 'A' as const },
          ],
        },
        {
          playerId: 'p2',
          nickname: 'Bob',
          hand: [
            { kind: 'standard' as const, suit: 'clubs' as const, rank: '6' as const },
            { kind: 'standard' as const, suit: 'spades' as const, rank: '8' as const },
            { kind: 'standard' as const, suit: 'hearts' as const, rank: '10' as const },
          ],
          faceUp: [
            { kind: 'standard' as const, suit: 'diamonds' as const, rank: '5' as const },
            { kind: 'standard' as const, suit: 'clubs' as const, rank: '7' as const },
            { kind: 'standard' as const, suit: 'spades' as const, rank: '9' as const },
          ],
          faceDown: [
            { kind: 'standard' as const, suit: 'hearts' as const, rank: '4' as const },
            { kind: 'standard' as const, suit: 'diamonds' as const, rank: 'Q' as const },
            { kind: 'standard' as const, suit: 'clubs' as const, rank: 'K' as const },
          ],
        },
      ],
      drawPile: [
        { kind: 'standard' as const, suit: 'spades' as const, rank: '3' as const },
        { kind: 'standard' as const, suit: 'diamonds' as const, rank: '4' as const },
      ],
      discardPile: [
        { kind: 'standard' as const, suit: 'hearts' as const, rank: '3' as const },
      ],
      currentPlayerIndex: 0,
      dealerIndex: 0,
    };

    return { ...baseState, ...overrides };
  }

  describe('swapCards', () => {
    it('swaps hand card with face-up card for valid swap', () => {
      const state = GameEngine.createGame(players3, 0);
      const player = state.players[0];
      const originalHand0 = player.hand[0];
      const originalFaceUp1 = player.faceUp[1];

      const result = GameEngine.swapCards(state, 'p1', 0, 1);

      expect(result.success).toBe(true);
      if (result.success) {
        const updatedPlayer = result.data!.players[0];
        expect(cardEquals(updatedPlayer.hand[0], originalFaceUp1)).toBe(true);
        expect(cardEquals(updatedPlayer.faceUp[1], originalHand0)).toBe(true);
      }
    });

    it('rejects swap when phase is not "swapping"', () => {
      const state = GameEngine.createGame(players2, 0);
      state.phase = 'playing';

      const result = GameEngine.swapCards(state, 'p1', 0, 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('swapping');
      }
    });

    it('rejects swap when phase is "transitioning"', () => {
      const state = GameEngine.createGame(players2, 0);
      state.phase = 'transitioning';

      const result = GameEngine.swapCards(state, 'p1', 0, 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
      }
    });

    it('rejects swap for unknown player', () => {
      const state = GameEngine.createGame(players2, 0);

      const result = GameEngine.swapCards(state, 'nonexistent', 0, 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PLAYER_NOT_FOUND');
        expect(result.error).toContain('Player not found');
      }
    });

    it('rejects swap with negative handIndex', () => {
      const state = GameEngine.createGame(players2, 0);

      const result = GameEngine.swapCards(state, 'p1', -1, 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('Invalid');
      }
    });

    it('rejects swap with handIndex >= hand.length', () => {
      const state = GameEngine.createGame(players2, 0);

      const result = GameEngine.swapCards(state, 'p1', 3, 0);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
      }
    });

    it('rejects swap with negative faceUpIndex', () => {
      const state = GameEngine.createGame(players2, 0);

      const result = GameEngine.swapCards(state, 'p1', 0, -1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
      }
    });

    it('rejects swap with faceUpIndex >= faceUp.length', () => {
      const state = GameEngine.createGame(players2, 0);

      const result = GameEngine.swapCards(state, 'p1', 0, 3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
      }
    });

    it('preserves other players\' cards when swapping', () => {
      const state = GameEngine.createGame(players3, 0);
      const player2Before = { ...state.players[1] };
      const player3Before = { ...state.players[2] };

      const result = GameEngine.swapCards(state, 'p1', 0, 0);

      expect(result.success).toBe(true);
      if (result.success) {
        // Player 2 unchanged
        expect(result.data!.players[1].hand).toEqual(player2Before.hand);
        expect(result.data!.players[1].faceUp).toEqual(player2Before.faceUp);
        expect(result.data!.players[1].faceDown).toEqual(player2Before.faceDown);

        // Player 3 unchanged
        expect(result.data!.players[2].hand).toEqual(player3Before.hand);
        expect(result.data!.players[2].faceUp).toEqual(player3Before.faceUp);
        expect(result.data!.players[2].faceDown).toEqual(player3Before.faceDown);
      }
    });

    it('allows multiple sequential swaps', () => {
      const state = GameEngine.createGame(players2, 0);
      const originalHand0 = state.players[0].hand[0];
      const originalHand1 = state.players[0].hand[1];
      const originalFaceUp0 = state.players[0].faceUp[0];
      const originalFaceUp1 = state.players[0].faceUp[1];

      // First swap
      const result1 = GameEngine.swapCards(state, 'p1', 0, 0);
      expect(result1.success).toBe(true);

      // Second swap on the result of the first
      const result2 = GameEngine.swapCards(result1.data!, 'p1', 1, 1);
      expect(result2.success).toBe(true);

      if (result2.success) {
        const finalPlayer = result2.data!.players[0];
        // hand[0] should now be originalFaceUp0 (from first swap)
        expect(cardEquals(finalPlayer.hand[0], originalFaceUp0)).toBe(true);
        // faceUp[0] should now be originalHand0 (from first swap)
        expect(cardEquals(finalPlayer.faceUp[0], originalHand0)).toBe(true);
        // hand[1] should now be originalFaceUp1 (from second swap)
        expect(cardEquals(finalPlayer.hand[1], originalFaceUp1)).toBe(true);
        // faceUp[1] should now be originalHand1 (from second swap)
        expect(cardEquals(finalPlayer.faceUp[1], originalHand1)).toBe(true);
      }
    });

    it('allows swapping same indices (self-swap)', () => {
      const state = GameEngine.createGame(players2, 0);
      const originalHand1 = state.players[0].hand[1];
      const originalFaceUp1 = state.players[0].faceUp[1];

      const result = GameEngine.swapCards(state, 'p1', 1, 1);

      expect(result.success).toBe(true);
      if (result.success) {
        const updatedPlayer = result.data!.players[0];
        // Still swapped, even though same index
        expect(cardEquals(updatedPlayer.hand[1], originalFaceUp1)).toBe(true);
        expect(cardEquals(updatedPlayer.faceUp[1], originalHand1)).toBe(true);
      }
    });

    it('does not mutate original state', () => {
      const state = GameEngine.createGame(players2, 0);
      const originalHandCard = state.players[0].hand[0];
      const originalFaceUpCard = state.players[0].faceUp[0];

      GameEngine.swapCards(state, 'p1', 0, 0);

      // Original state unchanged
      expect(cardEquals(state.players[0].hand[0], originalHandCard)).toBe(true);
      expect(cardEquals(state.players[0].faceUp[0], originalFaceUpCard)).toBe(true);
    });
  });

  describe('playCards', () => {
    it('accepts valid single card play (higher than pile top)', () => {
      const state = createTestState();
      // P1 hand: [5, 7, 9], discard pile top: 3
      // Playing card at index 0 (5) should succeed

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        const newState = result.data!;
        // Card should move to discard pile
        expect(newState.discardPile).toHaveLength(2);
        expect(newState.discardPile[1]).toEqual({ kind: 'standard', suit: 'hearts', rank: '5' });
        // Hand should have 2 cards remaining
        expect(newState.players[0].hand).toHaveLength(2);
      }
    });

    it('accepts valid multi-card play (2 cards of same rank)', () => {
      const state = createTestState();
      // Set up P1 with two 7s
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: '7' },
        { kind: 'standard', suit: 'diamonds', rank: '7' },
        { kind: 'standard', suit: 'clubs', rank: '9' },
      ];

      const result = GameEngine.playCards(state, 'p1', [0, 1]);

      expect(result.success).toBe(true);
      if (result.success) {
        const newState = result.data!;
        // Both cards should move to discard pile
        expect(newState.discardPile).toHaveLength(3);
        expect(newState.discardPile[1]).toEqual({ kind: 'standard', suit: 'hearts', rank: '7' });
        expect(newState.discardPile[2]).toEqual({ kind: 'standard', suit: 'diamonds', rank: '7' });
        // Hand should have 1 card remaining
        expect(newState.players[0].hand).toHaveLength(1);
      }
    });

    it('accepts play on empty discard pile (any card valid)', () => {
      const state = createTestState({ discardPile: [] });

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.discardPile).toHaveLength(1);
      }
    });

    it('accepts play of equal value card', () => {
      const state = createTestState();
      // Set discard pile top to 5, play 5
      state.discardPile = [{ kind: 'standard', suit: 'clubs', rank: '5' }];
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: '5' },
        { kind: 'standard', suit: 'diamonds', rank: '7' },
        { kind: 'standard', suit: 'clubs', rank: '9' },
      ];

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(true);
    });

    it('rejects play of lower value card', () => {
      const state = createTestState();
      // Discard pile top: 3, trying to play lower is impossible with 3 at top
      // Set discard pile top to 8, hand has 5
      state.discardPile = [{ kind: 'standard', suit: 'clubs', rank: '8' }];

      const result = GameEngine.playCards(state, 'p1', [0]); // Playing 5

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('too low');
      }
    });

    it('rejects play during non-playing phase', () => {
      const state = createTestState({ phase: 'swapping' });

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('playing phase');
      }
    });

    it('rejects play when not player\'s turn', () => {
      const state = createTestState();
      // P2's turn (currentPlayerIndex: 0 is P1, so set to 1 for P2)
      state.currentPlayerIndex = 1;

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NOT_YOUR_TURN');
        expect(result.error).toContain('Not your turn');
      }
    });

    it('rejects play with invalid card index (out of bounds)', () => {
      const state = createTestState();

      const result = GameEngine.playCards(state, 'p1', [5]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('Invalid card index');
      }
    });

    it('rejects play with negative card index', () => {
      const state = createTestState();

      const result = GameEngine.playCards(state, 'p1', [-1]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('Invalid card index');
      }
    });

    it('rejects play with duplicate card indices', () => {
      const state = createTestState();

      const result = GameEngine.playCards(state, 'p1', [0, 0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('Duplicate');
      }
    });

    it('rejects multi-card play with different ranks', () => {
      const state = createTestState();
      // P1 hand: [5, 7, 9] - different ranks

      const result = GameEngine.playCards(state, 'p1', [0, 1]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('same rank');
      }
    });

    it('rejects play with empty cardIndices array', () => {
      const state = createTestState();

      const result = GameEngine.playCards(state, 'p1', []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('at least one');
      }
    });

    it('rejects play when player not found', () => {
      const state = createTestState();

      const result = GameEngine.playCards(state, 'unknown', [0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PLAYER_NOT_FOUND');
        expect(result.error).toContain('Player not found');
      }
    });

    it('auto-draws cards after play when hand below 3', () => {
      const state = createTestState();
      // P1 starts with 3 cards, plays 1, should draw 1 back to 3
      state.drawPile = [
        { kind: 'standard', suit: 'spades', rank: '3' },
        { kind: 'standard', suit: 'diamonds', rank: '4' },
      ];

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        const newState = result.data!;
        // Hand should still be 3 (played 1, drew 1)
        expect(newState.players[0].hand).toHaveLength(3);
        // Draw pile should have 1 card left
        expect(newState.drawPile).toHaveLength(1);
      }
    });

    it('auto-draws only available cards when draw pile has fewer than needed', () => {
      const state = createTestState();
      // P1 plays 2 cards (needs 2 to get back to 3), but draw pile has only 1
      state.players[0].hand = [
        { kind: 'standard', suit: 'hearts', rank: '7' },
        { kind: 'standard', suit: 'diamonds', rank: '7' },
        { kind: 'standard', suit: 'clubs', rank: '9' },
      ];
      state.drawPile = [
        { kind: 'standard', suit: 'spades', rank: '3' },
      ];

      const result = GameEngine.playCards(state, 'p1', [0, 1]);

      expect(result.success).toBe(true);
      if (result.success) {
        const newState = result.data!;
        // Hand should have 2 (started 3, played 2, drew 1)
        expect(newState.players[0].hand).toHaveLength(2);
        // Draw pile should be empty
        expect(newState.drawPile).toHaveLength(0);
      }
    });

    it('does not draw when draw pile is empty', () => {
      const state = createTestState({ drawPile: [] });

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        const newState = result.data!;
        // Hand should have 2 (played 1, no draw)
        expect(newState.players[0].hand).toHaveLength(2);
        expect(newState.drawPile).toHaveLength(0);
      }
    });

    it('advances turn to next player after successful play', () => {
      const state = createTestState();

      const result = GameEngine.playCards(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        // Turn should advance from 0 to 1
        expect(result.data!.currentPlayerIndex).toBe(1);
      }
    });

    it('wraps turn around from last player to first', () => {
      const state = createTestState();
      // Add 2 more players
      state.players.push(
        {
          playerId: 'p3',
          nickname: 'Charlie',
          hand: [{ kind: 'standard', suit: 'clubs', rank: '6' }],
          faceUp: [],
          faceDown: [],
        },
        {
          playerId: 'p4',
          nickname: 'Diana',
          hand: [{ kind: 'standard', suit: 'spades', rank: '7' }],
          faceUp: [],
          faceDown: [],
        }
      );
      state.currentPlayerIndex = 3; // P4's turn (last player)

      const result = GameEngine.playCards(state, 'p4', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        // Turn should wrap to 0
        expect(result.data!.currentPlayerIndex).toBe(0);
      }
    });

    it('does not mutate original state', () => {
      const state = createTestState();
      const originalHandLength = state.players[0].hand.length;
      const originalDiscardLength = state.discardPile.length;

      GameEngine.playCards(state, 'p1', [0]);

      expect(state.players[0].hand).toHaveLength(originalHandLength);
      expect(state.discardPile).toHaveLength(originalDiscardLength);
    });
  });

  describe('pickupPile', () => {
    it('adds all discard pile cards to player hand', () => {
      const state = createTestState();
      state.discardPile = [
        { kind: 'standard', suit: 'hearts', rank: '3' },
        { kind: 'standard', suit: 'diamonds', rank: '4' },
        { kind: 'standard', suit: 'clubs', rank: '5' },
      ];
      const originalHandLength = state.players[0].hand.length;

      const result = GameEngine.pickupPile(state, 'p1');

      expect(result.success).toBe(true);
      if (result.success) {
        const newState = result.data!;
        // Hand should have original + pile cards
        expect(newState.players[0].hand).toHaveLength(originalHandLength + 3);
        // Pile cards should be at the end of hand
        expect(newState.players[0].hand[originalHandLength]).toEqual({ kind: 'standard', suit: 'hearts', rank: '3' });
      }
    });

    it('clears the discard pile after pickup', () => {
      const state = createTestState();
      state.discardPile = [
        { kind: 'standard', suit: 'hearts', rank: '3' },
        { kind: 'standard', suit: 'diamonds', rank: '4' },
      ];

      const result = GameEngine.pickupPile(state, 'p1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.discardPile).toHaveLength(0);
      }
    });

    it('advances turn to next player after pickup', () => {
      const state = createTestState();
      state.discardPile = [{ kind: 'standard', suit: 'hearts', rank: '3' }];

      const result = GameEngine.pickupPile(state, 'p1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.currentPlayerIndex).toBe(1);
      }
    });

    it('rejects pickup during non-playing phase', () => {
      const state = createTestState({ phase: 'swapping' });

      const result = GameEngine.pickupPile(state, 'p1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('playing phase');
      }
    });

    it('rejects pickup when not player\'s turn', () => {
      const state = createTestState();
      state.currentPlayerIndex = 1;

      const result = GameEngine.pickupPile(state, 'p1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NOT_YOUR_TURN');
        expect(result.error).toContain('Not your turn');
      }
    });

    it('rejects pickup when discard pile is empty', () => {
      const state = createTestState({ discardPile: [] });

      const result = GameEngine.pickupPile(state, 'p1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('No cards');
      }
    });

    it('rejects pickup when player not found', () => {
      const state = createTestState();

      const result = GameEngine.pickupPile(state, 'unknown');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PLAYER_NOT_FOUND');
        expect(result.error).toContain('Player not found');
      }
    });

    it('does not mutate original state', () => {
      const state = createTestState();
      state.discardPile = [
        { kind: 'standard', suit: 'hearts', rank: '3' },
        { kind: 'standard', suit: 'diamonds', rank: '4' },
      ];
      const originalHandLength = state.players[0].hand.length;
      const originalDiscardLength = state.discardPile.length;

      GameEngine.pickupPile(state, 'p1');

      expect(state.players[0].hand).toHaveLength(originalHandLength);
      expect(state.discardPile).toHaveLength(originalDiscardLength);
    });
  });
});
