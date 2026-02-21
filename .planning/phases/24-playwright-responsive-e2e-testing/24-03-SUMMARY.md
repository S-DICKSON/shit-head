---
phase: 24-playwright-responsive-e2e-testing
plan: 03
subsystem: testing
tags: [playwright, e2e, websocket, vue, typescript, ci-cd]

# Dependency graph
requires:
  - phase: 24-01
    provides: E2E infrastructure (playwright.config.ts, POM pages: SwapPhasePage, GamePage)
provides:
  - swap-phase.spec.ts: 6 E2E tests for swap phase UI with WS mocking
  - game.spec.ts: 7 E2E tests for active gameplay UI with WS mocking
  - CI pipeline with Playwright E2E step (chromium install + test run + artifact upload)
affects: [future-e2e, ci-cd-maintenance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "routeWebSocket mock pattern: room-created first, waitForURL lobby, then game-dealt"
    - "test.skip(browserName !== 'chromium') for WS-mocked tests"
    - "CSS class-based locators for card counting (button.bg-white.text-black.rounded)"

key-files:
  created:
    - packages/e2e/tests/swap-phase.spec.ts
    - packages/e2e/tests/game.spec.ts
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - "Send room-created immediately on create-room, then waitForURL(/#/room/) + 100ms before sending game-dealt to ensure Lobby.vue has mounted and registered its onMessage handler"
  - "WS-mocked tests use test.skip(browserName !== 'chromium') because routeWebSocket is Chromium-only — WebKit mobile projects skip gracefully"
  - "Card count assertion uses CSS class locators (button.bg-white.text-black.rounded) rather than section-filtered locators due to sibling-div structure in SwapPhase.vue"
  - "CI installs only chromium (not all browsers) to keep CI fast; WS-mocked tests only need Chromium"
  - "Playwright report artifact uses if: ${{ !cancelled() }} (not always()) to skip upload on workflow cancellation"

patterns-established:
  - "WS Mock Pattern: Store mockWs ref in routeWebSocket callback, return sendGameDealt() from setup function, call after waitForURL(lobby) in test body"
  - "game-dealt message uses flat fields matching gameDealtSchema (not nested under 'view' key)"

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 24 Plan 03: Swap Phase and Game Screen E2E Tests Summary

**WS-mocked E2E tests for swap phase and playing phase screens using game-dealt protocol, with Playwright added to CI pipeline**

## Performance

- **Duration:** ~3 minutes
- **Started:** 2026-02-21T22:14:39Z
- **Completed:** 2026-02-21T22:18:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 6 E2E tests for the swap phase screen (renders UI, card counts, ready button, leave button, no scroll, opponent section)
- 7 E2E tests for the active gameplay screen (renders UI, hand cards, face-up/face-down areas, draw pile count, discard pile, leave button, no scroll)
- All 52 Chromium tests pass (tablet, laptop, desktop, discord-iframe viewports)
- 26 WebKit mobile tests skip gracefully (mobile-375, mobile-390 projects)
- CI pipeline updated to install Chromium, run E2E tests, and upload HTML report artifact

## Task Commits

Each task was committed atomically:

1. **Task 1: Write swap phase and game screen E2E tests with WS mocking** - `f12c434` (feat)
2. **Task 2: Add Playwright E2E tests to CI workflow** - `db2bec2` (feat)

## Files Created/Modified

- `packages/e2e/tests/swap-phase.spec.ts` - 6 tests for swap phase screen, WS mock with game-dealt (swapping phase)
- `packages/e2e/tests/game.spec.ts` - 7 tests for active gameplay screen, WS mock with game-dealt (playing phase)
- `.github/workflows/ci.yml` - Added Playwright browser install, E2E test run, and report artifact upload steps

## Decisions Made

- **WS mock sequencing:** The `game-dealt` message is sent AFTER `waitForURL(/\/#\/room\//)` + 100ms pause to ensure Lobby.vue has mounted and its `onMessage` handler is registered. Sending them simultaneously would cause Lobby to miss the message and never navigate to `/game`.
- **Chromium-only skip:** `test.skip(browserName !== 'chromium')` is applied to all WS-mocked tests. The `routeWebSocket` API is Chromium-only in Playwright. Mobile projects use WebKit (`devices['iPhone SE']`, `devices['iPhone 14']`) and skip correctly.
- **CSS class locators for card counts:** SwapPhase.vue uses label divs followed by sibling card divs. The `filter({ hasText })` approach selects the label div, not the cards container. Used `button.bg-white.text-black.rounded` to count interactive card buttons instead.
- **CI: chromium only:** `bunx playwright install --with-deps chromium` installs only Chromium to keep CI fast. WS-mocked tests only require Chromium; home/lobby tests also use Chromium on non-mobile projects.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed card count locator strategy**
- **Found during:** Task 1 (shows correct card counts test)
- **Issue:** `div.filter({ hasText: 'Your Hand' }).last().locator('button')` returned 0 because SwapPhase.vue uses sibling divs (label div then cards div), so the label div has no button descendants
- **Fix:** Used `button.bg-white.text-black.rounded` CSS class selector to count the 6 interactive card buttons (3 hand + 3 face-up)
- **Files modified:** packages/e2e/tests/swap-phase.spec.ts
- **Verification:** Test passes — handCount assertion updated to `expect(playerCardButtons).toBe(6)`
- **Committed in:** f12c434 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed discard pile count assertion strict mode violation**
- **Found during:** Task 1 (shows discard pile card test)
- **Issue:** `page.getByText('1')` matched 2 elements in strict mode: the pile count badge AND the rank "10" card (which contains "1")
- **Fix:** Used `page.locator('span.bg-green-700.text-white').getByText('1', { exact: true })` to specifically target the discard pile badge
- **Files modified:** packages/e2e/tests/game.spec.ts
- **Verification:** Test passes — strict mode no longer violated
- **Committed in:** f12c434 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - Bug locator issues)
**Impact on plan:** Both fixes necessary for correct test assertions. No scope creep.

## Issues Encountered

None beyond the two locator bugs documented above.

## Next Phase Readiness

- Phase 24 plan 03 complete — this is the final plan in Phase 24
- Full E2E test suite: 4 spec files (home, lobby, swap-phase, game) x 6 viewports = 150 tests (124 passing, 26 skipped on WebKit mobile)
- CI now runs Playwright E2E on every PR
- Blocker from STATE.md resolved: "CI will need `bunx playwright install chromium` step" — now added

---
*Phase: 24-playwright-responsive-e2e-testing*
*Completed: 2026-02-21*

## Self-Check: PASSED
