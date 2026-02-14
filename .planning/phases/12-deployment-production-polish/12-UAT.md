---
status: complete
phase: 12-deployment-production-polish
source: 12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md
started: 2026-02-14T20:00:00Z
updated: 2026-02-14T20:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. OpenTofu OCI Configuration
expected: infra/opentofu/main.tf contains OCI provider and resources (VCN, subnet, security list, compute instance). variables.tf has sensitive credential variables. outputs.tf exposes public_ip and instance_id.
result: pass

### 2. Cloud-init VM Initialization Script
expected: infra/opentofu/cloud-init.yaml exists and contains Docker installation, iptables rules for Oracle dual-firewall, Caddy APT install, systemd service template for game container, and /opt/shithead directory creation.
result: pass

### 3. Unified Production Dockerfile
expected: packages/server/Dockerfile has multi-stage build with: base stage, dev stage (for local Docker Compose), client-build intermediate stage (runs Vite build), and production stage that copies client assets and serves on port 3000.
result: pass

### 4. Docker Image Builds Successfully
expected: Running `docker build -f packages/server/Dockerfile --target production .` from project root completes without errors and produces a working image.
result: pass

### 5. Deploy Workflow Structure
expected: .github/workflows/deploy.yml triggers on push to main, uses Infisical for secrets, builds ARM64 Docker image, pushes to GHCR, deploys via SSH to Oracle Cloud VPS, configures Caddy with domain, and runs health checks.
result: pass

### 6. Rollback Workflow Structure
expected: .github/workflows/rollback.yml is a manual workflow_dispatch with a SHA input. It SSHs to VPS, pulls the SHA-tagged image, retags as :latest, restarts systemd service, and health checks.
result: pass

### 7. Old Deployment Artifacts Removed
expected: No references to Cloudflare Pages, Fly.io, SOPS, or age encryption remain in infrastructure files. Old .sops.yaml, secrets.sops.yaml, .terraform/ directory, and terraform.tfstate files are deleted.
result: issue
reported: "pass but the fly.io needs to be removed from Makefile. The cloudflare tunnel can stay."
severity: minor

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "No references to Fly.io remain in infrastructure/build files"
  status: failed
  reason: "User reported: pass but the fly.io needs to be removed from Makefile. The cloudflare tunnel can stay."
  severity: minor
  test: 7
  root_cause: "Makefile deployment section still has Fly.io/SOPS targets from old split deployment — never cleaned up when Phase 12 moved to Oracle Cloud"
  artifacts:
    - path: "Makefile"
      issue: "Lines 59-81: SOPS_DECRYPT, FLYCTL, deploy-server, deploy-client, deploy, fly-secrets-set targets reference Fly.io and SOPS"
  missing:
    - "Remove SOPS_DECRYPT, FLYCTL variables and deploy-server, deploy-client, deploy, fly-secrets-set targets"
    - "Remove infra-edit-secrets target (references SOPS)"
    - "Keep tunnel target (cloudflared) and infra-init/plan/apply/destroy/shell targets"
  debug_session: ""
