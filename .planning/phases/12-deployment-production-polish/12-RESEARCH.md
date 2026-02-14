# Phase 12: Deployment & Production Polish - Research

**Researched:** 2026-02-14
**Domain:** Infrastructure automation, deployment, secret management
**Confidence:** MEDIUM

## Summary

This research focuses on deploying a Bun WebSocket game server to Oracle Cloud Always Free tier infrastructure. The user has made specific locked infrastructure choices: Oracle Cloud VPS (Ampere A1 ARM instances), OpenTofu for IaC, Infisical for secret management, and GitHub Actions for CI/CD.

The current codebase already has Docker containers configured and existing GitHub Actions workflows (currently deploying to Cloudflare Pages + Fly.io via SOPS). The migration involves:
1. Provisioning Oracle Cloud Ampere A1 compute instance via OpenTofu
2. Replacing SOPS with Infisical for secret management
3. Deploying Docker container to VPS via SSH in GitHub Actions
4. Configuring Caddy reverse proxy for automatic HTTPS and WebSocket support
5. Setting up systemd services for container management
6. Implementing monitoring and cleanup for production readiness

The server already supports unified deployment (serves both static files and WebSocket from single Bun process), has health check endpoint with metrics, 24-hour room cleanup, and graceful shutdown handling.

**Primary recommendation:** Use Docker on VPS with Caddy reverse proxy, systemd service management, and Infisical CLI for secret injection during OpenTofu apply and GitHub Actions deploy.

##User Constraints (from phase context)

### Locked Decisions
- **Oracle Cloud Always Free Tier VPS** — Ampere A1 ARM instances (4 OCPUs, 24 GB RAM total)
- **OpenTofu for IaC** — Infrastructure as Code using OpenTofu with OCI provider
- **Infisical for secret management** — NOT GitHub Secrets alone, use Infisical for managing deployment secrets
- **GitHub Actions for CI/CD** — Deploy pipeline using GitHub Actions
- **Unified deployment** — Single VPS running both client and server (Bun serves static files + WebSocket)

