# Phase 21: Card Playability Highlights - Research

**Researched:** 2026-02-18
**Domain:** Vue 3 / Tailwind v4 UI, client-side game rules, composable patterns
**Confidence:** HIGH

## Summary

Phase 21 adds visual indicators to hand cards showing which cards are legally playable on the current discard pile. The implementation is purely client-side: the `canPlayOnPile` function already exists in `packages/server/src/game/CardRules.ts` and needs to be mirrored (or shared) on the client. No server changes are needed.

The key design question is **where the playability logic lives**. Option A: move `canPlayOnPile` (and its dependency `getEffectiveTopCard` + `getRankValue`) into the shared package and import from `@shit-head/shared`. Option B: duplicate a thin copy of the logic directly in a new `usePlayabilityHighlights` composable on the client. Option A is cleaner and avoids drift; Option B is faster but creates maintenance risk.

The visual treatment follows the existing card rendering pattern in `PlayerCards.vue` — cards already use conditional Tailwind classes for selected state (`ring-2 ring-yellow-400`) and disabled state (`opacity-40 cursor-not-allowed`). Adding playability state is an additive change to these existing class bindings. Both the desktop card-button view and the mobile grouped view in `PlayerCards.vue` must be updated.

**Primary recommendation:** Move `canPlayOnPile`, `getEffectiveTopCard`, and `getRankValue` into `packages/shared/src` (or replicate a pure function in the client composable), then create `usePlayabilityHighlights` composable that computes a `playableIndices: Set<number>` from `gameView.hand` and `gameView.discardPile`. Pass this down from `usePlayingPhase` into `PlayerCards.vue` as a new prop.

## Standard Stack

No new library dependencies required. Everything needed is already in place.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.x | Reactivity / computed | Project standard |
| Tailwind CSS v4 | 4.x | CSS utility classes for visual states | Project standard |
| TypeScript | 5.x | Type-safe card logic | Project standard |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@shit-head/shared` | workspace:* | Card types, game types | Any new composable that works with cards |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure

The implementation touches exactly these files:

```
packages/shared/src/
└── game/                       # NEW: move or duplicate pure game rules here
    └── cardRules.ts            # canPlayOnPile, getEffectiveTopCard, getRankValue

packages/client/src/
├── composables/
│   ├── usePlayingPhase.ts      # MODIFY: compute playableHandIndices, playableFaceUpIndices; export them
│   └── usePlayabilityHighlights.ts  # NEW (optional if logic is thin inline in usePlayingPhase)
└── components/
    └── PlayerCards.vue         # MODIFY: accept playableHandIndices/playableFaceUpIndices props, apply CSS
```

**Simpler alternative (no shared refactor):** Inline the playability logic directly in `usePlayingPhase.ts` using a copy of the three functions. This avoids touching `packages/shared` but risks logic drift vs server.

### Pattern 1: Computed Playable Indices in usePlayingPhase

**What:** Add a `computed` that returns `Set<number>` of playable card indices, derived from the current `gameView` reactive state.

**When to use:** Whenever `gameView.hand` or `gameView.discardPile` changes (Vue reactivity handles this automatically).

**Example:**
```typescript
// In usePlayingPhase.ts — add after existing computed properties

// Returns set of hand indices that are legally playable on the current pile
const playableHandIndices = computed<Set<number>>(() => {
  if (!gameView.value || !isMyTurn.value) return new Set();
  const { hand, discardPile } = gameView.value;
  const playable = new Set<number>();
  hand.forEach((card, i) => {
    if (canPlayOnPile(card, discardPile)) {
      playable.add(i);
    }
  });
  return playable;
});

