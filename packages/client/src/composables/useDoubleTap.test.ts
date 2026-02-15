import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useDoubleTap } from './useDoubleTap';

describe('useDoubleTap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('double-tap detection', () => {
    it('triggers callback on two taps within 300ms threshold', () => {
      const callback = vi.fn();
      const { handleTap } = useDoubleTap(callback);

      handleTap();
      vi.advanceTimersByTime(200); // Within threshold
      handleTap();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('sets isWaitingForSecondTap to true on single tap', () => {
      const callback = vi.fn();
      const { handleTap, isWaitingForSecondTap } = useDoubleTap(callback);

      expect(isWaitingForSecondTap.value).toBe(false);

      handleTap();

      expect(isWaitingForSecondTap.value).toBe(true);
    });

    it('resets isWaitingForSecondTap after successful double-tap', () => {
      const callback = vi.fn();
      const { handleTap, isWaitingForSecondTap } = useDoubleTap(callback);

      handleTap();
      expect(isWaitingForSecondTap.value).toBe(true);

      vi.advanceTimersByTime(200);
      handleTap();

      expect(isWaitingForSecondTap.value).toBe(false);
    });
  });

  describe('threshold timeout', () => {
    it('does not trigger callback when taps are beyond 300ms threshold', () => {
      const callback = vi.fn();
      const { handleTap } = useDoubleTap(callback);

      handleTap();
      vi.advanceTimersByTime(350); // Beyond threshold
      handleTap();

      expect(callback).not.toHaveBeenCalled();
    });

    it('auto-resets after threshold expires', () => {
      const callback = vi.fn();
      const { handleTap, isWaitingForSecondTap } = useDoubleTap(callback);

      handleTap();
      expect(isWaitingForSecondTap.value).toBe(true);

      vi.advanceTimersByTime(300); // Exact threshold

      expect(isWaitingForSecondTap.value).toBe(false);
    });
  });

  describe('manual reset', () => {
    it('clears state and stops waiting', () => {
      const callback = vi.fn();
      const { handleTap, isWaitingForSecondTap, reset } = useDoubleTap(callback);

      handleTap();
      expect(isWaitingForSecondTap.value).toBe(true);

      reset();

      expect(isWaitingForSecondTap.value).toBe(false);
    });

    it('works mid-wait before second tap', () => {
      const callback = vi.fn();
      const { handleTap, isWaitingForSecondTap, reset } = useDoubleTap(callback);

      handleTap();
      expect(isWaitingForSecondTap.value).toBe(true);

      vi.advanceTimersByTime(100); // Mid-wait
      reset();

      expect(isWaitingForSecondTap.value).toBe(false);

      // Second tap after reset should not trigger callback
      handleTap();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('custom threshold', () => {
    it('accepts custom threshold parameter', () => {
      const callback = vi.fn();
      const { handleTap } = useDoubleTap(callback, 500);

      handleTap();
      vi.advanceTimersByTime(400); // Within custom 500ms threshold
      handleTap();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('respects custom threshold for timeout', () => {
      const callback = vi.fn();
      const { handleTap, isWaitingForSecondTap } = useDoubleTap(callback, 500);

      handleTap();
      expect(isWaitingForSecondTap.value).toBe(true);

      vi.advanceTimersByTime(500); // Custom threshold

      expect(isWaitingForSecondTap.value).toBe(false);
    });
  });
});
