import { describe, expect, test } from 'vitest';
import { BotPlayer } from '../BotPlayer';
import type { GameState, PlayerGameState } from '@shit-head/shared';
import type { Card } from '@shit-head/shared';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCard(rank: Card extends { kind: 'standard'; rank: infer R } ? R : never, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' = 'hearts'): Card {
  return { kind: 'standard', suit, rank } as Card;
}

function makeState(overrides: Partial<GameState> & { player?: Partial<PlayerGameState>; player2?: Partial<PlayerGameState> }): GameState {
  const { player = {}, player2 = {}, ...stateOverrides } = overrides;

  const defaultPlayer: PlayerGameState = {
    playerId: 'bot-1',
    nickname: 'Bot 1',
    hand: [],
    faceUp: [],
    faceDown: [],
    ...player,
  };

  const defaultPlayer2: PlayerGameState = {
    playerId: 'human-1',
    nickname: 'Human',
    hand: [makeCard('5')],
    faceUp: [],
    faceDown: [],
    ...player2,
  };

  const defaultState: GameState = {
    phase: 'playing',
    players: [defaultPlayer, defaultPlayer2],
    drawPile: [makeCard('6')], // Draw pile has a card by default
    discardPile: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    firstTurn: false,
    ...stateOverrides,
  };

  return defaultState;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BotPlayer.selectMove', () => {

  // -------------------------------------------------------------------------
  // Basic sanity
  // -------------------------------------------------------------------------

  test('throws if player not found in state', () => {
    const state = makeState({});
    expect(() => BotPlayer.selectMove(state, 'nonexistent')).toThrow();
  });

  // -------------------------------------------------------------------------
  // CASE 1: First turn — play all lowest-rank cards (skip 2s)
  // -------------------------------------------------------------------------

  test('first turn: plays all copies of lowest rank (skip 2s)', () => {
    const state = makeState({
      firstTurn: true,
      player: {
        hand: [
          makeCard('5', 'hearts'),   // idx 0 — lowest (non-2)
          makeCard('5', 'clubs'),    // idx 1 — also 5
          makeCard('K'),             // idx 2 — higher
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // Should play both 5s
      expect(move.cardIndices).toHaveLength(2);
      expect(move.cardIndices).toContain(0);
      expect(move.cardIndices).toContain(1);
    }
  });

  test('first turn: skips 2s and finds actual lowest rank', () => {
    const state = makeState({
      firstTurn: true,
      player: {
        hand: [
          makeCard('2', 'hearts'),   // idx 0 — 2 is skipped
          makeCard('7', 'clubs'),    // idx 1 — lowest non-2
          makeCard('K'),             // idx 2
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // Should play the 7 (lowest non-2), NOT the 2
      expect(move.cardIndices).toEqual([1]);
    }
  });

  test('first turn: plays single lowest card if no duplicates', () => {
    const state = makeState({
      firstTurn: true,
      player: {
        hand: [
          makeCard('3', 'hearts'),   // idx 0 — lowest non-2
          makeCard('7'),             // idx 1
          makeCard('J'),             // idx 2
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      expect(move.cardIndices).toEqual([0]);
    }
  });

  // -------------------------------------------------------------------------
  // CASE 2: Normal play — hand cards available, valid cards exist
  // -------------------------------------------------------------------------

  test('normal play: plays lowest valid rank group from hand', () => {
    const state = makeState({
      discardPile: [makeCard('5')], // Top card: 5
      player: {
        hand: [
          makeCard('6', 'hearts'),   // idx 0 — valid (>= 5), lowest
          makeCard('6', 'clubs'),    // idx 1 — also 6
          makeCard('K'),             // idx 2 — also valid but higher
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // Should play both 6s (lowest valid rank group)
      expect(move.cardIndices).toHaveLength(2);
      expect(move.cardIndices).toContain(0);
      expect(move.cardIndices).toContain(1);
    }
  });

  test('normal play: plays single card when only one valid card exists', () => {
    const state = makeState({
      discardPile: [makeCard('9')], // Top card: 9
      player: {
        hand: [
          makeCard('4'),   // idx 0 — NOT valid (< 9)
          makeCard('J'),   // idx 1 — valid (>= 9)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      expect(move.cardIndices).toEqual([1]);
    }
  });

  test('normal play: prefers lower rank over higher when both valid', () => {
    const state = makeState({
      discardPile: [makeCard('4')], // Top card: 4
      player: {
        hand: [
          makeCard('K'),   // idx 0 — valid but high
          makeCard('5'),   // idx 1 — valid and lowest
          makeCard('Q'),   // idx 2 — valid but higher than 5
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // Should play the 5 (lowest valid rank)
      expect(move.cardIndices).toEqual([1]);
    }
  });

  // -------------------------------------------------------------------------
  // CASE 3: Hand cards available, no valid cards → pickup
  // -------------------------------------------------------------------------

  test('no valid hand cards: picks up the pile', () => {
    const state = makeState({
      discardPile: [makeCard('K')], // Top card: K — only A or specials can play
      player: {
        hand: [
          makeCard('3'),   // idx 0 — NOT valid (< K)
          makeCard('5'),   // idx 1 — NOT valid (< K)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('pickup');
  });

  // -------------------------------------------------------------------------
  // CASE 4: Face-up cards (hand empty, draw pile exhausted)
  // -------------------------------------------------------------------------

  test('face-up phase: plays lowest valid face-up group', () => {
    const state = makeState({
      drawPile: [], // Draw pile empty triggers endgame
      discardPile: [makeCard('5')],
      player: {
        hand: [],   // Hand empty
        faceUp: [
          makeCard('6', 'hearts'),   // idx 0 — valid
          makeCard('6', 'clubs'),    // idx 1 — valid, same rank
          makeCard('K'),             // idx 2 — also valid but higher
        ],
        faceDown: [makeCard('3'), makeCard('4'), makeCard('7')],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // Should play both 6s
      expect(move.cardIndices).toHaveLength(2);
      expect(move.cardIndices).toContain(0);
      expect(move.cardIndices).toContain(1);
    }
  });

  test('face-up phase: picks up pile when no valid face-up cards', () => {
    const state = makeState({
      drawPile: [],
      discardPile: [makeCard('K')],
      player: {
        hand: [],
        faceUp: [
          makeCard('3'),   // NOT valid (< K)
          makeCard('5'),   // NOT valid (< K)
        ],
        faceDown: [makeCard('7'), makeCard('8'), makeCard('9')],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('pickup');
  });

  // -------------------------------------------------------------------------
  // CASE 5: Face-down cards only → random face-down index
  // -------------------------------------------------------------------------

  test('face-down phase: returns face-down move with valid index', () => {
    const state = makeState({
      drawPile: [],
      discardPile: [makeCard('K')],
      player: {
        hand: [],
        faceUp: [],   // face-up empty triggers face-down phase
        faceDown: [
          makeCard('3'),   // idx 0
          makeCard('4'),   // idx 1
          makeCard('5'),   // idx 2
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('face-down');
    if (move.type === 'face-down') {
      expect(move.faceDownIndex).toBeGreaterThanOrEqual(0);
      expect(move.faceDownIndex).toBeLessThan(3);
    }
  });

  test('face-down phase: index is within valid range over multiple calls', () => {
    const state = makeState({
      drawPile: [],
      discardPile: [],
      player: {
        hand: [],
        faceUp: [],
        faceDown: [makeCard('3'), makeCard('9')],  // 2 face-down cards
      },
    });

    // Run 20 times — index should always be 0 or 1
    for (let i = 0; i < 20; i++) {
      const move = BotPlayer.selectMove(state, 'bot-1');
      expect(move.type).toBe('face-down');
      if (move.type === 'face-down') {
        expect(move.faceDownIndex).toBeGreaterThanOrEqual(0);
        expect(move.faceDownIndex).toBeLessThan(2);
      }
    }
  });

  // -------------------------------------------------------------------------
  // CASE 6: 7-constraint — effective top is 7, must play <= 7
  // -------------------------------------------------------------------------

  test('7-constraint: plays card <= 7 when effective top is 7', () => {
    const state = makeState({
      discardPile: [makeCard('7')],  // Effective top: 7 — must play <= 7
      player: {
        hand: [
          makeCard('5'),   // idx 0 — valid (<= 7)
          makeCard('K'),   // idx 1 — NOT valid (> 7)
          makeCard('A'),   // idx 2 — NOT valid (> 7)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      expect(move.cardIndices).toEqual([0]); // Only the 5
    }
  });

  test('7-constraint: picks up pile when no card <= 7 available', () => {
    const state = makeState({
      discardPile: [makeCard('7')],
      player: {
        hand: [
          makeCard('K'),   // NOT valid (> 7)
          makeCard('A'),   // NOT valid (> 7)
          makeCard('J'),   // NOT valid (> 7)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('pickup');
  });

  test('7-constraint: special cards (2, 8, 10) still playable', () => {
    const state = makeState({
      discardPile: [makeCard('7')],
      player: {
        hand: [
          makeCard('K'),   // idx 0 — NOT valid (> 7)
          makeCard('2'),   // idx 1 — always valid (special)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // 2 is always playable (special), should be played even under 7-constraint
      expect(move.cardIndices).toContain(1);
    }
  });

  // -------------------------------------------------------------------------
  // CASE 7: Special cards (2, 8, 10) — always valid
  // -------------------------------------------------------------------------

  test('special cards: 2 is always valid even on high card', () => {
    const state = makeState({
      discardPile: [makeCard('A')],  // Ace is highest normal card
      player: {
        hand: [
          makeCard('3'),   // idx 0 — NOT valid (< A)
          makeCard('2'),   // idx 1 — always valid (resets pile)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      expect(move.cardIndices).toContain(1); // Must play the 2
    }
  });

  test('special cards: 10 is always valid even on high card', () => {
    const state = makeState({
      discardPile: [makeCard('A')],
      player: {
        hand: [
          makeCard('3'),   // idx 0 — NOT valid (< A)
          makeCard('10'),  // idx 1 — always valid (burns pile)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      expect(move.cardIndices).toContain(1); // Must play the 10
    }
  });

  test('special cards: 8 is always valid', () => {
    const state = makeState({
      discardPile: [makeCard('A')],
      player: {
        hand: [
          makeCard('3'),   // idx 0 — NOT valid (< A)
          makeCard('8'),   // idx 1 — always valid (invisible)
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      expect(move.cardIndices).toContain(1); // Must play the 8
    }
  });

  // -------------------------------------------------------------------------
  // CASE 8: Empty discard pile — anything valid, plays lowest rank
  // -------------------------------------------------------------------------

  test('empty discard pile: plays lowest rank card', () => {
    const state = makeState({
      discardPile: [],  // Empty pile — anything goes
      player: {
        hand: [
          makeCard('K'),   // idx 0 — valid but high
          makeCard('3'),   // idx 1 — valid and lowest
          makeCard('9'),   // idx 2 — valid but higher than 3
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // Should play the 3 (lowest rank)
      expect(move.cardIndices).toEqual([1]);
    }
  });

  test('empty discard pile: plays all copies of lowest rank', () => {
    const state = makeState({
      discardPile: [],
      player: {
        hand: [
          makeCard('3', 'hearts'),   // idx 0 — lowest
          makeCard('3', 'clubs'),    // idx 1 — same rank, should group
          makeCard('9'),             // idx 2 — higher
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      expect(move.cardIndices).toHaveLength(2);
      expect(move.cardIndices).toContain(0);
      expect(move.cardIndices).toContain(1);
    }
  });

  // -------------------------------------------------------------------------
  // CASE 9: Multiple same-rank cards — grouped together
  // -------------------------------------------------------------------------

  test('prefers playing multiple same-rank cards when lowest valid', () => {
    const state = makeState({
      discardPile: [makeCard('4')],  // Top: 4, must play >= 4
      player: {
        hand: [
          makeCard('7', 'hearts'),   // idx 0 — valid
          makeCard('7', 'clubs'),    // idx 1 — same rank
          makeCard('7', 'diamonds'), // idx 2 — same rank
          makeCard('K'),             // idx 3 — valid but higher
        ],
      },
    });

    const move = BotPlayer.selectMove(state, 'bot-1');
    expect(move.type).toBe('play');
    if (move.type === 'play') {
      // Should play all three 7s together
      expect(move.cardIndices).toHaveLength(3);
      expect(move.cardIndices).toContain(0);
      expect(move.cardIndices).toContain(1);
      expect(move.cardIndices).toContain(2);
    }
  });
});
