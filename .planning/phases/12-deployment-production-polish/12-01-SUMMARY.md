---
phase: 12-deployment-production-polish
plan: 01
subsystem: infra
tags: [websocket, production, health-check, graceful-shutdown, origin-validation, cleanup]

# Dependency graph
requires:
  - phase: 01-server-foundation
    provides: Server WebSocket handlers and room management
provides:
  - Production-ready server with Origin validation for WebSocket upgrades
  - Health check endpoint with room/player/connection metrics
  - Graceful shutdown on SIGTERM (55s timeout, code 1000)
  - Abandoned room cleanup (24 hour threshold, 5 min interval)
affects: [13-ci-cd-deployment, deployment, monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ALLOWED_ORIGINS env var for WebSocket origin validation"
    - "Connection tracking with Set<ServerWebSocket> for graceful shutdown"
    - "Activity-based room cleanup with lastActivityTimes Map"

key-files:
  created: []
  modified:
    - packages/server/src/index.ts
    - packages/server/src/rooms/RoomManager.ts

key-decisions:
  - "Removed static file serving - split deployment model (CF Pages client + Fly.io server)"
  - "Origin validation only in production mode - development allows localhost origins automatically"
  - "24 hour room abandonment threshold with 5 minute cleanup interval"
  - "55 second SIGTERM shutdown timeout to allow graceful connection closure"

patterns-established:
  - "Health endpoint returns activeRooms/activePlayers/activeConnections for monitoring"
  - "markActivity() called on createRoom, joinRoom, leaveRoom (non-destructive), startGame"
  - "lastActivityTimes cleanup on destroyRoom and leaveRoom (destructive)"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 12 Plan 01: Production Server Hardening Summary

**Server hardened for split deployment with Origin validation, health metrics, graceful shutdown, and room cleanup**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T23:56:23Z
- **Completed:** 2026-02-08T00:00:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed static file serving for split deployment (CF Pages serves client, Fly.io serves server)
- Added Origin header validation on WebSocket upgrades (prevents CSWSH attacks in production)
- Enhanced health check with activeRooms, activePlayers, activeConnections metrics
- Implemented graceful shutdown with SIGTERM handler (55s timeout, close code 1000)
- Added room activity tracking and automated cleanup for rooms abandoned 24+ hours

## Task Commits

Each task was committed atomically:

1. **Task 1: Update server index.ts for production deployment** - `8a3f8ab` (feat)
2. **Task 2: Add room activity tracking and cleanup to RoomManager** - `b1cc678` (feat)

## Files Created/Modified
- `packages/server/src/index.ts` - Production deployment features (Origin validation, health metrics, graceful shutdown, no static serving)
- `packages/server/src/rooms/RoomManager.ts` - Activity tracking with markActivity(), cleanupAbandonedRooms(), getRoomCount(), getPlayerCount()

## Decisions Made

**1. Split deployment model - no static file serving**
- Server no longer serves client static files (removed STATIC_DIR, serveStatic, MIME_TYPES)
- Rationale: Split deployment (CF Pages for client, Fly.io for server) means client is served independently
- Impact: Server returns 404 for non-health, non-WebSocket paths

**2. Origin validation only in production**
- `ALLOWED_ORIGINS` env var (comma-separated) validated in production mode
- Development automatically allows `http://localhost:5173` and `http://localhost:4173`
- Rationale: Different origins between client (CF Pages) and server (Fly.io) require CSWSH prevention
- Impact: Invalid origins rejected with 403, logged with console.warn

**3. 24 hour room abandonment threshold**
- Cleanup runs every 5 minutes, removes rooms inactive for 24+ hours
- Rationale: Prevents memory leaks from abandoned rooms, balances cleanup frequency with room lifecycle
- Impact: Long-abandoned rooms (no activity for 1 day) automatically cleaned

**4. 55 second graceful shutdown timeout**
- SIGTERM handler polls every 100ms, force exits after 55s
- Rationale: Fly.io gives 60s before SIGKILL, leaving 5s buffer
- Impact: Orderly connection closure on deploys, no abrupt disconnects

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Server is production-ready for split deployment:
- Origin validation prevents CSWSH when client and server on different domains
- Health metrics enable monitoring and alerting
- Graceful shutdown prevents user disruption during deploys
- Room cleanup prevents memory leaks

No blockers for Phase 13 CI/CD deployment.

## Self-Check: PASSED

All files and commits verified.

---
*Phase: 12-deployment-production-polish*
*Completed: 2026-02-08*
