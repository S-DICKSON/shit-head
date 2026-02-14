---
phase: 12-deployment-production-polish
plan: 03
subsystem: infra
tags: [github-actions, docker, ghcr, infisical, oracle-cloud, caddy, ssh, arm64]

# Dependency graph
requires:
  - phase: 12-01
    provides: Oracle Cloud VPS infrastructure provisioned via OpenTofu
  - phase: 12-02
    provides: Unified production Docker image with static files + WebSocket server
provides:
  - CI/CD pipeline that builds ARM64 image and deploys to Oracle Cloud VPS
  - Infisical-based secret management for GitHub Actions
  - Automated Caddy HTTPS configuration on deployment
  - Rollback workflow for restoring specific git SHA versions
affects: [future phases that modify server code will trigger auto-deploy]

# Tech tracking
tech-stack:
  added: [Infisical/secrets-action@v1.0.6, docker/build-push-action@v6, webfactory/ssh-agent@v0.9.1]
  patterns: [SSH heredoc with step-level env resolution for GitHub Actions variables, GHCR ARM64 multi-platform builds, systemd service management via SSH]

key-files:
  created: []
  modified: [.github/workflows/deploy.yml, .github/workflows/rollback.yml]

key-decisions:
  - "Use Infisical client-id/client-secret authentication instead of OIDC for GitHub Actions (simpler setup)"
  - "All GitHub Actions variables (${{ }}) resolved via step-level env before SSH heredoc to prevent interpolation issues"
  - "Tag images with both :latest and :sha for flexible rollback capability"
  - "Health check both internally (localhost:3000) and externally (domain) after deployment"

patterns-established:
  - "SSH heredoc pattern: Use non-quoted heredoc with step-level env to interpolate GitHub Actions variables before remote execution"
  - "Systemd service owner placeholder: Use OWNER placeholder in cloud-init, replace with actual repository owner during deploy"
  - "Caddy auto-HTTPS: Write Caddyfile with domain during deploy, reload Caddy for zero-downtime cert provisioning"

# Metrics
duration: 115s
completed: 2026-02-14
---

# Phase 12 Plan 03: Oracle Cloud CI/CD Workflows Summary

**GitHub Actions CI/CD with ARM64 builds, Infisical secrets, GHCR container registry, and SSH deployment to Oracle Cloud VPS**

## Performance

- **Duration:** 1 min 55 sec
- **Started:** 2026-02-14T18:59:58Z
- **Completed:** 2026-02-14T19:01:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced split Cloudflare Pages + Fly.io deployment with unified Oracle Cloud VPS deployment
- Migrated from SOPS/age to Infisical for secret management in GitHub Actions
- Automated Caddy HTTPS configuration with domain on every deployment
- Rollback workflow enables quick restoration to any previously deployed SHA

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace deploy workflow with Oracle Cloud SSH deployment** - `2d50835` (feat)
2. **Task 2: Replace rollback workflow with Oracle Cloud VPS rollback** - `9965c5a` (feat)

## Files Created/Modified
- `.github/workflows/deploy.yml` - CI/CD pipeline: build ARM64 image → push to GHCR → SSH deploy to Oracle Cloud VPS → configure Caddy → health check
- `.github/workflows/rollback.yml` - Manual rollback: pull specific SHA-tagged image → tag as latest → restart systemd service → health check

## Decisions Made

**1. Infisical client-id/client-secret authentication**
- Rationale: Simpler than OIDC identity configuration for initial setup
- Impact: Requires INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET as GitHub repository secrets

**2. Step-level env resolution for SSH heredoc variables**
- Rationale: GitHub Actions expressions (${{ }}) are NOT interpolated inside remote SSH sessions
- Pattern: Expose all needed values as step-level env vars, use non-quoted heredoc so runner's shell interpolates them before SSH
- Impact: All workflows use this pattern consistently to prevent interpolation bugs

**3. Dual image tagging (:latest and :sha)**
- Rationale: :latest simplifies systemd service definition (no version updates needed), :sha enables rollback to any prior version
- Impact: Every push creates two tags, rollback workflow retags :sha as :latest locally

**4. Caddy configuration written during deploy**
- Rationale: Domain is a secret (in Infisical), not baked into cloud-init
- Impact: Deploy workflow writes Caddyfile with actual domain and reloads Caddy for HTTPS

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - workflows replaced smoothly following documented SSH heredoc pattern from plan 12-02 revision.

## User Setup Required

**External services require manual configuration.** See plan frontmatter `user_setup` section for:

**GitHub:**
- Enable GHCR (GitHub Container Registry) for the repository
- Add GitHub repository secrets:
  - INFISICAL_CLIENT_ID (from Infisical dashboard)
  - INFISICAL_CLIENT_SECRET (from Infisical dashboard)

**Infisical:**
- Create production environment with required secrets:
  - VPS_SSH_PRIVATE_KEY (SSH private key for VPS access)
  - VPS_PUBLIC_IP (from `tofu output public_ip`)
  - DOMAIN (splatmonkey.com)
  - ALLOWED_ORIGINS (https://splatmonkey.com)

**Verification:**
- Push to main branch should trigger deploy workflow
- Workflow should build ARM64 image, push to GHCR, SSH to VPS, configure Caddy, and health check
- Visit https://splatmonkey.com/health to verify deployment

## Next Phase Readiness

- CI/CD pipeline ready for automatic deployments on push to main
- Manual rollback capability available via workflow_dispatch
- Health checks ensure deployment success before marking workflow complete
- Caddy auto-provisions Let's Encrypt HTTPS certificates for configured domain

**Blockers:** User must complete Infisical and GitHub setup (secrets configuration) before workflows can run successfully.

---
*Phase: 12-deployment-production-polish*
*Completed: 2026-02-14*

## Self-Check: PASSED

All files and commits verified.
