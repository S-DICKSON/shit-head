---
phase: 16-networking-foundation
plan: 04
subsystem: testing
tags: [vitest, websocket, proxy, cloudflared, ci, github-actions]

# Dependency graph
requires:
  - phase: 16-01
    provides: "Discord proxy configuration in client and server"
  - phase: 16-02
    provides: "Connection resilience and reconnection logic"
provides:
  - "Mock proxy tests for URL resolution and origin validation"
  - "Experimental CI workflow for cloudflared tunnel testing"
  - "Extracted testable functions from monolithic socket code"
affects: [testing, ci-cd, discord-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure function extraction for testability (resolveWebSocketUrl, isOriginAllowed)"
    - "Mock tests for proxy logic without external dependencies"
    - "Experimental CI workflows with manual triggers"

key-files:
  created:
    - packages/server/src/utils/originValidation.ts
    - packages/server/src/__tests__/proxy-origins.test.ts
    - packages/client/src/composables/__tests__/useGameSocket.proxy.test.ts
    - .github/workflows/discord-tunnel.yml
  modified:
    - packages/server/src/index.ts
    - packages/client/src/composables/useGameSocket.ts

key-decisions:
  - "Extracted isOriginAllowed and resolveWebSocketUrl to separate testable functions"
  - "Mock tests over integration tests for fast CI feedback loop"
  - "Experimental tunnel CI workflow with manual trigger only"
  - "Fixed bare discordsays.com origin rejection bug during test development"

patterns-established:
  - "Extract pure functions from tightly-coupled code for testability"
  - "Use vitest describe blocks to group related test cases"
  - "Manual workflow_dispatch for experimental CI tests"

# Metrics
duration: 4min
completed: 2026-02-16
---

# Phase 16 Plan 04: Discord Proxy Testing Summary

**Mock proxy tests validate URL mapping and origin logic without external dependencies, plus experimental cloudflared tunnel CI workflow for end-to-end verification**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T21:08:20Z
- **Completed:** 2026-02-16T21:12:17Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created 16 mock proxy tests (8 server origin validation + 8 client URL resolution)
- Extracted testable functions from tightly-coupled socket code
- Fixed bare discordsays.com origin validation bug
- Created experimental cloudflared tunnel CI workflow with structured error capture
- All tests run fast in CI without external dependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mock proxy URL mapping and origin validation tests** - `70d1a26` (test)
2. **Task 2: Create experimental cloudflared tunnel CI workflow** - `14e5908` (feat)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified

**Created:**
- `packages/server/src/utils/originValidation.ts` - Extracted isOriginAllowed function for testability
- `packages/server/src/__tests__/proxy-origins.test.ts` - 8 tests for server origin validation (allowlist, discordsays.com wildcard, malformed origins)
- `packages/client/src/composables/__tests__/useGameSocket.proxy.test.ts` - 8 tests for client URL resolution (Discord mode, localhost, tunnel, explicit server URL)
- `.github/workflows/discord-tunnel.yml` - Experimental CI workflow for cloudflared tunnel testing (manual trigger only)

**Modified:**
- `packages/server/src/index.ts` - Import isOriginAllowed from utils, pass ALLOWED_ORIGINS array
- `packages/client/src/composables/useGameSocket.ts` - Extract resolveWebSocketUrl function for testability

## Decisions Made

**1. Extract pure functions for testability**
- Rationale: `isOriginAllowed` was inline in index.ts (which starts server on import), making it untestable. `resolveWebSocketUrl` was embedded in singleton socket creation. Extracting to pure functions enables unit testing without side effects.

**2. Mock tests over integration tests**
- Rationale: Integration tests with real cloudflared tunnels are slow and flaky. Mock tests validate logic fast (< 10ms) without external dependencies, providing immediate CI feedback.

**3. Experimental CI workflow with manual trigger**
- Rationale: Cloudflared tunnel tests may be flaky (per user decision: "try it, delete if flaky"). Manual `workflow_dispatch` trigger prevents blocking CI while allowing on-demand validation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed bare discordsays.com origin rejection**
- **Found during:** Task 1 (Server origin test development)
- **Issue:** `url.hostname.endsWith('.discordsays.com')` returns false for bare "discordsays.com" (no subdomain), causing incorrect rejection
- **Fix:** Added explicit check for `url.hostname === 'discordsays.com'` before wildcard check
- **Files modified:** packages/server/src/utils/originValidation.ts
- **Verification:** Test "accepts bare discordsays.com" passes
- **Committed in:** 70d1a26 (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix necessary for correct Discord Activity proxy support. No scope creep.

## Issues Encountered

None - plan executed smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plan:**
- Mock proxy tests provide fast CI validation of URL resolution and origin checking
- Experimental tunnel CI workflow available for manual end-to-end testing
- Extracted functions improve code testability and maintainability

**Notes:**
- Pre-existing App.test.ts failures (2 tests, vue-test-utils WeakMap incompatibility) remain unchanged
- New tests add 16 passing tests (8 server + 8 client)
- Total test count: 339 server tests, 43 client tests (2 pre-existing failures)

## Self-Check: PASSED

All created files exist on disk and commits are in git history.

---
*Phase: 16-networking-foundation*
*Completed: 2026-02-16*
