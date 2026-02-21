---
phase: 24-playwright-responsive-e2e-testing
plan: 01
subsystem: testing
tags: [playwright, e2e, page-objects, vitest, responsive, mobile, viewport]

# Dependency graph
requires:
  - phase: 23-frontend-testing
    provides: vitest test infrastructure and @testing-library/vue patterns
provides:
  - packages/e2e workspace package with @playwright/test installed
  - 6-viewport Playwright project config (mobile-375, mobile-390, tablet-768, laptop-1280, desktop-1920, discord-iframe-460)
  - webServer array config starting Bun server + Vite client
  - 4 Page Object Model classes for Landing, Lobby, SwapPhase, GamePage screens
  - data-testid="room-code" attribute on RoomCode.vue for reliable E2E selection
  - Makefile e2e/e2e-ui/e2e-report targets
affects:
  - 24-02 (smoke tests will import these POMs)
  - 24-03 (responsive layout tests will use these POMs)

# Tech tracking
tech-stack:
  added:
    - "@playwright/test ^1.58.2"
    - "@types/node ^25.3.0 (for process.env in playwright.config.ts)"
  patterns:
    - Page Object Model pattern with readonly Locator fields
    - Role-based locators (getByRole, getByLabel, getByText, getByPlaceholder)
    - webServer array in playwright.config.ts for full-stack startup
    - data-testid attributes for stable E2E selectors on shared components

key-files:
  created:
    - packages/e2e/package.json
    - packages/e2e/playwright.config.ts
    - packages/e2e/tsconfig.json
    - packages/e2e/.gitignore
    - packages/e2e/tests/.gitkeep
    - packages/e2e/tests/pages/LandingPage.ts
    - packages/e2e/tests/pages/LobbyPage.ts
    - packages/e2e/tests/pages/SwapPhasePage.ts
    - packages/e2e/tests/pages/GamePage.ts
  modified:
    - packages/client/src/components/RoomCode.vue (data-testid added)
    - Makefile (e2e, e2e-ui, e2e-report targets added)
    - bun.lock (updated with new dependencies)

key-decisions:
  - "Used bunx vite for client webServer command (matches monorepo dev pattern)"
  - "Added @types/node to fix process.env TypeScript errors in playwright.config.ts"
  - "LandingPage.waitForConnected() fills temp nickname to trigger canCreate enablement check"
  - "GamePage uses getByText('YOUR TURN') matching TurnBanner.vue's actual text content"
  - "LobbyPage.roomCodeDisplay uses data-testid locator for reliability over fragile text regex"

patterns-established:
  - "POM Pattern: readonly Locator fields in constructor, action methods for interactions"
  - "Locator Strategy: prefer getByRole > getByLabel > getByPlaceholder > getByText > data-testid"
  - "E2E package: standalone bun workspace under packages/e2e, not merged with client tests"

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 24 Plan 01: Playwright E2E Infrastructure Summary

**Playwright workspace with 6-viewport config, 4 Page Object Models, and data-testid anchor on RoomCode.vue ready for test spec authoring**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-21T22:05:43Z
- **Completed:** 2026-02-21T22:08:06Z
- **Tasks:** 2
- **Files modified:** 11 (9 created, 2 modified)

## Accomplishments
- Created `packages/e2e` as a standalone Bun workspace with `@playwright/test` and Chromium installed
- Configured 6 viewport Playwright projects mirroring real device sizes used in the app
- Created 4 POM classes (LandingPage, LobbyPage, SwapPhasePage, GamePage) with role-based locators matching actual Vue component markup
- Added `data-testid="room-code"` to RoomCode.vue for reliable E2E selection without fragile CSS/text selectors

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold packages/e2e with Playwright config** - `4035667` (chore)
2. **Task 2: Add data-testid to RoomCode.vue and create Page Object Models** - `17cf10c` (feat)

## Files Created/Modified
- `packages/e2e/package.json` - E2E package with @playwright/test and @types/node
- `packages/e2e/playwright.config.ts` - 6 viewport projects + webServer array
- `packages/e2e/tsconfig.json` - TypeScript config for test files
- `packages/e2e/.gitignore` - Ignores playwright-report, test-results, blob-report
- `packages/e2e/tests/.gitkeep` - Tracks empty tests directory in git
- `packages/e2e/tests/pages/LandingPage.ts` - POM for home/landing screen
- `packages/e2e/tests/pages/LobbyPage.ts` - POM for lobby screen with data-testid room-code
- `packages/e2e/tests/pages/SwapPhasePage.ts` - POM for swap phase screen
- `packages/e2e/tests/pages/GamePage.ts` - POM for active gameplay screen
- `packages/client/src/components/RoomCode.vue` - Added data-testid="room-code"
- `Makefile` - Added e2e, e2e-ui, e2e-report targets

## Decisions Made
- Used `bunx vite` for client webServer command to match the monorepo's dev workflow
- Added `@types/node` to resolve TypeScript `process` not found errors in playwright.config.ts
- `LandingPage.waitForConnected()` fills a temporary nickname then clears it — necessary because `canCreate` requires both nickname length > 0 AND WebSocket connected; uses `expect().toBeEnabled()` exclusively per plan
- `GamePage.turnBanner` uses `getByText('YOUR TURN')` matching exact TurnBanner.vue text (uppercase)
- `LobbyPage.roomCodeDisplay` uses `page.locator('[data-testid="room-code"]')` — reliable anchor

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @types/node for process.env TypeScript support**
- **Found during:** Task 2 (TypeScript verification after creating POMs)
- **Issue:** `bunx tsc --noEmit` failed with "Cannot find name 'process'" in playwright.config.ts — the tsconfig had no node types
- **Fix:** Ran `bun add -d @types/node` in packages/e2e; updated package.json
- **Files modified:** packages/e2e/package.json, bun.lock
- **Verification:** `bunx tsc --noEmit` passes with no errors
- **Committed in:** `17cf10c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for TypeScript compliance. No scope creep.

## Issues Encountered
- `bunx playwright test --list` returns exit code 1 with "No tests found" message — this is expected behavior when no test files exist; config loaded correctly

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- E2E infrastructure complete and verified: `bunx tsc --noEmit` passes, Playwright config loads, 6 viewport projects defined
- Plan 02 (smoke tests) and Plan 03 (responsive layout tests) can now import POM classes and write test specs
- Chromium binaries installed locally; CI will need `bunx playwright install chromium` step

---
*Phase: 24-playwright-responsive-e2e-testing*
*Completed: 2026-02-21*

## Self-Check: PASSED
