# Phase 10: Client UI & Card Interactions - Research

**Researched:** 2026-02-08
**Domain:** Vue 3 card game UI with responsive layouts and animations
**Confidence:** HIGH

## Summary

Phase 10 implements the playing phase UI where players view their cards, opponents' states, and interact with cards to play, pick up pile, or play face-down blindly. This phase builds on the existing SwapPhase.vue component patterns (card rendering, tap-to-select) and extends them for gameplay interactions.

The research confirms that the existing tech stack (Vue 3 Composition API, Tailwind CSS v4, @vueuse/core) is ideal for this phase. The SwapPhase.vue component provides proven patterns for card rendering, selection state, and mobile-friendly tap interactions. The key challenge is adding multi-card selection (same rank), discard pile visualization, and animations that work smoothly on mobile.

Standard approach: Build PlayingPhase.vue as a new phase-specific component following SwapPhase.vue patterns. Use Vue 3's built-in `<Transition>` and `<TransitionGroup>` for card animations. Implement multi-card selection with tap-to-toggle pattern (visual selection state, not checkboxes). Use CSS transforms and opacity for 60fps animations. Structure as composable + component split for testability.

**Primary recommendation:** Create usePlayingPhase composable for state/actions and PlayingPhase.vue for rendering, mirroring the useSwapPhase/SwapPhase.vue pattern. Use TransitionGroup for list animations, standard Transition for individual card plays. Build on existing card rendering code from SwapPhase.vue.

## Standard Stack

The project already has the complete stack needed for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.5+ | UI framework | Composition API for stateful logic, built-in Transition/TransitionGroup |
| Tailwind CSS | 4.0 | Styling | Utility-first, responsive design primitives, mobile-first approach |
| @vueuse/core | 14.2+ | Vue utilities | Already in use for useWebSocket, provides useElementSize, useMediaQuery |
| TypeScript | 5.0+ | Type safety | Full type safety for game state, WebSocket messages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vue Router | 5.0+ | Navigation | Already configured, no changes needed |
| Vitest | 2.0+ | Testing | Already configured for component tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vue Transition | GSAP / Anime.js | Heavy animation libraries add ~50KB, overkill for card animations. Vue's built-in transitions are sufficient |
| Custom card components | PrimeVue Card / Element Plus | Component libraries add bloat and don't match Shithead's specific card layout needs. Custom components already proven in SwapPhase |
| Checkbox multi-select | Vue-Multiselect library | Libraries designed for dropdowns, not card games. Tap-to-toggle pattern is more mobile-friendly |

**Installation:**
No new packages required - existing stack is sufficient.

## Architecture Patterns

### Recommended Component Structure
```
packages/client/src/components/
├── PlayingPhase.vue        # NEW: Main playing phase component
├── DiscardPile.vue         # NEW: Discard pile with top card(s) visible
├── DrawPile.vue            # NEW: Draw pile visualization
├── OpponentCards.vue       # NEW: Opponent view (reusable for each opponent)
├── PlayerCards.vue         # NEW: Player's hand, face-up, face-down areas
├── SwapPhase.vue           # EXISTING: Reference for card rendering patterns
├── TurnTimer.vue           # EXISTING: Reuse for playing phase
└── Game.vue                # EXISTING: Add PlayingPhase to conditional rendering

packages/client/src/composables/
├── usePlayingPhase.ts      # NEW: Playing phase state and actions
├── useGameSocket.ts        # EXISTING: Already has gameView, turnTimeRemaining
└── useSwapPhase.ts         # EXISTING: Reference for composable pattern
```

