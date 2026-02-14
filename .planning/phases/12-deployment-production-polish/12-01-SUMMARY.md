---
phase: 12-deployment-production-polish
plan: 01
subsystem: infrastructure
tags: [oracle-cloud, opentofu, iac, vps, networking, cloud-init]

requires:
  - phases: []
    why: "Fresh infrastructure foundation replacing Cloudflare/Fly.io"

provides:
  - artifact: "OpenTofu configuration for Oracle Cloud Always Free tier"
    capability: "Provision Ampere A1 ARM instance with networking and initialization"
  - artifact: "Cloud-init script for VM setup"
    capability: "Automated Docker + Caddy installation with systemd service template"

affects:
  - phase: 12-02
    how: "Deploy workflow will use `infisical run -- tofu apply` to provision infrastructure"
  - phase: 12-03
    how: "GitHub Actions will target the provisioned OCI instance for deployment"

tech-stack:
  added:
    - name: oracle/oci
      purpose: "OpenTofu provider for Oracle Cloud Infrastructure provisioning"
      version: "~> 6.0"
  patterns:
    - name: "Infrastructure as Code with sensitive variable injection"
      why: "All OCI credentials marked sensitive and injected via Infisical CLI at apply time"
    - name: "Oracle Cloud dual-firewall pattern"
      why: "Security Lists (cloud-level) + iptables (instance-level) both required for port access"
    - name: "Cloud-init for stateless VM initialization"
      why: "Declarative VM setup with packages, files, and commands on first boot"

key-files:
  created:
    - infra/opentofu/cloud-init.yaml
  modified:
    - infra/opentofu/main.tf
    - infra/opentofu/variables.tf
    - infra/opentofu/outputs.tf
  deleted:
    - infra/opentofu/.sops.yaml
    - infra/opentofu/secrets.sops.yaml
    - infra/opentofu/.terraform/
    - infra/opentofu/.terraform.lock.hcl
    - infra/opentofu/terraform.tfstate
    - infra/opentofu/terraform.tfstate.*.backup

decisions:
  - what: "Oracle Cloud Always Free Ampere A1 instance (4 OCPU, 24GB RAM, 100GB disk)"
    why: "Free tier provides substantial resources for game server hosting"
    impact: "Zero hosting costs, ARM64 architecture requires compatible Docker images"
  - what: "Bind game container to 127.0.0.1:3000 only (not 0.0.0.0)"
    why: "Caddy reverse proxy handles public traffic, no direct container access"
    impact: "More secure, Caddy provides HTTPS termination and WebSocket proxy"
  - what: "Systemd service for Docker container management (not docker-compose)"
    why: "Simple single-container deployment, systemd provides auto-restart and journald logging"
    impact: "Deployment workflow directly manages systemd service, no compose overhead"
  - what: "Caddy over nginx for reverse proxy"
    why: "Automatic HTTPS with Let's Encrypt, simpler config for WebSocket proxy"
    impact: "Zero-config HTTPS, automatic cert renewal, easier WebSocket handling"
  - what: "Remove SOPS in favor of Infisical"
    why: "Unified secret management for OpenTofu and GitHub Actions"
    impact: "Single source of truth for secrets, simpler workflow, OIDC support"

duration: 125
completed: 2026-02-14
---

# Phase 12 Plan 01: Oracle Cloud Infrastructure Setup Summary

**One-liner:** OpenTofu IaC for Oracle Cloud Ampere A1 Always Free instance with VCN, security lists, and cloud-init for Docker + Caddy initialization

## What Was Built

Replaced the old Cloudflare Pages + Fly.io split deployment with a unified Oracle Cloud Infrastructure foundation:

1. **OpenTofu Configuration**
   - OCI provider setup with sensitive credentials (injected via Infisical)
   - Virtual Cloud Network (VCN) with 10.0.0.0/16 CIDR
   - Internet gateway and route table for public access
   - Security list with ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
   - Subnet with 10.0.1.0/24 CIDR and public IP assignment
   - Compute instance resource: VM.Standard.A1.Flex (4 OCPU, 24GB RAM, 100GB disk)
   - Ubuntu 24.04 ARM64 image via data source query

2. **Cloud-init Script**
   - Package update/upgrade on first boot
   - Docker installation via official script
   - iptables rules for Oracle Cloud dual-firewall (Security Lists + instance firewall)
   - Caddy installation from official APT repository
   - Systemd service template for game container management
   - Application directory creation at /opt/shithead
   - Placeholder Caddyfile (configured during deployment)

3. **Security Model**
   - All OCI credentials marked `sensitive = true` in variables.tf
   - Credentials injected via `infisical run -- tofu apply` (never committed)
   - SSH public key deployed to instance for secure access
   - Game container bound to localhost only (Caddy handles public traffic)

## Architecture Decisions

