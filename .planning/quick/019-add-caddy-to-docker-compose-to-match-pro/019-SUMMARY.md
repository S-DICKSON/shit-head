---
phase: quick-019
plan: 01
subsystem: infra
tags: [docker, caddy, docker-compose, reverse-proxy, local-dev]

# Dependency graph
requires:
  - phase: 12-02
    provides: Unified Bun server Dockerfile with production target
provides:
  - Client Dockerfile for dev environment (Vite dev server)
  - docker-compose.prod.yml for production-like local testing with Caddy
  - Caddyfile.local for localhost reverse proxy configuration
  - Makefile targets for prod-local workflow
affects: [local-development, testing, deployment-validation]

# Tech tracking
tech-stack:
  added: [caddy:2-alpine, Docker Compose production profile]
  patterns: [production parity in local dev, Caddy reverse proxy pattern]

key-files:
  created:
    - packages/client/Dockerfile
    - docker-compose.prod.yml
    - Caddyfile.local
  modified:
    - Makefile

key-decisions:
  - "Use Caddy instead of nginx for local prod testing - matches production VPS setup"
  - "Client Dockerfile has dev target only - production uses unified server Dockerfile"
  - "docker-compose.prod.yml exposes app internally only (Caddy publicly) - mirrors production security"
  - "Self-signed TLS on localhost for full HTTPS testing without external dependencies"

patterns-established:
  - "Production parity: Local dev can test with same reverse proxy as production"
  - "Multi-stage Dockerfile pattern: dev target for hot-reload, production target for unified build"
  - "Named volumes for Caddy data/config persistence across container restarts"

# Metrics
duration: 1min
completed: 2026-02-15
---

# Quick Task 019: Add Caddy to Docker Compose to Match Production

**Production-like Docker Compose with Caddy reverse proxy enables local testing with same architecture as Hetzner VPS (Caddy → unified Bun server on port 3000)**

## Performance

- **Duration:** 1 min 20 sec
- **Started:** 2026-02-15T14:49:56Z
- **Completed:** 2026-02-15T14:51:16Z
- **Tasks:** 3
- **Files modified:** 3 created, 1 modified

## Accomplishments
- Created packages/client/Dockerfile with dev target for Vite dev server (mirrors server Dockerfile pattern)
- Created docker-compose.prod.yml with Caddy reverse proxy and unified Bun server (production architecture)
- Added Caddyfile.local for localhost with automatic self-signed TLS
- Added `make prod-local` and `make prod-local-down` Makefile targets
- Updated `make clean` to teardown prod-local stack
- All existing dev workflow targets unchanged (make dev, test, lint, type-check, tunnel)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create client Dockerfile and local Caddyfile** - `aa609d1` (feat)
2. **Task 2: Create docker-compose.prod.yml and add Makefile targets** - `a202aac` (feat)
3. **Task 3: Verify dev workflow and prod-local build** - No commit (verification only)

## Files Created/Modified
- `packages/client/Dockerfile` - Dev target for Vite dev server with workspace dependencies
- `Caddyfile.local` - Caddy reverse proxy config for localhost with TLS and stdout logging
- `docker-compose.prod.yml` - Production-like stack (Caddy + unified Bun server)
- `Makefile` - Added prod-local, prod-local-down targets; updated clean target

## Decisions Made

**1. Client Dockerfile has dev target only**
- Production uses unified server Dockerfile (client-build → production stages)
- Client Dockerfile only needed for `make dev` hot-reload workflow
- Eliminates duplicate build logic

**2. docker-compose.prod.yml mirrors production security**
- `app` service uses `expose` not `ports` (internal only)
- Caddy is the only public-facing service (ports 80/443)
- Matches Hetzner VPS where Bun binds to 127.0.0.1:3000

**3. Caddy for local prod testing**
- Matches production (Hetzner VPS uses Caddy)
- Auto-generates self-signed cert for localhost
- Simpler than nginx for local TLS testing

**4. Named volumes for Caddy persistence**
- caddy_data and caddy_config volumes preserve TLS certs
- Avoids regenerating self-signed cert on every restart

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Usage

**Start production-like environment:**
```bash
make prod-local
```

**Access game:**
- Open https://localhost (browser will show TLS warning for self-signed cert - click through it)
- WebSocket and static files served through Caddy reverse proxy

**Stop environment:**
```bash
make prod-local-down
```

**Existing dev workflow unchanged:**
```bash
make dev        # Hot-reload dev environment
make test       # Run all tests
make lint       # Lint all packages
make tunnel     # Cloudflared tunnel for mobile testing
```

## Next Phase Readiness

- Production parity established for local testing
- Can validate WebSocket upgrade through Caddy before deploying
- Eliminates "works locally but not in production" issues

---
*Phase: quick-019*
*Completed: 2026-02-15*

## Self-Check: PASSED

All files and commits verified:
- ✓ packages/client/Dockerfile
- ✓ docker-compose.prod.yml
- ✓ Caddyfile.local
- ✓ aa609d1 (Task 1 commit)
- ✓ a202aac (Task 2 commit)
