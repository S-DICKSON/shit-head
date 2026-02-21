# Phase 22: Mobile Card Categories - Research

**Researched:** 2026-02-18
**Domain:** Mobile card UI, category/tab navigation, swipe carousel, Vue 3 composables
**Confidence:** HIGH

## Summary

Phase 22 extends the existing mobile grouped-card view (already implemented in Phase 15) with two new navigation dimensions: (1) a category split between "Power Cards" and "Normal Cards" when hand size exceeds 5, and (2) a horizontal swipe carousel within each category. The existing `useCardGrouping` composable and the grouped card layout in `PlayerCards.vue` already provide the grouping infrastructure — this phase layers category filtering and swipe navigation on top.

The power cards defined by the requirements are: `2`, `7`, `8`, `10`, and Joker. This aligns with the game's CardRules.ts special card logic (2=reset, 8=transparent, 10=burn) plus the 7-constraint card and Joker. Note that the server-side `isSpecialCard()` only covers `2`, `8`, and `10` — the phase must define a client-side `isPowerCard()` that additionally includes `7` and `Joker`.

The recommended approach: use pure CSS `scroll-snap-type: x mandatory` with `overflow-x: auto` for the carousel (no external library needed), add a category tab bar with reactive Vue 3 state, and wire everything into `PlayerCards.vue`. A "Play Selected" confirmation button already exists in the grouped view; it should remain as-is since MOBUI-05 requires preventing accidental plays.

**Primary recommendation:** Implement category tabs and carousel with native CSS scroll snap + VueUse `useSwipe` for programmatic category switching when swipe is detected outside the card area. No new dependencies required.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 Composition API | 3.5.x | Category state, card filtering, reactive tab switching | Already in use; `ref`, `computed` handle all state |
| Tailwind CSS v4 | 4.x | Tab button styles, touch target sizing, carousel container | Already in use; `overflow-x-auto`, `scroll-snap-*` utilities |
| @vueuse/core | 14.2.0 | `useSwipe` for detecting left/right swipe to switch categories | Already installed; prevents hand-rolling swipe detection |
| CSS scroll-snap | Native | Horizontal carousel within category view | 97%+ browser support (all modern browsers including iOS Safari 11+) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `touch-action` | Native | Prevent scroll conflicts on carousel containers | Always set `touch-action: pan-y` on carousel to allow vertical page scroll while enabling horizontal swipe |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS scroll-snap | embla-carousel-vue or vue3-carousel | Libraries add 5-20KB; scroll-snap handles this simple use case natively with zero JS |
| VueUse useSwipe | Custom touchstart/touchend tracking | VueUse handles passive listeners, threshold, cleanup — saves ~30 lines of boilerplate |
| Tab buttons (category nav) | Bottom sheet / drawer pattern | Tabs are simpler to implement, universally understood, and faster to switch |

**Installation:**
```bash
# No new dependencies required — everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
packages/client/src/
├── components/
│   └── PlayerCards.vue          # Primary change: add category tabs + carousel
├── composables/
│   ├── useCardGrouping.ts       # Existing — no changes needed
│   └── useCardCategories.ts     # NEW: category split and active tab state
```

### Pattern 1: Power Card Classification (Client-Side)

**What:** A pure function that classifies a card as "power" or "normal" for the mobile category view. This is client-display logic only — the server determines playability.

**Power card definition (per requirements MOBUI-03):** ranks `2`, `7`, `8`, `10`, and Joker.

**Example:**
```typescript
// Inside useCardCategories.ts or PlayerCards.vue
import type { Card } from '@shit-head/shared';

const POWER_RANKS = new Set(['2', '7', '8', '10']);

export function isPowerCard(card: Card): boolean {
  if (card.kind === 'joker') return true;
  return POWER_RANKS.has(card.rank);
}
```

Note: This differs from server-side `isSpecialCard()` which only covers `2`, `8`, `10`. The `7` and Joker are power cards for UI categorization purposes even though the server handles them differently.

### Pattern 2: Category Composable (useCardCategories)

**What:** Reactive composable that wraps `useCardGrouping`, splits groups into power/normal categories, and tracks which category is active.

