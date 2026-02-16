---
phase: 16-networking-foundation
plan: 01
subsystem: networking
tags: [vite, proxy, websocket, discord-activity, cors]

# Dependency graph
requires:
  - phase: 01-monorepo-foundation
    provides: Bun monorepo with client/server packages
provides:
  - Discord Activity proxy configuration for Vite dev server
  - Discord-aware WebSocket URL resolution in client
  - Discord proxy origin allowlist on WebSocket server
affects: [17-discord-integration, discord-activity]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discord Activity proxy path prefix pattern (/.proxy)"
    - "Hostname-based WebSocket URL resolution strategy"
    - "Wildcard origin validation with pattern matching"

key-files:
  created: []
  modified:
    - packages/client/vite.config.ts
    - packages/client/src/composables/useGameSocket.ts
    - packages/server/src/index.ts

key-decisions:
  - "Discord proxy uses /.proxy path prefix for both API and WebSocket routes"
  - "WebSocket URL resolution checks Discord hostname before localhost check (correct priority order)"
  - "Server validates *.discordsays.com origins via URL parsing with try/catch safety"

patterns-established:
  - "Vite proxy rewrite functions strip Discord prefix before forwarding to backend"
  - "Client hostname detection pattern for multi-environment WebSocket URL resolution"

# Metrics
duration: 3 min
completed: 2026-02-16
---

# Phase 16 Plan 01: Discord Proxy Configuration Summary

**Vite dev server configured to proxy Discord Activity requests through /.proxy path prefix with client and server updates to support discordsays.com origins**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T20:59:33Z
- **Completed:** 2026-02-16T21:02:03Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Vite dev server proxies Discord's `/.proxy/api` and `/.proxy/ws` paths to backend with prefix stripping
- Client WebSocket URL resolution detects `*.discordsays.com` hostname and routes through `/.proxy/ws`
- Server WebSocket upgrade handler accepts connections from any `*.discordsays.com` origin via pattern matching
- Existing standalone web mode (localhost, tunnel, split deployment) continues to work unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Discord proxy path rules to Vite config** - `8f6eda9` (feat)
2. **Task 2: Update client WebSocket URL resolution for Discord mode** - `985b02e` (feat)
3. **Task 3: Allow discordsays.com origins on WebSocket server** - `96c62c4` (feat)

## Files Created/Modified
- `packages/client/vite.config.ts` - Added two new proxy entries: `/.proxy/api` (strips prefix) and `/.proxy/ws` (maps to `/game-ws`)
- `packages/client/src/composables/useGameSocket.ts` - Added Discord hostname detection in WebSocket URL resolution (before localhost check)
- `packages/server/src/index.ts` - Added `isOriginAllowed` helper with `*.discordsays.com` pattern matching, updated origin validation

## Decisions Made
- **Discord proxy path prefix:** Used `/.proxy` prefix to namespace Discord Activity requests, preventing collision with direct API paths
- **URL resolution priority:** Discord check runs before localhost check because Discord dev uses `*.discordsays.com` hostname (not localhost)
- **Origin validation approach:** URL parsing with try/catch handles invalid origin strings gracefully, wildcard pattern allows any `*.discordsays.com` subdomain

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed as specified.

## Next Phase Readiness

Discord proxy foundation is complete. Ready for:
- Phase 17 (Discord SDK integration) - proxy configuration enables Discord Activity context
- Discord dev tunnel testing - client will correctly route through `/.proxy/ws` when served from `*.discordsays.com`

No blockers or concerns.

## Self-Check: PASSED

---
*Phase: 16-networking-foundation*
*Completed: 2026-02-16*