### Pattern 1: Composable + Component Split (Established Pattern)
**What:** Business logic in composable, rendering in component
**When to use:** All phase-specific components
**Example:**
```typescript
// usePlayingPhase.ts - Logic and state management
import { ref, computed } from 'vue';
import { useGameSocket } from './useGameSocket';

export function usePlayingPhase() {
  const { send, gameView, playerId, turnTimeRemaining } = useGameSocket();

  // Multi-card selection state
  const selectedHandIndices = ref<Set<number>>(new Set());
  const selectedFaceUpIndex = ref<number | null>(null);
  const selectedFaceDownIndex = ref<number | null>(null);

  // Computed state
  const isMyTurn = computed(() => {
    if (!gameView.value || !playerId.value) return false;
    // Compare currentPlayerIndex to player's position
    return gameView.value.currentPlayerIndex === /* player's index */;
  });

  const canPlayMultiple = computed(() => {
    if (selectedHandIndices.value.size < 2) return false;
    // Check if all selected cards have same rank
    const cards = Array.from(selectedHandIndices.value)
      .map(i => gameView.value!.hand[i]);
    return cards.every(c => cardRank(c) === cardRank(cards[0]));
  });

  // Actions
  const toggleHandCard = (index: number) => {
    if (!isMyTurn.value) return;
    if (selectedHandIndices.value.has(index)) {
      selectedHandIndices.value.delete(index);
    } else {
      selectedHandIndices.value.add(index);
    }
  };

  const playSelectedCards = () => {
    if (!isMyTurn.value || selectedHandIndices.value.size === 0) return;
    const indices = Array.from(selectedHandIndices.value).sort((a, b) => a - b);
    send({ type: 'play-cards', cardIndices: indices });
    selectedHandIndices.value.clear();
  };

  const pickupPile = () => {
    if (!isMyTurn.value) return;
    send({ type: 'pickup-pile' });
  };

  const playFaceDownCard = (index: number) => {
    if (!isMyTurn.value) return;
    send({ type: 'play-face-down', faceDownIndex: index });
  };

  return {
    // State
    gameView,
    turnTimeRemaining,
    selectedHandIndices,
    selectedFaceUpIndex,
    selectedFaceDownIndex,
    // Computed
    isMyTurn,
    canPlayMultiple,
    // Actions
    toggleHandCard,
    playSelectedCards,
    pickupPile,
    playFaceDownCard,
  };
}
```

```vue
<!-- PlayingPhase.vue - Rendering only -->
<template>
  <div class="flex flex-col min-h-screen bg-green-900 text-white p-4">
    <!-- Turn Timer -->
    <TurnTimer :time-remaining="turnTimeRemaining" :total-time="45" />

    <!-- Opponents -->
    <div class="flex flex-wrap justify-center gap-4 mb-6">
      <OpponentCards
        v-for="opponent in gameView?.opponents"
        :key="opponent.playerId"
        :opponent="opponent"
        :is-current-turn="isOpponentTurn(opponent)"
      />
    </div>

    <!-- Game Area: Draw Pile and Discard Pile -->
    <div class="flex justify-center gap-8 mb-6">
      <DrawPile :count="gameView?.drawPileCount ?? 0" />
      <DiscardPile :cards="gameView?.discardPile ?? []" />
    </div>

    <!-- Player's Cards -->
    <PlayerCards
      :hand="gameView?.hand ?? []"
      :face-up="gameView?.faceUp ?? []"
      :face-down-count="gameView?.faceDownCount ?? 0"
      :selected-hand-indices="selectedHandIndices"
      :selected-face-up-index="selectedFaceUpIndex"
      :selected-face-down-index="selectedFaceDownIndex"
      :is-my-turn="isMyTurn"
      @toggle-hand-card="toggleHandCard"
      @play-cards="playSelectedCards"
      @pickup-pile="pickupPile"
      @play-face-down="playFaceDownCard"
    />
  </div>
</template>

<script setup lang="ts">
import { usePlayingPhase } from '../composables/usePlayingPhase';
import TurnTimer from './TurnTimer.vue';
import OpponentCards from './OpponentCards.vue';
import DrawPile from './DrawPile.vue';
import DiscardPile from './DiscardPile.vue';
import PlayerCards from './PlayerCards.vue';

const {
  gameView,
  turnTimeRemaining,
  selectedHandIndices,
  selectedFaceUpIndex,
  selectedFaceDownIndex,
  isMyTurn,
  toggleHandCard,
  playSelectedCards,
  pickupPile,
  playFaceDownCard,
} = usePlayingPhase();

function isOpponentTurn(opponent: OpponentView): boolean {
  // Logic to determine if opponent is current player
}
</script>
```

### Pattern 2: Card Rendering with Standard Aspect Ratio
**What:** Playing cards use 2:3 aspect ratio (standard deck proportions)
**When to use:** All card rendering (hand, face-up, face-down, discard, draw)
**Example:**
```vue
<!-- From SwapPhase.vue - proven pattern -->
<button
  v-for="(card, i) in hand"
  :key="i"
  class="w-16 h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-sm cursor-pointer transition-all"
  :class="isSelected(i) ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
  @click="toggleCard(i)"
>
  <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
  <span :class="suitColor(card)">
    {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
  </span>
</button>
```

