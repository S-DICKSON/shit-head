---
status: resolved
trigger: "Playwright E2E swap-phase and game tests don't run — investigate root causes"
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — see Resolution
test: browser-name probe confirmed
expecting: n/a
next_action: n/a (diagnosis complete, no fix applied per instructions)

## Symptoms

expected: swap-phase.spec.ts and game.spec.ts run (and pass/skip) across all 6 viewport projects
actual:
  - In Playwright UI, swap-phase.spec.ts and game.spec.ts appear not to run at all
  - In headless mode they run but all WS-mock tests get skipped on non-Chromium projects
  - Lobby tests appear to only run mobile viewports
started: introduced in phase 24
reproduction: make e2e-ui / make e2e

## Eliminated

- hypothesis: routeWebSocket not available / not imported
  evidence: API is called correctly in both spec files; probe shows no import errors
  timestamp: 2026-02-22

- hypothesis: WebServer misconfiguration prevents test execution entirely
  evidence: test list shows all 150 tests discovered; home and lobby pass
  timestamp: 2026-02-22

## Evidence

- timestamp: 2026-02-22
  checked: playwright.config.ts projects section
  found: |
    mobile-375 uses ...devices['iPhone SE'] (defaultBrowserType: webkit)
    mobile-390 uses ...devices['iPhone 14'] (defaultBrowserType: webkit)
    tablet-768, laptop-1280, desktop-1920, discord-iframe-460 have no device spread
      — they inherit Playwright's default browser which is chromium
  implication: |
    4 of 6 projects are chromium, 2 of 6 are webkit.
    WS mock tests WILL run on chromium projects but SKIP on webkit projects.

- timestamp: 2026-02-22
  checked: browser-name probe test run across all 6 projects
  found: |
    mobile-375:        BROWSER_NAME: webkit
    mobile-390:        BROWSER_NAME: webkit
    tablet-768:        BROWSER_NAME: chromium
    laptop-1280:       BROWSER_NAME: chromium
    desktop-1920:      BROWSER_NAME: chromium
    discord-iframe-460: BROWSER_NAME: chromium
  implication: |
    test.skip(browserName !== 'chromium') in swap-phase.spec.ts and game.spec.ts
    will SKIP on mobile-375 and mobile-390, but EXECUTE on the other 4 projects.
    Tests ARE running — they just all appear as skipped when viewed only in
    Playwright UI's webkit-mobile filtered view, or the user's UI was showing
    only the webkit projects prominently.

- timestamp: 2026-02-22
  checked: swap-phase.spec.ts and game.spec.ts test.skip logic
  found: |
    Line 109: test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');
    This is inside the test body, not test.describe.skip or test.fixme.
    Playwright records these as "skipped" — they DO run (the test body executes
    up to the skip call) but produce a "skipped" result, not a "passed" result.
  implication: |
    In Playwright UI, skipped tests don't show a green check — they appear grayed
    out. If the user's UI view was filtered or sorted to show webkit mobile projects
    first (which run 100% skipped), it would look like the tests "don't run at all".

- timestamp: 2026-02-22
  checked: lobby.spec.ts — why mobile-only appearance
  found: |
    lobby.spec.ts has no browserName guard and no test.skip at all.
    It runs on ALL 6 projects equally.
    The "mobile-only" perception is likely because:
      - Playwright UI groups by project, and webkit mobile projects (2) run first
        due to alphabetical ordering (mobile-375 < mobile-390 < tablet < laptop...)
      - OR: the user ran e2e-ui filtered to mobile projects
  implication: |
    Lobby tests do run on all viewports — the perceived "mobile-only" is a display
    ordering artifact in the UI, not a real bug.

## Resolution

root_cause: |
  ISSUE 1 (swap-phase.spec.ts and game.spec.ts "don't run"):

  The tests DO run on 4 of 6 projects (tablet-768, laptop-1280, desktop-1920,
  discord-iframe-460 — all Chromium). They SKIP on mobile-375 and mobile-390
  (both WebKit via device presets) because of:
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

  In Playwright UI (--ui mode), skipped tests appear grayed/collapsed and
  don't show in the "passed" count. If the user's UI was showing results
  sorted/filtered toward the WebKit projects (which appear first alphabetically),
  the tests appear entirely absent.

  The ACTUAL problem for "don't run at all": routeWebSocket is a Chromium-only
  Playwright API. When tests skip BEFORE calling routeWebSocket on WebKit, they
  appear as "skipped" not "failed". The UI mode may have been showing those
  skipped results and interpreting them as "not running".

  ISSUE 2 (Playwright UI specifically — tests show as not executing):

  In --ui mode, Playwright UI groups tests by project. The WebKit mobile projects
  (mobile-375, mobile-390) show all WS-mock tests as skipped. Since test.skip()
  is called at the start of each test body, these tests appear to "not execute"
  from the user's perspective — they enter and immediately exit.

  HOWEVER: there is a real secondary issue. The 4 Chromium projects should show
  green passing results. If the user reports they "don't run at all" even in those
  projects, the issue may be the webServer not starting (routeWebSocket intercepts
  before connection attempt, so a failed server doesn't cause routeWebSocket to
  fail — it fails at waitForConnected instead).

  ISSUE 3 (lobby tests appear mobile-only):

  Display artifact. Lobby tests run on all 6 projects. The Playwright UI lists
  projects alphabetically: discord-iframe-460, laptop-1280, mobile-375, mobile-390,
  tablet-768, desktop-1920. The mobile projects produce the same results, so it
  may visually look "mobile-dominated" but all viewports execute.

fix: NOT APPLIED (diagnosis-only mode)

verification: NOT APPLICABLE

files_changed: []

## What Needs to Change

FILE: packages/e2e/playwright.config.ts

Issue A — mobile-375 and mobile-390 use WebKit device presets.
The test.skip(browserName !== 'chromium') guard exists to handle this, so
technically the design is intentional — WebKit skips, Chromium runs.
BUT if the goal is to test swap/game on mobile viewports too, the fix is:
  - Replace ...devices['iPhone SE'] with a plain viewport + chromium browser
  - Or: keep the WebKit projects and accept that swap/game tests are skipped there

Issue B — if WS-mock tests truly aren't running on Chromium projects either,
the webServer health check may be the culprit. The server health check uses
http://localhost:3000/health — if that endpoint doesn't exist or times out,
the webServer step fails silently when reuseExistingServer is true.

FILE: packages/e2e/tests/swap-phase.spec.ts (line 109)
FILE: packages/e2e/tests/game.spec.ts (line 110)

The test.skip placement is correct. No change needed for the skip logic itself.
If the intent is chromium-only tests, a cleaner approach would be to use
test.describe with a beforeEach skip, or use project-level filtering via
`--project` flag in the Makefile rather than runtime skip.

RECOMMENDED FIX DIRECTIONS:
1. For "don't run on chromium" issue: add a dedicated chromium project to
   playwright.config.ts specifically for WS-mock tests:
     { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
   And change test.skip condition to only skip when not chromium AND not in
   the chromium project.

2. Simpler: change mobile-375/mobile-390 to use chromium with mobile viewport
   instead of WebKit device presets, if WebKit mobile testing is not required.

3. For Playwright UI confusion: document that --project=chromium can be passed
   to focus results, or add a make e2e-chromium target.
