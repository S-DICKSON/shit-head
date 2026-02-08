---
phase: 10-client-ui-card-interactions
plan: 02
subsystem: client-ui
tags: [vue, components, game-area, presentational]
requires: [10-01]
provides:
  - DiscardPile component with stacked card visualization
  - DrawPile component with card-back and count
  - OpponentCards component with turn highlighting
affects: [10-03, 10-04]
tech-stack:
  added: []
  patterns:
    - Presentational component pattern (props in, no business logic)
    - Responsive card sizing with Tailwind sm: breakpoints
    - Stacked card visual effect with CSS transforms
key-files:
  created:
    - packages/client/src/components/DiscardPile.vue
    - packages/client/src/components/DrawPile.vue
    - packages/client/src/components/OpponentCards.vue
  modified: []
decisions:
  - id: discard-pile-stacking
    choice: Show top 3 cards with 3px offset stacking effect
    rationale: Provides visual depth without excessive clutter
  - id: current-turn-highlight
    choice: Yellow ring with animated pulse dot for current player
    rationale: Clear visual indicator that's consistent with swap phase ready states
  - id: card-rendering-consistency
    choice: Reuse suitSymbol and cardKey helpers from SwapPhase.vue
    rationale: Maintains consistent card display patterns across all components
metrics:
  duration: 139s
  tasks: 2
  commits: 2
  completed: 2026-02-08
---

# Phase 10 Plan 02: Game Area Sub-Components Summary

**One-liner:** Presentational components for discard pile (stacked top-3), draw pile (card-back + count), and opponent displays (face-up cards + counts + turn highlight)

## What Was Built

Created three presentational Vue components for the game area:

1. **DiscardPile.vue** - Visualizes the discard pile with stacked card effect
   - Shows top 3 cards with 3px translate offset for depth
   - Card count badge on top-right
   - Empty state with dashed border outline
   - Responsive sizing (14/21 mobile, 16/24 desktop)

2. **DrawPile.vue** - Visualizes the draw pile
   - Blue card-back pattern with decorative inner border
   - Card count badge when cards remain
   - Empty state with dashed border
   - Responsive sizing matching DiscardPile

3. **OpponentCards.vue** - Per-opponent card state display
   - Nickname with truncation
   - Face-up cards (visible to all players)
   - Hand count and face-down count indicators
   - Current turn highlight: yellow ring + animated pulse dot
   - Disconnect indicator (DC) for disconnected players
   - Responsive card sizing (10/15 mobile, 12/18 desktop)

All components follow the card rendering patterns established in SwapPhase.vue (suitSymbol helper, cardKey generation, red/black suit coloring).

## Task Commits

1. **27b8a6a** - feat(10-02): create DiscardPile and DrawPile components
   - DiscardPile with stacked top-3 cards and count badge
   - DrawPile with card-back visual and empty state
   - Both components mobile-responsive

2. **9fc8c64** - feat(10-02): create OpponentCards component
   - Opponent nickname, face-up cards, counts
   - Current-turn yellow ring highlight with pulse dot
   - Disconnect indicator for disconnected players

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

- ✅ `make type-check` passes with no errors
- ✅ `make lint` passes with no errors
- ✅ DiscardPile.vue renders stacked top-3 cards with empty state and count badge
- ✅ DrawPile.vue renders card-back with count and empty state
- ✅ OpponentCards.vue renders opponent name, face-up cards, counts, and turn highlight

ESLint auto-fix applied formatting corrections (attribute line breaks, self-closing tags).

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| discard-pile-stacking | Show top 3 cards with 3px offset stacking effect | Provides visual depth without excessive clutter, keeps pile readable |
| current-turn-highlight | Yellow ring with animated pulse dot for current player | Clear visual indicator consistent with ready states in swap phase |
| card-rendering-consistency | Reuse suitSymbol and cardKey helpers from SwapPhase.vue | Maintains consistent card display patterns across all components |

## Integration Points

**Provides to downstream:**
- DiscardPile component ready for PlayingPhase.vue integration (10-03)
- DrawPile component ready for PlayingPhase.vue integration (10-03)
- OpponentCards component ready for PlayingPhase.vue integration (10-03)

**Dependencies satisfied:**
- Uses `OpponentView` type from @shit-head/shared (Phase 3)
- Uses `Card` discriminated union from @shit-head/shared (Phase 3)
- Follows card rendering patterns from SwapPhase.vue (Phase 4)

## Next Phase Readiness

**Ready to proceed:** Yes

**Blockers:** None

**Next steps:**
- Plan 10-03: Create PlayingPhase.vue and integrate these sub-components
- Plan 10-04: Implement card interaction logic (select, play, pickup)

**Concerns:** None - all components are purely presentational with no side effects

## Self-Check: PASSED

All created files verified:
- ✅ packages/client/src/components/DiscardPile.vue
- ✅ packages/client/src/components/DrawPile.vue
- ✅ packages/client/src/components/OpponentCards.vue

All commits verified:
- ✅ 27b8a6a
- ✅ 9fc8c64