**Key dimensions:**
- Mobile: w-16 h-24 (64px × 96px = 2:3 ratio)
- Desktop: Can scale up with w-20 h-30 or w-24 h-36 using media queries
- Standard deck: 2.5" × 3.5" = 2:3 ratio
- Use aspect-ratio CSS property for responsive scaling if needed

### Pattern 3: Vue TransitionGroup for List Animations
**What:** Animate cards entering, leaving, and reordering in lists
**When to use:** Hand cards, discard pile, face-up cards
**Example:**
```vue
<TransitionGroup name="card-list" tag="div" class="flex gap-2">
  <button
    v-for="(card, i) in hand"
    :key="cardKey(card, i)"
    class="w-16 h-24 /* ... card styles ... */"
  >
    <!-- Card content -->
  </button>
</TransitionGroup>

<style>
/* Enter/leave transitions */
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.3s ease;
}

.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Move transition for reordering */
.card-list-move {
  transition: transform 0.3s ease;
}

/* Remove leaving items from layout flow */
.card-list-leave-active {
  position: absolute;
}
</style>
```

**CRITICAL:** Each card needs a unique, stable key. Use card identity (suit+rank+id) not array index:
```typescript
function cardKey(card: Card, fallbackIndex: number): string {
  if (card.kind === 'standard') {
    return `${card.suit}-${card.rank}`;
  }
  return `joker-${card.id}`;
}
```

### Pattern 4: Single Card Transition for Plays
**What:** Animate individual card flying from hand to discard pile
**When to use:** Card play action, pile pickup
**Example:**
```vue
<!-- Simplified - pseudo-code for concept -->
<Transition name="card-fly" @after-leave="onCardPlayed">
  <div v-if="playingCard" class="card-flying">
    <!-- Card being played -->
  </div>
</Transition>

<style>
.card-fly-leave-active {
  transition: all 0.4s ease-out;
}

.card-fly-leave-to {
  transform: translate(/* calculate target position */);
  opacity: 0.5;
}
</style>
```

**Note:** Complex "card flies to pile" animation can be deferred to polish phase. Start with simple fade transitions.

### Pattern 5: Multi-Card Selection with Tap-to-Toggle
**What:** Players tap cards to select/deselect, can select multiple same-rank cards
**When to use:** Hand cards during player's turn
**Example:**
```typescript
// Set-based selection for O(1) contains check
const selectedHandIndices = ref<Set<number>>(new Set());

const toggleHandCard = (index: number) => {
  if (!isMyTurn.value) return;

  // Check if we're starting fresh or adding to selection
  if (selectedHandIndices.value.size === 0) {
    selectedHandIndices.value.add(index);
    return;
  }

  // Toggle off if already selected
  if (selectedHandIndices.value.has(index)) {
    selectedHandIndices.value.delete(index);
    return;
  }

  // Only allow adding if same rank as first selected
  const firstCard = gameView.value!.hand[Array.from(selectedHandIndices.value)[0]];
  const clickedCard = gameView.value!.hand[index];

  if (cardRank(firstCard) === cardRank(clickedCard)) {
    selectedHandIndices.value.add(index);
  }
};
```

**Visual feedback:**
- Selected cards: ring-2 ring-blue-500 scale-105
- Not selected: border-gray-300 hover:border-gray-400
- Different rank disabled: opacity-50 cursor-not-allowed

### Anti-Patterns to Avoid

- **Don't use array index as TransitionGroup key** - Keys must be stable across renders. Array indices shift when items are removed, breaking animations.
- **Don't animate height/width/margin** - Triggers expensive layout calculations. Use transform and opacity only.
- **Don't fetch state in components** - Use composable for all WebSocket state. Components should be pure render logic.
- **Don't mix select paradigms** - Use tap-to-toggle for cards, not checkboxes. Checkboxes are desktop-centric and clutter mobile UI.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive breakpoints | Custom JS window.innerWidth | Tailwind responsive classes (sm:, md:, lg:) | Tailwind handles breakpoints declaratively, mobile-first approach |
| Card aspect ratio | Manual height calculation | CSS aspect-ratio property OR Tailwind w-X h-Y classes | w-16 h-24 maintains 2:3 ratio, aspect-ratio: 2/3 for dynamic sizing |
| WebSocket state | Prop drilling | useGameSocket composable (singleton) | Already implemented, shares state across all components |
| Animation timing | setTimeout chains | Vue Transition with CSS transitions | Declarative, GPU-accelerated, handles edge cases |
| Touch gestures | Touchstart/touchmove handlers | Native click events (work for both touch and mouse) | Vue normalizes events, no need for separate touch handling |
| Element dimensions | ResizeObserver wrapper | @vueuse/core useElementSize | Already in dependencies, reactive, handles cleanup |

