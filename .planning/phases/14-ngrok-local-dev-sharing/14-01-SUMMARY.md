---
phase: 14-ngrok-local-dev-sharing
plan: 01
subsystem: infra
tags: [vite, websocket, ngrok, docker, makefile]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Vite dev server with /api proxy to server
  - phase: 02-game-lobby-room-creation
    provides: WebSocket connection via useGameSocket composable
provides:
  - Vite WebSocket proxy for /game-ws path
  - Makefile tunnel target for ngrok on port 5173
  - Single tunnel serves both client and proxied WebSocket connections
affects: [local-dev, mobile-testing, qa]

# Tech tracking
tech-stack:
  added: [ngrok]
  patterns: [vite-websocket-proxy, window-location-fallback-url]

key-files:
  created: []
  modified:
    - packages/client/vite.config.ts
    - docker-compose.yml
    - Makefile

key-decisions:
  - "Vite proxy handles WebSocket upgrade with ws: true config"
  - "Remove VITE_WS_URL to rely on window.location-based WebSocket URL derivation"
  - "Single ngrok tunnel on port 5173 serves both client and proxied WebSocket"

patterns-established:
  - "WebSocket proxy pattern: Vite forwards /game-ws to server with ws: true"
  - "Environment-agnostic WebSocket URLs: window.location.host + /game-ws works for localhost and ngrok"

# Metrics
duration: 1.5min
completed: 2026-02-08
---

# Phase 14 Plan 01: Ngrok Local Dev Sharing Summary

**Vite WebSocket proxy at /game-ws enables single ngrok tunnel for mobile testing with both client and WebSocket connections**

## Performance

- **Duration:** 1.5 minutes
- **Started:** 2026-02-08T22:41:28Z
- **Completed:** 2026-02-08T22:43:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Vite proxy forwards /game-ws WebSocket requests to server on port 3000
- Removed VITE_WS_URL from docker-compose.yml to enable window.location fallback
- Added Makefile tunnel target for ngrok on port 5173 with clear instructions
- Single public URL now serves both client HTTP and WebSocket connections

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WebSocket proxy and remove VITE_WS_URL** - `e188274` (feat)
2. **Task 2: Add Makefile tunnel target** - `7b9f251` (feat)

**Plan metadata:** (to be committed after SUMMARY.md creation)

## Files Created/Modified
- `packages/client/vite.config.ts` - Added /game-ws proxy with ws: true for WebSocket upgrade
- `docker-compose.yml` - Removed VITE_WS_URL environment variable from client service
- `Makefile` - Added tunnel target to start ngrok on port 5173

## Decisions Made

**Vite WebSocket proxy configuration:**
- Used `serverUrl.replace('http', 'ws')` to convert HTTP URL to WebSocket target
- Set `ws: true` to enable WebSocket upgrade handling in http-proxy
- Path `/game-ws` matches existing client expectation from useGameSocket.ts

**window.location fallback pattern:**
- By removing VITE_WS_URL, client falls back to deriving WebSocket URL from `window.location.host`
- This works for both localhost:5173 (dev) and ngrok URLs (tunnel)
- Vite proxy transparently forwards WebSocket connections to server

**Makefile tunnel target:**
- Runs ngrok on host machine (not in Docker) since port 5173 is already mapped
- Clear instructions remind user to run `make dev` first in another terminal
- HTTPS tunnel URL works with secure WebSocket (wss://) upgrade

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

Users must have ngrok installed locally:
- macOS: `brew install ngrok`
- Other platforms: Download from ngrok.com

No ngrok authentication required for basic HTTP tunnels.

## Next Phase Readiness

- Local dev environment can now be shared via public URL for mobile testing
- Single tunnel URL serves both client and WebSocket (no CORS issues, no multiple tunnels)
- HMR will not work over ngrok (uses separate `/__hmr` path), but game functionality works perfectly
- Ready for QA and user testing on mobile devices

---
*Phase: 14-ngrok-local-dev-sharing*
*Completed: 2026-02-08*

## Self-Check: PASSED

All modified files verified:
- packages/client/vite.config.ts
- docker-compose.yml
- Makefile

All commits verified:
- e188274 (Task 1)
- 7b9f251 (Task 2)
