import { ref, computed } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useGameSocket } from './useGameSocket';

export function useSwapPhase() {
  const { send, gameView, playerId, swapTimeRemaining, readyPlayers, swapPhaseComplete, swapPhaseReason } = useGameSocket();

  // Card selection state for tap-tap swap
  const selectedHandIndex = ref<number | null>(null);
  const selectedFaceUpIndex = ref<number | null>(null);

  // Debounced swap send (150ms debounce, 500ms maxWait)
  const sendSwap = useDebounceFn(
    (handIndex: number, faceUpIndex: number) => {
      send({ type: 'swap-cards', handIndex, faceUpIndex });
    },
    150,
    { maxWait: 500 }
  );

  // Select a hand card
  const selectHandCard = (index: number) => {
    if (swapPhaseComplete.value) return; // No swaps during transition

    if (selectedHandIndex.value === index) {
      // Deselect if same card tapped again
      selectedHandIndex.value = null;
      return;
    }

    selectedHandIndex.value = index;

    // If face-up card already selected, perform swap
    if (selectedFaceUpIndex.value !== null) {
      sendSwap(index, selectedFaceUpIndex.value);
      selectedHandIndex.value = null;
      selectedFaceUpIndex.value = null;
    }
  };

  // Select a face-up card
  const selectFaceUpCard = (index: number) => {
    if (swapPhaseComplete.value) return;

    if (selectedFaceUpIndex.value === index) {
      selectedFaceUpIndex.value = null;
      return;
    }

    selectedFaceUpIndex.value = index;

    // If hand card already selected, perform swap
    if (selectedHandIndex.value !== null) {
      sendSwap(selectedHandIndex.value, index);
      selectedHandIndex.value = null;
      selectedFaceUpIndex.value = null;
    }
  };

  // Ready up toggle
  const isReady = computed(() =>
    playerId.value ? readyPlayers.value.includes(playerId.value) : false
  );

  const toggleReady = () => {
    if (swapPhaseComplete.value) return;
    send({ type: 'ready-up' });
  };

  // Timer display
  const timerDisplay = computed(() => `${swapTimeRemaining.value}s`);

  // Transition state
  const isTransitioning = computed(() => swapPhaseComplete.value);
  const transitionMessage = computed(() => "Let's play!");

  return {
    // Card state from socket
    gameView,
    // Selection state
    selectedHandIndex,
    selectedFaceUpIndex,
    // Actions
    selectHandCard,
    selectFaceUpCard,
    toggleReady,
    // Ready state
    isReady,
    readyPlayers,
    // Timer
    swapTimeRemaining,
    timerDisplay,
    // Transition
    isTransitioning,
    transitionMessage,
    swapPhaseReason,
    // Identity
    playerId,
  };
}
