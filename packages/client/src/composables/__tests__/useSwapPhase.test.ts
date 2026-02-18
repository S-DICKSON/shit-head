import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// Mock useDebounceFn to execute immediately (no debounce in tests).
// useWebSocket must also be included because useGameSocket.ts imports it from @vueuse/core;
// even though useGameSocket is mocked separately, Vitest validates all named exports
// referenced by the module graph. In Docker/Bun single-thread mode the shared mock
// must export everything that may be needed.
vi.mock('@vueuse/core', () => ({
  useDebounceFn: (fn: (...args: unknown[]) => unknown) => fn,
  useWebSocket: vi.fn(() => ({
    status: { value: 'OPEN' },
    data: { value: null },
    send: vi.fn(),
    close: vi.fn(),
    open: vi.fn(),
  })),
}));

// vi.mock is hoisted before all imports — must be declared before any import of the mocked module
vi.mock('../useGameSocket', () => {
  let _cache: any = null;
  const create = () => ({
    send: vi.fn(),
    gameView: ref<any>(null),
    playerId: ref<string | null>('player-1'),
    swapTimeRemaining: ref(30),
    readyPlayers: ref<string[]>([]),
    swapPhaseComplete: ref(false),
    swapPhaseReason: ref<'timer-expired' | 'all-ready' | null>(null),
  });
  return { useGameSocket: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useGameSocket } from '../useGameSocket';
import { useSwapPhase } from '../useSwapPhase';

describe('useSwapPhase', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.gameView.value = {
      hand: [
        { kind: 'standard', rank: '3', suit: 'H' },
        { kind: 'standard', rank: '7', suit: 'D' },
        { kind: 'standard', rank: 'K', suit: 'S' },
      ],
      faceUp: [
        { kind: 'standard', rank: 'A', suit: 'H' },
        { kind: 'standard', rank: '2', suit: 'D' },
        { kind: 'standard', rank: '10', suit: 'S' },
      ],
      faceDownCount: 3,
    };
    s.playerId.value = 'player-1';
    s.swapTimeRemaining.value = 30;
    s.readyPlayers.value = [];
    s.swapPhaseComplete.value = false;
    s.swapPhaseReason.value = null;
    // Reassign fresh spy so clearMocks config doesn't break it
    s.send = vi.fn();
    vi.clearAllMocks();
  });

  describe('card selection', () => {
    it('selectHandCard sets selectedHandIndex', () => {
      const { selectHandCard, selectedHandIndex } = useSwapPhase();
      selectHandCard(1);
      expect(selectedHandIndex.value).toBe(1);
    });

    it('selectHandCard deselects on second tap of same index', () => {
      const { selectHandCard, selectedHandIndex } = useSwapPhase();
      selectHandCard(1);
      selectHandCard(1);
      expect(selectedHandIndex.value).toBeNull();
    });

    it('selectFaceUpCard sets selectedFaceUpIndex', () => {
      const { selectFaceUpCard, selectedFaceUpIndex } = useSwapPhase();
      selectFaceUpCard(0);
      expect(selectedFaceUpIndex.value).toBe(0);
    });

    it('selectFaceUpCard deselects on second tap of same index', () => {
      const { selectFaceUpCard, selectedFaceUpIndex } = useSwapPhase();
      selectFaceUpCard(0);
      selectFaceUpCard(0);
      expect(selectedFaceUpIndex.value).toBeNull();
    });
  });

  describe('swap trigger', () => {
    it('selecting hand then face-up triggers swap and clears selection', () => {
      const s = useGameSocket() as any;
      const { selectHandCard, selectFaceUpCard, selectedHandIndex, selectedFaceUpIndex } = useSwapPhase();
      selectHandCard(0);
      selectFaceUpCard(2);
      expect(s.send).toHaveBeenCalledWith({ type: 'swap-cards', handIndex: 0, faceUpIndex: 2 });
      expect(selectedHandIndex.value).toBeNull();
      expect(selectedFaceUpIndex.value).toBeNull();
    });

    it('selecting face-up then hand triggers swap', () => {
      const s = useGameSocket() as any;
      const { selectHandCard, selectFaceUpCard } = useSwapPhase();
      selectFaceUpCard(1);
      selectHandCard(2);
      expect(s.send).toHaveBeenCalledWith({ type: 'swap-cards', handIndex: 2, faceUpIndex: 1 });
    });
  });

  describe('swap phase complete blocking', () => {
    it('selectHandCard does nothing when swapPhaseComplete is true', () => {
      const s = useGameSocket() as any;
      s.swapPhaseComplete.value = true;
      const { selectHandCard, selectedHandIndex } = useSwapPhase();
      selectHandCard(0);
      expect(selectedHandIndex.value).toBeNull();
    });

    it('selectFaceUpCard does nothing when swapPhaseComplete is true', () => {
      const s = useGameSocket() as any;
      s.swapPhaseComplete.value = true;
      const { selectFaceUpCard, selectedFaceUpIndex } = useSwapPhase();
      selectFaceUpCard(0);
      expect(selectedFaceUpIndex.value).toBeNull();
    });

    it('toggleReady does nothing when swapPhaseComplete is true', () => {
      const s = useGameSocket() as any;
      s.swapPhaseComplete.value = true;
      const { toggleReady } = useSwapPhase();
      toggleReady();
      expect(s.send).not.toHaveBeenCalled();
    });
  });

  describe('ready-up', () => {
    it('toggleReady sends ready-up message', () => {
      const s = useGameSocket() as any;
      const { toggleReady } = useSwapPhase();
      toggleReady();
      expect(s.send).toHaveBeenCalledWith({ type: 'ready-up' });
    });

    it('isReady is false when player not in readyPlayers', () => {
      const { isReady } = useSwapPhase();
      expect(isReady.value).toBe(false);
    });

    it('isReady is true when player is in readyPlayers', () => {
      const s = useGameSocket() as any;
      s.readyPlayers.value = ['player-1'];
      const { isReady } = useSwapPhase();
      expect(isReady.value).toBe(true);
    });
  });

  describe('timer display', () => {
    it('timerDisplay shows formatted time', () => {
      const s = useGameSocket() as any;
      s.swapTimeRemaining.value = 30;
      const { timerDisplay } = useSwapPhase();
      expect(timerDisplay.value).toBe('30s');
    });
  });

  describe('transition state', () => {
    it('isTransitioning is true when swapPhaseComplete', () => {
      const s = useGameSocket() as any;
      s.swapPhaseComplete.value = true;
      const { isTransitioning } = useSwapPhase();
      expect(isTransitioning.value).toBe(true);
    });

    it("transitionMessage is \"Let's play!\"", () => {
      const { transitionMessage } = useSwapPhase();
      expect(transitionMessage.value).toBe("Let's play!");
    });
  });
});
