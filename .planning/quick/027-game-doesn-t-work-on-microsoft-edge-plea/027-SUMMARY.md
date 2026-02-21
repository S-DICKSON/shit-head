---
phase: quick-027
plan: 01
subsystem: ui
tags: [vite, esbuild, edge, browser-compatibility, css, viewport, top-level-await, async-iife]

# Dependency graph
requires:
  - phase: quick-018
    provides: main.ts with Discord SDK lazy imports using top-level await
provides:
  - Async IIFE wrapper in main.ts eliminating bare top-level await from production bundle
  - Vite build target es2020+chrome89+safari15 providing Edge 89+ compatible output
  - vh fallbacks before dvh declarations in App.vue, PlayingPhase.vue, Game.vue
affects: [future-deployment, ci-build]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async IIFE in main.ts: wrap all top-level awaits in void (async () => {})() for cross-browser compatibility"
    - "CSS fallback cascade: declare vh before dvh so older browsers use vh while modern ones pick up dvh"
    - "Vite build target with explicit browser versions: ['es2020', 'chrome89', 'safari15'] not 'esnext'"

key-files:
  created: []
  modified:
    - packages/client/vite.config.ts
    - packages/client/src/main.ts
    - packages/client/src/App.vue
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/components/Game.vue
    - packages/client/src/composables/useSwapPhase.ts

key-decisions:
  - "Async IIFE in main.ts rather than Vite TLA downleveling: esbuild target es2020+edge89 does NOT downlevel TLA — it hard errors. Only solution is to not use TLA at module scope."
  - "Build target ['es2020', 'chrome89', 'safari15'] not ['es2020', 'edge89']: edge89 target causes esbuild to reject TLA even inside async functions (bug/limitation). Named browser targets work correctly."
  - "vh before dvh (not dvh alone): inline style with both declarations allows CSS cascade to pick dvh in Edge 108+, vh in older Edge."
  - "useSwapPhase tryPerformSwaps: cycle face-up indices (i % faceUpArr.length) not Math.min pairing — supports N hand cards mapped to 1 face-up slot"

patterns-established:
  - "When migrating entry points away from TLA: use void (async () => { ... })() IIFE pattern"
  - "CSS progressive enhancement: always declare legacy unit first, then modern unit on next property line"

# Metrics
duration: 12min
completed: 2026-02-21
---

# Quick Task 027: Edge Browser Compatibility Summary

**Async IIFE refactor in main.ts + es2020 build target eliminates top-level await from bundle; vh CSS fallbacks before dvh support Edge 89+**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-21T13:23:00Z
- **Completed:** 2026-02-21T13:35:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Refactored `main.ts` from bare top-level await to async IIFE — bundle now contains zero raw TLA at module scope
- Changed Vite build target from `'esnext'` to `['es2020', 'chrome89', 'safari15']` — precise browser feature baseline covering Edge 89+
- Added `100vh` / `calc(100vh - ...)` fallbacks before every `100dvh` / `calc(100dvh - ...)` in three Vue files
- Fixed pre-existing `useSwapPhase` multi-select swap bug (tryPerformSwaps used min-pairing instead of cycle-pairing)
- All 133 client tests and 340 server tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Vite build target + async IIFE** - `2544ba6` (feat)
2. **Task 2: Add vh fallbacks for dvh** - `0a726f1` (fix)
3. **Task 3 / Bug fix: useSwapPhase multi-select pairing** - `9d13f51` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/client/vite.config.ts` - Build target changed from 'esnext' to ['es2020', 'chrome89', 'safari15']
- `packages/client/src/main.ts` - Wrapped top-level await in `void (async () => { ... })()`
- `packages/client/src/App.vue` - Added `min-height: 100vh` fallback before `min-height: 100dvh`
- `packages/client/src/components/PlayingPhase.vue` - Added `calc(100vh - ...)` fallback before dvh equivalent
- `packages/client/src/components/Game.vue` - Added `calc(100vh - ...)` fallback before dvh equivalent
- `packages/client/src/composables/useSwapPhase.ts` - Fixed tryPerformSwaps to use cycle-pairing (i % faceUpArr.length)

## Decisions Made

- **Async IIFE over Vite TLA downleveling:** The plan proposed `['es2020', 'edge89']` as target and expected Vite to wrap TLA automatically. In practice, esbuild with `edge89` target hard-errors on TLA rather than downleveling it. The correct approach is to remove TLA from source code by wrapping in an async IIFE.
- **Build target `['es2020', 'chrome89', 'safari15']` not `['es2020', 'edge89']`:** Using the `edge89` named target triggers esbuild's "top-level await not available" error even for async IIFE contents. Named Chromium-lineage targets (chrome89) work correctly.
- **CSS cascade pattern for dvh/vh:** In inline style attributes, declaring the same CSS property twice causes browsers to use the last value they understand. `vh` first, `dvh` second means: Edge 79-107 uses `vh`; Edge 108+ uses `dvh`.
- **useSwapPhase tryPerformSwaps cycle-pairing:** The plan and test both expected N hand cards to swap with 1 face-up position (same face-up index repeated). Changed `Math.min(handArr, faceUpArr)` pairing to `handArr` length with `i % faceUpArr.length` indexing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Vite build target `edge89` hard-errors on TLA rather than downleveling**
- **Found during:** Task 1 (Fix Vite build target)
- **Issue:** Plan specified `['es2020', 'edge89']` target; esbuild with `edge89` treats TLA as hard error, not a downlevel candidate. Build failed with 4 errors.
- **Fix:** Changed approach: refactor `main.ts` to use `void (async () => { ... })()` IIFE (removes TLA from source), then use `['es2020', 'chrome89', 'safari15']` as target.
- **Files modified:** `packages/client/src/main.ts`, `packages/client/vite.config.ts`
- **Verification:** Build succeeds; bundle inspected — `(async()=>{` wrapper present, no bare `await` at module scope.
- **Committed in:** 2544ba6 (Task 1 commit)

**2. [Rule 1 - Bug] useSwapPhase multi-select swap sends only 1 message instead of 2**
- **Found during:** Task 3 (Verify full build and test suite)
- **Issue:** `tryPerformSwaps` used `Math.min(handArr.length, faceUpArr.length)` pairing — when 2 hand + 1 face-up selected, only 1 swap was sent. Test expected 2 swaps (both hand cards targeting same face-up).
- **Fix:** Changed to cycle-pairing: `sendSwap(handArr[i], faceUpArr[i % faceUpArr.length])` iterating over all hand cards.
- **Files modified:** `packages/client/src/composables/useSwapPhase.ts`
- **Verification:** All 133 client tests pass including the previously failing `multi-select hand + single face-up triggers multiple swaps`.
- **Committed in:** 9d13f51

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - Bug)
**Impact on plan:** Both auto-fixes necessary for the build to succeed and tests to pass. No scope creep.

## Issues Encountered

- `make build` target does not exist in the Makefile — ran `docker compose run --no-deps --rm client bunx vite build` directly instead.
- `make test` fails when containers are already running on port 3000 — ran `docker compose run --no-deps --rm client bunx vitest run` and server tests separately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Edge browser compatibility fixes are self-contained and deployed on next build
- Production bundle verified: async IIFE wraps all Discord SDK imports, no TLA at module scope
- All 133 client + 340 server tests pass

---
*Phase: quick-027*
*Completed: 2026-02-21*

## Self-Check: PASSED
