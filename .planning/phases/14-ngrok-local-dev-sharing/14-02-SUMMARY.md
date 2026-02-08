---
phase: 14-ngrok-local-dev-sharing
plan: 02
subsystem: infra
tags: [vite, websocket, proxy, docker, ngrok]

# Dependency graph
requires:
  - phase: 14-ngrok-local-dev-sharing
    provides: Vite WebSocket proxy config and Makefile tunnel target
provides:
  - Working WebSocket connections through Vite proxy on localhost
  - allowedHosts bypass for ngrok tunnel hostnames
  - host.docker.internal proxy target for Docker WebSocket compatibility
affects: [local-dev, mobile-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [host-docker-internal-proxy-target, vite-allowed-hosts]

key-files:
  created: []
  modified:
    - packages/client/vite.config.ts

key-decisions:
  - "Use host.docker.internal instead of Docker service name for WebSocket proxy target — Docker internal DNS fails WebSocket upgrade through Vite's http-proxy"
  - "allowedHosts: true bypasses Vite hostname validation for ngrok tunnels"
  - "changeOrigin: true rewrites Host header for WebSocket handshake compatibility"

patterns-established:
  - "WebSocket proxy in Docker: use host.docker.internal to route through host port mapping instead of Docker DNS"

# Metrics
duration: 45min
completed: 2026-02-08
---

# Phase 14 Plan 02: Fix WebSocket Proxy and Ngrok Hostname Blocking Summary

**WebSocket proxy fixed via host.docker.internal target with allowedHosts and changeOrigin for ngrok support**

## Performance

- **Duration:** ~45 minutes (including debugging iterations)
- **Started:** 2026-02-08
- **Completed:** 2026-02-08
- **Tasks:** 1 (with multiple debugging iterations)
- **Files modified:** 1

## Accomplishments
- WebSocket connects through Vite proxy on localhost:5173
- Room creation works via WebSocket connection on localhost
- Ngrok tunnel URL loads game landing page (no "Blocked request" error)
- WebSocket works through ngrok on laptop browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Add changeOrigin and allowedHosts** - `11c866f` (feat)
2. **Fix: HTTP target instead of ws:// scheme** - `aeace44` (fix)
3. **Fix: Custom WebSocket proxy plugin** - `c800a28` (fix)
4. **Fix: Raw TCP sockets approach** - `02a4cfb` (fix)
5. **Fix: host.docker.internal proxy target** - `ccdb9a3` (fix — final working solution)

## Files Created/Modified
- `packages/client/vite.config.ts` - WebSocket proxy with host.docker.internal target, allowedHosts, changeOrigin

## Decisions Made

**Proxy target hostname:**
- Docker service name (`server:3000`) failed WebSocket upgrade through Vite's http-proxy
- `host.docker.internal` resolves to host machine from inside Docker container
- Routes through Docker's exposed port 3000 mapping instead of internal DNS
- This is a macOS/Windows Docker Desktop feature (works for development)

**Vite proxy configuration:**
- `ws: true` enables WebSocket upgrade handling in http-proxy
- `changeOrigin: true` rewrites Host header to match target server
- `allowedHosts: true` disables Vite hostname validation for ngrok tunnels

**Custom proxy approaches abandoned:**
- Custom Vite plugin with node:http — Bun's node:http compatibility doesn't fire upgrade event
- Raw TCP socket proxy with node:net — same Bun compatibility issue
- These approaches were investigated before discovering the host.docker.internal fix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WebSocket proxy target scheme**
- **Found during:** Task 1 verification
- **Issue:** `serverUrl.replace('http', 'ws')` created ws:// target, but http-proxy expects http:// even for WebSocket proxying
- **Fix:** Changed to use serverUrl directly (HTTP scheme)
- **Committed in:** aeace44

**2. [Rule 3 - Blocking] Docker DNS incompatible with WebSocket proxy**
- **Found during:** Debugging iterations
- **Issue:** Vite's http-proxy under Bun in Docker could not complete WebSocket upgrade to Docker service name `server:3000`
- **Fix:** Changed proxy target to `ws://host.docker.internal:3000` which routes through host port mapping
- **Committed in:** ccdb9a3

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Root cause was different than diagnosed (Docker DNS, not just missing changeOrigin). Required multiple debugging iterations.

## Issues Encountered

**Mobile WebSocket through ngrok:**
- iOS WebKit (Chrome on iPhone) doesn't reliably send cookies with WebSocket upgrade requests
- ngrok free tier interstitial requires cookie for subsequent requests
- Result: WebSocket works on laptop browser via ngrok but fails on mobile
- **Status:** Deferred — user will address mobile tunnel separately (cloudflared or server-served client approach)

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Local dev WebSocket connections work immediately via Vite proxy
- Ngrok tunnel works for laptop browser testing
- Mobile testing via ngrok deferred (iOS WebKit cookie limitation with ngrok interstitial)
- For mobile testing, recommend switching to cloudflared tunnel or serving built client from server

---
*Phase: 14-ngrok-local-dev-sharing*
*Completed: 2026-02-08*

## Self-Check: PASSED

Modified file verified:
- packages/client/vite.config.ts exists and contains host.docker.internal, allowedHosts, changeOrigin

Commits verified:
- 11c866f, aeace44, c800a28, 02a4cfb, ccdb9a3
