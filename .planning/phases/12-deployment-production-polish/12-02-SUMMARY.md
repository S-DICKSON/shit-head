---
phase: 12-deployment-production-polish
plan: 02
subsystem: infra
tags: [docker, bun, vite, arm64, oracle-cloud, unified-deployment]

# Dependency graph
requires:
  - phase: 01-project-setup-foundation
    provides: Multi-stage Dockerfiles with dev and production targets
  - phase: 12-01
    provides: Server static file serving capability and ALLOWED_ORIGINS validation
provides:
  - Unified Docker image with client build stage
  - Single container serving static files + WebSocket on port 3000
  - ARM64-compatible production build for Oracle Cloud Ampere A1
affects: [12-03-oracle-infisical-setup, deployment, infra]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Multi-stage Docker build with intermediate client-build stage", "COPY --from=stage for asset propagation"]

key-files:
  created: []
  modified: ["packages/server/Dockerfile"]

key-decisions:
  - "Production image changed from port 8080 to 3000 (unified)"
  - "Client assets copied from client-build stage at packages/client/dist path"
  - "Dev stage preserved unchanged for Docker Compose local workflow"

patterns-established:
  - "Three-stage Dockerfile pattern: base → dev + client-build → production"
  - "Client build stage runs bunx vite build with all dependencies"
  - "Production stage copies pre-built assets from client-build stage"

# Metrics
duration: 3min
completed: 2026-02-14
---

# Phase 12 Plan 02: Unified Production Docker Image Summary

**Multi-stage Dockerfile building client assets and serving unified static files + WebSocket from single Bun process on port 3000**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-14T18:51:25Z
- **Completed:** 2026-02-14T18:54:25Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Rewrote server Dockerfile with three-stage build (base, dev, client-build, production)
- Production stage now includes client assets copied from client-build intermediate stage
- Changed production port from 8080 to 3000 for unified server + client deployment
- Verified ARM64 build compatibility for Oracle Cloud Ampere A1 VPS
- Dev stage preserved for Docker Compose local development workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Update server Dockerfile for unified production build** - `ae15a72` (feat)

## Files Created/Modified
- `packages/server/Dockerfile` - Multi-stage build with client-build stage, unified production stage serving static files + WebSocket on port 3000

## Decisions Made
- **Production port changed from 8080 to 3000** - Unified deployment requires single port for both static files and WebSocket (server index.ts already supports serving client/dist when present)
- **Client assets path is packages/client/dist** - Matches server's resolution path from index.ts: `join(import.meta.dir, '../../client/dist')` which from `/app/packages/server/src/` resolves to `/app/packages/client/dist/`
- **Dev stage unchanged** - Preserves Docker Compose local development workflow without regression

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - ARM64 build completed successfully in under 30 seconds (cross-compilation was not needed on this development machine).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 12 Plan 03 (Oracle Cloud + Infisical setup). The unified Docker image can now be deployed to a single Oracle Cloud VPS with:
- Client static files served from /app/packages/client/dist
- WebSocket + API on same port (3000)
- ARM64 compatibility verified
- Production environment variables: NODE_ENV=production, PORT=3000

---
*Phase: 12-deployment-production-polish*
*Completed: 2026-02-14*

## Self-Check: PASSED

All files and commits verified.
