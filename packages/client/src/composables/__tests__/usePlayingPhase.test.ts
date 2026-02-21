import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// vi.mock is hoisted before all imports — must be declared before any import of the mocked module
vi.mock('../useGameSocket', () => {
  let _cache: any = null;
  const create = () => ({
    send: vi.fn(),
    gameView: ref<any>(null),
    playerId: ref<string | null>('player-1'),
    roomState: ref<any>(null),
    turnTimeRemaining: ref(45),
    turnTimerPlayerIndex: ref(-1),
  });
  return { useGameSocket: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useGameSocket } from '../useGameSocket';
import { usePlayingPhase } from '../usePlayingPhase';

function createRoomState(players = [{ id: 'player-1' }, { id: 'player-2' }]) {
  return { players };
}

function createGameView(overrides: any = {}) {
  return {
    currentPlayerIndex: 0,
    hand: [
      { kind: 'standard', rank: '7', suit: 'H' },
      { kind: 'standard', rank: '7', suit: 'D' },
      { kind: 'standard', rank: 'K', suit: 'S' },
    ],
    faceUp: [],
    faceDownCount: 0,
    opponents: [],
    drawPileCount: 20,
    discardPile: [],
    dealerIndex: 0,
    phase: 'playing',
    ...overrides,
  };
}

describe('usePlayingPhase', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.gameView.value = null;
    s.playerId.value = 'player-1';
    s.roomState.value = null;
    s.turnTimeRemaining.value = 45;
    s.turnTimerPlayerIndex.value = -1;
    // Reassign fresh spies so clearMocks config doesn't break them
    s.send = vi.fn();
    vi.clearAllMocks();
  });

  describe('isMyTurn computed', () => {
    it('isMyTurn is false when gameView is null', () => {
      const s = useGameSocket() as any;
      s.gameView.value = null;
      s.roomState.value = createRoomState();
      const { isMyTurn } = usePlayingPhase();
      expect(isMyTurn.value).toBe(false);
    });

    it('isMyTurn is false when roomState is null', () => {
      const s = useGameSocket() as any;
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      s.roomState.value = null;
      const { isMyTurn } = usePlayingPhase();
      expect(isMyTurn.value).toBe(false);
    });

    it('isMyTurn is true when currentPlayerIndex matches player position', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState([{ id: 'player-1' }, { id: 'player-2' }]);
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { isMyTurn } = usePlayingPhase();
      expect(isMyTurn.value).toBe(true);
    });

    it('isMyTurn is false when it is another player\'s turn', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState([{ id: 'player-1' }, { id: 'player-2' }]);
      s.gameView.value = createGameView({ currentPlayerIndex: 1 });
      const { isMyTurn } = usePlayingPhase();
      expect(isMyTurn.value).toBe(false);
    });
  });

  describe('activeSource computed', () => {
    it('activeSource is hand when hand has cards', () => {
      const s = useGameSocket() as any;
      s.gameView.value = createGameView({
        hand: [{ kind: 'standard', rank: '7', suit: 'H' }],
        faceUp: [],
        faceDownCount: 0,
      });
      const { activeSource } = usePlayingPhase();
      expect(activeSource.value).toBe('hand');
    });

    it('activeSource is face-up when hand is empty but faceUp has cards', () => {
      const s = useGameSocket() as any;
      s.gameView.value = createGameView({
        hand: [],
        faceUp: [{ kind: 'standard', rank: 'A', suit: 'H' }],
        faceDownCount: 3,
      });
      const { activeSource } = usePlayingPhase();
      expect(activeSource.value).toBe('face-up');
    });

    it('activeSource is face-down when hand and faceUp are empty', () => {
      const s = useGameSocket() as any;
      s.gameView.value = createGameView({
        hand: [],
        faceUp: [],
        faceDownCount: 3,
      });
      const { activeSource } = usePlayingPhase();
      expect(activeSource.value).toBe('face-down');
    });
  });

  describe('toggleHandCard', () => {
    it('selects a hand card', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { toggleHandCard, selectedHandIndices } = usePlayingPhase();
      toggleHandCard(0);
      expect(selectedHandIndices.value.has(0)).toBe(true);
    });

    it('deselects an already-selected card', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { toggleHandCard, selectedHandIndices } = usePlayingPhase();
      toggleHandCard(0);
      toggleHandCard(0);
      expect(selectedHandIndices.value.has(0)).toBe(false);
    });

    it('allows selecting multiple cards of same rank', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      // hand[0] = 7H, hand[1] = 7D — same rank
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { toggleHandCard, selectedHandIndices } = usePlayingPhase();
      toggleHandCard(0);
      toggleHandCard(1);
      expect(selectedHandIndices.value.has(0)).toBe(true);
      expect(selectedHandIndices.value.has(1)).toBe(true);
    });

    it('switches selection to different rank when cards already selected', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      // hand[0] = 7H, hand[2] = KS — different rank
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { toggleHandCard, selectedHandIndices } = usePlayingPhase();
      toggleHandCard(0);
      toggleHandCard(2);
      expect(selectedHandIndices.value.has(0)).toBe(false);
      expect(selectedHandIndices.value.has(2)).toBe(true);
      expect(selectedHandIndices.value.size).toBe(1);
    });
  });

  describe('playSelectedCards', () => {
    it('sends play-cards with selected hand indices', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { toggleHandCard, playSelectedCards } = usePlayingPhase();
      toggleHandCard(0);
      toggleHandCard(1);
      playSelectedCards();
      expect(s.send).toHaveBeenCalledWith({ type: 'play-cards', cardIndices: [0, 1] });
    });

    it('clears selection after playing', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { toggleHandCard, playSelectedCards, selectedHandIndices } = usePlayingPhase();
      toggleHandCard(0);
      playSelectedCards();
      expect(selectedHandIndices.value.size).toBe(0);
    });
  });

  describe('pickupPile', () => {
    it('sends pickup-pile message when it is my turn', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      s.gameView.value = createGameView({ currentPlayerIndex: 0 });
      const { pickupPile } = usePlayingPhase();
      pickupPile();
      expect(s.send).toHaveBeenCalledWith({ type: 'pickup-pile' });
    });

    it('does nothing when not my turn', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      // currentPlayerIndex: 1 means it is player-2's turn
      s.gameView.value = createGameView({ currentPlayerIndex: 1 });
      const { pickupPile } = usePlayingPhase();
      pickupPile();
      expect(s.send).not.toHaveBeenCalled();
    });
  });

  describe('selectFaceDownCard', () => {
    it('sends play-face-down message when it is my turn and source is face-down', () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState();
      s.gameView.value = createGameView({
        currentPlayerIndex: 0,
        hand: [],
        faceUp: [],
        faceDownCount: 3,
      });
      const { selectFaceDownCard } = usePlayingPhase();
      selectFaceDownCard(0);
      expect(s.send).toHaveBeenCalledWith({ type: 'play-face-down', faceDownIndex: 0 });
    });
  });
});