### Claude's Discretion
- Deployment method (Docker on VPS vs direct Bun install)
- Reverse proxy setup (nginx, Caddy, or Bun direct)
- SSL/TLS approach (Let's Encrypt, Caddy auto-SSL, etc.)
- Monitoring approach
- Backup strategy

### Deferred Ideas (OUT OF SCOPE)
- None specified

## Standard Stack

### Core Infrastructure
| Component | Version/Type | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| Oracle Cloud | Always Free tier | Hosting infrastructure | User requirement - free tier ARM instances |
| OpenTofu | >= 1.8 | Infrastructure as Code | Open-source Terraform fork, user requirement |
| Infisical | Latest | Secret management | User requirement - replaces SOPS |
| GitHub Actions | N/A | CI/CD pipeline | User requirement - already in use |
| Docker | Latest | Container runtime | Already configured, ARM64 support |
| Bun | 1.x | Application runtime | Already in use - native WebSocket support |

### Supporting Components
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Caddy | 2.x | Reverse proxy + HTTPS | Automatic Let's Encrypt, WebSocket support |
| systemd | N/A | Service management | Container lifecycle, auto-restart |
| iptables | N/A | OS-level firewall | Required on Oracle Cloud Ubuntu/OL images |
| cloud-init | N/A | VM initialization | Docker installation at instance creation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Caddy | nginx | nginx requires manual Let's Encrypt setup, more complex config |
| Docker | Direct Bun install | Docker provides isolation, easier rollback, consistent environments |
| systemd | Manual process | systemd provides auto-restart, boot startup, graceful shutdown |

**Installation (on VPS):**
```bash
# Docker installation via cloud-init
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# Caddy installation
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## Architecture Patterns

### Recommended Infrastructure Structure
```
Oracle Cloud (OCI)
├── VCN (Virtual Cloud Network)
│   ├── Subnet (public)
│   ├── Internet Gateway
│   └── Security Lists (ports 80, 443, 22)
├── Ampere A1 Compute Instance
│   ├── VM.Standard.A1.Flex (4 OCPU, 24 GB RAM)
│   ├── 200 GB boot volume
│   └── Ubuntu 24.04 ARM64
└── Reserved Public IP

Local: infra/opentofu/
├── main.tf              # Provider config, compute instance
├── variables.tf         # Input variables
├── outputs.tf          # Public IP, instance ID
├── cloud-init.yaml     # Docker + initial setup
└── terraform.tfvars    # Non-sensitive values

VPS Layout:
/opt/
├── shithead/
│   ├── docker-compose.yml
│   ├── .env              # From Infisical
│   └── Caddyfile
└── backups/              # Optional: application state
```

### Pattern 1: OpenTofu with Infisical Secret Injection
**What:** Use Infisical CLI to inject secrets at OpenTofu apply time
**When to use:** Provisioning infrastructure with API keys, avoiding state file secrets

**Example:**
```hcl
# main.tf
terraform {
  required_version = ">= 1.8"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

variable "tenancy_ocid" {
  description = "OCI Tenancy OCID"
  type        = string
  sensitive   = true
}

variable "user_ocid" {
  description = "OCI User OCID"
  type        = string
  sensitive   = true
}

variable "fingerprint" {
  description = "API Key Fingerprint"
  type        = string
  sensitive   = true
}

variable "private_key_path" {
  description = "Path to OCI API private key"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "OCI Region"
  type        = string
  default     = "us-phoenix-1"
}

# Compute instance resource
resource "oci_core_instance" "shithead_server" {
  availability_domain = data.oci_identity_availability_domain.ad.name
  compartment_id      = var.tenancy_ocid
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 4
    memory_in_gbs = 24
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = 100
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data          = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  display_name = "shithead-game-server"
}
```

**Apply with Infisical:**
```bash
# Inject secrets from Infisical at apply time
infisical run --path=/infrastructure/oci -- tofu apply
```

### Pattern 2: Unified Bun Server (Static + WebSocket)
**What:** Single Bun.serve() handles both static files and WebSocket
**When to use:** Unified deployment on single VPS (user requirement)

**Example (already implemented in codebase):**
```typescript
// packages/server/src/index.ts (simplified)
const clientDistPath = join(import.meta.dir, '../../client/dist');
const serveStaticFiles = await Bun.file(join(clientDistPath, 'index.html')).exists();

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,

  async fetch(req, server) {
    const url = new URL(req.url);

    // Health check with metrics
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        activeRooms: roomManager.getRoomCount(),
        activePlayers: roomManager.getPlayerCount(),
        activeConnections: activeConnections.size,
      }));
    }

    // WebSocket upgrade
    if (url.pathname === '/game-ws') {
      return server.upgrade(req, { data: { playerId: nanoid() } })
        ? undefined
        : new Response('Upgrade failed', { status: 500 });
    }

    // Serve static files (client build)
    if (serveStaticFiles) {
      const filePath = join(clientDistPath, url.pathname === '/' ? 'index.html' : url.pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) return new Response(file);
      return new Response(Bun.file(join(clientDistPath, 'index.html'))); // SPA fallback
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) { /* ... */ },
    message(ws, message) { /* ... */ },
    close(ws) { /* ... */ },
  },
});
```

### Pattern 3: Systemd Service for Docker Container
**What:** Manage Docker container lifecycle with systemd
**When to use:** Production VPS deployment with auto-restart, graceful shutdown

**Example:**
```ini
# /etc/systemd/system/shithead-game.service
[Unit]
Description=Shithead Game Server (Docker)
After=docker.service
Requires=docker.service
Wants=network-online.target

[Service]
Type=simple
Restart=on-failure
RestartSec=15
StartLimitIntervalSec=300
StartLimitBurst=5

WorkingDirectory=/opt/shithead
EnvironmentFile=/opt/shithead/.env

# Cleanup old container
ExecStartPre=-/usr/bin/docker stop shithead-game
ExecStartPre=-/usr/bin/docker rm shithead-game

