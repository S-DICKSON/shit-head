---
phase: 12-deployment-production-polish
verified: 2026-02-14T19:15:00Z
status: gaps_found
score: 9/10 must-haves verified
gaps:
  - truth: "No Cloudflare/Fly.io/SOPS remnants in infra/ or .github/workflows/"
    status: failed
    reason: "terraform.tfvars.example contains outdated Cloudflare/Fly.io configuration"
    artifacts:
      - path: "infra/opentofu/terraform.tfvars.example"
        issue: "File contains old Fly.io and Cloudflare variables that don't match current variables.tf"
    missing:
      - "terraform.tfvars.example should be updated to document OCI variables or removed entirely"
      - "Example should show: tenancy_ocid, user_ocid, fingerprint, region, ssh_public_key, domain"
---

# Phase 12: Deployment & Production Polish Verification Report

**Phase Goal:** Game is deployed to Oracle Cloud VPS with unified Docker deployment, OpenTofu IaC, Infisical secrets, and Caddy auto-HTTPS

**Verified:** 2026-02-14T19:15:00Z

**Status:** gaps_found

**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

This phase creates deployment infrastructure (IaC, Docker images, CI/CD workflows). The actual deployment hasn't happened yet — the user needs to:
1. Set up Oracle Cloud account and provision infrastructure via `tofu apply`
2. Configure Infisical with secrets
3. Push to main to trigger deploy

Therefore, verification checks that the **code and configuration artifacts** are correct and complete, not that the deployment is currently live.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OpenTofu provisions Oracle Cloud Ampere A1 instance with VCN, subnet, security lists, and public IP | ✓ VERIFIED | main.tf defines all resources: oci_core_vcn, oci_core_subnet, oci_core_security_list, oci_core_instance with VM.Standard.A1.Flex shape (4 OCPU, 24GB RAM, 100GB disk) |
| 2 | Cloud-init installs Docker, Caddy, opens iptables ports 80/443, creates systemd service | ✓ VERIFIED | cloud-init.yaml has packages, iptables rules, Docker installation, Caddy installation, systemd service template at /etc/systemd/system/shithead-game.service |
| 3 | Unified Docker image builds client + server in single container on port 3000 | ✓ VERIFIED | Dockerfile has client-build stage (bunx vite build), production stage copies from client-build, exposes port 3000, CMD runs server |
| 4 | Deploy workflow: builds ARM64 image → pushes GHCR → SSHs to VPS → configures Caddy → health checks | ✓ VERIFIED | .github/workflows/deploy.yml uses Infisical secrets, docker/build-push-action with platforms: linux/arm64, SSH deployment with Caddy config, health check at /health |
| 5 | Rollback workflow: accepts git SHA → SSHs → pulls specific tag → restarts → health checks | ✓ VERIFIED | .github/workflows/rollback.yml has workflow_dispatch with target_sha input, SSH to VPS, docker pull SHA tag, restart systemd, health check |
| 6 | Both workflows use Infisical (not SOPS) for secrets | ✓ VERIFIED | Both workflows use Infisical/secrets-action@v1.0.6 with client-id/client-secret, no SOPS references in workflow steps |
| 7 | No Cloudflare/Fly.io/SOPS remnants in infra/ or .github/workflows/ | ✗ FAILED | infra/opentofu/terraform.tfvars.example contains outdated Cloudflare/Fly.io variables that don't match variables.tf |
| 8 | Server has health endpoint with active rooms/players/connections metrics | ✓ VERIFIED | index.ts /health endpoint returns JSON with activeRooms (roomManager.getRoomCount()), activePlayers (roomManager.getPlayerCount()), activeConnections (Set size) |
| 9 | Room cleanup runs every 5 minutes with 24-hour abandonment threshold | ✓ VERIFIED | RoomManager.ts constructor starts setInterval with 5 * 60 * 1000ms, cleanupAbandonedRooms() checks 24 * 60 * 60 * 1000ms threshold |
| 10 | Server validates WebSocket origins in production mode | ✓ VERIFIED | index.ts validates origin when NODE_ENV === 'production' && !serveStaticFiles (split deployment), skips validation in unified mode (same-origin) |

