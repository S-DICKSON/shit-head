---
phase: 18-discord-authentication
plan: 04
subsystem: auth
tags: [discord, platform-adapter, dynamic-import, docker, bun, api]

# Dependency graph
requires:
  - phase: 18-discord-authentication
    provides: Discord adapter pattern, /api/token endpoint, platform detection
provides:
  - Dynamic import of Discord SDK adapters (web mode isolation)
  - Correct Dockerfile lockfile glob for bun.lock text format
  - Graceful /api/token 400 handling for malformed JSON
affects: [19-discord-room-management, production-builds, web-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic import for platform-specific code: Discord SDK only loaded in discord branch"
    - "Top-level await in main.ts for async platform setup before app.mount"
    - "Inner try/catch for SyntaxError isolation within outer error handler"

key-files:
  created: []
  modified:
    - packages/client/src/platform/index.ts
    - packages/client/src/main.ts
    - packages/client/Dockerfile
    - packages/server/Dockerfile
    - Dockerfile.tunnel
    - packages/server/src/index.ts

key-decisions:
  - "Top-level await used in main.ts (Vite supports it natively) — no IIFE wrapper needed"
  - "SyntaxError re-thrown for non-JSON parse errors to preserve outer catch behavior"
  - "bun.lock* glob is forward-compatible with both bun.lock (text) and bun.lockb (binary)"

patterns-established:
  - "Platform-specific adapters: never statically import Discord SDK in barrel — use dynamic import() in platform branch only"
  - "JSON parse errors: use inner try/catch scoped to SyntaxError, re-throw others"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 18 Plan 04: UAT Gap Closure Summary

**Dynamic import isolation for Discord SDK, correct Dockerfile lockfile glob, and graceful /api/token 400 handling close all 3 UAT blockers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-17T23:35:03Z
- **Completed:** 2026-02-17T23:38:40Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Web mode now loads without Discord SDK resolution errors (lazy load via dynamic import)
- Production Docker builds no longer silently omit lockfile (bun.lock* glob fix)
- /api/token returns 400 for empty/malformed bodies instead of 500 Internal Server Error
- All 5 UAT tests from 18-UAT.md can now pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Lazy-load Discord adapters via dynamic import** - `715d680` (feat)
2. **Task 2: Fix Dockerfile lockfile glob (bun.lockb -> bun.lock)** - `7589a6c` (fix)
3. **Task 3: Guard /api/token against malformed JSON body** - `0671f5b` (fix)

## Files Created/Modified
- `packages/client/src/platform/index.ts` - Removed 3 Discord adapter re-exports; added comment explaining dynamic import pattern
- `packages/client/src/main.ts` - Removed static Discord imports; uses top-level await + dynamic import() for discord platform branch
- `packages/client/Dockerfile` - Fixed bun.lockb* -> bun.lock* (1 COPY line + comment)
- `packages/server/Dockerfile` - Fixed bun.lockb* -> bun.lock* (3 COPY lines + comment)
- `Dockerfile.tunnel` - Fixed bun.lockb* -> bun.lock* (2 COPY lines)
- `packages/server/src/index.ts` - Added inner try/catch around req.json() to return 400 on SyntaxError

## Decisions Made
- Used top-level await in main.ts directly (Vite supports it natively) rather than wrapping in async IIFE — cleaner and idiomatic
- SyntaxError catch re-throws non-SyntaxError exceptions so the outer catch still handles unexpected server errors as 500
- bun.lock* glob kept intentionally forward-compatible (matches both text and binary format)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Client tests: 2 pre-existing failures in `App.test.ts` (vue-test-utils WeakMap incompatibility with Bun). These are unchanged from baseline and documented in MEMORY.md. Not regressions from this plan.

## Next Phase Readiness

Phase 18 (Discord Authentication) is now fully verified and complete. All 3 UAT gaps are closed:
- UAT-01: Web mode loads without SDK errors
- UAT-02: Docker builds with correct lockfile
- UAT-03: /api/token returns 400 for malformed JSON

Ready to proceed with Phase 19 (Discord Room Management).

---
*Phase: 18-discord-authentication*
*Completed: 2026-02-17*

## Self-Check: PASSED