**Example:**
```typescript
// composables/useCardCategories.ts
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import type { Card } from '@shit-head/shared';
import { useCardGrouping } from './useCardGrouping';

const POWER_RANKS = new Set(['2', '7', '8', '10']);

function isPowerCard(card: Card): boolean {
  if (card.kind === 'joker') return true;
  return POWER_RANKS.has(card.rank);
}

export type CardCategory = 'power' | 'normal';

export function useCardCategories(hand: Ref<Card[]>) {
  const { groupedCards, ...groupingRest } = useCardGrouping(hand);
  const activeCategory = ref<CardCategory>('normal');

  const powerGroups = computed(() =>
    groupedCards.value.filter(g => g.cards.some(c => isPowerCard(c)))
  );

  const normalGroups = computed(() =>
    groupedCards.value.filter(g => g.cards.every(c => !isPowerCard(c)))
  );

  const powerCount = computed(() =>
    powerGroups.value.reduce((acc, g) => acc + g.count, 0)
  );

  const normalCount = computed(() =>
    normalGroups.value.reduce((acc, g) => acc + g.count, 0)
  );

  const activeGroups = computed(() =>
    activeCategory.value === 'power' ? powerGroups.value : normalGroups.value
  );

  function switchCategory(cat: CardCategory) {
    activeCategory.value = cat;
  }

  return {
    ...groupingRest,
    groupedCards,
    powerGroups,
    normalGroups,
    powerCount,
    normalCount,
    activeCategory,
    activeGroups,
    switchCategory,
  };
}
```

### Pattern 3: Category Tab Bar (60px touch targets)

**What:** Two buttons showing category names and counts. Must meet 60px minimum height per MOBUI-05.

**Example (Tailwind v4):**
```vue
<template>
  <!-- Category tab bar — only shown when shouldShowGrouped -->
  <div
    v-if="shouldShowGrouped"
    class="flex gap-1 mb-2"
    role="tablist"
  >
    <button
      role="tab"
      :aria-selected="activeCategory === 'normal'"
      class="flex-1 min-h-[60px] rounded-lg text-sm font-semibold transition-colors"
      :class="activeCategory === 'normal'
        ? 'bg-green-600 text-white'
        : 'bg-gray-700 text-gray-300'"
      @click="switchCategory('normal')"
    >
      Normal Cards ({{ normalCount }})
    </button>
    <button
      role="tab"
      :aria-selected="activeCategory === 'power'"
      class="flex-1 min-h-[60px] rounded-lg text-sm font-semibold transition-colors"
      :class="activeCategory === 'power'
        ? 'bg-yellow-600 text-black'
        : 'bg-gray-700 text-gray-300'"
      @click="switchCategory('power')"
    >
      Power Cards ({{ powerCount }})
    </button>
  </div>
</template>
```

Note: Tailwind v4 uses arbitrary values like `min-h-[60px]` — this is supported syntax.

### Pattern 4: Horizontal Carousel with CSS scroll-snap

**What:** A scrollable horizontal container for card groups in the active category. Native CSS scroll-snap provides touch swipe with snap behavior. No JavaScript carousel library needed.

**Example (Tailwind v4 + scoped CSS):**
```vue
<template>
  <!-- Carousel container -->
  <div
    ref="carouselRef"
    class="flex overflow-x-auto gap-3 px-1 pb-2 snap-x snap-mandatory"
    style="scroll-behavior: smooth; -webkit-overflow-scrolling: touch;"
  >
    <div
      v-for="group in activeGroups"
      :key="group.rank"
      class="snap-start flex-shrink-0 w-[80vw] max-w-[280px] bg-gray-800/60 rounded-xl p-3"
      :class="isPowerGroupRank(group.rank) ? 'border border-yellow-500/50' : 'border border-gray-700'"
    >
      <!-- Card group content (existing +/- selector pattern) -->
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar on carousel */
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}
.overflow-x-auto {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
```

Tailwind v4 includes `snap-x`, `snap-mandatory`, `snap-start` utilities natively.

### Pattern 5: VueUse useSwipe for Category Switching

**What:** Use `useSwipe` on the carousel container (or a wrapper) to detect left/right swipes that cross a threshold and switch the active category. This supplements the tab buttons.

**Example:**
```typescript
import { useSwipe } from '@vueuse/core';
import { useTemplateRef } from 'vue';

const carouselRef = useTemplateRef<HTMLElement>('carouselRef');

const { direction } = useSwipe(carouselRef, {
  threshold: 80, // px — more than default 50 to avoid false category switches
  onSwipeEnd(_, direction) {
    if (direction === 'left') switchCategory('power');
    if (direction === 'right') switchCategory('normal');
  },
});
```

CAUTION: The carousel already scrolls horizontally, so a direct `useSwipe` on the carousel element will conflict with scroll events. Options:
1. Use a swipe zone ABOVE the carousel (e.g., the category tab row itself detects swipes)
2. Set a very high threshold and only trigger on fast, short swipes (velocity-based, not just distance)
3. Skip `useSwipe` entirely and rely solely on the tab buttons for category switching (simpler, no conflict)