**Key insight:** The existing codebase (SwapPhase.vue, useSwapPhase.ts, useGameSocket.ts) provides proven patterns. Phase 10 is "do more of what already works" not "build something new."

## Common Pitfalls

### Pitfall 1: TransitionGroup Keys Tied to Array Index
**What goes wrong:** Cards animate incorrectly when hand changes (cards removed after play, drawn cards added)
**Why it happens:** Vue can't track which card is which when keys change
**How to avoid:** Use card identity (suit+rank or joker id) as key, not array index
**Warning signs:** Cards appear to "swap" visually when one is removed, or animations apply to wrong cards

**Solution:**
```vue
<!-- WRONG -->
<div v-for="(card, i) in hand" :key="i">

<!-- RIGHT -->
<div v-for="(card, i) in hand" :key="cardKey(card)">
```

### Pitfall 2: Animating Layout-Triggering Properties
**What goes wrong:** Animations stutter, especially on mobile
**Why it happens:** height, width, margin, padding trigger CSS layout recalculation (expensive)
**How to avoid:** Only animate transform and opacity (GPU-accelerated)
**Warning signs:** Janky animations, dropped frames, slow on mobile

**Solution:**
```css
/* WRONG - triggers layout */
.card-enter-active {
  transition: height 0.3s, margin 0.3s;
}

/* RIGHT - GPU accelerated */
.card-enter-active {
  transition: transform 0.3s, opacity 0.3s;
}
```

### Pitfall 3: Multi-Card Selection Without Rank Validation
**What goes wrong:** Players select mixed-rank cards (3, 5, 7) and hit "Play", server rejects
**Why it happens:** Selection logic doesn't enforce game rules
**How to avoid:** Validate rank match before allowing additional selections
**Warning signs:** "Invalid action" errors from server after client says "OK to play"

**Solution:**
```typescript
// Validate before adding to selection
const firstCardRank = cardRank(hand[Array.from(selectedHandIndices)[0]]);
const clickedCardRank = cardRank(hand[index]);

if (firstCardRank !== clickedCardRank) {
  // Show visual feedback: can't select this card
  return;
}
```

### Pitfall 4: Not Disabling Actions When Not Player's Turn
**What goes wrong:** Players can click cards and buttons when it's not their turn, see errors
**Why it happens:** Forgot to check isMyTurn before allowing interactions
**How to avoid:** Wrap all action handlers with isMyTurn check, add disabled styles
**Warning signs:** Server sends NOT_YOUR_TURN errors, users confused why actions fail

**Solution:**
```typescript
const toggleHandCard = (index: number) => {
  if (!isMyTurn.value) return; // Guard at function entry
  // ... rest of logic
};
```

```vue
<button
  :disabled="!isMyTurn"
  :class="!isMyTurn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'"
  @click="playCards"
>
  Play
</button>
```

### Pitfall 5: Rendering Discard Pile as Full List
**What goes wrong:** Long discard pile (30+ cards) renders as giant stack, slow and ugly
**Why it happens:** Rendering every card in pile
**How to avoid:** Only render top 3-5 cards with stacked offset effect
**Warning signs:** Discard area grows huge, performance degrades mid-game

**Solution:**
```vue
<div class="relative">
  <div
    v-for="(card, i) in visibleDiscardCards"
    :key="cardKey(card, i)"
    :style="{ transform: `translate(${i * 2}px, ${i * 2}px)` }"
    class="absolute top-0 left-0 w-16 h-24"
  >
    <!-- Card rendering -->
  </div>
</div>

<script setup>
const visibleDiscardCards = computed(() => {
  const pile = gameView.value?.discardPile ?? [];
  return pile.slice(-3); // Only show top 3 cards
});
</script>
```

### Pitfall 6: Not Handling Phase-Specific Card Sources
**What goes wrong:** UI shows hand cards clickable when player is in face-up or face-down phase
**Why it happens:** determinePlaySource is server-side, client must respect it
**How to avoid:** Compute activeSource from gameView state, disable non-active areas
**Warning signs:** Players click hand cards when they should be playing face-up, server rejects

