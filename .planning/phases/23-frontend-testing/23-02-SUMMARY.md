---
phase: 23-frontend-testing
plan: 02
subsystem: testing
tags: [vitest, vue-test-utils, vue3, components, websocket-mock, singleton-mock]

# Dependency graph
requires:
  - phase: 23-frontend-testing-01
    provides: useGameSocket proxy resolution tests (pattern for mocking singleton composable)
provides:
  - ConnectionStatus component tests covering connected/reconnecting/failed states and retry button
  - NotificationToast component tests covering rendering, click-dismiss, and severity styling
affects: [23-frontend-testing-03, 23-frontend-testing-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton mock pattern: vi.mock with _cache, reassign vi.fn() in beforeEach instead of vi.clearAllMocks()"
    - "ConnectionStatus test: find('.fixed').exists() to check overlay presence under Vue Transition"
    - "NotificationToast test: find('[class*=rounded-lg]') to locate notification elements by partial class"

key-files:
  created:
    - packages/client/src/components/__tests__/ConnectionStatus.test.ts
    - packages/client/src/components/__tests__/NotificationToast.test.ts
  modified: []

key-decisions:
  - "Reassign vi.fn() in beforeEach (not vi.clearAllMocks()) — vitest.config clearMocks:true resets spy state on cached objects"
  - "Use wrapper.find('.fixed') to detect overlay presence — Vue Transition renders no DOM when v-if is false"
  - "Use find('[class*=rounded-lg]') for notifications — partial class match works with Tailwind multi-class bindings"

patterns-established:
  - "Singleton composable test pattern: _cache guard + reassign spies in beforeEach"
  - "Overlay component test: check .fixed element existence, not text absence"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 23 Plan 02: ConnectionStatus and NotificationToast Component Tests Summary

**Vitest tests for two global overlay components: ConnectionStatus (6 tests, all connection states + retry) and NotificationToast (5 tests, render/dismiss/severity)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T20:09:22Z
- **Completed:** 2026-02-18T20:12:02Z
- **Tasks:** 2 (+ 1 auto-fix)
- **Files modified:** 2

## Accomplishments
- 6 ConnectionStatus tests: connected/reconnecting/failed overlay rendering, error message display, retry button presence and click interaction
- 5 NotificationToast tests: empty state, single/multiple message rendering, click-to-dismiss with correct id, severity CSS classes (bg-red-600, bg-green-600)
- Fixed Bun `clearMocks` compatibility issue with singleton mock caching — applied fresh vi.fn() reassignment pattern in beforeEach

## Task Commits

Each task was committed atomically:

1. **Task 1: ConnectionStatus component tests** - `b513745` (test)
2. **Task 2: NotificationToast component tests** - `a41c356` (test)
3. **Bug fix: vi.fn() spy reassignment pattern** - `cac385e` (fix)

**Plan metadata:** *(pending)*

## Files Created/Modified
- `packages/client/src/components/__tests__/ConnectionStatus.test.ts` - 6 tests: overlay states, retry button, click handler
- `packages/client/src/components/__tests__/NotificationToast.test.ts` - 5 tests: render, multiple, dismiss, severity classes

## Decisions Made
- Reassigned `vi.fn()` in `beforeEach` rather than using `vi.clearAllMocks()` — the `clearMocks: true` config in vitest.config.ts resets spy tracking on the original mock objects, but the singleton `_cache` retains the stale references. Reassigning fresh spies each test ensures `toHaveBeenCalledWith()` assertions work correctly.
- Used `wrapper.find('.fixed').exists()` to detect overlay presence — Vue's `<Transition>` renders no child DOM when `v-if` is false, so checking for specific element classes is more reliable than text absence.
- Used `wrapper.find('[class*="rounded-lg"]')` for notification elements — partial class selector works with Tailwind's multi-class attribute bindings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Singleton mock spy tracking breaks with clearMocks config**
- **Found during:** Verification (make test-client Docker run)
- **Issue:** `vi.clearAllMocks()` in beforeEach resets spy state, but vitest.config.ts has `clearMocks: true` which conflicts with the singleton `_cache` pattern — the cached object's spy functions lose their spy identity after the first test, causing "is not a spy or a call to a spy" errors
- **Fix:** Replaced `vi.clearAllMocks()` with explicit spy reassignment: `s.retryConnection = vi.fn()` / `s.dismissNotification = vi.fn()` in beforeEach
- **Files modified:** ConnectionStatus.test.ts, NotificationToast.test.ts
- **Verification:** All 11 new tests pass in Docker (make test-client: 69/69 passed)
- **Committed in:** `cac385e`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary fix for Bun/Docker environment compatibility. No scope creep.

## Issues Encountered
- Unhandled WebSocket ErrorEvent errors appear in `make test-client` output — pre-existing Bun WebSocket issue (documented in MEMORY.md), unrelated to these tests. All 69 tests pass; exit code 2 is caused by the unhandled error, not test failures.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ConnectionStatus and NotificationToast test coverage complete
- Singleton mock pattern established for other components that import useGameSocket
- Ready for Phase 23 Plans 03-04 (LobbyView, GameView component tests)

---
*Phase: 23-frontend-testing*
*Completed: 2026-02-18*

## Self-Check: PASSED