# Pull latest image
ExecStartPre=/usr/bin/docker pull ghcr.io/user/shithead-game:latest

# Start container
ExecStart=/usr/bin/docker run \
  --name shithead-game \
  --rm \
  --log-driver=journald \
  -p 3000:3000 \
  --env-file /opt/shithead/.env \
  ghcr.io/user/shithead-game:latest

# Graceful shutdown (SIGTERM to container)
ExecStop=/usr/bin/docker stop -t 60 shithead-game

TimeoutStartSec=120
TimeoutStopSec=65

[Install]
WantedBy=multi-user.target
```

**Commands:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable shithead-game
sudo systemctl start shithead-game
sudo systemctl status shithead-game
journalctl -u shithead-game -f  # View logs
```

### Pattern 4: Caddy Reverse Proxy with Auto-HTTPS
**What:** Caddy handles HTTPS, WebSocket proxying, automatic Let's Encrypt
**When to use:** Production deployment requiring SSL/TLS

**Example:**
```caddyfile
# /etc/caddy/Caddyfile
shithead.example.com {
    reverse_proxy localhost:3000

    # Caddy automatically handles WebSocket upgrades
    # No special configuration needed for WebSocket

    log {
        output file /var/log/caddy/shithead.log
    }
}
```

**Key features:**
- Automatic HTTPS via Let's Encrypt (ports 80/443 must be open)
- WebSocket upgrade detection (no special config needed)
- HTTP/2 support
- Automatic certificate renewal

### Pattern 5: GitHub Actions SSH Deploy
**What:** Deploy to VPS via SSH, pull Docker image, restart service
**When to use:** CI/CD pipeline for VPS deployment

**Example:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Oracle Cloud

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write  # Required for Infisical OIDC

    steps:
      - uses: actions/checkout@v4

      # Fetch secrets from Infisical
      - name: Fetch Infisical secrets
        uses: Infisical/secrets-action@v1
        with:
          method: oidc
          env-slug: production
          project-slug: shithead-game

      # Build and push Docker image
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push (ARM64)
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/server/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/shithead-server:latest
          platforms: linux/arm64
          target: production
          cache-from: type=gha
          cache-to: type=gha,mode=max

      # Deploy to VPS
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ env.VPS_SSH_PRIVATE_KEY }}

      - name: Deploy to Oracle Cloud VPS
        run: |
          ssh -o StrictHostKeyChecking=no ubuntu@${{ env.VPS_PUBLIC_IP }} << 'ENDSSH'
            # Pull latest image
            docker pull ghcr.io/${{ github.repository_owner }}/shithead-server:latest

            # Restart systemd service
            sudo systemctl restart shithead-game

            # Wait and health check
            sleep 10
            curl -f http://localhost:3000/health || exit 1

            echo "Deployment successful!"
          ENDSSH