// Returns set of face-up indices that are legally playable
const playableFaceUpIndices = computed<Set<number>>(() => {
  if (!gameView.value || !isMyTurn.value || activeSource.value !== 'face-up') return new Set();
  const { faceUp, discardPile } = gameView.value;
  const playable = new Set<number>();
  faceUp.forEach((card, i) => {
    if (canPlayOnPile(card, discardPile)) {
      playable.add(i);
    }
  });
  return playable;
});
```

### Pattern 2: CSS Class Binding in PlayerCards.vue

**What:** Add playability state to the existing conditional class bindings on card buttons.

**When to use:** Replaces or extends the existing `border-gray-300` / `opacity-40` classes.

**Example — desktop card button (hand):**
```vue
<!-- In PlayerCards.vue, hand card button -->
<button
  v-for="(card, i) in hand"
  :key="cardKey(card)"
  class="w-14 h-21 sm:w-16 sm:h-24 bg-white text-black rounded border-2 flex flex-col items-center justify-center text-xs sm:text-sm transition-all"
  :class="[
    selectedHandIndices.has(i)
      ? 'ring-2 ring-yellow-400 -translate-y-2 border-yellow-400 shadow-lg'
      : playableHandIndices.has(i)
        ? 'border-green-400 shadow-green-400/50 shadow-md'
        : !playableHandIndices.size
          ? 'border-gray-300'        // no highlights yet (not my turn)
          : 'border-gray-400 opacity-50',  // unplayable card (greyed out)
    activeSource !== 'hand'
      ? 'opacity-40 cursor-not-allowed'
      : 'cursor-pointer hover:border-gray-400'
  ]"
  @click="$emit('toggle-hand-card', i)"
>
```

**Example — mobile grouped view:**
```vue
<!-- In PlayerCards.vue, grouped card item -->
<div
  v-for="group in groupedCards"
  :key="group.rank"
  class="bg-gray-800/50 rounded-lg p-2 flex items-center gap-3"
  :class="[
    groupIsPlayable(group)
      ? 'ring-1 ring-green-400'
      : 'opacity-60'
  ]"