**Score:** 9/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `infra/opentofu/main.tf` | OCI provider, VCN, subnet, security list, compute instance | ✓ VERIFIED | 152 lines, defines all required resources with sensitive variables |
| `infra/opentofu/cloud-init.yaml` | VM initialization script with Docker, Caddy, systemd service | ✓ VERIFIED | 73 lines, package_update, packages, write_files for systemd service + Caddyfile, runcmd for installation |
| `infra/opentofu/variables.tf` | OCI credential variables marked sensitive | ✓ VERIFIED | 41 lines, all credentials (tenancy_ocid, user_ocid, fingerprint, ssh_public_key) marked sensitive = true |
| `infra/opentofu/outputs.tf` | public_ip, instance_id outputs | ✓ VERIFIED | 15 lines, outputs public_ip and instance_id for use in workflows |
| `infra/opentofu/terraform.tfvars.example` | Example configuration for OCI variables | ✗ STUB | File contains old Cloudflare/Fly.io variables that don't match variables.tf (not updated in plan execution) |
| `packages/server/Dockerfile` | Multi-stage build with client-build and production stages | ✓ VERIFIED | 69 lines, base → dev + client-build → production, COPY --from=client-build for assets, port 3000, unified deployment |
| `.github/workflows/deploy.yml` | CI/CD pipeline with Infisical, ARM64 build, SSH deploy | ✓ VERIFIED | 110 lines, Infisical/secrets-action, docker/build-push-action with platforms: linux/arm64, SSH heredoc with step-level env resolution |
| `.github/workflows/rollback.yml` | Manual rollback with workflow_dispatch | ✓ VERIFIED | 61 lines, accepts target_sha input, SSH to VPS, pull specific tag, restart, health check |
| `packages/server/src/index.ts` | Health endpoint, origin validation, static file serving | ✓ VERIFIED | 152 lines, /health endpoint with metrics, origin validation in production, serveStaticFiles for unified deployment |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `.github/workflows/deploy.yml` | `packages/server/Dockerfile` | docker/build-push-action builds production target | ✓ WIRED | Line 47: `target: production` in build-push-action |
| `.github/workflows/deploy.yml` | `infra/opentofu/cloud-init.yaml` | SSH deploys to VPS provisioned with cloud-init | ✓ WIRED | SSH commands assume systemd service exists, matches cloud-init template |
| `.github/workflows/deploy.yml` | `packages/server/src/index.ts` | Health check endpoint verifies running server | ✓ WIRED | Line 101: `curl -f http://localhost:3000/health` checks /health endpoint |
| `packages/server/Dockerfile` | `packages/client/dist` | Production stage copies from client-build stage | ✓ WIRED | Line 61: `COPY --from=client-build /app/packages/client/dist ./packages/client/dist` |
| `infra/opentofu/main.tf` | `infra/opentofu/cloud-init.yaml` | Instance metadata uses cloud-init script | ✓ WIRED | Line 149: `user_data = base64encode(file("${path.module}/cloud-init.yaml"))` |
| Health endpoint | `RoomManager` | Health endpoint queries room/player counts | ✓ WIRED | index.ts calls roomManager.getRoomCount() and getPlayerCount(), methods exist in RoomManager.ts |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `infra/opentofu/terraform.tfvars.example` | 1-13 | Outdated example with Cloudflare/Fly.io variables | 🛑 Blocker | Misleading documentation for users setting up infrastructure |
| `infra/opentofu/cloud-init.yaml` | 33 | Placeholder OWNER in Docker image path | ℹ️ Info | Intentional — replaced during deploy via sed in deploy.yml line 79 |
| `packages/server/src/index.ts` | 61 | Origin validation skipped in unified mode | ℹ️ Info | Intentional — same-origin in unified deployment doesn't need CORS validation |

### Human Verification Required

The following items need human verification after infrastructure provisioning:

#### 1. Oracle Cloud VPS Provisioning

**Test:** Run `infisical run -- tofu apply` in infra/opentofu directory

**Expected:** 
- VCN, subnet, security list, and compute instance created
- Public IP address output
- Instance accessible via SSH on output public IP
- cloud-init completion visible in /var/log/cloud-init-output.log

**Why human:** Requires Oracle Cloud account, OCI credentials in Infisical, and OpenTofu CLI installation

#### 2. GitHub Actions Deployment

**Test:** Configure Infisical + GitHub secrets, push to main branch

**Expected:**
- Deploy workflow triggers on push to main
- ARM64 image builds and pushes to GHCR
- SSH connection succeeds to VPS
- Caddy configured with domain
- systemd service starts successfully
- Health check passes
- External health check at https://DOMAIN/health returns JSON with metrics

