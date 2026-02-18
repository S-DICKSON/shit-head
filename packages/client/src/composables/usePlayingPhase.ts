import { ref, computed, watch } from 'vue';
import { useGameSocket } from './useGameSocket';
import type { Card } from '@shit-head/shared';
import { canPlayOnPile } from '../game/cardRules';

export function usePlayingPhase() {
  const { send, gameView, playerId, roomState, turnTimeRemaining, turnTimerPlayerIndex } = useGameSocket();

  // Multi-card selection state
  const selectedHandIndices = ref<Set<number>>(new Set());
  const selectedFaceUpIndex = ref<number | null>(null);
  const selectedFaceDownIndex = ref<number | null>(null);

  // Helper: extract rank from Card union
  const cardRank = (card: Card): string => {
    return card.kind === 'standard' ? card.rank : 'joker';
  };

  // Computed: check if it's my turn
  const isMyTurn = computed<boolean>(() => {
    if (!roomState.value || !gameView.value || !playerId.value) return false;
    const myPlayerIndex = roomState.value.players.findIndex(p => p.id === playerId.value);
    return myPlayerIndex === gameView.value.currentPlayerIndex;
  });

  // Computed: check if it's the first turn
  const isFirstTurn = computed<boolean>(() => {
    return gameView.value?.firstTurn === true;
  });

  // Computed: which cards must be played on first turn
  const forcedCardIndices = computed<Set<number>>(() => {
    if (!isFirstTurn.value || !isMyTurn.value || !gameView.value) return new Set();
    const hand = gameView.value.hand;
    // Find lowest rank (skip 2s, same logic as server)
    const rankOrder = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
    let lowestRank: string | null = null;
    for (const rank of rankOrder) {
      if (hand.some(c => c.kind === 'standard' && c.rank === rank)) {
        lowestRank = rank;
        break;
      }
    }
    if (!lowestRank) return new Set();
    const indices = new Set<number>();
    hand.forEach((c, i) => {
      if (c.kind === 'standard' && c.rank === lowestRank) indices.add(i);
    });
    return indices;
  });

  // Computed: determine active source based on card availability
  const activeSource = computed<'hand' | 'face-up' | 'face-down'>(() => {
    if (!gameView.value) return 'hand';
    if (gameView.value.hand.length > 0) return 'hand';
    if (gameView.value.faceUp.length > 0) return 'face-up';
    return 'face-down';
  });

  // Computed: can-click guards for each source
  const canClickHand = computed<boolean>(() => {
    return isMyTurn.value && activeSource.value === 'hand';
  });

  const canClickFaceUp = computed<boolean>(() => {
    return isMyTurn.value && activeSource.value === 'face-up';
  });

  const canClickFaceDown = computed<boolean>(() => {
    return isMyTurn.value && activeSource.value === 'face-down';
  });

  // Computed: has any selection
  const hasSelection = computed<boolean>(() => {
    return selectedHandIndices.value.size > 0 || selectedFaceUpIndex.value !== null || selectedFaceDownIndex.value !== null;
  });

  // Computed: which hand card indices are playable on the current pile
  const playableHandIndices = computed<Set<number>>(() => {
    if (!gameView.value || !isMyTurn.value) return new Set();
    // On first turn, use forced card indices directly
    if (isFirstTurn.value) return forcedCardIndices.value;
    // Normal turn: check each hand card against pile
    const result = new Set<number>();
    gameView.value.hand.forEach((card, i) => {
      if (canPlayOnPile(card, gameView.value!.discardPile)) {
        result.add(i);
      }
    });
    return result;
  });

  // Computed: which face-up card indices are playable on the current pile
  const playableFaceUpIndices = computed<Set<number>>(() => {
    if (!gameView.value || !isMyTurn.value || activeSource.value !== 'face-up') return new Set();
    const result = new Set<number>();
    gameView.value.faceUp.forEach((card, i) => {
      if (canPlayOnPile(card, gameView.value!.discardPile)) {
        result.add(i);
      }
    });
    return result;
  });

  // Actions: toggle hand card (multi-card with same-rank validation)
  const toggleHandCard = (index: number) => {
    if (!canClickHand.value) return;
    if (!gameView.value) return;

    // On first turn, only allow toggling forced cards (prevent deselection)
    if (isFirstTurn.value && forcedCardIndices.value.has(index)) {
      // Cannot deselect forced cards on first turn
      return;
    }
    if (isFirstTurn.value && !forcedCardIndices.value.has(index)) {
      // Can only play forced cards on first turn
      return;
    }

    // If already selected, deselect
    if (selectedHandIndices.value.has(index)) {
      selectedHandIndices.value.delete(index);
      selectedHandIndices.value = new Set(selectedHandIndices.value); // trigger reactivity
      return;
    }

    // If no selection yet, add this card
    if (selectedHandIndices.value.size === 0) {
      selectedHandIndices.value.add(index);
      selectedHandIndices.value = new Set(selectedHandIndices.value);
      return;
    }

    // Check if this card has same rank as first selected card
    const firstSelectedIndex = Array.from(selectedHandIndices.value)[0];
    const firstCard = gameView.value.hand[firstSelectedIndex];
    const thisCard = gameView.value.hand[index];

    if (cardRank(firstCard) === cardRank(thisCard)) {
      selectedHandIndices.value.add(index);
      selectedHandIndices.value = new Set(selectedHandIndices.value);
    }
    // Else: ignore different rank (don't add)
  };

  // Actions: select face-up card (single selection, then play immediately)
  const selectFaceUpCard = (index: number) => {
    if (!canClickFaceUp.value) return;

    // Toggle: if same index selected, deselect; else select this index
    if (selectedFaceUpIndex.value === index) {
      selectedFaceUpIndex.value = null;
    } else {
      selectedFaceUpIndex.value = index;
      // Auto-play immediately after selection
      playSelectedCards();
    }
  };

  // Actions: select face-down card (blind play, immediate)
  const selectFaceDownCard = (index: number) => {
    if (!canClickFaceDown.value) return;
    send({ type: 'play-face-down', faceDownIndex: index });
  };

  // Actions: play selected cards
  const playSelectedCards = () => {
    if (!isMyTurn.value) return;

    // Play from hand
    if (selectedHandIndices.value.size > 0) {
      const indices = Array.from(selectedHandIndices.value).sort((a, b) => a - b);
      send({ type: 'play-cards', cardIndices: indices });
      clearSelection();
      return;
    }

    // Play from face-up
    if (selectedFaceUpIndex.value !== null) {
      send({ type: 'play-cards', cardIndices: [selectedFaceUpIndex.value] });
      clearSelection();
      return;
    }
  };

  // Actions: pickup pile
  const pickupPile = () => {
    if (!isMyTurn.value) return;
    send({ type: 'pickup-pile' });
  };

  // Actions: clear all selections
  const clearSelection = () => {
    selectedHandIndices.value.clear();
    selectedHandIndices.value = new Set(); // trigger reactivity
    selectedFaceUpIndex.value = null;
    selectedFaceDownIndex.value = null;
  };

  // Watch gameView changes to clear stale selections
  watch(gameView, () => {
    clearSelection();
  }, { deep: true });

  // Auto-select forced cards on first turn
  watch([isFirstTurn, isMyTurn], ([firstTurn, myTurn]) => {
    if (firstTurn && myTurn && forcedCardIndices.value.size > 0) {
      selectedHandIndices.value = new Set(forcedCardIndices.value);
    }
  }, { immediate: true });

  return {
    // State from socket
    gameView,
    playerId,
    roomState,
    turnTimeRemaining,
    turnTimerPlayerIndex,
    // Selection state
    selectedHandIndices,
    selectedFaceUpIndex,
    selectedFaceDownIndex,
    // Computed
    isMyTurn,
    isFirstTurn,
    forcedCardIndices,
    activeSource,
    canClickHand,
    canClickFaceUp,
    canClickFaceDown,
    hasSelection,
    playableHandIndices,
    playableFaceUpIndices,
    // Actions
    toggleHandCard,
    selectFaceUpCard,
    selectFaceDownCard,
    playSelectedCards,
    pickupPile,
    clearSelection,
  };
}
