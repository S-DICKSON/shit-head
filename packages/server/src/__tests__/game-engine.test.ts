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
});
