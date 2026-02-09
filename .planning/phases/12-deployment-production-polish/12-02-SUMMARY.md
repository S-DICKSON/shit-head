---
phase: 12-deployment-production-polish
plan: 02
subsystem: infra
tags: [cloudflare-pages, fly-io, vite, websocket, deployment]

# Dependency graph
requires:
  - phase: 12-01
    provides: Research and deployment strategy for split hosting (CF Pages + Fly.io)
provides:
  - Client WebSocket connection with VITE_SERVER_URL for split deployment
  - Vite build configuration for CF Pages
  - Backward compatibility for local dev and tunnel modes
affects: [12-03, 12-04, deployment, production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "VITE_SERVER_URL env var for split deployment WebSocket URLs"
    - "Three-tier WebSocket URL strategy: production (VITE_SERVER_URL), local (direct), tunnel (proxy)"

key-files:
  created: []
  modified:
    - packages/client/src/composables/useGameSocket.ts
    - packages/client/vite.config.ts

key-decisions:
  - "Replace VITE_WS_URL with VITE_SERVER_URL for consistency with research phase naming"
  - "Explicit build.outDir: 'dist' in vite.config.ts for CF Pages deployment target"
  - "Remove unused serverUrl variable from vite.config.ts, hardcode Docker proxy targets"

patterns-established:
  - "WebSocket URL selection: VITE_SERVER_URL (split deployment) → localhost direct → tunnel proxy"
  - "Vite env vars baked into build via import.meta.env static replacement"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 12 Plan 02: Client Split Deployment Configuration Summary

**Client WebSocket connection supports split deployment via VITE_SERVER_URL with backward compatibility for local dev and tunnel modes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T23:56:56Z
- **Completed:** 2026-02-08T23:59:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Updated client WebSocket URL construction to use VITE_SERVER_URL for production split deployment
- Maintained backward compatibility for local development (direct localhost:3000) and tunnel modes
- Added explicit Vite build configuration with outDir: 'dist' for CF Pages deployment
- Cleaned up unused serverUrl variable and standardized Docker proxy configuration

## Task Commits

Each task was committed atomically:

1. **Task 1: Update useGameSocket WebSocket URL for split deployment** - `5325e7a` (feat)
2. **Task 2: Update Vite config for production build output** - `7757282` (feat)

## Files Created/Modified
- `packages/client/src/composables/useGameSocket.ts` - WebSocket URL construction with VITE_SERVER_URL support
- `packages/client/vite.config.ts` - Build configuration for CF Pages and clean Docker proxy setup

## Decisions Made

**1. Replace VITE_WS_URL with VITE_SERVER_URL**
- Rationale: Consistency with research phase (12-01) naming convention
- Impact: Production deployments will set VITE_SERVER_URL instead of VITE_WS_URL

**2. Three-tier WebSocket URL strategy**
- VITE_SERVER_URL present: Use for split deployment (e.g., wss://shit-head-server.fly.dev)
- localhost: Direct connection to localhost:3000 (bypasses Vite proxy)
- tunnel/other: Proxy through current host with protocol detection
- Rationale: Explicit branching logic clearer than nested ternary, handles all deployment modes

**3. Remove unused serverUrl variable from vite.config.ts**
- Rationale: Proxy targets hardcoded to host.docker.internal:3000 for Docker compatibility
- Impact: Cleaner config, no misleading unused variables

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

**Ready for:**
- Phase 12-03: Fly.io server deployment setup
- Phase 12-04: Cloudflare Pages client deployment setup

**Prerequisites complete:**
- Client can connect to separate server origin via VITE_SERVER_URL
- Vite build outputs to dist/ for CF Pages
- Local development and tunnel modes continue to work without changes

**Notes:**
- VITE_SERVER_URL must be set at build time for CF Pages (build environment variable)
- Format: wss://your-server.fly.dev (no trailing slash, path /game-ws appended by client)

---
*Phase: 12-deployment-production-polish*
*Completed: 2026-02-08*

## Self-Check: PASSED

All files exist and all commits verified.