>
```

### Pattern 3: Props Contract

**What:** Extend `PlayerCards.vue` props to receive playability data.

```typescript
// PlayerCards.vue props addition
const props = defineProps<{
  hand: Card[];
  faceUp: Card[];
  faceDownCount: number;
  selectedHandIndices: Set<number>;
  selectedFaceUpIndex: number | null;
  isMyTurn: boolean;
  activeSource: 'hand' | 'face-up' | 'face-down';
  hasSelection: boolean;
  playableHandIndices: Set<number>;    // NEW
  playableFaceUpIndices: Set<number>;  // NEW
}>();
```

### Anti-Patterns to Avoid

- **Fetching playability from server:** The client already has `discardPile` and `hand` in `gameView` — compute it locally. Introducing a new server message for this is unnecessary roundtrip.
- **Using hover-only green glow:** The requirement explicitly states "without hover (always visible on mobile)". Do not use `hover:ring-green-400` as the primary indicator.
- **Re-implementing full server rules differently:** Don't write a simplified version that ignores the 8s-invisible rule or the 7-constraint. The exact same `canPlayOnPile` logic must be used.
- **Putting playability in OpponentCards:** Opponents' hands are hidden — no playability indicators apply there.
- **Ignoring dark mode:** Tailwind v4 uses `dark:` prefix. Ensure the green glow and gray-out are visible in both light (bg-white cards) and dark mode if the app ever switches. Currently cards are bg-white with no dark variant, so the green border approach is safe.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Can this card be played?" | Custom rank comparison | `canPlayOnPile` from CardRules.ts | Already handles all special cases: 2s, 8s transparency, 7-constraint, 10s, jokers |
| "What is the effective top card?" | Manual pile scan | `getEffectiveTopCard` | Already handles consecutive 8s pile correctly |

**Key insight:** The server's `CardRules.ts` has already solved all edge cases. Don't reimagine the rules — copy or import the pure functions.

## Common Pitfalls

### Pitfall 1: Forgetting the 8-transparency Rule

**What goes wrong:** A developer checks `discardPile[discardPile.length - 1]` to find the top card, then compares against it directly.

**Why it happens:** The naive "what's the top card?" check misses that 8s are transparent. If the pile is `[K, 8]`, the effective top is `K`, not `8`. A player trying to play a 5 would incorrectly see it as playable.

**How to avoid:** Always use `getEffectiveTopCard()` which walks back through trailing 8s. This function is defined in `CardRules.ts`.

**Warning signs:** Playability indicators show 3s/4s as playable when an 8 is on top of a King.

### Pitfall 2: Wrong "No Playable Cards" State

**What goes wrong:** When no cards in hand are playable (player must pick up the pile), the UI shows all cards as "red/disabled" without explaining why.

**Why it happens:** Developer just dims all cards when `playableHandIndices.size === 0`.

**How to avoid:** When it's the player's turn and `playableHandIndices.size === 0`, show cards as normal (no green/gray highlight) OR show all as grayed with a clear message "No playable cards — pick up pile". The current UI already has the "Pick Up Pile" button; just ensure the card state communicates the situation clearly.

### Pitfall 3: Highlights Showing When Not Player's Turn

**What goes wrong:** Playability indicators glow green for cards during an opponent's turn, confusing the player about whose turn it is.

**Why it happens:** `playableHandIndices` computed doesn't guard against `!isMyTurn`.

**How to avoid:** Return empty Set when `!isMyTurn.value` in the computed. Cards should only show playability indicators when `isMyTurn` is true.

### Pitfall 4: First-Turn Logic Not Reflected in Highlights

**What goes wrong:** On the first turn, `forcedCardIndices` exists but the highlights show all playable cards instead of only the forced ones.

**Why it happens:** `canPlayOnPile` alone doesn't encode the first-turn "must play lowest" constraint — that's a separate rule in the GameEngine.

**How to avoid:** On first turn, use `forcedCardIndices` (already computed in `usePlayingPhase`) as the playable set, not the general `canPlayOnPile` output. The `forcedCardIndices` already represents exactly which cards the player must play.

**Revised logic:**
```typescript
const playableHandIndices = computed<Set<number>>(() => {
  if (!gameView.value || !isMyTurn.value) return new Set();
  // On first turn, only forced cards are "playable"
  if (isFirstTurn.value) return forcedCardIndices.value;
  const { hand, discardPile } = gameView.value;
  const playable = new Set<number>();
  hand.forEach((card, i) => {
    if (canPlayOnPile(card, discardPile)) playable.add(i);
  });
  return playable;
});
```

### Pitfall 5: Mobile Grouped View Missing Highlights

**What goes wrong:** Desktop card buttons get the green glow, but the mobile grouped view (`shouldShowGrouped`) shows no playability indication.

**Why it happens:** Developer updates only the `v-else` branch (desktop view) and forgets the grouped branch.

**How to avoid:** For grouped view, a card group is "playable" if any card in the group satisfies `canPlayOnPile`. Add a `groupIsPlayable(group: CardGroup): boolean` helper that checks `group.cards[0]` (since all cards in a group share rank, checking one is enough). Apply a green ring to the group container.

### Pitfall 6: Face-Up Highlights During Wrong Play Source

**What goes wrong:** Face-up cards show green glow even when the player is in hand-play phase (still has hand cards).

**Why it happens:** `playableFaceUpIndices` computed doesn't check `activeSource`.

**How to avoid:** Only compute face-up playability when `activeSource.value === 'face-up'`. Return empty Set otherwise.

## Code Examples

Verified patterns from existing code:

### Existing card CSS class pattern (from PlayerCards.vue)
```vue
<!-- Existing pattern — selected gets yellow ring, inactive gets opacity-40 -->
:class="[
  selectedHandIndices.has(i)
    ? 'ring-2 ring-yellow-400 -translate-y-2 border-yellow-400 shadow-lg'
    : 'border-gray-300',
  activeSource !== 'hand'
    ? 'opacity-40 cursor-not-allowed'
    : 'cursor-pointer hover:border-gray-400'
]"
```

### canPlayOnPile signature (from CardRules.ts)
```typescript
// Source: packages/server/src/game/CardRules.ts
export function canPlayOnPile(playedCard: Card, discardPile: Card[]): boolean {
  if (discardPile.length === 0) return true;
  if (playedCard.kind === 'standard') {
    if (playedCard.rank === '2') return true;
    if (playedCard.rank === '10') return true;
    if (playedCard.rank === '8') return true;
  }
  const effectiveTop = getEffectiveTopCard(discardPile);
  if (effectiveTop === null) return true;
  if (effectiveTop.kind === 'standard' && effectiveTop.rank === '7') {
    return getRankValue(playedCard) <= getRankValue(effectiveTop);
  }
  return getRankValue(playedCard) >= getRankValue(effectiveTop);
}
```

### Tailwind v4 glow pattern (used in existing burn animation context)
```css
/* Tailwind v4 uses @import "tailwindcss" not @tailwind directives */
/* Box-shadow color utilities: shadow-green-400/50 works in v4 */
/* ring-2 ring-green-400 ring-offset-1 for card glow */
```

### Proposed visual states for hand cards
```
Not my turn:     → no highlights, existing opacity-40 cursor-not-allowed preserved
My turn, playable: → border-green-400 shadow-md shadow-green-400/40 (green glow)
My turn, unplayable: → border-gray-500 opacity-50 (grayed out)
Selected:        → existing ring-2 ring-yellow-400 -translate-y-2 shadow-lg (unchanged)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 | This project already uses v4 — no change needed |
| `box-shadow` in `<style scoped>` | Tailwind `shadow-*` utilities | Tailwind v4 | Use `shadow-green-400/50 shadow-md` for glow effect |