**Recommended:** Rely on tab buttons as the primary category switch mechanism. The carousel scroll handles within-category navigation. This avoids touch event conflicts.

### Pattern 6: Visual Distinction for Power Cards

**What:** Gold/amber borders and background tints on power card items (as per success criteria: "gold/purple borders").

**Example:**
```vue
<div
  :class="[
    'rounded-xl p-3',
    isPowerGroup
      ? 'bg-yellow-900/30 border border-yellow-500/60 ring-1 ring-yellow-400/20'
      : 'bg-gray-800/50 border border-gray-700'
  ]"
>
```

### Anti-Patterns to Avoid

- **Don't create a separate component for the category view:** The existing `PlayerCards.vue` already handles the mobile/desktop split — add category logic inline or via a new composable, not a new top-level component.
- **Don't add carousel library for 5-10 card views:** CSS scroll-snap is sufficient; a library like Embla adds significant weight for a simple horizontal scroll.
- **Don't ignore the `shouldShowGrouped` gate:** Category view must only show when `isMobile && hand.length > 5` — desktop layout stays unchanged.
- **Don't put `useSwipe` directly on the scrolling carousel element:** Touch events will conflict with the native scroll behavior.
- **Don't forget to clear selection when switching categories:** If user selects cards in "Normal" then switches to "Power", selections should reset to avoid playing wrong cards.
- **Don't bypass the existing `play-grouped-cards` emit pattern:** `PlayingPhase.vue` already handles `@play-grouped-cards` and routes to `send({ type: 'play-cards', cardIndices })` — keep this wiring.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe detection | Custom touchstart/touchend with delta tracking | VueUse `useSwipe` | Handles passive listeners, threshold, multi-touch cancellation, cleanup |
| Horizontal scroll carousel | Custom drag-with-mouse + touch handler | CSS `scroll-snap-type: x mandatory` | Native browser handles momentum, snap, touch vs mouse uniformly |
| Touch target sizing | Custom padding calculations | Tailwind `min-h-[60px]` + `py-4` | Declarative, tested at all breakpoints |

**Key insight:** The existing `useCardGrouping` composable already handles the hard part (index tracking, selection state, quantity +/- logic). Phase 22 only needs to add a category filter layer on top — it should NOT rewrite card grouping logic.

## Common Pitfalls

### Pitfall 1: Index Tracking Breaks When Filtering Categories

**What goes wrong:** The category filter shows only power or normal card groups, but `selectedIndices` in `useCardGrouping` tracks indices into the full hand array. If the UI only shows a subset, the displayed cards and selected indices can desync.

**Why it happens:** `useCardGrouping.groupedCards` includes ALL groups. Filtering to `activeGroups` (power or normal) changes display but not the underlying index mapping.

**How to avoid:**
- Keep `useCardGrouping` untouched — it correctly maps to original hand indices.
- Filter at the display layer only: `activeGroups = groupedCards.filter(...)`.
- The `+/-` selectors in `activeGroups` still call `incrementSelection(group.rank)` which modifies the underlying `selectedCounts` for the correct rank.
- When `handleGroupedPlay()` calls `emit('play-grouped-cards', selectedIndices.value)`, it correctly uses the full hand's indices regardless of which category was visible.

**Confidence:** HIGH — this is how the existing architecture is designed.

### Pitfall 2: Touch Events Conflict Between Carousel Scroll and Category Swipe

**What goes wrong:** Applying `useSwipe` on the same element that horizontally scrolls causes the browser to route touch events to scroll AND the swipe listener, resulting in flickering category switches during normal card scrolling.

**Why it happens:** The browser's scroll event handling and JavaScript touch listeners compete. `scroll-snap` uses native scroll which fires before JavaScript event handlers.

**How to avoid:**
- Use tab buttons as the ONLY mechanism to switch categories.
- If swipe category switching is desired: listen for swipes on a non-scrolling parent container (e.g., the tab bar above the carousel) with a separate, non-scrolling element.
- Alternatively: skip the swipe-to-switch-category feature entirely — the requirements don't explicitly require it, only "Category navigation allows switching between normal and power card views."

### Pitfall 3: "Play Selected" Confusion Across Categories

**What goes wrong:** User selects 2x King in Normal category, switches to Power category, sees zero selections but clicks "Play Selected" anyway — nothing plays or wrong thing plays.

**Why it happens:** `selectedCounts` persists across category switches. The Play button visibility is `hasGroupSelection` computed from `selectedIndices.value.length > 0`, which remains true.

