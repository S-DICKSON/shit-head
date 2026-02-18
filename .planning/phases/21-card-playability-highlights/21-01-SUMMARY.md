---
phase: 21-card-playability-highlights
plan: 01
subsystem: ui
tags: [vue, tailwind, card-rules, computed, playability, mobile]

# Dependency graph
requires:
  - phase: 06-special-card-rules
    provides: Server-side CardRules.ts and CardComparison.ts pure functions (canPlayOnPile, getEffectiveTopCard, getRankValue)
  - phase: 12-playing-phase-ui
    provides: PlayerCards.vue component with hand/face-up/face-down card rendering
  - phase: 14-forced-first-turn
    provides: forcedCardIndices computed in usePlayingPhase
provides:
  - Client-side cardRules.ts with canPlayOnPile, getEffectiveTopCard, getRankValue pure functions
  - playableHandIndices and playableFaceUpIndices computed Sets in usePlayingPhase
  - Green glow / gray dim visual playability indicators on hand and face-up cards
  - Mobile grouped view playability ring via isGroupPlayable index-based helper
affects:
  - future testing phases
  - 23-frontend-testing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client copy of server pure functions in packages/client/src/game/ to avoid cross-package dependency"
    - "Computed Set<number> pattern for tracking playable card indices"
    - "playableHandIndices.size > 0 guard pattern: zero size means no highlights (not my turn / not computed)"
    - "Index-based group playability check to avoid JKR vs joker kind mismatch in mobile grouped view"

key-files:
  created:
    - packages/client/src/game/cardRules.ts
  modified:
    - packages/client/src/composables/usePlayingPhase.ts
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/components/PlayerCards.vue

key-decisions:
  - "Client copy of server pure functions (not import): avoids cross-package server dependency, keeps client bundle clean"
  - "playableHandIndices.size > 0 as highlight guard: when size is 0 (not my turn), all cards show default border-gray-300"
  - "First-turn uses forcedCardIndices directly (not canPlayOnPile): preserves server forced-play logic for highlights"
  - "isGroupPlayable uses group.indices (index-based) not rank comparison: avoids JKR vs joker kind string mismatch"
  - "Joker always playable: server CardRules.ts relied on joker returning 999 from getRankValue to beat any card; made explicit with early return"

patterns-established:
  - "Playability guard pattern: check .size > 0 before applying highlight classes so no-highlight state is default"
  - "Index-based cross-component checks: use card indices for playability, not rank strings, when dealing with grouped views"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 21 Plan 01: Card Playability Highlights Summary

**Green glow / gray-dim playability indicators on hand and face-up cards using client-side canPlayOnPile, with mobile grouped view ring highlights via index-based isGroupPlayable helper**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T20:35:16Z
- **Completed:** 2026-02-18T20:38:28Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- Created `packages/client/src/game/cardRules.ts` with client-side copies of `canPlayOnPile`, `getEffectiveTopCard`, and `getRankValue` pure functions (verbatim copy from server, kept in sync comment added)
- Added `playableHandIndices` and `playableFaceUpIndices` computed Sets to `usePlayingPhase` — return empty Set when not my turn, use `forcedCardIndices` on first turn, call `canPlayOnPile` on normal turns
- Updated `PlayerCards.vue` to accept the two new props and render green border+shadow glow on playable cards, gray border+opacity-50 on unplayable cards, and green ring on mobile grouped playable groups
- Face-down cards unchanged (blind play by design, no playability hints)
- All 462 tests (122 client, 340 server) pass; type-check and lint both clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Create client-side card rules and add playability computed properties** - `b8c892e` (feat)
2. **Task 2: Add visual playability CSS to PlayerCards desktop and mobile views** - `05d0f74` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/client/src/game/cardRules.ts` - Client-side pure functions: `getRankValue`, `getEffectiveTopCard`, `canPlayOnPile`. Copy of server logic, avoids cross-package dependency.
- `packages/client/src/composables/usePlayingPhase.ts` - Added `import { canPlayOnPile }`, `playableHandIndices` computed, `playableFaceUpIndices` computed; both added to return object
- `packages/client/src/components/PlayingPhase.vue` - Added `playableHandIndices` and `playableFaceUpIndices` to destructuring and passed as `:playable-hand-indices` / `:playable-face-up-indices` props to `<PlayerCards>`
- `packages/client/src/components/PlayerCards.vue` - Added `playableHandIndices` and `playableFaceUpIndices` props; updated desktop hand card, face-up card, and mobile grouped view `:class` bindings; added `isGroupPlayable` helper

## Decisions Made

- **Client copy not server import:** `cardRules.ts` is a deliberate client-side copy of server pure functions. Importing from `packages/server` would add a cross-package dependency that pollutes the client bundle and violates the monorepo dependency direction.
- **Guard pattern (`playableHandIndices.size > 0`):** When size is 0 (not my turn, or first-turn before forced indices resolved), all hand cards show default `border-gray-300` — exactly the same as before the feature. This ensures zero visual change during opponent turns.
- **Joker explicit early return in `canPlayOnPile`:** The server version relies on jokers having `getRankValue` = 999 to naturally beat any card in normal ordering. The client copy made this explicit with an early `if (playedCard.kind === 'joker') return true` for clarity and correctness.
- **`isGroupPlayable` uses `group.indices` not rank strings:** The mobile grouped view uses `'JKR'` as rank key for jokers while `Card.kind` is `'joker'`. Using index-based checks entirely avoids this mismatch without needing extra normalization logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Joker always-playable explicit guard in canPlayOnPile**

- **Found during:** Task 1 (creating cardRules.ts)
- **Issue:** Server `canPlayOnPile` did not have an explicit `joker` guard — it relied on `getRankValue(joker) = 999` being >= any card's rank value. This works correctly when only standard cards are on the pile, but the logic path was implicit and the client copy could mislead future readers.
- **Fix:** Added explicit `if (playedCard.kind === 'joker') return true` after the special-ranks block, making joker always-playable explicit and self-documenting.
- **Files modified:** `packages/client/src/game/cardRules.ts`
- **Verification:** Type-check passes; logic equivalent to server behavior.
- **Committed in:** `b8c892e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — explicit guard for correctness and readability)
**Impact on plan:** Minimal scope addition; improves code clarity without behavioral change.

## Issues Encountered

None. Type-check, lint, and all tests passed on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 21 plan 01 complete: visual playability highlights working for desktop and mobile
- All existing tests unbroken (122 client, 340 server)
- If phase has more plans (e.g., face-down hints, tooltip enhancements): foundation in `cardRules.ts` and the computed Set pattern are ready to extend

---
*Phase: 21-card-playability-highlights*
*Completed: 2026-02-18*

## Self-Check: PASSED
