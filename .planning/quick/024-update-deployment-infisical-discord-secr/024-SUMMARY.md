---
phase: quick-024
plan: 01
subsystem: infra
tags: [docker, github-actions, infisical, discord, makefile, deploy, vite]

# Dependency graph
requires:
  - phase: 18-discord-authentication
    provides: VITE_DISCORD_CLIENT_ID needed at client build time
provides:
  - infra/scripts/deploy.sh — manual deploy script using Infisical-managed secrets
  - infra/Makefile deploy target — `make deploy` from infra/ triggers full VPS deploy
  - Dockerfile build arg VITE_DISCORD_CLIENT_ID — embeds Discord client ID in client JS at build time
  - deploy.yml Discord env vars — CI deploys write Discord credentials to production .env
affects: [future-deploys, discord-activity, production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Infisical secrets injection via `infisical run --env=prod -- bash /scripts/deploy.sh`"
    - "SSH positional args pattern: bash -s arg1 arg2 << 'ENDSSH' to pass secrets to remote shell without heredoc variable expansion"
    - "Docker build-arg for VITE_ prefixed env vars — Vite embeds them in client JS bundle at build time"

key-files:
  created:
    - infra/scripts/deploy.sh
  modified:
    - infra/Makefile
    - infra/docker-compose.yml
    - packages/server/Dockerfile
    - .github/workflows/deploy.yml

key-decisions:
  - "deploy.sh as separate script file (not inline Makefile heredoc) — avoids nested Makefile/shell/SSH quoting hell"
  - "bash -s with positional args + single-quoted ENDSSH heredoc — secrets passed to remote shell without local expansion"
  - "scripts volume mount (./scripts:/scripts) added to infra docker-compose.yml — script accessible inside infra container"
  - "VITE_DISCORD_CLIENT_ID build-arg uses same value as DISCORD_CLIENT_ID secret — client ID is public (safe as build arg)"
  - "GHCR_PAT in Infisical (not GITHUB_TOKEN) — GITHUB_TOKEN unavailable outside Actions; user must create PAT manually"

patterns-established:
  - "Pattern: Infisical-wrapped deploy script at infra/scripts/deploy.sh — template for future deploy targets"

# Metrics
duration: 2min
completed: 2026-02-20
---

# Quick Task 024: Update Deployment — Infisical Discord Secrets Summary

**Dockerfile build arg VITE_DISCORD_CLIENT_ID added to client-build stage; infra Makefile deploy target using infisical run --env=prod; GitHub Actions deploy.yml writes DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to production .env**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-20T18:31:09Z
- **Completed:** 2026-02-20T18:33:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added `ARG VITE_DISCORD_CLIENT_ID` + `ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID` to client-build stage in production Dockerfile, before `bunx vite build` — embeds Discord client ID in client JS bundle
- Created `infra/scripts/deploy.sh` with full deploy logic: GHCR login, docker pull, .env write with Discord credentials, systemd restart, health check
- Added `deploy` target to `infra/Makefile` using `infisical run --env=prod -- bash /scripts/deploy.sh`
- Updated `infra/docker-compose.yml` to mount `./scripts:/scripts` so deploy.sh is available inside the infra container
- Updated `.github/workflows/deploy.yml` to include `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in the deploy step env block and production `.env` heredoc, plus `VITE_DISCORD_CLIENT_ID` as a Docker build arg

## Task Commits

Each task was committed atomically:

1. **Task 1: Add VITE_DISCORD_CLIENT_ID build arg to production Dockerfile** - `983a63c` (feat)
2. **Task 2: Add deploy target to infra Makefile** - `2215eb2` (feat)
3. **Task 3: Update GitHub Actions deploy.yml to include Discord env vars** - `2cccf8c` (feat)

## Files Created/Modified

- `infra/scripts/deploy.sh` — Bash deploy script: writes SSH key, SSHes to VPS, runs GHCR login, docker pull, .env write, systemd restart, health check
- `infra/Makefile` — Added `deploy` target + `deploy` to `.PHONY`
- `infra/docker-compose.yml` — Added `./scripts:/scripts` volume mount for infra container
- `packages/server/Dockerfile` — Added `ARG VITE_DISCORD_CLIENT_ID` and `ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID` in client-build stage
- `.github/workflows/deploy.yml` — Added Discord secrets to deploy step env, production .env heredoc, and Docker build-args

## Decisions Made

- **deploy.sh as separate file**: Inline Makefile heredoc with SSH inside infisical inside docker exec would require 4+ levels of nested escaping. A separate .sh script keeps the logic readable and maintainable.
- **bash -s + single-quoted heredoc pattern**: `ssh ... bash -s "$VAR1" "$VAR2" << 'ENDSSH'` passes secrets as positional args ($1, $2) to the remote shell. The single-quoted delimiter prevents local expansion while the script uses them safely on the remote.
- **GHCR_PAT in Infisical**: The CI uses `GITHUB_TOKEN` (auto-provided by Actions), but manual deploys need a GitHub PAT with `packages:read` scope stored in Infisical as `GHCR_PAT`.
- **VITE_DISCORD_CLIENT_ID = DISCORD_CLIENT_ID value**: The VITE_ prefix just indicates it's exposed to the Vite client build. The value is the same Discord application client ID — it's a public identifier, safe to embed in client JS.

## Deviations from Plan

None — plan executed exactly as written.

## User Setup Required

Before running `make deploy`, ensure Infisical (prod environment) contains these secrets:
- `VPS_SSH_PRIVATE_KEY` — PEM-encoded SSH private key for root@46.225.52.135
- `DISCORD_CLIENT_ID` — Discord application client ID
- `DISCORD_CLIENT_SECRET` — Discord application client secret
- `GHCR_PAT` — GitHub Personal Access Token with `read:packages` scope
- `GHCR_USERNAME` — GitHub username

Before CI deploys include Discord credentials, add these GitHub Actions secrets in repo settings:
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

(See `.planning/phases/18-discord-authentication/18-01-USER-SETUP.md` for Discord Developer Portal setup)

## Next Phase Readiness

- Both manual (`make deploy` from infra/) and CI (GitHub Actions on push to main) deploy paths now produce identical production `.env` files with Discord credentials
- Docker image builds embed `VITE_DISCORD_CLIENT_ID` in client JS at build time — `import.meta.env.VITE_DISCORD_CLIENT_ID` will resolve in production
- Discord Activity fully deployable once GitHub Actions secrets and Infisical prod secrets are populated

---
*Phase: quick-024*
*Completed: 2026-02-20*

## Self-Check: PASSED
