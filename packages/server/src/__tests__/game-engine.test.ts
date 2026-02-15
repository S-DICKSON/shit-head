import { describe, it, expect } from 'vitest';
import { GameEngine } from '../game/GameEngine';
import { cardEquals } from '@shit-head/shared';
import type { Card, PlayerGameState, GameState, Rank, Suit } from '@shit-head/shared';

// Helper function to safely extract rank from a card (tests only use standard cards)
const cardRank = (card: Card): string => {
  if (card.kind === 'joker') throw new Error('Expected standard card');
  return card.rank;
};

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
        // After swap, hand should contain originalFaceUp1 (position may vary due to sorting)
        expect(updatedPlayer.hand.some(c => cardEquals(c, originalFaceUp1))).toBe(true);
        // FaceUp should contain originalHand0 at position 1
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
      const _originalHand = [...state.players[0].hand];
      const originalFaceUp = [...state.players[0].faceUp];

      // First swap: hand[0] ↔ faceUp[0]
      const result1 = GameEngine.swapCards(state, 'p1', 0, 0);
      expect(result1.success).toBe(true);

      // Second swap on the result of the first: hand[1] ↔ faceUp[1]
      // Note: After first swap, hand is sorted, so indices may point to different cards
      if (result1.success) {
        const result2 = GameEngine.swapCards(result1.data, 'p1', 1, 1);
        expect(result2.success).toBe(true);

        if (result2.success) {
          const finalPlayer = result2.data.players[0];
          // Verify both swaps occurred successfully
          // - At least one card from originalFaceUp should be in hand (from first swap)
          // - At least one card from originalHand should be in faceUp (from first swap)
          // - Hand and faceUp should have exactly 3 cards each
          expect(finalPlayer.hand).toHaveLength(3);
          expect(finalPlayer.faceUp).toHaveLength(3);

          // Check that some swapping occurred
          const handFromFaceUp = finalPlayer.hand.filter(c =>
            originalFaceUp.some(fc => cardEquals(c, fc))
          );
          expect(handFromFaceUp.length).toBeGreaterThan(0);
        }
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
        // Still swapped, even though same index (position in hand may vary due to sorting)
        expect(updatedPlayer.hand.some(c => cardEquals(c, originalFaceUp1))).toBe(true);
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
        // Hand should still have 3 cards (played 1, drew 1 from draw pile)
        expect(newState.players[0].hand).toHaveLength(3);
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
        // Hand should have 3 cards (started 3, played 2, drew 2 from pile)
        expect(newState.players[0].hand).toHaveLength(3);
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
      // Set discard pile with 9 on top, hand has 5
      // (Note: can't use just 8 as 8s are invisible per Phase 6 rules)
      state.discardPile = [{ kind: 'standard', suit: 'clubs', rank: '9' }];

      const result = GameEngine.playCards(state, 'p1', [0]); // Playing 5

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
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

  // Helper for concise card creation (matches pattern from card-rules.test.ts)
  function c(rank: string, suit: string = 'hearts'): Card {
    return { kind: 'standard', suit: rank === 'J' ? 'joker' : suit as any, rank: rank as any };
  }

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
        // Verify all pile cards are in hand (order may vary due to sorting)
        expect(newState.players[0].hand.some(c => c.kind === 'standard' && c.rank === '3' && c.suit === 'hearts')).toBe(true);
        expect(newState.players[0].hand.some(c => c.kind === 'standard' && c.rank === '4' && c.suit === 'diamonds')).toBe(true);
        expect(newState.players[0].hand.some(c => c.kind === 'standard' && c.rank === '5' && c.suit === 'clubs')).toBe(true);
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

  describe('special cards and burns', () => {
    describe('special card plays', () => {
      it('allows playing 2 on King (2 resets)', () => {
        const state = createTestState({
          discardPile: [c('K')],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('2'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3'), c('4'), c('7')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.discardPile).toHaveLength(2);
          expect(cardRank(result.data.discardPile[1])).toBe('2');
        }
      });

      it('allows playing 2 on Ace (2 always playable)', () => {
        const state = createTestState({
          discardPile: [c('A')],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('2'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
      });

      it('allows playing 2 on empty pile', () => {
        const state = createTestState({
          discardPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('2'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
      });

      it('allows playing 10 on any pile and burns it', () => {
        const state = createTestState({
          discardPile: [c('K'), c('A')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('10'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          // Pile should be burned (empty)
          expect(result.data!.discardPile).toEqual([]);
          // Same player goes again (turn doesn't advance)
          expect(result.data!.currentPlayerIndex).toBe(0);
        }
      });

      it('allows playing 8 on any pile', () => {
        const state = createTestState({
          discardPile: [c('K')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('8'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          // 8 should be on pile
          expect(cardRank(result.data.discardPile[result.data.discardPile.length - 1])).toBe('8');
          // Turn advances normally
          expect(result.data.currentPlayerIndex).toBe(1);
        }
      });

      it('allows playing 5 on pile with 7 on top (5 <= 7)', () => {
        const state = createTestState({
          discardPile: [c('7')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('5'), c('6'), c('9')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
      });

      it('rejects playing 9 on pile with 7 on top (9 > 7, 7-constraint)', () => {
        const state = createTestState({
          discardPile: [c('7')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('9'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('INVALID_ACTION');
        }
      });

      it('rejects playing Jack on pile with 7 on top (J > 7)', () => {
        const state = createTestState({
          discardPile: [c('7')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('J'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(false);
      });

      it('allows playing 2 on pile with 7 on top (2 is special)', () => {
        const state = createTestState({
          discardPile: [c('7')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('2'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
      });

      it('allows playing 8 on pile with 7 on top (8 is special)', () => {
        const state = createTestState({
          discardPile: [c('7')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('8'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
      });

      it('validates card correctly when effective top is beneath 8s', () => {
        const state = createTestState({
          discardPile: [c('5'), c('8'), c('8')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('6'), c('9'), c('3')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('4')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        // Should be able to play 6 (6 >= 5, effective top)
        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
      });
    });

    describe('burn scenarios', () => {
      it('playing 10 burns pile, same player goes again', () => {
        const state = createTestState({
          discardPile: [c('K'), c('A'), c('Q')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('10'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          // Pile burned
          expect(result.data!.discardPile).toEqual([]);
          // Same player's turn
          expect(result.data!.currentPlayerIndex).toBe(0);
        }
      });

      it('playing fourth King completes four-of-a-kind and burns pile', () => {
        const state = createTestState({
          discardPile: [c('K'), c('K'), c('K')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('K'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          // Pile burned
          expect(result.data!.discardPile).toEqual([]);
          // Same player's turn
          expect(result.data!.currentPlayerIndex).toBe(0);
        }
      });

      it('four-of-a-kind with 8s invisible burns pile', () => {
        const state = createTestState({
          discardPile: [c('2'), c('8'), c('2'), c('8')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('2'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        // Pile has: [2, 8, 2, 8], playing another 2
        // This gives: [2, 8, 2, 8, 2] -> three 2s visible through 8s, not enough yet
        // Actually wait, let me reread: we need 4 total counting through 8s
        // Pile currently: 2, 8, 2 (that's 2 twos visible through one 8, need to count backwards)
        // Let me set up pile with 3 twos with 8s mixed in, then play 4th
        state.discardPile = [c('2'), c('8'), c('2'), c('8'), c('2')];

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          // Four 2s (with 8s invisible) should burn
          expect(result.data!.discardPile).toEqual([]);
          expect(result.data!.currentPlayerIndex).toBe(0);
        }
      });

      it('after burn, player can play any card on empty pile', () => {
        const state = createTestState({
          discardPile: [c('K'), c('Q')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('10'), c('3'), c('4')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('5')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        // First play 10 to burn pile
        const result1 = GameEngine.playCards(state, 'p1', [0]);
        expect(result1.success).toBe(true);

        if (result1.success) {
          const stateAfterBurn = result1.data!;
          expect(stateAfterBurn.discardPile).toEqual([]);
          expect(stateAfterBurn.currentPlayerIndex).toBe(0); // Still P1's turn

          // Now P1 should be able to play any card (even low 3)
          const result2 = GameEngine.playCards(stateAfterBurn, 'p1', [0]); // Play 3

          expect(result2.success).toBe(true);
        }
      });

      it('playing three Kings (not four) does not burn pile', () => {
        const state = createTestState({
          discardPile: [c('K'), c('K')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('K'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          // Pile should NOT be burned (only 3 Kings)
          expect(result.data!.discardPile).toHaveLength(3);
          // Turn should advance normally
          expect(result.data!.currentPlayerIndex).toBe(1);
        }
      });
    });

    describe('turn management after burn', () => {
      it('after 10 burn, currentPlayerIndex stays the same', () => {
        const state = createTestState({
          discardPile: [c('K')],
          drawPile: [],
          currentPlayerIndex: 0,
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('10'), c('5'), c('6')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data!.currentPlayerIndex).toBe(0);
        }
      });

      it('after four-of-a-kind burn, currentPlayerIndex stays the same', () => {
        const state = createTestState({
          discardPile: [c('5'), c('5'), c('5')],
          drawPile: [],
          currentPlayerIndex: 0,
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('5'), c('6'), c('7')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data!.currentPlayerIndex).toBe(0);
        }
      });

      it('after normal play (no burn), currentPlayerIndex advances', () => {
        const state = createTestState({
          discardPile: [c('5')],
          drawPile: [],
          currentPlayerIndex: 0,
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('6'), c('7'), c('9')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        const result = GameEngine.playCards(state, 'p1', [0]);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data!.currentPlayerIndex).toBe(1);
        }
      });

      it('after burn, next play on empty pile succeeds with any card', () => {
        const state = createTestState({
          discardPile: [c('K'), c('Q'), c('J')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('10'), c('3'), c('4')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('5')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        // P1 plays 10 to burn
        const result1 = GameEngine.playCards(state, 'p1', [0]);
        expect(result1.success).toBe(true);

        if (result1.success) {
          // Pile is empty, P1 still current
          expect(result1.data!.discardPile).toEqual([]);
          expect(result1.data!.currentPlayerIndex).toBe(0);

          // P1 plays low card (3) on empty pile
          const result2 = GameEngine.playCards(result1.data, 'p1', [0]);
          expect(result2.success).toBe(true);
          if (result2.success) {
            expect(result2.data.discardPile).toHaveLength(1);
            expect(cardRank(result2.data.discardPile[0])).toBe('3');
          }
        }
      });
    });

    describe('multi-card plays with burn', () => {
      it('playing multiple cards of same rank checks burn after all added', () => {
        const state = createTestState({
          discardPile: [c('K'), c('K')],
          drawPile: [],
          players: [
            {
              playerId: 'p1',
              nickname: 'Alice',
              hand: [c('K', 'hearts'), c('K', 'diamonds'), c('5')],
              faceUp: [],
              faceDown: [],
            },
            {
              playerId: 'p2',
              nickname: 'Bob',
              hand: [c('3')],
              faceUp: [],
              faceDown: [],
            },
          ],
        });

        // Playing 2 Kings when pile has 2 Kings = 4 of a kind
        const result = GameEngine.playCards(state, 'p1', [0, 1]);

        expect(result.success).toBe(true);
        if (result.success) {
          // Should burn
          expect(result.data!.discardPile).toEqual([]);
          expect(result.data!.currentPlayerIndex).toBe(0);
        }
      });
    });
  });

  describe('determinePlaySource', () => {
    it('returns "hand" when player has hand cards', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [c('5'), c('7')],
        faceUp: [c('3')],
        faceDown: [c('K')],
      };

      const result = GameEngine.determinePlaySource(player, false);

      expect(result).toBe('hand');
    });

    it('returns "hand" when hand is empty but draw pile has cards (player must draw)', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [],
        faceUp: [c('3'), c('4')],
        faceDown: [c('K')],
      };

      const result = GameEngine.determinePlaySource(player, false);

      expect(result).toBe('hand');
    });

    it('returns "face-up" when hand and draw pile are empty but face-up cards remain', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [],
        faceUp: [c('3'), c('4')],
        faceDown: [c('K')],
      };

      const result = GameEngine.determinePlaySource(player, true);

      expect(result).toBe('face-up');
    });

    it('returns "face-down" when hand, draw pile, and face-up are all empty but face-down remains', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [],
        faceUp: [],
        faceDown: [c('K')],
      };

      const result = GameEngine.determinePlaySource(player, true);

      expect(result).toBe('face-down');
    });

    it('returns null when player has no cards at all (eliminated)', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [],
        faceUp: [],
        faceDown: [],
      };

      const result = GameEngine.determinePlaySource(player, true);

      expect(result).toBeNull();
    });

    it('returns "hand" when hand has cards even if draw pile is empty', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [c('5')],
        faceUp: [],
        faceDown: [],
      };

      const result = GameEngine.determinePlaySource(player, true);

      expect(result).toBe('hand');
    });
  });

  describe('checkPlayerElimination', () => {
    it('returns true when all card arrays are empty', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [],
        faceUp: [],
        faceDown: [],
      };

      const result = GameEngine.checkPlayerElimination(player);

      expect(result).toBe(true);
    });

    it('returns false when hand has cards', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [c('5')],
        faceUp: [],
        faceDown: [],
      };

      const result = GameEngine.checkPlayerElimination(player);

      expect(result).toBe(false);
    });

    it('returns false when faceUp has cards', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [],
        faceUp: [c('3')],
        faceDown: [],
      };

      const result = GameEngine.checkPlayerElimination(player);

      expect(result).toBe(false);
    });

    it('returns false when faceDown has cards', () => {
      const player: PlayerGameState = {
        playerId: 'p1',
        nickname: 'Alice',
        hand: [],
        faceUp: [],
        faceDown: [c('K')],
      };

      const result = GameEngine.checkPlayerElimination(player);

      expect(result).toBe(false);
    });
  });

  describe('nextActivePlayerIndex', () => {
    it('skips eliminated players and returns next player with cards', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [c('5')],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p3',
            nickname: 'Charlie',
            hand: [c('7')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.nextActivePlayerIndex(state, 2);

      expect(result).toBe(0); // Skips P2 (eliminated)
    });

    it('returns current player when all others are eliminated', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [c('5')],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p3',
            nickname: 'Charlie',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.nextActivePlayerIndex(state, 0);

      expect(result).toBe(0); // Only P1 has cards
    });

    it('handles normal rotation when no players eliminated', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [c('5')],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.nextActivePlayerIndex(state, 0);

      expect(result).toBe(1);
    });

    it('wraps around to beginning of array', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [c('5')],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p3',
            nickname: 'Charlie',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.nextActivePlayerIndex(state, 1);

      expect(result).toBe(0); // Wraps from P2 to P1, skipping P3
    });

    it('has loop limit to prevent infinite loops', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p3',
            nickname: 'Charlie',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.nextActivePlayerIndex(state, 0);

      // Should return current index as fallback when all eliminated
      expect(result).toBe(0);
    });
  });

  describe('findShithead', () => {
    it('returns null when 2+ players have cards', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [c('5')],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.findShithead(state);

      expect(result).toBeNull();
    });

    it('returns playerId when only 1 player has cards (3 player game)', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p3',
            nickname: 'Charlie',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.findShithead(state);

      expect(result).toBe('p2');
    });

    it('returns playerId when only 1 player has cards (2 player game)', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [],
            faceUp: [c('3')],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.findShithead(state);

      expect(result).toBe('p2');
    });

    it('returns null when 2 players both have cards', () => {
      const state = createTestState({
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('4')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [],
            faceUp: [c('3')],
            faceDown: [],
          },
          {
            playerId: 'p3',
            nickname: 'Charlie',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
          {
            playerId: 'p4',
            nickname: 'Diana',
            hand: [],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.findShithead(state);

      expect(result).toBeNull();
    });
  });

  describe('playFromFaceUp', () => {
    it('allows valid single face-up card play', () => {
      const state = createTestState({
        drawPile: [],
        discardPile: [c('3')],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5'), c('7'), c('9')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.discardPile).toHaveLength(2);
        expect(result.data!.discardPile[1]).toEqual(c('5'));
        expect(result.data!.players[0].faceUp).toHaveLength(2);
        expect(result.data!.currentPlayerIndex).toBe(1);
      }
    });

    it('allows valid multi-card face-up play (2 same-rank cards)', () => {
      const state = createTestState({
        drawPile: [],
        discardPile: [c('3')],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5', 'hearts'), c('5', 'diamonds'), c('9')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0, 1]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.discardPile).toHaveLength(3);
        expect(result.data!.players[0].faceUp).toHaveLength(1);
      }
    });

    it('allows play on empty discard pile from face-up', () => {
      const state = createTestState({
        drawPile: [],
        discardPile: [],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('3')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.discardPile).toHaveLength(1);
      }
    });

    it('rejects play of lower card from face-up', () => {
      const state = createTestState({
        drawPile: [],
        discardPile: [c('9')],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5'), c('6')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('K')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
      }
    });

    it('rejects play when not player\'s turn', () => {
      const state = createTestState({
        drawPile: [],
        currentPlayerIndex: 1,
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NOT_YOUR_TURN');
      }
    });

    it('rejects play when determinePlaySource returns "hand" not "face-up"', () => {
      const state = createTestState({
        drawPile: [],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [c('4')], // Has hand cards, must play from hand
            faceUp: [c('5')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('correct source');
      }
    });

    it('rejects play with invalid index', () => {
      const state = createTestState({
        drawPile: [],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [5]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('Invalid card index');
      }
    });

    it('rejects play when player plays last face-up card(s) but still has face-down', () => {
      // This test verifies that elimination is checked correctly
      const state = createTestState({
        drawPile: [],
        discardPile: [c('3')],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5')],
            faceDown: [c('K')],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        // Player not eliminated (has face-down cards)
        expect(result.data!.players[0].faceUp).toHaveLength(0);
        expect(result.data!.players[0].faceDown).toHaveLength(1);
        // Turn advances normally
        expect(result.data!.currentPlayerIndex).toBe(1);
        // Phase still playing
        expect(result.data!.phase).toBe('playing');
      }
    });

    it('eliminates player when last face-up card(s) played with no other cards', () => {
      const state = createTestState({
        drawPile: [],
        discardPile: [c('3')],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        // Player eliminated (no cards left)
        expect(result.data!.players[0].hand).toHaveLength(0);
        expect(result.data!.players[0].faceUp).toHaveLength(0);
        expect(result.data!.players[0].faceDown).toHaveLength(0);
        // Game ends (only P2 has cards)
        expect(result.data!.phase).toBe('finished');
      }
    });

    it('does NOT auto-draw (draw pile is empty by definition in endgame)', () => {
      const state = createTestState({
        drawPile: [],
        discardPile: [c('3')],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5')],
            faceDown: [c('K')],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0]);

      expect(result.success).toBe(true);
      if (result.success) {
        // Hand remains empty (no auto-draw)
        expect(result.data!.players[0].hand).toHaveLength(0);
        expect(result.data!.drawPile).toHaveLength(0);
      }
    });

    it('rejects empty cardIndices array', () => {
      const state = createTestState({
        drawPile: [],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('6')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('at least one');
      }
    });

    it('rejects duplicate indices', () => {
      const state = createTestState({
        drawPile: [],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5'), c('6')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('7')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0, 0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('Duplicate');
      }
    });

    it('rejects cards with different ranks', () => {
      const state = createTestState({
        drawPile: [],
        discardPile: [c('3')],
        players: [
          {
            playerId: 'p1',
            nickname: 'Alice',
            hand: [],
            faceUp: [c('5'), c('6')],
            faceDown: [],
          },
          {
            playerId: 'p2',
            nickname: 'Bob',
            hand: [c('7')],
            faceUp: [],
            faceDown: [],
          },
        ],
      });

      const result = GameEngine.playFromFaceUp(state, 'p1', [0, 1]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_ACTION');
        expect(result.error).toContain('same rank');
      }
    });
  });

  describe('playFaceDownBlind', () => {
    // Helper to create card
    function c(rank: Rank, suit: Suit = 'hearts'): Card {
      return { kind: 'standard', suit, rank };
    }

    function joker(id: 1 | 2 = 1): Card {
      return { kind: 'joker', id };
    }

    // Helper to create endgame state with specific cards
    function createEndgameState(config: {
      faceDown: Card[];
      discardPile?: Card[];
      otherPlayerCards?: boolean;
      currentPlayerIndex?: number;
      playerCount?: number;
    }): GameState {
      const players: PlayerGameState[] = [
        {
          playerId: 'p1',
          nickname: 'Alice',
          hand: [],
          faceUp: [],
          faceDown: config.faceDown,
        },
      ];

      // Add second player
      if (config.playerCount === undefined || config.playerCount >= 2) {
        players.push({
          playerId: 'p2',
          nickname: 'Bob',
          hand: config.otherPlayerCards ? [c('6')] : [],
          faceUp: [],
          faceDown: [],
        });
      }

      // Add third player if requested
      if (config.playerCount && config.playerCount >= 3) {
        players.push({
          playerId: 'p3',
          nickname: 'Charlie',
          hand: config.otherPlayerCards ? [c('7')] : [],
          faceUp: [],
          faceDown: [],
        });
      }

      return {
        phase: 'playing',
        players,
        drawPile: [],
        discardPile: config.discardPile || [],
        currentPlayerIndex: config.currentPlayerIndex ?? 0,
        dealerIndex: 0,
      };
    }

    describe('validation errors', () => {
      it('rejects play during wrong phase (swapping)', () => {
        const state = createEndgameState({ faceDown: [c('5')] });
        state.phase = 'swapping';

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('INVALID_ACTION');
          expect(result.error).toContain('playing phase');
        }
      });

      it('rejects play when not player\'s turn', () => {
        const state = createEndgameState({
          faceDown: [c('5')],
          currentPlayerIndex: 1,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('NOT_YOUR_TURN');
        }
      });

      it('rejects play when player has hand cards (source should be "hand")', () => {
        const state = createEndgameState({ faceDown: [c('5')] });
        state.players[0].hand = [c('3')]; // Player has hand cards

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('INVALID_ACTION');
          expect(result.error).toContain('correct source');
        }
      });

      it('rejects play when player has face-up cards (source should be "face-up")', () => {
        const state = createEndgameState({ faceDown: [c('5')] });
        state.players[0].faceUp = [c('3')]; // Player has face-up cards

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('INVALID_ACTION');
          expect(result.error).toContain('correct source');
        }
      });

      it('rejects play with invalid faceDownIndex (-1)', () => {
        const state = createEndgameState({ faceDown: [c('5')] });

        const result = GameEngine.playFaceDownBlind(state, 'p1', -1);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('INVALID_ACTION');
          expect(result.error).toContain('Invalid face-down index');
        }
      });

      it('rejects play with invalid faceDownIndex (>= faceDown.length)', () => {
        const state = createEndgameState({ faceDown: [c('5')] });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 1); // Only 1 card, index 1 is invalid

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('INVALID_ACTION');
          expect(result.error).toContain('Invalid face-down index');
        }
      });

      it('rejects play when player not found', () => {
        const state = createEndgameState({ faceDown: [c('5')] });

        const result = GameEngine.playFaceDownBlind(state, 'unknown', 0);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe('PLAYER_NOT_FOUND');
        }
      });
    });

    describe('playable card tests (path A)', () => {
      it('blind card is higher than top of pile -> success, card on discard, faceDown count decreases', () => {
        const state = createEndgameState({
          faceDown: [c('A', 'hearts')], // Ace beats King
          discardPile: [c('K')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('A', 'hearts'));
          expect(result.data.state.discardPile).toHaveLength(2);
          expect(result.data.state.discardPile[1]).toEqual(c('A', 'hearts'));
          expect(result.data.state.players[0].faceDown).toHaveLength(0);
          expect(result.data.state.currentPlayerIndex).toBe(1); // Turn advanced
        }
      });

      it('blind card is equal to top of pile -> success (equal is playable)', () => {
        const state = createEndgameState({
          faceDown: [c('7', 'diamonds')],
          discardPile: [c('7', 'hearts')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('7', 'diamonds'));
          expect(result.data.state.discardPile).toHaveLength(2);
        }
      });

      it('blind card on empty discard pile -> success (any card playable)', () => {
        const state = createEndgameState({
          faceDown: [c('3')], // Lowest card still playable on empty pile
          discardPile: [],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('3'));
          expect(result.data.state.discardPile).toHaveLength(1);
          expect(result.data.state.discardPile[0]).toEqual(c('3'));
        }
      });

      it('blind card is a joker -> success (joker beats everything)', () => {
        const state = createEndgameState({
          faceDown: [joker(1)],
          discardPile: [c('A')], // Ace is highest standard card
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(joker(1));
          expect(result.data.state.discardPile).toHaveLength(2);
        }
      });

      it('player plays last face-down card successfully -> player eliminated', () => {
        const state = createEndgameState({
          faceDown: [c('K')], // Only 1 face-down card
          discardPile: [c('5')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          // Player eliminated
          expect(result.data.state.players[0].hand).toHaveLength(0);
          expect(result.data.state.players[0].faceUp).toHaveLength(0);
          expect(result.data.state.players[0].faceDown).toHaveLength(0);
        }
      });

      it('elimination causes findShithead with 1 player remaining -> phase = finished', () => {
        const state = createEndgameState({
          faceDown: [c('K')],
          discardPile: [c('5')],
          otherPlayerCards: true, // Only P2 has cards
          playerCount: 2,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          // P1 eliminated, only P2 has cards -> game over
          expect(result.data.state.phase).toBe('finished');
        }
      });

      it('elimination but 2+ players remain -> game continues', () => {
        const state = createEndgameState({
          faceDown: [c('K')],
          discardPile: [c('5')],
          otherPlayerCards: true,
          playerCount: 3, // P2 and P3 have cards
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          // P1 eliminated, but P2 and P3 remain -> game continues
          expect(result.data.state.phase).toBe('playing');
        }
      });
    });

    describe('unplayable card tests (path B)', () => {
      it('blind card is lower than top of pile -> card + pile go to hand, discard cleared', () => {
        const state = createEndgameState({
          faceDown: [c('3', 'hearts')], // 3 is lower than King
          discardPile: [c('K')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          expect(result.data.card).toEqual(c('3', 'hearts'));
          // Hand contains discardPile cards AND the flipped card
          expect(result.data.state.players[0].hand).toHaveLength(2); // K + 3
          expect(result.data.state.players[0].hand).toContainEqual(c('K'));
          expect(result.data.state.players[0].hand).toContainEqual(c('3', 'hearts'));
          // Discard pile is empty
          expect(result.data.state.discardPile).toHaveLength(0);
          // FaceDown count decreased by 1
          expect(result.data.state.players[0].faceDown).toHaveLength(0);
        }
      });

      it('verify hand contains discardPile cards AND the flipped card', () => {
        const state = createEndgameState({
          faceDown: [c('4', 'spades')],
          discardPile: [c('7'), c('9'), c('K')], // 3 cards on pile
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          // Hand should have all 4 cards (3 from pile + 1 flipped)
          expect(result.data.state.players[0].hand).toHaveLength(4);
          expect(result.data.state.players[0].hand).toContainEqual(c('7'));
          expect(result.data.state.players[0].hand).toContainEqual(c('9'));
          expect(result.data.state.players[0].hand).toContainEqual(c('K'));
          expect(result.data.state.players[0].hand).toContainEqual(c('4', 'spades'));
        }
      });

      it('verify discardPile is empty after pickup', () => {
        const state = createEndgameState({
          faceDown: [c('3')],
          discardPile: [c('5'), c('7'), c('K')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          expect(result.data.state.discardPile).toEqual([]);
        }
      });

      it('verify faceDown count decreases by 1', () => {
        const state = createEndgameState({
          faceDown: [c('3'), c('5'), c('7')], // 3 face-down cards
          discardPile: [c('K')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          expect(result.data.state.players[0].faceDown).toHaveLength(2); // 3 -> 2
        }
      });

      it('turn advances to next player after pickup', () => {
        const state = createEndgameState({
          faceDown: [c('3')],
          discardPile: [c('K')],
          otherPlayerCards: true,
          currentPlayerIndex: 0,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          expect(result.data.state.currentPlayerIndex).toBe(1);
        }
      });

      it('after pickup, determinePlaySource on this player returns "hand"', () => {
        const state = createEndgameState({
          faceDown: [c('3'), c('5')],
          discardPile: [c('K')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          // Check that player now has hand cards
          const player = result.data.state.players[0];
          const playSource = GameEngine.determinePlaySource(player, true);
          expect(playSource).toBe('hand');
        }
      });

      it('pickup when discard pile has many cards -> all go to hand', () => {
        const state = createEndgameState({
          faceDown: [c('3')],
          discardPile: [c('5'), c('6'), c('7'), c('8'), c('9'), c('10')], // 6 cards
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          // 6 from pile + 1 flipped = 7 total
          expect(result.data.state.players[0].hand).toHaveLength(7);
        }
      });
    });

    describe('edge cases', () => {
      it('player with only 1 face-down card, blind play succeeds -> eliminated', () => {
        const state = createEndgameState({
          faceDown: [c('A')], // Only 1 card, and it's playable
          discardPile: [c('5')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          // Player eliminated (no cards left)
          const totalCards = result.data.state.players[0].hand.length +
                           result.data.state.players[0].faceUp.length +
                           result.data.state.players[0].faceDown.length;
          expect(totalCards).toBe(0);
        }
      });

      it('player with only 1 face-down card, blind play fails -> picks up pile, has hand cards, continues', () => {
        const state = createEndgameState({
          faceDown: [c('3')], // Only 1 card, but it's not playable
          discardPile: [c('K')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(false);
          // Player not eliminated - has hand cards now
          expect(result.data.state.players[0].hand).toHaveLength(2); // K + 3
          expect(result.data.state.players[0].faceDown).toHaveLength(0);
          // Game continues
          expect(result.data.state.phase).toBe('playing');
        }
      });

      it('2-player game, blind play eliminates P0 -> P1 is shithead (last with cards), game ends', () => {
        const state = createEndgameState({
          faceDown: [c('A')],
          discardPile: [c('5')],
          otherPlayerCards: true,
          playerCount: 2,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          // P0 eliminated, only P1 has cards -> game ends
          expect(result.data.state.phase).toBe('finished');
        }
      });
    });

    describe('burn detection', () => {
      it('blind 10 on pile -> burns pile (discard cleared to empty), same player goes again', () => {
        const state = createEndgameState({
          faceDown: [c('10')],
          discardPile: [c('5')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('10'));
          // Pile should be burned (empty)
          expect(result.data.state.discardPile).toEqual([]);
          // Same player goes again
          expect(result.data.state.currentPlayerIndex).toBe(0);
        }
      });

      it('blind 10 on empty pile -> burns pile, same player goes again', () => {
        const state = createEndgameState({
          faceDown: [c('10')],
          discardPile: [],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('10'));
          // Pile should be burned (empty)
          expect(result.data.state.discardPile).toEqual([]);
          // Same player goes again
          expect(result.data.state.currentPlayerIndex).toBe(0);
        }
      });

      it('four-of-a-kind from face-down -> burns pile', () => {
        const state = createEndgameState({
          faceDown: [c('6', 'spades')],
          discardPile: [c('6', 'hearts'), c('6', 'diamonds'), c('6', 'clubs')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('6', 'spades'));
          // Pile should be burned (empty)
          expect(result.data.state.discardPile).toEqual([]);
          // Same player goes again
          expect(result.data.state.currentPlayerIndex).toBe(0);
        }
      });

      it('blind 10 is last face-down card, burn + eliminated -> game continues if 2+ players remain', () => {
        const state = createEndgameState({
          faceDown: [c('10')],
          discardPile: [c('5')],
          otherPlayerCards: true,
          playerCount: 3,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('10'));
          // Pile should be burned (empty)
          expect(result.data.state.discardPile).toEqual([]);
          // Player eliminated (total cards = 0)
          const totalCards = result.data.state.players[0].hand.length +
                           result.data.state.players[0].faceUp.length +
                           result.data.state.players[0].faceDown.length;
          expect(totalCards).toBe(0);
          // Game continues (2+ players remain)
          expect(result.data.state.phase).toBe('playing');
        }
      });

      it('blind 10 is last face-down card, burn + eliminated -> game finished if only 1 player has cards', () => {
        const state = createEndgameState({
          faceDown: [c('10')],
          discardPile: [c('5')],
          otherPlayerCards: true,
          playerCount: 2,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('10'));
          // Pile should be burned (empty)
          expect(result.data.state.discardPile).toEqual([]);
          // Game ends (only 1 player remains with cards)
          expect(result.data.state.phase).toBe('finished');
        }
      });

      it('non-burn playable card still advances turn normally (regression check)', () => {
        const state = createEndgameState({
          faceDown: [c('K')],
          discardPile: [c('5')],
          otherPlayerCards: true,
        });

        const result = GameEngine.playFaceDownBlind(state, 'p1', 0);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.playable).toBe(true);
          expect(result.data.card).toEqual(c('K'));
          // Pile should NOT be burned (has 2 cards: 5 + K)
          expect(result.data.state.discardPile).toHaveLength(2);
          // Turn should advance normally
          expect(result.data.state.currentPlayerIndex).toBe(1);
        }
      });
    });
  });
});