**Why human:** Requires Infisical production secrets, GitHub repository secrets (INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET), and actual push to main

#### 3. Production WebSocket Connection

**Test:** Open browser to https://DOMAIN, create room, join from second device

**Expected:**
- Static files served from unified container
- WebSocket upgrade succeeds (wss://DOMAIN/game-ws)
- Room creation and joining works
- Real-time updates visible
- No CORS errors in browser console

**Why human:** Requires live deployment, DNS configuration, and Let's Encrypt certificate provisioning

#### 4. Caddy HTTPS Auto-Provisioning

**Test:** Check Caddy logs after first deployment

**Expected:**
- Caddy obtains Let's Encrypt certificate automatically
- HTTPS (443) works without manual cert installation
- HTTP (80) redirects to HTTPS
- Certificate renewal scheduled

**Why human:** Requires live deployment and DNS pointing to VPS public IP

#### 5. Rollback Workflow

**Test:** Trigger rollback workflow from GitHub Actions UI with previous SHA

**Expected:**
- Workflow accepts SHA input
- Pulls specific SHA-tagged image
- Tags as :latest locally
- Restarts service
- Health check passes
- Running version matches target SHA

**Why human:** Requires at least two deployments (current + previous) and manual workflow_dispatch trigger

#### 6. Room Persistence and Cleanup

**Test:** Create room, keep game active for hours, verify room exists; abandon room for 24+ hours, verify cleanup

**Expected:**
- Rooms persist as long as WebSocket connections active
- Active rooms visible in /health endpoint metrics
- Abandoned rooms cleaned up after 24 hours (check /health activeRooms before/after)

**Why human:** Requires 24+ hour monitoring period

### Gaps Summary

One gap blocks full verification:

**Gap: Outdated terraform.tfvars.example**

The file `infra/opentofu/terraform.tfvars.example` contains old Cloudflare and Fly.io configuration that doesn't match the current `variables.tf`. This creates misleading documentation for users attempting to provision infrastructure.

**Current content (outdated):**
```
# Fly.io configuration
fly_api_token = "fo1_your_fly_api_token_here"
fly_org       = "personal"
fly_region    = "sjc"

# Cloudflare configuration
cloudflare_api_token  = "your_cloudflare_api_token_here"
cloudflare_account_id = "your_cloudflare_account_id_here"

# Project configuration
project_name    = "shit-head"
github_repo     = "YOUR_USERNAME/shit-head"
allowed_origins = "https://shit-head.pages.dev"
```

**Expected content (OCI variables):**
```
# OCI credentials (inject via Infisical: infisical run -- tofu apply)
tenancy_ocid     = "ocid1.tenancy.oc1..aaaaaa..."
user_ocid        = "ocid1.user.oc1..aaaaaa..."
fingerprint      = "aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99"
private_key_path = "~/.oci/oci_api_key.pem"
region           = "us-phoenix-1"
ssh_public_key   = "ssh-ed25519 AAAAC3NzaC1... user@host"
domain           = "shithead.example.com"
```

**Impact:** User attempting to provision infrastructure with `tofu apply` will be confused by outdated example. Plan 12-01 should have updated or removed this file.

**Recommendation:** Update terraform.tfvars.example to match variables.tf, or remove it entirely and document that all variables should be provided via Infisical environment variables (TF_VAR_* pattern).

### Success Criteria Coverage

From ROADMAP.md Phase 12 success criteria:

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1. Production build is deployed to public URL | ⏳ READY | Docker image builds client + server, deploy workflow configured for SSH deployment, Caddy configured for HTTPS — **requires user to run deployment** |
| 2. WebSocket connections work in production environment | ⏳ READY | Unified container on port 3000, Caddy reverse proxy configured, origin validation in index.ts — **requires human verification after deployment** |
| 3. Rooms persist as long as game is active | ⏳ READY | RoomManager maintains rooms in memory, no cleanup while active — **requires human verification with live deployment** |
| 4. Basic monitoring shows active games and connected players | ✓ VERIFIED | /health endpoint returns activeRooms, activePlayers, activeConnections from RoomManager |
| 5. Abandoned rooms are cleaned up after 24 hours | ✓ VERIFIED | RoomManager.cleanupAbandonedRooms() runs every 5 minutes with 24-hour threshold |

4 of 5 criteria verified in code. Criteria 1-3 require human verification after actual deployment.

---

_Verified: 2026-02-14T19:15:00Z_
_Verifier: Claude (gsd-verifier)_
