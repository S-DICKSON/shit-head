---
phase: 23-frontend-testing
plan: 04
subsystem: testing
tags: [vitest, vue3, composables, usePlayingPhase, useSwapPhase, vueuse, vi.mock]

# Dependency graph
requires:
  - phase: 23-01
    provides: vitest config with dangerouslyIgnoreUnhandledErrors, singleton mock pattern
provides:
  - 16 tests for usePlayingPhase (isMyTurn, activeSource, card selection, play/pickup messages)
  - 15 tests for useSwapPhase (card selection, swap triggers, phase-complete blocking, ready-up, timer, transition)
affects: [future composable test patterns when @vueuse/core is used]

# Tech tracking
tech-stack:
  added: []
  patterns: [singleton vi.mock factory pattern for composables, @vueuse/core mock must include all exports referenced transitively in Docker/Bun single-thread mode]

key-files:
  created:
    - packages/client/src/composables/__tests__/usePlayingPhase.test.ts
    - packages/client/src/composables/__tests__/useSwapPhase.test.ts
  modified: []

key-decisions:
  - "Mock @vueuse/core with useWebSocket stub when mocking useDebounceFn — Docker/Bun single-thread mode shares mocks across test files; missing export causes test suite failure"
  - "useDebounceFn mocked as identity function (fn) => fn — makes swap sends synchronous for test assertions"
  - "Singleton mock pattern: reassign s.send = vi.fn() in beforeEach before vi.clearAllMocks() — clearMocks:true resets spies on cached singleton"

patterns-established:
  - "When mocking @vueuse/core for useDebounceFn, always include useWebSocket stub — prevents cross-file mock leakage in Docker"
  - "useGameSocket singleton mock: set ref values directly on cached instance in beforeEach"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 23 Plan 04: Gameplay Composable Tests Summary

**31 tests for usePlayingPhase and useSwapPhase composables covering turn detection, multi-rank card selection, swap flow, and ready-up — all 122 client tests pass via make test-client**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T20:30:10Z
- **Completed:** 2026-02-18T20:35:03Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- 16 tests for usePlayingPhase: isMyTurn computed (4 cases), activeSource computed (3 cases), toggleHandCard multi-rank selection (4 cases), playSelectedCards send/clear (2 cases), pickupPile guard (2 cases), selectFaceDownCard (1 case)
- 15 tests for useSwapPhase: card selection with deselect-on-retap (4 cases), swap triggers hand-then-faceup and faceup-then-hand (2 cases), swapPhaseComplete blocking (3 cases), ready-up toggle and isReady computed (3 cases), timer display (1 case), transition state (2 cases)
- Fixed Docker/Bun test isolation bug: @vueuse/core mock must export useWebSocket stub or the full suite fails in single-thread mode

## Task Commits

Each task was committed atomically:

1. **Task 1: usePlayingPhase composable tests** - `187bda1` (test)
2. **Task 2: useSwapPhase composable tests** - `9ada404` (test)
3. **Fix: add useWebSocket to @vueuse/core mock** - `03037c3` (fix)
4. **Style: fix lint error in useSwapPhase tests** - `ae81ee4` (style)

## Files Created/Modified
- `packages/client/src/composables/__tests__/usePlayingPhase.test.ts` - 16 tests for turn management, card selection state machine, play/pickup message sending
- `packages/client/src/composables/__tests__/useSwapPhase.test.ts` - 15 tests for pre-game card swap, ready-up, phase-complete blocking, timer display

## Decisions Made
- **@vueuse/core mock must include useWebSocket:** Docker/Bun runs tests in a single thread without worker isolation. When useSwapPhase.test.ts mocks @vueuse/core (for useDebounceFn), the mock is shared globally. Other test files that load useGameSocket transitively expect useWebSocket to exist in the mock. Adding a stub prevents the "No useWebSocket export" error.
- **useDebounceFn mocked as identity:** `(fn) => fn` makes the debounced sendSwap call synchronous, enabling `expect(s.send).toHaveBeenCalledWith(...)` assertions without fake timers.
- **Singleton mock reassignment pattern:** Per phase 23-01/02 decisions, reassign `s.send = vi.fn()` in beforeEach before `vi.clearAllMocks()` to avoid clearMocks:true resetting the cached singleton's spies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added useWebSocket to @vueuse/core mock**
- **Found during:** Task 2 (useSwapPhase tests) — verification via make test-client (Docker)
- **Issue:** vi.mock('@vueuse/core') with only useDebounceFn caused `Error: [vitest] No "useWebSocket" export is defined on the "@vueuse/core" mock` in Docker single-thread mode. Tests passed natively (parallel workers have module isolation) but failed in Docker.
- **Fix:** Added `useWebSocket: vi.fn(() => ({ status, data, send, close, open }))` to the @vueuse/core mock factory
- **Files modified:** packages/client/src/composables/__tests__/useSwapPhase.test.ts
- **Verification:** `make test-client` passes 122/122 in Docker
- **Committed in:** `03037c3`

**2. [Rule 1 - Bug] Fixed lint error — Function type**
- **Found during:** Lint check after Task 2
- **Issue:** `useDebounceFn: (fn: Function) => fn` violated `@typescript-eslint/no-unsafe-function-type`
- **Fix:** Changed to `(fn: (...args: unknown[]) => unknown) => fn`
- **Files modified:** packages/client/src/composables/__tests__/useSwapPhase.test.ts
- **Verification:** `make lint` passes clean
- **Committed in:** `ae81ee4`

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness (Docker test pass) and code quality (lint). No scope creep.

## Issues Encountered
- Docker/Bun single-thread test isolation differs from native Vitest parallel workers. When mocking a shared package like @vueuse/core, the mock must include all exports transitively needed by any module in the test run — not just those directly used in the test file.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 23 plan 04 of 4 complete. All 4 plans in phase 23 are now done.
- 122 client tests passing via make test-client
- Composable test pattern fully established for both game phase composables

---
*Phase: 23-frontend-testing*
*Completed: 2026-02-18*

## Self-Check: PASSED