**Solution:**
```typescript
const activeSource = computed<PlaySource>(() => {
  const hand = gameView.value?.hand ?? [];
  const faceUp = gameView.value?.faceUp ?? [];
  const faceDownCount = gameView.value?.faceDownCount ?? 0;

  if (hand.length > 0) return 'hand';
  if (faceUp.length > 0) return 'face-up';
  if (faceDownCount > 0) return 'face-down';

  // Player eliminated
  return 'hand'; // Shouldn't happen if eliminated
});

// Disable non-active sources
const canClickHand = computed(() => isMyTurn.value && activeSource.value === 'hand');
const canClickFaceUp = computed(() => isMyTurn.value && activeSource.value === 'face-up');
const canClickFaceDown = computed(() => isMyTurn.value && activeSource.value === 'face-down');
```

## Code Examples

Verified patterns from existing codebase and official Vue 3 docs:

### Card Rendering (from SwapPhase.vue)
```vue
<template>
  <div class="flex justify-center gap-2 mb-4">
    <button
      v-for="(card, i) in gameView?.hand"
      :key="'h-' + i"
      class="w-16 h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-sm cursor-pointer transition-all"
      :class="selectedHandIndex === i ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'"
      @click="selectHandCard(i)"
    >
      <span class="font-bold">{{ card.kind === 'standard' ? card.rank : 'JKR' }}</span>
      <span :class="card.kind === 'standard' && ['hearts','diamonds'].includes(card.suit) ? 'text-red-600' : 'text-black'">
        {{ card.kind === 'standard' ? suitSymbol(card.suit) : '★' }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
function suitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  };
  return symbols[suit] ?? suit;
}
</script>
```
**Source:** /Users/stephendickson/Personal/shit-head/packages/client/src/components/SwapPhase.vue (lines 84-100)

### TransitionGroup with List Animations (from Vue docs)
```vue
<template>
  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item">
      {{ item }}
    </li>
  </TransitionGroup>
</template>

<style>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Critical: Remove leaving items from layout flow */
.list-leave-active {
  position: absolute;
}
</style>
```
**Source:** https://vuejs.org/guide/built-ins/transition-group.html

### Composable Pattern (from useSwapPhase.ts)
```typescript
import { ref, computed } from 'vue';
import { useGameSocket } from './useGameSocket';

export function useSwapPhase() {
  const { send, gameView, playerId } = useGameSocket();

  // Local selection state
  const selectedHandIndex = ref<number | null>(null);
  const selectedFaceUpIndex = ref<number | null>(null);

  // Computed derived state
  const isReady = computed(() =>
    playerId.value ? readyPlayers.value.includes(playerId.value) : false
  );

  // Actions that send WebSocket messages
  const selectHandCard = (index: number) => {
    selectedHandIndex.value = index;
    // ... swap logic
  };

  return {
    gameView,
    selectedHandIndex,
    selectedFaceUpIndex,
    selectHandCard,
    isReady,
  };
}
```
**Source:** /Users/stephendickson/Personal/shit-head/packages/client/src/composables/useSwapPhase.ts

### Responsive Mobile-First Layout (Tailwind Pattern)
```vue
<template>
  <!-- Mobile: vertical stack, Desktop: horizontal layout -->
  <div class="flex flex-col md:flex-row gap-4">
    <!-- Card size: small on mobile, larger on desktop -->
    <div
      v-for="card in cards"
      :key="card.id"
      class="w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36"
    >
      <!-- Card content -->
    </div>
  </div>
</template>
```
**Breakpoints:**
- Default (mobile): 0-640px
- sm: 640px+
- md: 768px+
- lg: 1024px+

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery card animations | CSS transitions + Vue Transition | ~2018 | Declarative, GPU-accelerated, better mobile performance |
| Manual touch event handling | Native click (works for touch) | ~2019 | Simpler code, browser handles touch vs click normalization |
| Checkbox multi-select | Tap-to-toggle selection state | Card game UX evolution | More intuitive for mobile card games |
| Flexbox only | CSS Grid + Flexbox | ~2020 | Grid for 2D layouts (game board), Flexbox for 1D (card rows) |
| aspect-ratio with padding hack | Native aspect-ratio property | 2021 (CSS spec) | Cleaner code, better browser support in 2026 |
| Separate .move-active class | Automatic .move class in TransitionGroup | Vue 3.0 (2020) | Less boilerplate, animations work out-of-box |

