import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// Mock useDebounceFn to execute immediately (no debounce in tests).
// useWebSocket must also be included because useGameSocket.ts imports it from @vueuse/core;
// even though useGameSocket is mocked separately, Vitest validates all named exports
// referenced by the module graph. In Docker/Bun single-thread mode the shared mock
// must export everything that may be needed.
vi.mock('@vueuse/core', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    useDebounceFn: (fn: (...args: unknown[]) => unknown) => fn,
    useWebSocket: vi.fn(() => ({
      status: vueRef('OPEN'),
      data: vueRef(null),
      send: vi.fn(),
      close: vi.fn(),
      open: vi.fn(),
    })),
  };
});

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
    it('selectHandCard adds index to selectedHandIndices', () => {
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(1);
      expect(selectedHandIndices.value.has(1)).toBe(true);
      expect(selectedHandIndices.value.size).toBe(1);
    });

    it('selectHandCard deselects on second tap of same index', () => {
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(1);
      selectHandCard(1);
      expect(selectedHandIndices.value.size).toBe(0);
    });

    it('selectFaceUpCard adds index to selectedFaceUpIndices', () => {
      const { selectFaceUpCard, selectedFaceUpIndices } = useSwapPhase();
      selectFaceUpCard(0);
      expect(selectedFaceUpIndices.value.has(0)).toBe(true);
      expect(selectedFaceUpIndices.value.size).toBe(1);
    });

    it('selectFaceUpCard deselects on second tap of same index', () => {
      const { selectFaceUpCard, selectedFaceUpIndices } = useSwapPhase();
      selectFaceUpCard(0);
      selectFaceUpCard(0);
      expect(selectedFaceUpIndices.value.size).toBe(0);
    });

    it('selectHandCard switches selection when different rank tapped', () => {
      // hand: [rank:'3', rank:'7', rank:'K']
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(0); // rank '3'
      selectHandCard(1); // rank '7' — different, should switch
      expect(selectedHandIndices.value.has(1)).toBe(true);
      expect(selectedHandIndices.value.size).toBe(1);
    });

    it('selectHandCard accumulates when same rank tapped', () => {
      const s = useGameSocket() as any;
      s.gameView.value = {
        ...s.gameView.value,
        hand: [
          { kind: 'standard', rank: '7', suit: 'H' },
          { kind: 'standard', rank: '7', suit: 'D' },
          { kind: 'standard', rank: 'K', suit: 'S' },
        ],
      };
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(0); // rank '7'
      selectHandCard(1); // rank '7' — same, accumulate
      expect(selectedHandIndices.value.has(0)).toBe(true);
      expect(selectedHandIndices.value.has(1)).toBe(true);
      expect(selectedHandIndices.value.size).toBe(2);
    });

    it('selectHandCard switches from accumulated to different rank', () => {
      const s = useGameSocket() as any;
      s.gameView.value = {
        ...s.gameView.value,
        hand: [
          { kind: 'standard', rank: '7', suit: 'H' },
          { kind: 'standard', rank: '7', suit: 'D' },
          { kind: 'standard', rank: 'K', suit: 'S' },
        ],
      };
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(0); // rank '7'
      selectHandCard(1); // rank '7' — accumulate
      selectHandCard(2); // rank 'K' — different, switch
      expect(selectedHandIndices.value.has(2)).toBe(true);
      expect(selectedHandIndices.value.size).toBe(1);
    });

    it('deselecting one card from accumulated set keeps others', () => {
      const s = useGameSocket() as any;
      s.gameView.value = {
        ...s.gameView.value,
        hand: [
          { kind: 'standard', rank: '7', suit: 'H' },
          { kind: 'standard', rank: '7', suit: 'D' },
          { kind: 'standard', rank: 'K', suit: 'S' },
        ],
      };
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(0); // rank '7'
      selectHandCard(1); // rank '7' — accumulate
      selectHandCard(0); // deselect index 0
      expect(selectedHandIndices.value.has(1)).toBe(true);
      expect(selectedHandIndices.value.size).toBe(1);
    });

    it('selectFaceUpCard same-rank accumulation works', () => {
      const s = useGameSocket() as any;
      s.gameView.value = {
        ...s.gameView.value,
        faceUp: [
          { kind: 'standard', rank: 'A', suit: 'H' },
          { kind: 'standard', rank: 'A', suit: 'D' },
          { kind: 'standard', rank: '10', suit: 'S' },
        ],
      };
      const { selectFaceUpCard, selectedFaceUpIndices } = useSwapPhase();
      selectFaceUpCard(0); // rank 'A'
      selectFaceUpCard(1); // rank 'A' — same, accumulate
      expect(selectedFaceUpIndices.value.has(0)).toBe(true);
      expect(selectedFaceUpIndices.value.has(1)).toBe(true);
      expect(selectedFaceUpIndices.value.size).toBe(2);
    });

    it('joker cards accumulate with other jokers', () => {
      const s = useGameSocket() as any;
      s.gameView.value = {
        ...s.gameView.value,
        hand: [
          { kind: 'joker', id: 1 },
          { kind: 'joker', id: 2 },
          { kind: 'standard', rank: 'K', suit: 'S' },
        ],
      };
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(0); // joker -> 'JKR'
      selectHandCard(1); // joker -> 'JKR' — same rank, accumulate
      expect(selectedHandIndices.value.size).toBe(2);
    });
  });

  describe('swap trigger', () => {
    it('selecting hand then face-up triggers swap and clears selection', () => {
      const s = useGameSocket() as any;
      const { selectHandCard, selectFaceUpCard, selectedHandIndices, selectedFaceUpIndices } = useSwapPhase();
      selectHandCard(0);
      selectFaceUpCard(2);
      expect(s.send).toHaveBeenCalledWith({ type: 'swap-cards', handIndex: 0, faceUpIndex: 2 });
      expect(selectedHandIndices.value.size).toBe(0);
      expect(selectedFaceUpIndices.value.size).toBe(0);
    });

    it('selecting face-up then hand triggers swap', () => {
      const s = useGameSocket() as any;
      const { selectHandCard, selectFaceUpCard } = useSwapPhase();
      selectFaceUpCard(1);
      selectHandCard(2);
      expect(s.send).toHaveBeenCalledWith({ type: 'swap-cards', handIndex: 2, faceUpIndex: 1 });
    });

    it('multi-select hand + single face-up triggers multiple swaps', () => {
      const s = useGameSocket() as any;
      s.gameView.value = {
        ...s.gameView.value,
        hand: [
          { kind: 'standard', rank: '7', suit: 'H' },
          { kind: 'standard', rank: '7', suit: 'D' },
          { kind: 'standard', rank: 'K', suit: 'S' },
        ],
      };
      const { selectHandCard, selectFaceUpCard, selectedHandIndices, selectedFaceUpIndices } = useSwapPhase();
      selectHandCard(0); // rank '7'
      selectHandCard(1); // rank '7' — accumulate, now 2 hand cards selected
      selectFaceUpCard(0); // triggers swap: pairs (0,0) and (1,0)
      expect(s.send).toHaveBeenCalledTimes(2);
      expect(s.send).toHaveBeenCalledWith({ type: 'swap-cards', handIndex: 0, faceUpIndex: 0 });
      expect(s.send).toHaveBeenCalledWith({ type: 'swap-cards', handIndex: 1, faceUpIndex: 0 });
      expect(selectedHandIndices.value.size).toBe(0);
      expect(selectedFaceUpIndices.value.size).toBe(0);
    });
  });

  describe('swap phase complete blocking', () => {
    it('selectHandCard does nothing when swapPhaseComplete is true', () => {
      const s = useGameSocket() as any;
      s.swapPhaseComplete.value = true;
      const { selectHandCard, selectedHandIndices } = useSwapPhase();
      selectHandCard(0);
      expect(selectedHandIndices.value.size).toBe(0);
    });

    it('selectFaceUpCard does nothing when swapPhaseComplete is true', () => {
      const s = useGameSocket() as any;
      s.swapPhaseComplete.value = true;
      const { selectFaceUpCard, selectedFaceUpIndices } = useSwapPhase();
      selectFaceUpCard(0);
      expect(selectedFaceUpIndices.value.size).toBe(0);
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
