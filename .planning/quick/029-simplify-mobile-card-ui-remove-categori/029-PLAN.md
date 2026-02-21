---
phase: quick-029
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/PlayerCards.vue
  - packages/client/src/components/PlayingPhase.vue
  - packages/client/src/composables/useCardCategories.ts      # DELETE
  - packages/client/src/composables/useCardGrouping.ts        # DELETE
  - packages/client/src/composables/useCardGrouping.test.ts   # DELETE
autonomous: true

must_haves:
  truths:
    - "Mobile users see normal card buttons (same as desktop), not category tabs or +/- carousel"
    - "Mobile users can horizontally swipe through hand cards when they have many cards"
    - "Page does not scroll vertically on mobile — no overflow"
  artifacts:
    - path: "packages/client/src/components/PlayerCards.vue"
      provides: "Simplified card display — always shows TransitionGroup card buttons, horizontal scroll on mobile"
    - path: "packages/client/src/components/PlayingPhase.vue"
      provides: "Cleaned up — no grouped play handler or emit"
  key_links:
    - from: "packages/client/src/components/PlayerCards.vue"
      to: "PlayingPhase.vue"
      via: "emits: toggle-hand-card, play-cards, pickup-pile (no more play-grouped-cards)"
---

<objective>
Simplify the mobile card UI by removing the category tabs and +/- counter carousel interface. Display hand cards as normal buttons (same as desktop) in a horizontally scrollable container on mobile. Fix mobile scroll overflow.

Purpose: The grouped mobile UI was over-engineered and clunky. Normal card buttons with horizontal swipe are simpler and more intuitive.
Output: Cleaned PlayerCards.vue, cleaned PlayingPhase.vue, deleted useCardCategories.ts, useCardGrouping.ts, and useCardGrouping.test.ts
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/components/PlayerCards.vue
@packages/client/src/components/PlayingPhase.vue
@packages/client/src/composables/useCardCategories.ts
@packages/client/src/composables/useCardGrouping.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Simplify PlayerCards.vue — remove grouped mode, add horizontal scroll</name>
  <files>packages/client/src/components/PlayerCards.vue</files>
  <action>
Rewrite PlayerCards.vue to remove ALL grouped mobile UI and simplify to a single card display mode:

**Remove from template:**
- The entire `v-if="shouldShowGrouped"` block (lines 71-170): category tab bar, empty category message, horizontal carousel with +/- selectors
- The `v-else` on the TransitionGroup (line 173) — it should always render, not be conditional
- In the Play button: remove `shouldShowGrouped ? hasGroupSelection : hasSelection` — just use `hasSelection`
- In the Play button: remove the `playConfirming` conditional class and text — always show "Play"
- In the Play button: remove `shouldShowGrouped ? handleGroupedPlayConfirm() : emit('play-cards')` — just use `emit('play-cards')`

**Remove from script:**
- `import { useCardCategories, isPowerCard } from '../composables/useCardCategories'` — delete entirely
- `windowWidth` ref, `updateWidth` function, `onMounted`/`onUnmounted` resize listeners
- `isMobile` computed
- `handRef` computed and entire `useCardCategories` destructuring block (lines 297-310)
- `shouldShowGrouped` computed
- `playConfirming` ref and `confirmTimer` variable
- `handleGroupedPlayConfirm` function
- `watch(activeCategory, ...)` watcher
- `isPowerGroup` helper function
- Remove `'play-grouped-cards'` from `defineEmits`
- Remove `hasGroupSelection` from the `defineEmits` type (it was only used in template conditional, not as an emit)
- Clean up unused imports: remove `watch`, `onMounted`, `onUnmounted` from vue import if no longer used. Keep `computed`, `ref` (ref is used by pickupConfirming via useDoubleTap). Actually check: `watch` is not used elsewhere, `onMounted`/`onUnmounted` are not used elsewhere — remove them. Keep `computed` and `ref`.

**Modify the TransitionGroup for horizontal scroll on mobile:**
Change the TransitionGroup container classes from:
```
class="flex justify-center gap-1 sm:gap-2 flex-wrap"
```
To:
```
class="flex gap-1 sm:gap-2 flex-nowrap overflow-x-auto snap-x snap-mandatory sm:flex-wrap sm:overflow-visible sm:justify-center pb-2 sm:pb-0"
```
This makes cards horizontally scrollable on mobile (flex-nowrap + overflow-x-auto) and wrapping on desktop (sm:flex-wrap).

Add `snap-start flex-shrink-0` to each card button class list so cards snap nicely when swiping.

**Fix scroll overflow:**
Line 4: Change `class="overflow-y-auto max-h-[35vh] sm:max-h-none flex-1"` to `class="overflow-hidden flex-1"` — the parent PlayingPhase already constrains with max-h-[45vh], and vertical scroll is not wanted.

**Keep the scrollbar-hiding CSS** in the style block — rename selectors from `.snap-x` to target the TransitionGroup's horizontal scroll (the snap-x class is still used, so the existing CSS works as-is).
  </action>
  <verify>Run `make type-check` and `make lint` to confirm no TypeScript or lint errors. Visually confirm the template has no v-if="shouldShowGrouped" and no category/carousel markup.</verify>
  <done>PlayerCards.vue always renders the TransitionGroup card buttons. No category tabs, no +/- carousel, no grouped mode logic. Cards are horizontally scrollable on mobile via flex-nowrap + overflow-x-auto with snap scrolling. No vertical overflow.</done>
</task>

<task type="auto">
  <name>Task 2: Clean up PlayingPhase.vue and delete unused composables</name>
  <files>
    packages/client/src/components/PlayingPhase.vue
    packages/client/src/composables/useCardCategories.ts
    packages/client/src/composables/useCardGrouping.ts
    packages/client/src/composables/useCardGrouping.test.ts
  </files>
  <action>
**PlayingPhase.vue changes:**
- Remove the `handleGroupedPlay` function (lines 47-49)
- Remove `@play-grouped-cards="handleGroupedPlay"` from the PlayerCards component usage (line 143)
- No other changes needed — the `send` import is still used for other purposes

**Delete files:**
- `packages/client/src/composables/useCardCategories.ts` — no longer imported anywhere
- `packages/client/src/composables/useCardGrouping.ts` — only imported by useCardCategories
- `packages/client/src/composables/useCardGrouping.test.ts` — tests for deleted composable
  </action>
  <verify>Run `make type-check` to confirm no broken imports. Run `make test-client` to confirm remaining tests pass (the deleted test file will simply not run). Run `make lint` to confirm no lint errors.</verify>
  <done>PlayingPhase.vue has no grouped play handler. Three composable files deleted. `make type-check`, `make test-client`, and `make lint` all pass.</done>
</task>

</tasks>

<verification>
- `make type-check` passes with zero errors
- `make lint` passes
- `make test-client` passes (useCardGrouping.test.ts is deleted, other tests unaffected)
- No references to useCardCategories, useCardGrouping, isPowerCard, shouldShowGrouped, or play-grouped-cards remain in the codebase
</verification>

<success_criteria>
- Mobile card display shows normal card buttons (identical to desktop) in a horizontally scrollable row
- Desktop card display unchanged (flex-wrap, centered)
- No category tabs, no +/- carousel, no two-step confirm in the UI
- No vertical scroll overflow on mobile
- All dead code and composable files removed
- Type checking, linting, and tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/029-simplify-mobile-card-ui-remove-categori/029-SUMMARY.md`
</output>
