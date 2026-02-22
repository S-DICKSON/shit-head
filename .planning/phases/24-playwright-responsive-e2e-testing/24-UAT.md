---
status: diagnosed
phase: 24-playwright-responsive-e2e-testing
source: 24-01-SUMMARY.md, 24-02-SUMMARY.md, 24-03-SUMMARY.md
started: 2026-02-21T23:00:00Z
updated: 2026-02-22T00:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. E2E test suite runs successfully
expected: Running `make e2e` executes the Playwright test suite with ~124 passing and ~26 skipped across 6 viewports. No failures.
result: pass

### 2. Playwright UI mode opens
expected: Running `make e2e-ui` opens the interactive Playwright Test UI in a browser window where you can see all test files, run individual tests, and inspect results visually.
result: issue
reported: "pass but game-spec and swap phase don't run"
severity: major

### 3. Home screen tests validate landing page
expected: In the E2E output (or Playwright UI), the home.spec.ts file shows 6 passing tests across viewports: heading renders, form visible, WS connection indicator, button states, and viewport fit.
result: pass

### 4. Lobby screen tests validate room creation
expected: lobby.spec.ts shows 6 passing tests: room creation flow, player name in lobby, 6-char room code displayed, leave button, viewport fit, and host controls (waiting for players).
result: issue
reported: "pass but it just looks like its running just mobile"
severity: minor

### 5. Swap phase tests with WS mocking
expected: swap-phase.spec.ts shows tests passing on Chromium viewports (tablet, laptop, desktop, discord-iframe) and skipping on WebKit mobile. Tests verify swap UI renders, card counts, ready button, leave button, opponent section.
result: issue
reported: "fail it doesn't run"
severity: major

### 6. Game screen tests with WS mocking
expected: game.spec.ts shows tests passing on Chromium viewports and skipping on WebKit mobile. Tests verify gameplay UI: hand cards, face-up/face-down areas, draw pile count, discard pile badge, leave button.
result: issue
reported: "fail"
severity: major

### 7. CI workflow includes Playwright E2E step
expected: Checking `.github/workflows/ci.yml` shows a Playwright step that installs Chromium, runs E2E tests, and uploads the HTML report as an artifact.
result: pass

### 8. Playwright HTML report generates
expected: After running `make e2e`, running `make e2e-report` opens an HTML report in the browser showing all test results with pass/skip/fail details per viewport.
result: pass

## Summary

total: 8
passed: 4
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Playwright UI mode runs all test specs including game and swap phase"
  status: failed
  reason: "User reported: pass but game-spec and swap phase don't run. User clarified: they pass in the report just not the UI"
  severity: major
  test: 2
  root_cause: "mobile-375 and mobile-390 use WebKit device presets (iPhone SE/14). WS-mocked tests have test.skip(browserName !== 'chromium'). In Playwright UI, WebKit projects show prominently with skipped tests, making it look like specs don't run. The 4 Chromium projects do pass but are less visible in the UI."
  artifacts:
    - path: "packages/e2e/playwright.config.ts"
      issue: "mobile-375/mobile-390 use WebKit device presets, causing WS-mocked tests to skip"
    - path: "packages/e2e/tests/swap-phase.spec.ts"
      issue: "test.skip(browserName !== 'chromium') skips on WebKit mobile projects"
    - path: "packages/e2e/tests/game.spec.ts"
      issue: "test.skip(browserName !== 'chromium') skips on WebKit mobile projects"
  missing:
    - "Change mobile viewport projects to use Chromium instead of WebKit device presets, so all 6 projects run WS-mocked tests"
  debug_session: ""

- truth: "Lobby tests run across all 6 viewports visibly"
  status: failed
  reason: "User reported: pass but it just looks like its running just mobile"
  severity: minor
  test: 4
  root_cause: "Display artifact in Playwright UI. All 6 projects run but alphabetical ordering and WebKit mobile projects dominating the view create impression of mobile-only. All 36 lobby tests (6 tests x 6 viewports) do pass."
  artifacts:
    - path: "packages/e2e/playwright.config.ts"
      issue: "Project ordering in UI shows mobile projects prominently"
  missing:
    - "Same fix as gap 1 — switching mobile to Chromium will make all projects appear consistently"
  debug_session: ""

- truth: "Swap phase tests run and pass on Chromium viewports"
  status: failed
  reason: "User reported: fail it doesn't run. User clarified: they pass in the report just not the UI"
  severity: major
  test: 5
  root_cause: "Same root cause as gap 1 — WebKit mobile projects skip WS-mocked tests, making it appear as if nothing runs in the UI. Chromium projects do pass."
  artifacts:
    - path: "packages/e2e/tests/swap-phase.spec.ts"
      issue: "test.skip on WebKit causes visual confusion in UI mode"
  missing:
    - "Same fix as gap 1"
  debug_session: ""

- truth: "Game screen tests run and pass on Chromium viewports"
  status: failed
  reason: "User reported: fail. User clarified: they pass in the report just not the UI"
  severity: major
  test: 6
  root_cause: "Same root cause as gap 1 — WebKit mobile projects skip WS-mocked tests in UI mode. Chromium projects do pass."
  artifacts:
    - path: "packages/e2e/tests/game.spec.ts"
      issue: "test.skip on WebKit causes visual confusion in UI mode"
  missing:
    - "Same fix as gap 1"
  debug_session: ""
