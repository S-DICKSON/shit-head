import { ref, computed } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import type { Card } from '@shithead/shared';
import { useGameSocket } from './useGameSocket';

export function useSwapPhase() {
  const { send, gameView, playerId, swapTimeRemaining, readyPlayers, swapPhaseComplete, swapPhaseReason } = useGameSocket();

  // Card selection state: Set-based for multi-select
  const selectedHandIndices = ref<Set<number>>(new Set());
  const selectedFaceUpIndices = ref<Set<number>>(new Set());

  // Debounced swap send (150ms debounce, 500ms maxWait)
  const sendSwap = useDebounceFn(
    (handIndex: number, faceUpIndex: number) => {
      send({ type: 'swap-cards', handIndex, faceUpIndex });
    },
    150,
    { maxWait: 500 }
  );

  // Helper: get rank string for a card (standard uses card.rank, joker uses 'JKR')
  function getRank(card: Card): string {
    return card.kind === 'standard' ? card.rank : 'JKR';
  }

  // Attempt to execute paired swaps when both zones have selections
  function tryPerformSwaps() {
    const handSet = selectedHandIndices.value;
    const faceUpSet = selectedFaceUpIndices.value;

    if (handSet.size === 0 || faceUpSet.size === 0) return;

    // Pair selections: hand drives the count, face-up cycles if fewer selections.
    // This supports the common case of selecting N same-rank hand cards and 1 face-up
    // slot, resulting in N swap messages all targeting the same face-up index.
    const handArr = [...handSet];
    const faceUpArr = [...faceUpSet];

    for (let i = 0; i < handArr.length; i++) {
      sendSwap(handArr[i], faceUpArr[i % faceUpArr.length]);
    }

    // Clear all selections
    selectedHandIndices.value = new Set();
    selectedFaceUpIndices.value = new Set();
  }

  // Select a hand card (rank-aware multi-select)
  const selectHandCard = (index: number) => {
    if (swapPhaseComplete.value) return;

    const card = gameView.value?.hand[index];
    if (!card) return;

    // Deselect if already selected
    if (selectedHandIndices.value.has(index)) {
      const next = new Set(selectedHandIndices.value);
      next.delete(index);
      selectedHandIndices.value = next;
      return;
    }

    const tappedRank = getRank(card);

    if (selectedHandIndices.value.size > 0) {
      // Get rank of first selected card
      const firstIndex = [...selectedHandIndices.value][0];
      const firstCard = gameView.value?.hand[firstIndex];
      const firstRank = firstCard ? getRank(firstCard) : null;

      if (firstRank === tappedRank) {
        // Same rank: accumulate
        selectedHandIndices.value = new Set([...selectedHandIndices.value, index]);
      } else {
        // Different rank: switch selection
        selectedHandIndices.value = new Set([index]);
      }
    } else {
      // No selection yet: start
      selectedHandIndices.value = new Set([index]);
    }

    // Check if both zones now have selections
    tryPerformSwaps();
  };

  // Select a face-up card (rank-aware multi-select)
  const selectFaceUpCard = (index: number) => {
    if (swapPhaseComplete.value) return;

    const card = gameView.value?.faceUp[index];
    if (!card) return;

    // Deselect if already selected
    if (selectedFaceUpIndices.value.has(index)) {
      const next = new Set(selectedFaceUpIndices.value);
      next.delete(index);
      selectedFaceUpIndices.value = next;
      return;
    }

    const tappedRank = getRank(card);

    if (selectedFaceUpIndices.value.size > 0) {
      // Get rank of first selected card
      const firstIndex = [...selectedFaceUpIndices.value][0];
      const firstCard = gameView.value?.faceUp[firstIndex];
      const firstRank = firstCard ? getRank(firstCard) : null;

      if (firstRank === tappedRank) {
        // Same rank: accumulate
        selectedFaceUpIndices.value = new Set([...selectedFaceUpIndices.value, index]);
      } else {
        // Different rank: switch selection
        selectedFaceUpIndices.value = new Set([index]);
      }
    } else {
      // No selection yet: start
      selectedFaceUpIndices.value = new Set([index]);
    }

    // Check if both zones now have selections
    tryPerformSwaps();
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
    // Selection state (Set-based)
    selectedHandIndices,
    selectedFaceUpIndices,
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