```

### Anti-Patterns to Avoid
- **Secrets in Terraform state:** Use Infisical CLI injection, not direct values in .tf files
- **Building on VPS:** Build Docker images in GitHub Actions, not on the VPS (ARM compile is slow)
- **No health checks:** Always verify service is healthy before considering deploy successful
- **Hardcoded IPs:** Use Terraform outputs, environment variables for dynamic values
- **Manual SSL management:** Use Caddy auto-HTTPS, not manual certbot
- **Ignoring iptables:** Oracle Cloud instances require iptables rules IN ADDITION to Security Lists

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTPS certificates | Manual certbot + cron | Caddy auto-HTTPS | Caddy handles issuance, renewal, serving automatically |
| Secret injection | Bash scripts parsing YAML | Infisical CLI | Secure auth (OIDC), audit logs, dynamic secrets, proper encryption |
| Container orchestration | Custom bash restart scripts | systemd services | Handles dependencies, restarts, logging, graceful shutdown |
| Zero-downtime deploy | Custom rolling update | Docker health checks + systemd | Proven pattern, handles rollback, health verification |
| Log aggregation | Custom file parsing | journalctl (systemd) | Structured logs, automatic capture of stdout/stderr, filtering |
| Infrastructure provisioning | Manual OCI console | OpenTofu/Terraform | Reproducible, version controlled, dependency tracking |

**Key insight:** Oracle Cloud + VPS deployment has well-established tooling. Use Caddy for HTTPS (not manual certbot), Infisical CLI for secrets (not env files in git), systemd for container management (not custom scripts).

## Common Pitfalls

### Pitfall 1: Oracle Cloud Requires TWO Firewall Layers
**What goes wrong:** You open ports in OCI Security Lists but connections still fail
**Why it happens:** Oracle Cloud Ubuntu/Oracle Linux images have iptables rules that block traffic by default
**How to avoid:** Configure BOTH Security Lists (OCI) AND iptables rules (OS)
**Warning signs:** Security List shows ports 80/443 open but `curl` from outside times out

**Solution:**
```bash
# 1. OCI Security List (via OpenTofu)
resource "oci_core_security_list" "public" {
  # ... VCN/compartment config ...

  ingress_security_rules {
    protocol = "6"  # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol = "6"  # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }
}

# 2. iptables rules (via cloud-init or manual)
# Edit /etc/iptables/rules.v4 and add BEFORE the final REJECT rule:
-A INPUT -p tcp -m state --state NEW -m tcp --dport 80 -j ACCEPT
-A INPUT -p tcp -m state --state NEW -m tcp --dport 443 -j ACCEPT

# Apply: sudo iptables-restore < /etc/iptables/rules.v4
```

### Pitfall 2: ARM64 Architecture Build Issues
**What goes wrong:** Docker image builds fail or container won't start on Oracle Cloud
**Why it happens:** Oracle Cloud Always Free uses ARM64 (Ampere A1), not x86_64
**How to avoid:** Build for `linux/arm64` platform explicitly, test locally with ARM emulation
**Warning signs:** "exec format error" when running container on VPS

**Solution:**
```yaml
# GitHub Actions: specify platform
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    platforms: linux/arm64  # CRITICAL: ARM architecture

# Test locally with ARM emulation:
docker buildx build --platform linux/arm64 -t myapp:arm64 .
docker run --platform linux/arm64 myapp:arm64
```

### Pitfall 3: Infisical Secrets Not Available at OpenTofu Apply
**What goes wrong:** OpenTofu apply fails with "variable not set" errors
**Why it happens:** Terraform/OpenTofu doesn't know about Infisical secrets without CLI wrapper
**How to avoid:** Use `infisical run` wrapper to inject secrets as environment variables
**Warning signs:** Variables marked `sensitive=true` have empty values during apply

**Solution:**
```bash
# DON'T: tofu apply
# Secrets not available to Terraform

# DO: Wrap with Infisical CLI
infisical run --path=/infrastructure/oci -- tofu apply

# Infisical reads secrets, injects as TF_VAR_* environment variables
# Terraform picks them up automatically
```

### Pitfall 4: Docker Container Exits Immediately on VPS
**What goes wrong:** systemd service starts but container exits with code 0
**Why it happens:** Bun server fails to start (missing env vars, port conflict)
**How to avoid:** Check logs with `journalctl -u service-name -n 50`, ensure health check passes
**Warning signs:** systemd shows "active" briefly then "inactive (dead)"

**Solution:**
```bash
# Check container logs
journalctl -u shithead-game -n 100

# Run container manually to debug
docker run --rm -it --env-file /opt/shithead/.env ghcr.io/user/shithead-game:latest

# Check health endpoint
curl http://localhost:3000/health

# Common issues:
# - Missing .env file on VPS
# - PORT environment variable not set
# - ALLOWED_ORIGINS empty in production
```

### Pitfall 5: Let's Encrypt Rate Limits During Testing
**What goes wrong:** Caddy fails to get HTTPS certificate after multiple attempts
**Why it happens:** Let's Encrypt rate limits (5 failures per hour, 50 certs per domain per week)
**How to avoid:** Test with HTTP first, use staging environment, ensure DNS is correct BEFORE enabling HTTPS
**Warning signs:** Caddy logs show "429 Too Many Requests" from Let's Encrypt

**Solution:**
```bash
# 1. Test HTTP first (no TLS)
# Caddyfile:
http://shithead.example.com {
    reverse_proxy localhost:3000
}