**How to avoid:**
- Clear selection state (`clearGroupSelection()`) when `activeCategory` changes.
- Alternatively: show the "Play Selected" button always (even when on a different category), with a summary like "Play 2× K" to make cross-category selection obvious.
- Simplest/safest: clear on category switch via `watch(activeCategory, clearGroupSelection)`.

### Pitfall 4: Empty Category State

**What goes wrong:** A player has only power cards (e.g., 2×2, 10, Joker). The "Normal Cards" tab shows 0 cards, and the carousel is empty — confusing UI.

**Why it happens:** Not all hands split evenly into both categories.

**How to avoid:**
- When a category has 0 cards, show a friendly "No [normal/power] cards in hand" message.
- Consider auto-switching to the non-empty category when the active one is empty (watch `activeGroups.length === 0`).
- Show the count on each tab button (e.g., "Normal Cards (0)") so user can see before switching.

### Pitfall 5: Tailwind v4 scroll-snap Utilities

**What goes wrong:** Using Tailwind v3-style `scroll-snap-*` class names that don't exist in v4, or using PostCSS configuration that Tailwind v4's CSS-first approach doesn't recognize.

**Why it happens:** Tailwind v4 uses CSS-first configuration (`@import "tailwindcss"`) without `tailwind.config.js`. Some v3 utilities changed names.

**How to avoid:**
- Tailwind v4 includes scroll snap utilities: `snap-x`, `snap-y`, `snap-mandatory`, `snap-proximity`, `snap-start`, `snap-end`, `snap-center`, `snap-always`, `snap-normal`. These are available.
- Verify by checking Tailwind v4 docs or testing in dev mode.
- Use `style=""` inline for non-utility values like `scroll-behavior: smooth` (no Tailwind utility exists for this in v4).

**Confidence:** MEDIUM — based on Tailwind v4 documentation structure; verify in dev run.

### Pitfall 6: Desktop Layout Regression

**What goes wrong:** Category tabs or carousel markup appears on desktop breakpoints, breaking the existing `TransitionGroup` card display.

**Why it happens:** The `v-if="shouldShowGrouped"` gate exists in `PlayerCards.vue` but might not wrap all category-related elements.

**How to avoid:**
- Wrap the entire category tab + carousel block in `v-if="shouldShowGrouped"` (same condition as the existing grouped view: `isMobile && hand.length > 5`).
- Desktop remains: `v-else` shows the `TransitionGroup` flex wrap of individual cards.
- Run visual checks at 640px+ breakpoint before completion.

## Code Examples

Verified patterns from official sources:

### useSwipe from VueUse (verified via vueuse.org)

```typescript
// Source: https://vueuse.org/core/useSwipe/
import { useSwipe } from '@vueuse/core';
import { useTemplateRef } from 'vue';

const el = useTemplateRef<HTMLElement>('swipeZone');
const { isSwiping, direction } = useSwipe(el, {
  threshold: 50,
  onSwipeEnd(e, direction) {
    // direction: 'left' | 'right' | 'up' | 'down' | 'none'
    console.log('Swipe ended:', direction);
  },
});
```

### CSS Scroll Snap Carousel (verified via MDN)

```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overflow/Carousels */
.carousel-container {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: 12px;
  padding-bottom: 8px;
}

.carousel-item {
  flex: 0 0 80vw;
  max-width: 280px;
  scroll-snap-align: start;
}

/* Hide scrollbar */
.carousel-container::-webkit-scrollbar { display: none; }
.carousel-container { scrollbar-width: none; }
```

### Category Tab Pattern with ARIA

```vue
<!-- Source: WAI-ARIA Authoring Practices 1.1 - Tabs Pattern -->
<div role="tablist" aria-label="Card categories" class="flex gap-2 mb-3">
  <button
    v-for="cat in ['normal', 'power']"
    :key="cat"
    role="tab"
    :aria-selected="activeCategory === cat"
    :tabindex="activeCategory === cat ? 0 : -1"
    class="flex-1 py-4 min-h-[60px] rounded-lg text-sm font-bold transition-all"
    @click="switchCategory(cat)"
  >
    {{ cat === 'normal' ? 'Normal Cards' : 'Power Cards' }}
    ({{ cat === 'normal' ? normalCount : powerCount }})
  </button>
</div>
```

### Integrating with Existing PlayerCards.vue

The key integration point is replacing the existing `shouldShowGrouped` block with the enhanced version:

```vue
<!-- EXISTING (Phase 15) - grouped view -->
<div v-if="shouldShowGrouped" class="flex flex-col gap-2 ...">
  <div v-for="group in groupedCards" ...>
    <!-- +/- selectors -->
  </div>
</div>

<!-- PHASE 22 - enhanced with categories + carousel -->
<div v-if="shouldShowGrouped">
  <!-- Category tabs -->
  <CategoryTabs
    :active="activeCategory"
    :normal-count="normalCount"
    :power-count="powerCount"
    @switch="switchCategory"
  />

  <!-- Carousel of groups in active category -->
  <div class="flex overflow-x-auto snap-x snap-mandatory gap-3">
    <div
      v-for="group in activeGroups"
      :key="group.rank"
      class="snap-start flex-shrink-0 w-[80vw] ..."
    >
      <!-- Same +/- selector content as before -->
    </div>
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Third-party carousel libraries (Swiper.js) | CSS scroll-snap + native browser scroll | 2022+ | Zero JS overhead, better performance on mobile |
| `scroll-snap-type: mandatory` (removed) | `scroll-snap-type: x mandatory` | CSS Scroll Snap L1 | New spec is stable, widely supported |
| Custom `touchstart` event listeners | VueUse `useSwipe` composable | 2021+ | Handles passive listeners, cleanup, multi-touch |
| Separate mobile components | `v-if` breakpoint gates in same component | Ongoing | Less code duplication, easier testing |

**Current stable pattern:**
- CSS scroll-snap for carousels: HIGH confidence, widely supported
- `useSwipe` from VueUse: HIGH confidence, already installed
- Tab buttons for category navigation: standard pattern, no special support needed

## Open Questions

1. **Should "Play Selected" persist across category switches?**
   - What we know: Clearing on switch is safest for correctness; keeping is more ergonomic.
   - What's unclear: Whether users commonly select across both categories in one turn.
   - Recommendation: Clear selection on category switch (safer, prevents wrong-card play). Show the previous selection count in tab: "Normal Cards (2 selected)".

2. **Carousel item width on small phones vs. tablets**
   - What we know: `w-[80vw] max-w-[280px]` shows partial next item, hinting at scrollability.
   - What's unclear: Whether 80vw works well on 320px (iPhone SE) width.
   - Recommendation: Test on 320px viewport. Consider `w-[85vw]` for smaller screens.

3. **Category view when hand is 5-6 cards (edge of threshold)**
   - What we know: Threshold is `hand.length > 5` (6+ cards triggers grouped/category view).
   - What's unclear: Whether category split makes sense for 6-card hands that might all be normal or all power.
   - Recommendation: Show category tabs even for 6-card hands (the `>5` threshold is correct per MOBUI-02), but handle empty category state gracefully.

4. **Integration with Phase 21 (card playability highlights)**
   - What we know: Phase 21 adds playability highlight styling to cards. Phase 22 adds category navigation.
   - What's unclear: Whether Phase 21 will be complete before Phase 22 is executed.
   - Recommendation: Design Phase 22 to be compatible with playability highlight classes. The `isPowerCard()` function can coexist with `isPlayable(card)` — both are pure classifiers applied to the same card object.

## Sources

### Primary (HIGH confidence)
- VueUse `useSwipe` docs (vueuse.org/core/useSwipe) — API verified via WebFetch
- MDN CSS Carousels guide (developer.mozilla.org/en-US/docs/Web/CSS/Guides/Overflow/Carousels) — scroll-snap pattern verified
- Project source: `packages/client/src/composables/useCardGrouping.ts` — existing composable API verified
- Project source: `packages/client/src/components/PlayerCards.vue` — existing component structure verified
- Project source: `packages/server/src/game/CardRules.ts` — power card logic cross-referenced
- Project source: `packages/client/package.json` — @vueuse/core 14.2.0 confirmed installed

### Secondary (MEDIUM confidence)
- [CSS scroll-snap browser support — Can I use](https://caniuse.com/css-snappoints) — broad support confirmed via search results (97%+)
- [Interop 2026 — scroll snap focus area](https://webkit.org/blog/17818/announcing-interop-2026/) — confirms scroll snap is actively being improved, already widely supported

### Tertiary (LOW confidence — for reference only)
- [vue3-carousel](https://github.com/ismail9k/vue3-carousel) — considered and rejected (too heavyweight for this use case)
- [Embla Carousel Vue](https://www.embla-carousel.com/get-started/vue/) — considered and rejected (no new dep needed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new deps
- Architecture (composable split): HIGH — directly extends existing Phase 15 patterns
- Power card definition: HIGH — specified in requirements + cross-referenced with CardRules.ts
- CSS scroll-snap carousel: HIGH — native browser feature, widely supported
- Touch conflict avoidance: MEDIUM — recommended to use tab buttons only (avoid useSwipe on carousel); requires testing
- Empty category handling: MEDIUM — behavior is unspecified in requirements, recommendation is conservative

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days — stable domain, no fast-moving dependencies)
