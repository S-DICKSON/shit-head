import { ref } from 'vue';

/**
 * Composable for double-tap detection with visual feedback
 * @param callback Function to call on successful double-tap
 * @param threshold Time window in ms for second tap (default 300ms)
 */
export function useDoubleTap(callback: () => void, threshold = 300) {
  const lastTapTime = ref(0);
  const isWaitingForSecondTap = ref(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function handleTap() {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.value;

    if (timeSinceLastTap < threshold && lastTapTime.value > 0) {
      // Second tap within threshold - execute callback
      callback();
      reset();
    } else {
      // First tap - start waiting for second tap
      lastTapTime.value = now;
      isWaitingForSecondTap.value = true;

      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Auto-reset after threshold expires
      timeoutId = setTimeout(() => {
        reset();
      }, threshold);
    }
  }

  function reset() {
    lastTapTime.value = 0;
    isWaitingForSecondTap.value = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  return {
    handleTap,
    isWaitingForSecondTap,
    reset,
  };
}
