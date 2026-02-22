---
phase: 24-playwright-responsive-e2e-testing
plan: 04
subsystem: testing
tags: [playwright, e2e, chromium, mobile, viewport, websocket]

# Dependency graph
requires:
  - phase: 24-playwright-responsive-e2e-testing
    provides: WS-mocked swap-phase and game tests with Chromium-only skip guards
provides:
  - All-Chromium Playwright config with mobile viewport simulation
  - WS-mocked tests running uniformly on all 6 viewport projects (0 skipped)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mobile viewport simulation via Chromium: explicit viewport + hasTouch + isMobile instead of device presets"

key-files:
  created: []
  modified:
    - packages/e2e/playwright.config.ts
    - packages/e2e/tests/swap-phase.spec.ts
    - packages/e2e/tests/game.spec.ts

key-decisions:
  - "Switch mobile-375 and mobile-390 from iPhone SE/14 WebKit device presets to Chromium with explicit viewport + hasTouch + isMobile"
  - "Remove unused devices import from @playwright/test after mobile project migration"
  - "Remove all test.skip(browserName !== chromium) guards since all projects now use Chromium"

patterns-established:
  - "Mobile Chromium viewport pattern: { viewport: { width, height }, hasTouch: true, isMobile: true } — no device preset needed"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 24 Plan 04: Gap Closure — All-Chromium Mobile Viewport Config Summary

**Switched mobile Playwright projects from WebKit device presets to Chromium with custom mobile viewports, eliminating all WS-mocked test skips across 150 tests and 6 viewport projects**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T00:43:50Z
- **Completed:** 2026-02-22T00:45:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Mobile-375 and mobile-390 projects now use Chromium with viewport 375x667 and 390x844 respectively (touch + mobile flags preserved)
- Removed `devices` import from `@playwright/test` — no longer needed
- Removed all 13 `test.skip(browserName !== 'chromium')` guards (6 in swap-phase.spec.ts, 7 in game.spec.ts)
- 150/150 tests pass on all 6 viewport projects, 0 skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Switch mobile projects to Chromium with mobile viewports** - `3ef3464` (chore)
2. **Task 2: Remove Chromium-only skip guards from WS-mocked tests** - `130990a` (test)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `packages/e2e/playwright.config.ts` - Replaced device presets with explicit Chromium viewport config; removed devices import
- `packages/e2e/tests/swap-phase.spec.ts` - Removed 6 skip guards and browserName params
- `packages/e2e/tests/game.spec.ts` - Removed 7 skip guards and browserName params

## Decisions Made

- Chromium handles mobile viewport simulation correctly via `{ viewport, hasTouch: true, isMobile: true }` — no device preset required
- Removing `devices` import avoids lint warnings about unused imports
- All projects now identical in browser engine (Chromium), differentiated only by viewport dimensions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 Playwright viewport projects run all 150 tests uniformly via Chromium
- CI pipeline already installs only Chromium — no changes needed there
- Playwright UI mode shows all specs running across all projects with no skips
- Phase 24 gap closure complete

---
*Phase: 24-playwright-responsive-e2e-testing*
*Completed: 2026-02-22*

## Self-Check: PASSED
