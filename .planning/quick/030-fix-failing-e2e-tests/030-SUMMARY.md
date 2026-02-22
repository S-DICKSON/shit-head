---
phase: quick-030
plan: 01
subsystem: testing
tags: [playwright, e2e, websocket, routeWebSocket, mocking]

# Dependency graph
requires:
  - phase: quick-024
    provides: E2E test infrastructure with Playwright, POMs, 7 viewport projects
provides:
  - WS-mocked home.spec.ts (no real server dependency)
  - WS-mocked lobby.spec.ts (no real server dependency)
  - Consolidated game.spec.ts (9 tests, no redundancy)
  - Full E2E suite passing (203 tests, 0 failures)
affects: [future e2e test additions, CI pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [routeWebSocket mock pattern extended to home/lobby specs]

key-files:
  created: []
  modified:
    - packages/e2e/tests/home.spec.ts
    - packages/e2e/tests/lobby.spec.ts
    - packages/e2e/tests/game.spec.ts

key-decisions:
  - "setupHomeMock() only handles ping/pong — home tests never send create-room"
  - "setupLobbyMock() parses nickname from create-room message and echoes it back in room-created response (lobby displays player.nickname from server response, not local store)"
  - "game.spec.ts reduced from 11 to 9 tests: removed 'shows face-up and face-down card areas' (redundant with 'shows discard pile card') and 'action buttons visible within viewport' (redundant with 'Pick Up Pile button fully visible')"

patterns-established:
  - "routeWebSocket mock pattern: setupXMock(page) => routeWebSocket('**/game-ws**', ws => ...) for all E2E specs needing WS"
  - "Lobby mock must echo nickname from create-room payload back in room-created players array"

# Metrics
duration: 12min
completed: 2026-02-22
---

# Quick 030: Fix Failing E2E Tests Summary

**Converted home.spec.ts and lobby.spec.ts to use routeWebSocket mocking, fixing 63 previously-failing tests and reducing game.spec.ts from 11 to 9 non-redundant tests — full E2E suite now passes with 203/203 tests green**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-22T11:44:57Z
- **Completed:** 2026-02-22T11:57:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `setupHomeMock()` to home.spec.ts — 3 WS-dependent tests now self-contained (no real server)
- Added `setupLobbyMock()` to lobby.spec.ts — all 6 tests now self-contained with create-room -> room-created flow
- Eliminated 2 redundant tests from game.spec.ts (11 -> 9 tests per viewport)
- All 203 E2E tests pass across 7 viewport projects with 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WS mocking to home.spec.ts and lobby.spec.ts** - `ead287b` (test)
2. **Task 2: Consolidate redundant game.spec.ts tests** - `ab1dbb8` (test)

**Plan metadata:** (committed below)

## Files Created/Modified

- `packages/e2e/tests/home.spec.ts` - Added setupHomeMock() with ping/pong handler; applied to 3 WS-dependent tests
- `packages/e2e/tests/lobby.spec.ts` - Added setupLobbyMock() with ping/pong + create-room handler; applied to all 6 tests
- `packages/e2e/tests/game.spec.ts` - Removed 2 redundant tests; 11 -> 9 tests per viewport

## Decisions Made

- **Home mock is ping-only:** Home tests only test the connection state (button enable/disable) — they never create rooms, so the mock only needs ping/pong. Simpler is better.
- **Lobby mock echoes nickname from message:** The lobby UI renders `player.nickname` from `roomState.value.players` (server response), not from a local store. The mock was initially hardcoded to 'Player1', causing "lobby shows player name" tests to fail when tests used different nicknames (e.g., 'LobbyTester'). Fix: parse `msg.nickname` from the create-room message and echo it back in the room-created response.
- **game.spec.ts consolidation:** "shows face-up and face-down card areas" only checked `Discard` text visibility — identical to what "shows discard pile card" already covered (plus the badge count). "action buttons visible within viewport" only checked y-axis bounds for Pick Up Pile — "Pick Up Pile button fully visible" is strictly more thorough (checks all 4 edges).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lobby mock nickname hardcoded to 'Player1' broke player name test**

- **Found during:** Task 1 verification (first `make e2e` run)
- **Issue:** Mock responded with `nickname: 'Player1'` regardless of what nickname the test used. Tests using 'LobbyTester', 'CodeCheck', etc. failed because the displayed name came from the server response, not local Vue store state.
- **Fix:** Parse `msg.nickname` from the incoming create-room message and use it in the room-created response players array.
- **Files modified:** packages/e2e/tests/lobby.spec.ts
- **Verification:** All 7 viewport lobby specs passed after fix (42 tests, 0 failures)
- **Committed in:** ead287b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The deviation was a necessary fix to the mock implementation — the plan's note about hardcoding vs. echoing the nickname was ambiguous, and the correct behavior required reading from the message. No scope creep.

## Issues Encountered

- First `make e2e` run had 7 failures in "lobby shows player name" across all viewports — traced to hardcoded nickname in mock vs. dynamic nickname from test. Resolved by echoing the nickname from the create-room message.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full E2E suite (203 tests) passes with 0 failures across all 7 viewports
- E2E suite is now entirely self-contained (no real server needed) for all specs except screenshots.spec.ts
- Ready for any future E2E additions following the same routeWebSocket mock pattern

---
*Phase: quick-030*
*Completed: 2026-02-22*

## Self-Check: PASSED