# 2. Verify DNS propagation BEFORE enabling HTTPS
dig +short shithead.example.com  # Should show VPS public IP

# 3. Use Caddy staging (testing)
https://shithead.example.com {
    tls {
        ca https://acme-staging-v02.api.letsencrypt.org/directory
    }
    reverse_proxy localhost:3000
}

# 4. Once working, remove staging CA line for production
```

### Pitfall 6: WebSocket Connections Drop After 60 Seconds
**What goes wrong:** WebSocket connections close unexpectedly after ~60 seconds idle
**Why it happens:** Load balancer/proxy idle timeout, no keepalive ping/pong
**How to avoid:** Implement WebSocket ping/pong heartbeat every 30 seconds
**Warning signs:** Connections close with code 1006 (abnormal closure) when idle

**Solution (already in codebase via Bun native support):**
```typescript
// Bun.serve() websocket config
websocket: {
  idleTimeout: 120,  // 2 minutes
  maxPayloadLength: 64 * 1024,  // 64KB

  // Bun automatically sends ping frames
  // Implement application-level heartbeat for extra reliability:
  open(ws) {
    ws.data.heartbeatInterval = setInterval(() => {
      ws.send(JSON.stringify({ type: 'ping' }));
    }, 30000);  // Every 30 seconds
  },

  close(ws) {
    clearInterval(ws.data.heartbeatInterval);
  },
}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Oracle Cloud Compute Instance (OpenTofu)
```hcl
# Source: https://github.com/AmpereComputing/terraform-oci-ampere-a1
# Adapted for Always Free tier limits

# Get Ubuntu ARM64 image
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.tenancy_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# Availability domain
data "oci_identity_availability_domain" "ad" {
  compartment_id = var.tenancy_ocid
  ad_number      = 1
}

# VCN and networking
resource "oci_core_vcn" "main" {
  compartment_id = var.tenancy_ocid
  display_name   = "shithead-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "shithead"
}

resource "oci_core_internet_gateway" "main" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "shithead-igw"
}

resource "oci_core_route_table" "public" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "shithead-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

resource "oci_core_security_list" "public" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "shithead-public-sl"

  # SSH
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 22
      max = 22
    }
  }

  # HTTP
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }

  # HTTPS
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }

  # Allow all outbound
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.tenancy_ocid
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "shithead-public-subnet"
  route_table_id    = oci_core_route_table.public.id
  security_list_ids = [oci_core_security_list.public.id]
  dns_label         = "public"
}

# Compute instance (Always Free: 4 OCPU, 24 GB RAM)
resource "oci_core_instance" "shithead_server" {
  availability_domain = data.oci_identity_availability_domain.ad.name
  compartment_id      = var.tenancy_ocid
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 4   # Max for Always Free
    memory_in_gbs = 24  # Max for Always Free
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = 100  # Max 200 GB total (save space for backups)
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    display_name     = "shithead-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  display_name = "shithead-game-server"
}

output "public_ip" {
  value = oci_core_instance.shithead_server.public_ip
}
```

### Cloud-Init Script (Docker Installation)
```yaml
# cloud-init.yaml
# Source: https://www.ateam-oracle.com/automate-docker-setup-on-your-oci-compute-instance

#cloud-config

# Update and upgrade packages
package_update: true
package_upgrade: true

# Install required packages
packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release

runcmd:
  # Install Docker
  - curl -fsSL https://get.docker.com | sh
  - usermod -aG docker ubuntu

  # Install Docker Compose
  - curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  - chmod +x /usr/local/bin/docker-compose

  # Open ports in iptables (CRITICAL for Oracle Cloud)
  - iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  - iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  - netfilter-persistent save

  # Create application directory
  - mkdir -p /opt/shithead
  - chown ubuntu:ubuntu /opt/shithead

  # Enable Docker service
  - systemctl enable docker
  - systemctl start docker

final_message: "Cloud-init complete. Docker installed. Ports 80/443 open."
```