**Deprecated/outdated:**
- Padding-bottom hack for aspect ratio: Native aspect-ratio property now has universal browser support
- Separate touch/click handlers: Vue normalizes events, native click works for both
- Class-based components: Composition API is standard for Vue 3 (Options API still works but not recommended for new code)

## Open Questions

1. **Should card play have "fly to pile" animation or simple fade?**
   - What we know: Fly animation is visually appealing but complex to implement
   - What's unclear: Is it worth the implementation time vs starting with simple fades?
   - Recommendation: Start with simple fade transitions (Transition with opacity). Add fly animation in polish phase if time permits. Mobile users value fast gameplay over fancy animations.

2. **How to handle very long player nicknames on mobile?**
   - What we know: Nickname validation allows up to 20 characters
   - What's unclear: Opponent cards are in a horizontal row, long names could overflow
   - Recommendation: Use Tailwind truncate class (text-overflow: ellipsis) for opponent names. Max-width: 80px on mobile, 120px on desktop. Full name on hover/tap tooltip (deferred to polish).

3. **Should discard pile show count or just visual stack?**
   - What we know: Game rules don't require knowing exact pile count, but might be useful
   - What's unclear: UI clutter vs useful information tradeoff
   - Recommendation: Show visual stack of top 3 cards with stagger effect. No count display initially. Can add small badge with count in polish phase if users request it.

4. **How to indicate which player's turn it is?**
   - What we know: turnTimerPlayerIndex from useGameSocket indicates current player
   - What's unclear: Best visual indicator (highlight, arrow, glow, text?)
   - Recommendation: Multi-indicator approach:
     - TurnTimer component at top (already shows who's active)
     - Opponent cards: add border-yellow-400 border-4 for current player
     - Own cards: "Your Turn" text banner when isMyTurn is true
     - Combination is clear on both mobile and desktop

## Sources

### Primary (HIGH confidence)
- Vue 3 Official Docs - Transition: https://vuejs.org/guide/built-ins/transition
- Vue 3 Official Docs - TransitionGroup: https://vuejs.org/guide/built-ins/transition-group.html
- Existing codebase patterns: SwapPhase.vue, useSwapPhase.ts, useGameSocket.ts (proven in production)
- Tailwind CSS v4 official documentation (utility classes, responsive design)

### Secondary (MEDIUM confidence)
- [CSS Playing Cards Standard Dimensions](https://www.sitepoint.com/community/t/creating-a-playing-card/465502) - Standard 2:3 aspect ratio
- [CSS Card Flip Performance Best Practices](https://uicookies.com/css-card-flip/) - Use transform and opacity, avoid height/width animations
- [Accessible Card UI Patterns](https://dap.berkeley.edu/web-a11y-basics/accessible-card-ui-component-patterns) - Keyboard navigation, focus indicators
- [Mobile Game UI Touch Interactions 2026](https://pixune.com/blog/best-examples-mobile-game-ui-design/) - Touch-first design, large tap targets

### Tertiary (LOW confidence)
- WebSearch results for card game UI trends - General industry direction, not specific technical guidance
- Vue component libraries (PrimeVue, Element Plus) - Feature reference but not using their components

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing codebase already has all necessary tools
- Architecture: HIGH - SwapPhase.vue provides proven patterns to extend
- Pitfalls: HIGH - Common issues well-documented in Vue 3 Transition docs and mobile web dev resources
- Animations: MEDIUM - TransitionGroup well-documented but card-specific animations may need iteration
- Mobile UX: MEDIUM - Tap-to-toggle pattern proven in SwapPhase, extending to multi-select needs testing

**Research date:** 2026-02-08
**Valid until:** 30 days (Vue 3 and Tailwind CSS are stable, patterns unlikely to change)

**Key dependencies:**
- Phase 9 complete (connection management) - users can reconnect during games
- Phase 5-8 complete (game engine, turn timer) - backend supports all gameplay messages
- SwapPhase.vue exists - provides card rendering and selection patterns to build on

**Critical success factors:**
1. Mobile-first design - most users play on phones
2. Clear turn indication - avoid "is it my turn?" confusion
3. Multi-card selection works intuitively - no need for instructions
4. Animations smooth on mobile - 60fps target, GPU-accelerated only
5. Respect game phase progression - hand → face-up → face-down visibility
