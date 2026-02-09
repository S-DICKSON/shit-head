---
phase: 12
plan: 03
subsystem: deployment-infrastructure
tags: [deployment, infrastructure, docker, github-actions, opentofu, fly-io, cloudflare-pages]

dependencies:
  requires: ["12-01", "12-02"]
  provides:
    - Server-only Dockerfile for Fly.io deployment
    - Fly.io configuration with WebSocket support
    - Split deployment GitHub Actions workflows (GHCR + CF Pages + Fly.io)
    - Coordinated rollback workflow
    - OpenTofu IaC for two-provider architecture
  affects: ["future deployment phases", "production operations"]

tech-stack:
  added:
    - fly.toml configuration
    - GitHub Actions docker/build-push-action@v5
    - GitHub Actions docker/metadata-action@v5
    - GitHub Actions cloudflare/wrangler-action@v3
    - GitHub Actions superfly/flyctl-actions
    - OpenTofu fly-apps/fly provider
    - OpenTofu cloudflare/cloudflare provider
  patterns:
    - Split deployment architecture (client to CF Pages, server to Fly.io)
    - Container registry pattern (GHCR for Docker images)
    - Atomic rollback via coordinated SHA deployment
    - Infrastructure-as-code with dual providers

key-files:
  created:
    - fly.toml
    - .github/workflows/rollback.yml
  modified:
    - packages/server/Dockerfile
    - .github/workflows/deploy.yml
    - infra/opentofu/main.tf
    - infra/opentofu/variables.tf
    - infra/opentofu/outputs.tf
    - infra/opentofu/terraform.tfvars.example

decisions:
  - decision: Use port 8080 for Fly.io deployment
    rationale: Fly.io standard internal port, matches common container patterns
    impact: Production server runs on 8080, dev stays on 3000
    alternatives: Could use 3000 everywhere, but 8080 is more conventional for production

  - decision: Disable auto_stop_machines for WebSocket support
    rationale: WebSocket connections require persistent server availability
    impact: Server runs 24/7, no cost savings from auto-stop
    alternatives: Could use auto_stop but would break active WebSocket connections

  - decision: Three-job deploy pipeline with GHCR intermediate
    rationale: Build once, deploy image to Fly.io; client builds separately for CF Pages
    impact: Faster rollbacks (image already built), atomic server deployments
    alternatives: Could build on Fly.io directly but loses rollback flexibility

  - decision: Coordinated rollback via SHA-based workflow_dispatch
    rationale: Both client and server can rollback to any previous commit
    impact: Simple manual rollback via GitHub UI, rebuilds client for consistency
    alternatives: Could use separate rollback workflows but coordination is harder

metrics:
  duration: 260s
  completed: 2026-02-09

wave: 2
---

# Phase 12 Plan 03: Deployment Infrastructure Summary

**One-liner:** Split deployment infrastructure with server-only Dockerfile (Fly.io port 8080), three-job GitHub Actions pipeline (GHCR → CF Pages + Fly.io), coordinated rollback workflow, and dual-provider OpenTofu configuration.

## What Was Built

### 1. Server-Only Dockerfile and Fly.io Config
- **Updated Dockerfile production stage**: Removed client build, changed port from 3000 to 8080, added explicit PORT env var
- **Created fly.toml**: Configured with auto_stop_machines=false for persistent WebSocket support, shared-cpu-1x VM with 256MB memory, port 8080 internal port
- **Port strategy**: Development stays on 3000, production runs on 8080 (Fly.io standard)

### 2. Split Deployment GitHub Actions Workflows
- **Rewrote deploy.yml**: Three-job pipeline:
  - `build-push-server`: Build server Docker image, push to GHCR with prod-sha-{SHA} tags
  - `deploy-client`: Build client with Vite, deploy to Cloudflare Pages via wrangler-action
  - `deploy-server`: Deploy pre-built GHCR image to Fly.io via flyctl
- **Created rollback.yml**: workflow_dispatch with target_sha input for coordinated rollbacks
- **Deployment flow**: Push to production branch → build image → deploy both client and server