**Deprecated/outdated:**
- `ring-offset-color` is not needed for the glow — `shadow-md shadow-green-400/50` achieves the "green glow" effect cleanly with Tailwind v4 utilities.

## Open Questions

1. **Where should `canPlayOnPile` live for the client?**
   - What we know: It exists in `packages/server/src/game/CardRules.ts`. The shared package currently only has types.
   - What's unclear: Whether this phase should refactor `CardRules.ts` into shared, or just inline a copy in the client composable.
   - Recommendation: Inline a copy in a new `packages/client/src/composables/usePlayabilityHighlights.ts` for this phase. Moving to shared is a separate refactor concern that the planner can decide. The pure functions (`getRankValue`, `getEffectiveTopCard`, `canPlayOnPile`) are 30 lines total and have no server-only dependencies.

2. **Joker handling in playability highlights**
   - What we know: Jokers return `999` from `getRankValue`, so they can play on everything. `isSpecialCard` only covers 2/8/10.
   - What's unclear: Are jokers in the game currently? Yes — `createDeck()` includes 2 jokers.
   - Recommendation: Jokers must show as always playable (green glow always on my turn). `canPlayOnPile` already handles this via `getRankValue(joker) = 999 >= anything`.

3. **Face-down cards: no highlights needed**
   - What we know: Face-down cards are played blind — player cannot know if playable in advance.
   - What's unclear: Nothing. No highlight should be applied to face-down cards.
   - Recommendation: Skip playability highlights for face-down entirely. The `?` button UX is sufficient.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `packages/server/src/game/CardRules.ts` — complete playability logic
- Direct codebase inspection: `packages/client/src/components/PlayerCards.vue` — current card rendering
- Direct codebase inspection: `packages/client/src/composables/usePlayingPhase.ts` — existing composable patterns
- Direct codebase inspection: `packages/client/src/style.css` — Tailwind v4 `@import "tailwindcss"` confirmed
- Direct codebase inspection: `packages/shared/src/types/game.ts` — `PlayerGameView` includes `discardPile` and `hand`

### Secondary (MEDIUM confidence)
- None required — implementation is entirely codebase-internal.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, everything in-tree
- Architecture: HIGH — Clear composable pattern, existing similar computed (`forcedCardIndices`) in `usePlayingPhase.ts`
- Playability logic: HIGH — `canPlayOnPile` fully implemented and tested in server code
- Pitfalls: HIGH — Based on direct inspection of edge-case logic in `CardRules.ts` and `GameEngine.ts`
- CSS visual approach: MEDIUM — Tailwind v4 shadow/ring utilities verified by existing code patterns; specific class combinations untested

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable tech, 30-day horizon)