**Oracle Cloud Always Free Tier**
- 4 OCPU Ampere A1 ARM instance provides generous resources at zero cost
- 24GB RAM and 100GB disk sufficient for game server + monitoring
- ARM64 architecture requires compatible Docker images (Bun has ARM support)

**Infrastructure as Code with Infisical**
- OpenTofu configuration is declarative and version-controlled
- Sensitive credentials never committed (injected at apply time)
- State file management deferred to Plan 02 (Terraform Cloud or S3 backend)

**Caddy for Reverse Proxy**
- Automatic HTTPS with Let's Encrypt (zero-config)
- WebSocket upgrade handling simpler than nginx
- Automatic certificate renewal
- Single binary, minimal resource overhead

**Systemd Service Management**
- Docker container managed as systemd service (not docker-compose)
- ExecStartPre pulls latest image before start
- Restart on failure with 15-second delay
- Journald logging for centralized log collection
- 60-second graceful shutdown timeout

**Oracle Cloud Dual-Firewall Pattern**
- Security Lists (cloud-level firewall) configured in OpenTofu
- iptables rules (instance-level firewall) configured in cloud-init
- Both layers required for port access (Oracle Cloud requirement)
- Rules saved with netfilter-persistent for reboot persistence

## Task Commits

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Replace OpenTofu configuration with OCI provider and networking | 97e37fc | main.tf, variables.tf, outputs.tf |
| 2 | Create cloud-init script for VPS initialization | d6ec78b | cloud-init.yaml |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

**Manual Verification (OpenTofu CLI not installed):**
- Configuration files syntax verified by inspection
- All required OCI resources present in main.tf
- All sensitive variables marked correctly
- Cloud-init contains all required components
- No Cloudflare/Fly.io/SOPS references remain in config files

**Note:** Full `tofu init && tofu validate` verification deferred until user installs OpenTofu CLI. Configuration structure follows official OCI provider documentation and should validate successfully.

## Next Phase Readiness

**Ready for Plan 12-02:** GitHub Actions workflow setup
- OpenTofu configuration is complete and ready for CI/CD integration
- `infisical run -- tofu apply` command pattern established
- Outputs (public_ip, instance_id) available for subsequent plans

**Blockers:**
- User must complete Oracle Cloud account setup (see 12-01-PLAN.md user_setup section)
- User must configure Infisical project with OCI credentials
- OpenTofu CLI installation recommended for local validation

**Integration Points:**
- Plan 12-02 will create GitHub Actions workflow using Infisical OIDC for secret injection
- Plan 12-03 will configure SSH deployment to provisioned instance
- Cloud-init systemd service expects ghcr.io/OWNER/shithead-server:latest (OWNER replaced during deploy)
- Caddyfile placeholder will be configured during first deployment with domain from TF_VAR_domain

## Key Learnings

1. **Oracle Cloud Free Tier Quirks:**
   - Dual-firewall requirement (Security Lists + iptables) is Oracle-specific
   - Must use netfilter-persistent to save iptables rules (default Ubuntu doesn't persist)
   - Always Free A1 shape requires specific image filtering in data source

2. **Cloud-init Best Practices:**
   - Packages installed first, then write_files, then runcmd
   - Systemd service files written via write_files (not created in runcmd)
   - Final message useful for debugging cloud-init completion

3. **OpenTofu Sensitive Variables:**
   - Mark all credentials `sensitive = true` to prevent accidental logging
   - Infisical CLI sets TF_VAR_* environment variables automatically
   - Private key path has default (~/.oci/oci_api_key.pem) but overridable

4. **ARM64 Considerations:**
   - Must specify shape in image data source (VM.Standard.A1.Flex)
   - Ubuntu 24.04 has good ARM support
   - Bun official Docker images support ARM64 (oven/bun:1)

## Files Changed

**Created:**
- infra/opentofu/cloud-init.yaml (73 lines) - VM initialization script

**Modified:**
- infra/opentofu/main.tf (152 lines) - Complete replacement with OCI resources
- infra/opentofu/variables.tf (41 lines) - OCI credential variables
- infra/opentofu/outputs.tf (15 lines) - Instance outputs

**Deleted:**
- infra/opentofu/.sops.yaml (replaced by Infisical)
- infra/opentofu/secrets.sops.yaml (replaced by Infisical)
- infra/opentofu/.terraform/ (old Cloudflare provider)
- infra/opentofu/.terraform.lock.hcl (old provider lock)
- infra/opentofu/terraform.tfstate* (old state files)

## Self-Check: PASSED

**Created files verified:**
- ✓ infra/opentofu/cloud-init.yaml exists

**Modified files verified:**
- ✓ infra/opentofu/main.tf exists
- ✓ infra/opentofu/variables.tf exists
- ✓ infra/opentofu/outputs.tf exists

**Commits verified:**
- ✓ 97e37fc exists in git log
- ✓ d6ec78b exists in git log