### Infisical CLI with OpenTofu
```bash
# Source: https://infisical.com/blog/how-to-manage-secrets-on-terraform-using-infisical

# Install Infisical CLI
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical

# Authenticate (one-time setup)
infisical login

# Apply OpenTofu with secret injection
# Infisical reads secrets from project, injects as TF_VAR_* env vars
infisical run --path=/infrastructure/oci --env=production -- tofu apply

# Example: Secret named "tenancy_ocid" becomes TF_VAR_tenancy_ocid
# OpenTofu reads it as variable "tenancy_ocid"
```

### Room Cleanup (Already Implemented)
```typescript
// Source: packages/server/src/rooms/RoomManager.ts (existing code)

export class RoomManager {
  private lastActivityTimes: Map<string, number>; // roomCode -> timestamp

  constructor() {
    this.rooms = new Map();
    this.playerRoomIndex = new Map();
    this.lastActivityTimes = new Map();

    // Start cleanup interval - runs every 5 minutes
    setInterval(() => this.cleanupAbandonedRooms(), 5 * 60 * 1000);
  }

  markActivity(roomCode: string): void {
    this.lastActivityTimes.set(roomCode, Date.now());
  }

  private cleanupAbandonedRooms(): void {
    const now = Date.now();
    const abandonedThreshold = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    for (const [roomCode, lastActivity] of this.lastActivityTimes.entries()) {
      if (now - lastActivity > abandonedThreshold) {
        console.log(`Cleaning up abandoned room: ${roomCode}`);

        const room = this.rooms.get(roomCode);
        if (room) {
          const state = room.getState();
          state.players.forEach(player => {
            this.playerRoomIndex.delete(player.id);
          });
        }

        this.rooms.delete(roomCode);
        this.lastActivityTimes.delete(roomCode);
      }
    }
  }
}

// Activity tracking happens on:
// - createRoom()
// - joinRoom()
// - startGame()
// - leaveRoom() (if room still exists)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SOPS for secrets | Infisical | 2024-2025 | Better OIDC auth, audit logs, dynamic secrets, easier GitOps |
| Terraform | OpenTofu | 2023 | Open-source fork after Terraform license change (BSL) |
| Manual certbot | Caddy auto-HTTPS | 2020+ | Zero-config HTTPS, automatic renewal, simpler deployment |
| nginx + manual WebSocket config | Caddy transparent WebSocket | 2020+ | No special WebSocket proxy config needed |
| Long-lived deploy keys | GitHub Actions OIDC | 2023+ | No static secrets, automatic rotation, better security |
| Docker Compose restart | systemd + health checks | 2024+ | Better integration with OS, graceful shutdown, journald logs |

**Deprecated/outdated:**
- **Manual Let's Encrypt with certbot:** Caddy handles automatically, no cron jobs needed
- **SOPS with age/gpg keys:** Infisical provides OIDC auth, no key management
- **Terraform after BSL license:** OpenTofu is the open-source continuation
- **Long-lived SSH keys in GitHub Secrets:** Use SSH keys from Infisical, rotatable
- **Building Docker images on VPS:** Build in GitHub Actions (faster, cached, ARM64 platform specified)

## Open Questions

1. **Oracle Cloud Always Free capacity availability**
   - What we know: Ampere A1 instances often show "Out of host capacity" errors
   - What's unclear: Which regions have actual availability in 2026
   - Recommendation: Try multiple regions (Phoenix, Ashburn, Frankfurt, London), use automated provisioning script that retries

2. **Backup strategy for in-memory game state**
   - What we know: Game rooms are in-memory only, no database
   - What's unclear: Whether to add persistence layer or accept ephemeral state
   - Recommendation: Start with ephemeral (matches "abandoned rooms cleaned up after 24 hours" requirement), add Redis persistence if needed later

3. **Monitoring/alerting approach**
   - What we know: Health endpoint exposes activeRooms, activePlayers, activeConnections
   - What's unclear: Whether to add external monitoring (UptimeRobot, Grafana) or just rely on journalctl logs
   - Recommendation: Start with journalctl + manual health checks, add UptimeRobot free tier for uptime monitoring

4. **Rollback strategy if deployment fails**
   - What we know: systemd pulls :latest tag, no version pinning
   - What's unclear: How to quickly rollback to previous version
   - Recommendation: Tag images with git SHA (${{ github.sha }}), document manual rollback process (update systemd to use specific SHA tag, restart)

## Sources

### Primary (HIGH confidence)
- [Oracle Cloud Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) - Always Free tier limits (4 OCPU, 24 GB, 200 GB storage)
- [Infisical GitHub Actions Integration](https://infisical.com/docs/integrations/cicd/githubactions) - OIDC auth for GitHub Actions
- [Infisical Terraform/OpenTofu](https://infisical.com/blog/how-to-manage-secrets-on-terraform-using-infisical) - Secret injection with Infisical CLI
- [AmpereComputing terraform-oci-ampere-a1](https://github.com/AmpereComputing/terraform-oci-ampere-a1) - Terraform module for A1 instances
- [Bun WebSocket Servers](https://oneuptime.com/blog/post/2026-01-31-bun-websocket-servers/view) - Production-ready Bun.serve() patterns
- [Docker Containers as Systemd Services](https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-containers-as-systemd-services/view) - Complete systemd service template

### Secondary (MEDIUM confidence)
- [Oracle Cloud Automate Docker Setup](https://www.ateam-oracle.com/automate-docker-setup-on-your-oci-compute-instance) - cloud-init Docker installation
- [Caddy Reverse Proxy Quick-Start](https://caddyserver.com/docs/quick-starts/reverse-proxy) - Automatic HTTPS configuration
- [Deploy Docker Containers to VPS with GitHub Actions](https://davidhuertas.dev/en/posts/deploy-docker-containers-in-vps-with-github-actions/) - SSH deployment pattern
- [OCI Terraform Provider Configuration](https://docs.oracle.com/en-us/iaas/Content/dev/terraform/configuring.htm) - API key authentication
- [Oracle Cloud Security Rules](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securityrules.htm) - Security Lists and ingress rules
- [Opening Ports 80/443 on Oracle Cloud](https://marcinmitruk.link/posts/how-to-open-ports-80-and-443-on-an-oracle-cloud-instance/) - iptables + Security Lists

### Tertiary (LOW confidence - needs validation)
- [WebSocket Room Cleanup Patterns](https://medium.com/voodoo-engineering/websockets-on-production-with-node-js-bdc82d07bb9f) - Cleanup interval patterns (verified in existing codebase)
- [VPS Backup Strategies 2026](https://www.youstable.com/blog/set-up-and-manage-vps-server-backups) - Backup frequency and retention recommendations
- [Zero Downtime Docker Compose](https://github.com/wowu/docker-rollout) - docker-rollout tool (not using Docker Compose, but pattern applies)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Oracle Cloud docs, Infisical docs, official GitHub Actions, Caddy docs are all authoritative
- Architecture: MEDIUM - Patterns from official sources but not all tested together (OCI + Infisical + Caddy combination is novel)
- Pitfalls: MEDIUM - Oracle Cloud dual-firewall is documented, ARM64 builds are known issue, Infisical CLI usage confirmed
- Deployment pattern: MEDIUM - systemd + Docker is standard, GitHub Actions SSH deploy is well-documented, but Oracle Cloud specific nuances need testing

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - infrastructure tools are relatively stable)

**Key uncertainties:**
- Oracle Cloud Ampere A1 availability (capacity issues common)
- Infisical + OpenTofu integration (documented but not widely used yet)
- ARM64 Docker build compatibility with existing Dockerfiles (likely works but needs testing)
- Bun production deployment patterns (Bun is still maturing for production use)
