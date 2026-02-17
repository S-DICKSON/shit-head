---
phase: 18-discord-authentication
plan: 03
subsystem: auth
tags: [discord, vue, adapters, dependency-injection, vite, docker]

# Dependency graph
requires:
  - phase: 18-01
    provides: Discord token exchange server endpoint
  - phase: 18-02
    provides: DiscordAuthAdapter, DiscordConnectionAdapter, DiscordRoomAdapter implementations
provides:
  - Platform-conditional adapter wiring in main.ts (discord branch active, no throw)
  - Barrel export including all three Discord adapter classes
  - Vite production build confirmed working with @discord/embedded-app-sdk
affects: [19-discord-activity-ui, future-discord-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform-conditional Vue injection: detectPlatform() determines which adapter set is provided at startup"
    - "DiscordAuthAdapter receives VITE_DISCORD_CLIENT_ID at instantiation, not authenticate() call"

key-files:
  created: []
  modified:
    - packages/client/src/platform/index.ts
    - packages/client/src/main.ts

key-decisions:
  - "authenticate() not called at startup — triggered by component lifecycle in Phase 19"
  - "VITE_DISCORD_CLIENT_ID passed as constructor arg (undefined if unset, adapter fails at runtime as expected)"

patterns-established:
  - "Adapter instantiation pattern: new DiscordAuthAdapter(import.meta.env.VITE_DISCORD_CLIENT_ID)"
  - "Barrel export pattern: web adapters and discord adapters both exported from platform/index.ts"

# Metrics
duration: 7min
completed: 2026-02-17
---

# Phase 18 Plan 03: Platform Factory Wiring Summary

**Discord adapters wired into Vue injection system via platform-conditional branching in main.ts — throw removed, VITE_DISCORD_CLIENT_ID passed to DiscordAuthAdapter constructor, all three adapters provided when platform === 'discord'**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-17T23:05:20Z
- **Completed:** 2026-02-17T23:11:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced `throw new Error('Discord adapters not implemented yet (Phase 18)')` with actual adapter instantiation
- All three Discord adapters (Auth, Connection, Room) provided via Vue's injection system when `platform === 'discord'`
- Barrel export in `platform/index.ts` updated to include all three Discord adapter classes
- Web mode wiring completely unchanged (regression-safe)
- Vite production build verified: 143 modules including @discord/embedded-app-sdk

## Task Commits

Each task was committed atomically:

1. **Task 1: Update barrel export and wire Discord adapters into main.ts** - `fd3a316` (feat)
2. **Task 2: Full project verification** - No code changes (verification only; Docker rebuild was required to include SDK in container)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/client/src/platform/index.ts` - Added Discord adapter exports (DiscordAuthAdapter, DiscordConnectionAdapter, DiscordRoomAdapter)
- `packages/client/src/main.ts` - Replaced throw with adapter instantiation; added Discord adapter imports

## Decisions Made
- `authenticate()` is NOT called at startup — only adapters are instantiated and provided. The auth flow will be triggered by a component in Phase 19 (the lobby or app mount hook).
- `VITE_DISCORD_CLIENT_ID` passed as constructor argument to `DiscordAuthAdapter`. If the env var is not set, it will be `undefined` at runtime — the adapter fails when trying to create the SDK. This is expected and intentional (clear fail vs silent misconfiguration).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt Docker client container to include @discord/embedded-app-sdk**
- **Found during:** Task 2 (Full project verification — `make build` equivalent)
- **Issue:** The Docker client image was stale (built before `@discord/embedded-app-sdk` was installed in Phase 18-02). Vite build failed with "Rollup failed to resolve import @discord/embedded-app-sdk". The SDK was in local `packages/client/node_modules` but not in the Docker container.
- **Fix:** Ran `docker compose build client` to rebuild the image, which runs `bun install` and picks up the new dependency from `bun.lockb`.
- **Files modified:** No source files (Docker layer rebuild only)
- **Verification:** Vite build succeeded: 143 modules transformed, dist output generated
- **Committed in:** Not committed (Docker layer, not tracked by git)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary infrastructure fix; no scope creep. The SDK was installed in Phase 18-02 but the Docker image hadn't been rebuilt. Build now passes cleanly.

## Issues Encountered
- Docker image staleness: `@discord/embedded-app-sdk` was added to `packages/client/package.json` in Phase 18-02 but the Docker client container hadn't been rebuilt. Vite build failed until `docker compose build client` was run. This is a normal consequence of bun lockfile installs being cached in Docker layers.

## Next Phase Readiness
- Discord adapter wiring is complete. Phase 19 can now import `DiscordAuthAdapter` from `'./platform'` and call `authenticate()` in the appropriate component lifecycle hook.
- `VITE_DISCORD_CLIENT_ID` env var must be set before Discord mode will function (see 18-01-USER-SETUP.md).
- Web mode is completely unchanged and continues to work as before.
- All type-check, lint, test, and build pass. The 2 pre-existing App.test.ts failures (vue-test-utils WeakMap/Bun incompatibility) are unaffected.

---
*Phase: 18-discord-authentication*
*Completed: 2026-02-17*