### 3. OpenTofu Dual-Provider Infrastructure
- **Replaced Render with Fly.io + Cloudflare**: main.tf now uses fly-apps/fly and cloudflare/cloudflare providers
- **Fly.io server resource**: fly_app + fly_machine with WebSocket config, port 8080, ALLOWED_ORIGINS env var
- **Cloudflare Pages resource**: cloudflare_pages_project with build_config, VITE_SERVER_URL set to wss://{fly-app}.fly.dev
- **Variables**: Added fly_api_token, cloudflare_api_token, cloudflare_account_id, github_repo, allowed_origins
- **Outputs**: server_url, client_url, fly_app_name, cf_pages_project for CLI operations

## Task Commits

| Task | Commit  | Description                                           |
| ---- | ------- | ----------------------------------------------------- |
| 1    | 81348dc | Server-only Dockerfile with port 8080, fly.toml       |
| 2    | ac185f2 | Deploy/rollback GitHub Actions workflows              |
| 3    | 5f1d8e1 | OpenTofu Fly.io + Cloudflare dual-provider config     |

## Decisions Made

### Port 8080 for Production
Fly.io uses port 8080 as standard internal port. Development environment stays on 3000 for local consistency. This split is clean and follows container deployment conventions.

### No Auto-Stop for WebSocket
WebSocket connections require persistent availability. Disabling auto_stop_machines ensures connections don't get dropped when server spins down. This trades cost savings for reliability (critical for real-time game).

### GHCR as Intermediate Registry
Build server image once in GitHub Actions, push to GHCR, then deploy that image to Fly.io. This enables fast atomic rollbacks (image already built) and consistent deployments (same image for all environments).

### Coordinated Rollback Workflow
Single workflow_dispatch with target_sha allows rolling back both client and server to any previous commit. Client rebuilds at target SHA (ensures VITE_SERVER_URL matches), server deploys pre-built image from GHCR.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for Phase 12 Plan 04** (if exists) or completion of Phase 12.

**Deployment prerequisites:**
- GitHub secrets required: FLY_API_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, VITE_SERVER_URL
- OpenTofu state backend configuration (local or remote)
- Fly.io account and organization setup
- Cloudflare account and Pages project creation
- Production branch created from main

**Blocked by:**
- User needs to configure GitHub secrets before deploy workflow can run
- User needs to apply OpenTofu configuration to provision infrastructure
- Not a blocker for development, only for actual deployment

## Testing Notes

**Verification completed:**
1. ✅ Dockerfile production stage has EXPOSE 8080 and ENV PORT=8080
2. ✅ fly.toml has auto_stop_machines=false and internal_port=8080
3. ✅ deploy.yml has three jobs: build-push-server, deploy-client, deploy-server
4. ✅ rollback.yml has workflow_dispatch with target_sha input
5. ✅ main.tf has both fly-apps/fly and cloudflare/cloudflare providers
6. ✅ variables.tf has fly_api_token, cloudflare_api_token, cloudflare_account_id
7. ✅ All files have valid syntax (HCL, YAML, TOML verified)

**Local lint check:** Passed - no ESLint errors in server, client, or shared packages.

## Lessons Learned

### Split Deployment Complexity
Managing two separate deployment targets (CF Pages for static client, Fly.io for WebSocket server) requires careful coordination. The GitHub Actions workflow handles this with job dependencies (deploy-server needs build-push-server) and sequential execution.

### Environment Variable Strategy
Client build-time env vars (VITE_SERVER_URL) must be set during GitHub Actions build step, not at runtime. Server runtime env vars (ALLOWED_ORIGINS) can be set via Fly.io secrets. This distinction is critical for split deployment.

### Rollback Coordination Challenge
Rolling back client and server independently could cause version mismatch (client expects different WebSocket message format than server provides). Coordinated rollback via single workflow_dispatch ensures both roll back to same SHA.

### OpenTofu Provider Limitations
Fly.io OpenTofu provider is relatively new (v0.1) and may not support all Fly.io features. fly.toml remains primary source of truth for server configuration. OpenTofu manages app/machine lifecycle only.

## Self-Check: PASSED

All created files exist:
- ✅ fly.toml
- ✅ .github/workflows/rollback.yml

All modified files verified:
- ✅ packages/server/Dockerfile
- ✅ .github/workflows/deploy.yml
- ✅ infra/opentofu/main.tf
- ✅ infra/opentofu/variables.tf
- ✅ infra/opentofu/outputs.tf
- ✅ infra/opentofu/terraform.tfvars.example

All commits exist:
- ✅ 81348dc
- ✅ ac185f2
- ✅ 5f1d8e1
