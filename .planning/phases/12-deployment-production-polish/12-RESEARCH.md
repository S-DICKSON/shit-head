# Phase 12: Deployment & Production Polish - Research

**Researched:** 2026-02-08 (Updated to reflect split deployment architecture)
**Domain:** Bun monorepo deployment with WebSocket server and Vue/Vite SPA
**Confidence:** HIGH

## Summary

Phase 12 deploys a Bun monorepo with native WebSocket server and Vue/Vite SPA client using **split deployment architecture**: Cloudflare Pages for static frontend assets, Fly.io for WebSocket/API backend, and GHCR for Docker image storage with SHA-tagged rollback capability.

**Key architecture:** Client built assets (`vite build` → `dist/`) deployed to Cloudflare Pages CDN (free, unlimited bandwidth, 300+ edge locations). Server deployed to Fly.io as Docker container (free tier, persistent WebSocket connections, no spin-down). Two separate origins require Origin header validation for WebSocket security and CORS configuration for any HTTP API endpoints.

**Primary recommendation:** Deploy client to Cloudflare Pages (wrangler-action from GitHub Actions), server to Fly.io (Docker container from GHCR), manage infrastructure with OpenTofu (fly-apps/fly + cloudflare/cloudflare providers). Client uses `VITE_SERVER_URL` environment variable (set in CF Pages dashboard) to connect WebSocket to Fly.io origin. Server validates Origin header during WebSocket upgrade to prevent CSWSH attacks.

**Rationale:** Split deployment provides CDN performance for static assets (global edge caching), independent scaling (client CDN vs server resources), and separation of concerns (client updates without server restarts). Free tier across all services ($0/month). OpenTofu manages both providers as IaC.

## Standard Stack

The split deployment stack for Bun monorepo with WebSocket:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Cloudflare Pages | 2026 | Static client hosting (Vue/Vite build output) | Free unlimited bandwidth, 300+ edge locations, GitHub Actions integration, preview deployments on PRs |
| Fly.io | 2026 | WebSocket/API server hosting | $0 (3 VMs free), full persistent connections, no spin-down, Docker native, global anycast |
| GitHub Container Registry | 2026 | Docker image storage | Free (500MB private, unlimited public), rollback via SHA tags, GitHub-native auth |
| GitHub Actions | 2026 | CI/CD pipeline | Free (2000 min/month), deploy to both CF Pages + Fly.io, Docker layer caching |
| Docker Buildx | Latest | Multi-stage server builds | Layer caching, parallel builds, multi-platform support |
| OpenTofu | 1.8+ | Infrastructure as Code | Manage Fly.io + Cloudflare with fly-apps/fly (~0.1) + cloudflare/cloudflare (4.x) providers |

**Why split deployment:**
- **Performance:** Static assets served from 300+ CF edge locations vs single Fly.io region
- **Bandwidth:** CF Pages unlimited free bandwidth vs Fly.io 160GB/month free tier
- **Scaling:** CDN auto-scales globally, server scales independently with Fly.io machines
- **Cost:** Both free ($0/month), better resource utilization than unified
- **Independence:** Client updates deploy to CDN without server restarts

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cloudflare/wrangler-action | v3 | Deploy to CF Pages from GH Actions | Required for CI/CD deployment (replaces deprecated pages-action) |
| superfly/flyctl-actions | v1.5 | Fly.io GH Actions deploy | Deploy to Fly.io from CI with specific image tag |
| docker/metadata-action | v5 | Docker tag generation | Automates SHA-based tagging in CI for rollback capability |
| nanoid | Already in use | Room code generation | Collision-resistant short codes for room IDs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cloudflare Pages | Vercel | Vercel: 100GB bandwidth (not unlimited), commercial use discouraged on free tier |
| Cloudflare Pages | Netlify | Netlify: 100GB bandwidth (not unlimited), 300 build minutes vs CF Pages 500 |
| Cloudflare Pages | GitHub Pages | No build-time env vars (can't set VITE_SERVER_URL dynamically) |
| Fly.io | Railway | Railway better DX but costs $5/month vs Fly.io $0 |
| Split deployment | Unified (Bun serves both) | Unified simpler but loses CDN performance and bandwidth savings |
| GHCR | Docker Hub | 200MB free vs 500MB GHCR, but more widely known |

**Installation:**
```bash
# Cloudflare account setup (one-time)
# 1. Create Cloudflare account (free)
# 2. Create API token: My Profile > API Tokens > Create Token
#    Permissions: Account.Cloudflare Pages (Edit)
# 3. Get Account ID: Workers & Pages > Account ID in right sidebar
# 4. Add to GitHub repo secrets: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN

# Fly.io setup (one-time)
curl -L https://fly.io/install.sh | sh
fly auth login
fly launch  # Interactive setup, creates fly.toml

# GHCR authentication (handled by GitHub Actions)
# Automatic via docker/login-action with GITHUB_TOKEN
```

## Architecture Patterns

### Recommended Project Structure
```
.github/workflows/
├── ci.yml                   # PR checks (type-check, lint, test, build)
├── deploy.yml               # Production deploy (build server → GHCR, deploy client → CF Pages, deploy server → Fly.io)
└── rollback.yml             # Manual rollback workflow (server: deploy previous SHA, client: deploy previous commit)
packages/
├── server/
│   ├── Dockerfile           # Server-only build (no client assets)
│   ├── src/
│   │   ├── index.ts         # Bun.serve with /health, /game-ws (no static file serving)
│   │   ├── websocket/handlers.ts
│   │   └── rooms/RoomManager.ts
│   └── package.json
├── client/
│   ├── src/
│   │   ├── services/websocket.ts  # Uses import.meta.env.VITE_SERVER_URL
│   │   └── App.vue
│   ├── vite.config.ts       # Build config (output dist/)
│   └── package.json
└── shared/
    └── types/
infra/opentofu/
├── main.tf                  # Fly.io app + Cloudflare Pages project (two providers)
├── fly.tf                   # Fly.io resources (app, machine, secrets)
├── cloudflare.tf            # Cloudflare resources (Pages project, custom domain)
├── variables.tf
└── outputs.tf
fly.toml                     # Fly.io server config (WebSocket/API only)
wrangler.toml                # Cloudflare Pages config (optional, can use CLI args)
```

**Key differences from unified architecture:**
- Separate deployments: Client to CF Pages, Server to Fly.io (two GH Actions jobs)
- Server Dockerfile: No client build stage, server-only
- Client WebSocket: Uses `VITE_SERVER_URL` env var pointing to Fly.io
- OpenTofu: Two providers (fly-apps/fly + cloudflare/cloudflare)
- Origin validation: Required (different origins = CSWSH risk)

### Pattern 1: Server-Only Dockerfile (Split Deployment)
**What:** Single-stage Dockerfile builds and runs Bun server (no client assets)
**When to use:** Split deployment where client deployed separately to CF Pages
**Example:**
```dockerfile
# Source: Docker multi-stage best practices + Bun documentation
# packages/server/Dockerfile (UPDATED for split deployment)

FROM oven/bun:1 AS base
WORKDIR /app

# Copy package files for dependency resolution
COPY package.json bun.lockb* tsconfig.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy server and shared source
COPY packages/server/ ./packages/server/
COPY packages/shared/ ./packages/shared/

# Expose server port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start server (WebSocket + API only, no static files)
CMD ["bun", "packages/server/src/index.ts"]
```

**Key elements:**
- No client build stage (client deployed to CF Pages separately)
- Production dependencies only (no Vite or client dev tools)
- Smaller image size (~100MB vs ~300MB unified)
- Faster builds (no client asset compilation in Docker)

### Pattern 2: Server WebSocket-Only (Split Deployment)
**What:** Bun.serve() handles WebSocket and API endpoints only (no static file serving)
**When to use:** Split deployment where client served from CF Pages
**Example:**
```typescript
// Source: https://bun.com/docs/runtime/http/websockets
// packages/server/src/index.ts (UPDATED for split deployment)

import { APP_VERSION } from '@shit-head/shared';
import { handleMessage, handleClose, handleOpen, roomManager } from './websocket/handlers';
import type { WebSocketData } from './websocket/handlers';
import { nanoid } from 'nanoid';

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];

// CRITICAL: In development, allow localhost. In production, must explicitly set ALLOWED_ORIGINS.
if (NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:4173');
}

// Track active connections for graceful shutdown
const activeConnections = new Set<ServerWebSocket<WebSocketData>>();

const server = Bun.serve<WebSocketData>({
  port: PORT,

  async fetch(req, server) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          version: APP_VERSION,
          uptime: process.uptime(),
          activeRooms: roomManager.getRoomCount(),
          activePlayers: roomManager.getPlayerCount(),
          activeConnections: activeConnections.size,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Health check can be public
          },
        }
      );
    }

    // WebSocket upgrade endpoint
    if (url.pathname === '/game-ws') {
      const origin = req.headers.get('Origin');

      // CRITICAL: Origin validation prevents Cross-Site WebSocket Hijacking (CSWSH)
      // Split deployment = different origins = MUST validate
      if (NODE_ENV === 'production' && origin) {
        if (!ALLOWED_ORIGINS.includes(origin)) {
          console.warn(`Rejected WebSocket from unauthorized origin: ${origin}`);
          return new Response('Forbidden', { status: 403 });
        }
      }

      const upgraded = server.upgrade(req, {
        data: {
          playerId: nanoid(),
          roomCode: null,
        },
      });

      if (upgraded) {
        return undefined; // Connection upgraded
      }

      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    // No static file serving (client hosted on CF Pages)
    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      activeConnections.add(ws);
      console.log(`Player ${ws.data.playerId} connected`);
      handleOpen(ws);
    },

    message(ws, message) {
      const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
      handleMessage(ws, msgStr, roomManager);
    },

    close(ws) {
      activeConnections.delete(ws);
      handleClose(ws, roomManager);
      console.log(`Player ${ws.data.playerId} disconnected`);
    },
  },
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  server.stop();

  // Close existing WebSocket connections with 1000 (normal closure)
  for (const ws of activeConnections) {
    ws.close(1000, 'Server shutting down');
  }

  // Wait for connections to close (max 55 sec for Fly.io)
  const timeout = setTimeout(() => {
    console.warn('Shutdown timeout, forcing exit');
    process.exit(0);
  }, 55000);

  const checkInterval = setInterval(() => {
    if (activeConnections.size === 0) {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      console.log('All connections closed, exiting');
      process.exit(0);
    }
  }, 100);
});

console.log(`Server listening on port ${server.port}`);
console.log(`Environment: ${NODE_ENV}`);
console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
```

**Key differences from unified:**
- No static file serving logic (removed `Bun.file()` patterns)
- Origin validation REQUIRED in production (CSWSH prevention)
- `ALLOWED_ORIGINS` env var (comma-separated list of CF Pages URLs)
- Returns 404 for non-API paths (client not served from here)

### Pattern 3: Client WebSocket Connection (Split Deployment)
**What:** Client connects to WebSocket at separate origin using VITE_SERVER_URL env var
**When to use:** Vue client in split deployment (hosted on CF Pages, server on Fly.io)
**Example:**
```typescript
// Source: https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection
// packages/client/src/services/websocket.ts (UPDATED for split deployment)

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private serverUrl: string;

  constructor() {
    // CRITICAL: Use VITE_SERVER_URL from environment (set in CF Pages dashboard)
    // Example: VITE_SERVER_URL=wss://shit-head-server.fly.dev
    this.serverUrl = import.meta.env.VITE_SERVER_URL;

    if (!this.serverUrl) {
      throw new Error('VITE_SERVER_URL environment variable not set');
    }
  }

  connect() {
    // Split deployment: Connect to separate server origin
    const wsUrl = `${this.serverUrl}/game-ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0; // Reset on success
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed', event.code, event.reason);

      // Don't reconnect if closed normally (1000) or by user
      if (event.code === 1000 || event.wasClean) return;

      // Exponential backoff with jitter
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        const jitter = Math.random() * 1000; // 0-1 second jitter
        const delay = baseDelay + jitter;

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
        setTimeout(() => this.connect(), delay);
        this.reconnectAttempts++;
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error', error);
    };
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }
}
```

**Key elements:**
- Uses `import.meta.env.VITE_SERVER_URL` (set in CF Pages dashboard)
- Connects to separate origin (e.g., `wss://shit-head-server.fly.dev`)
- Browser automatically sends Origin header (client origin = CF Pages URL)
- Server validates Origin to prevent CSWSH attacks

**Vite configuration:**
```typescript
// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist', // Output for CF Pages deployment
  },
});
```

### Pattern 4: GitHub Actions Split Deployment Pipeline
**What:** Build server image → GHCR, build client → CF Pages, deploy server → Fly.io
**When to use:** Production deployments with separate client and server targets
**Example:**
```yaml
# Source: https://docs.docker.com/build/ci/github-actions/ + CF Pages docs
# .github/workflows/deploy.yml (UPDATED for split deployment)

name: Deploy to Production

on:
  push:
    branches: [production]

jobs:
  build-push-server:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write  # GHCR push permission

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}-server
          tags: |
            type=ref,event=branch
            type=sha,prefix=prod-sha-
          flavor: |
            latest=true

      - name: Build and push server image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: packages/server/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64

  deploy-client:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile
        working-directory: packages/client

      - name: Build client
        run: bun run build
        working-directory: packages/client
        env:
          # VITE_SERVER_URL baked into build (not runtime)
          VITE_SERVER_URL: wss://shit-head-server.fly.dev

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy packages/client/dist --project-name=shit-head

  deploy-server:
    runs-on: ubuntu-latest
    needs: build-push-server  # Wait for image to be pushed to GHCR

    steps:
      - name: Deploy to Fly.io
        uses: superfly/flyctl-actions@v1.5
        with:
          args: "deploy --image ghcr.io/${{ github.repository }}-server:prod-sha-${{ github.sha }}"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Key elements:**
- Three jobs: build server image, deploy client, deploy server
- Server image pushed to GHCR with SHA tags (rollback capability)
- Client built with `VITE_SERVER_URL` baked in at build time
- Client deployed to CF Pages via wrangler-action
- Server deployed to Fly.io from GHCR image

**GitHub Secrets required:**
- `CLOUDFLARE_API_TOKEN` - CF Pages deploy permission
- `CLOUDFLARE_ACCOUNT_ID` - CF account identifier
- `FLY_API_TOKEN` - Fly.io deploy permission
- `GITHUB_TOKEN` - Automatic (GHCR push)

### Pattern 5: Cloudflare Pages Environment Variables
**What:** Set VITE_SERVER_URL in CF Pages dashboard for build-time injection
**When to use:** Client needs to know server URL at build time (Vite static replacement)
**Example:**

**Via CF Pages Dashboard:**
1. Navigate to Workers & Pages > Select project
2. Settings > Environment variables
3. Add variable:
   - **Name:** `VITE_SERVER_URL`
   - **Value:** `wss://shit-head-server.fly.dev`
   - **Environment:** Production (also add for Preview if needed)

**In Vite code:**
```typescript
// Accessed at build time, replaced with actual value in built assets
const serverUrl = import.meta.env.VITE_SERVER_URL;
```

**CRITICAL:** Vite performs static string replacement at build time. Changing `VITE_SERVER_URL` requires rebuilding client. This is standard for split deployments where client is static assets on CDN.

**Alternative (via GitHub Actions):**
Set in workflow file (as shown in Pattern 4):
```yaml
- name: Build client
  run: bun run build
  env:
    VITE_SERVER_URL: wss://shit-head-server.fly.dev
```

### Pattern 6: Fly.io Configuration (Split Deployment)
**What:** Fly.io app config for WebSocket/API server only (no static file serving)
**When to use:** Production split deployment (client on CF Pages)
**Example:**
```toml
# Source: https://fly.io/docs/reference/configuration/
# fly.toml at project root (UPDATED for split deployment)

app = "shit-head-server"
primary_region = "sjc"  # San Jose, CA

[build]
  image = "ghcr.io/username/shit-head-server:prod-latest"

[env]
  PORT = "8080"
  NODE_ENV = "production"
  # CRITICAL: ALLOWED_ORIGINS must include CF Pages URL
  ALLOWED_ORIGINS = "https://shit-head.pages.dev,https://yourdomain.com"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false  # Keep running (no spin-down)
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["http", "tls"]

  [services.concurrency]
    type = "connections"
    hard_limit = 1000
    soft_limit = 800

[[services.tcp_checks]]
  interval = "15s"
  timeout = "5s"
  grace_period = "10s"

[[vm]]
  size = "shared-cpu-1x"  # 256MB RAM, 1 shared CPU (free tier)
  memory = 256
```

**Key elements:**
- `ALLOWED_ORIGINS` env var includes CF Pages URL (CSWSH prevention)
- No static file serving configuration (client on CF Pages)
- WebSocket-optimized concurrency settings

### Pattern 7: OpenTofu Two-Provider Configuration
**What:** IaC managing both Fly.io (server) and Cloudflare (client) resources
**When to use:** Production infrastructure with split deployment
**Example:**
```hcl
# Source: https://registry.terraform.io/providers/fly-apps/fly/latest/docs
# Source: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs
# infra/opentofu/main.tf (UPDATED for split deployment)

terraform {
  required_version = ">= 1.8"
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.1"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "fly" {
  fly_api_token = var.fly_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

```hcl
# infra/opentofu/fly.tf
# --- Fly.io Server (WebSocket + API) ---
resource "fly_app" "server" {
  name = "${var.project_name}-server"
  org  = var.fly_org
}

resource "fly_machine" "server" {
  app    = fly_app.server.name
  region = var.fly_region
  name   = "${var.project_name}-server-machine"

  image = "ghcr.io/${var.github_repo}-server:prod-latest"

  cpus     = 1
  cputype  = "shared"
  memorymb = 256

  env = {
    PORT       = "8080"
    NODE_ENV   = "production"
    ALLOWED_ORIGINS = var.allowed_origins  # CF Pages URL
  }

  services = [{
    ports = [
      { port = 443, handlers = ["tls", "http"] },
      { port = 80, handlers = ["http"] }
    ]
    protocol      = "tcp"
    internal_port = 8080
  }]
}
```

```hcl
# infra/opentofu/cloudflare.tf
# --- Cloudflare Pages Project (Static Client) ---
resource "cloudflare_pages_project" "client" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = "production"

  build_config {
    build_command       = "cd packages/client && bun install && bun run build"
    destination_dir     = "packages/client/dist"
    root_dir            = ""
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_SERVER_URL = "wss://${fly_app.server.name}.fly.dev"
      }
    }
    preview {
      environment_variables = {
        VITE_SERVER_URL = "wss://${fly_app.server.name}.fly.dev"
      }
    }
  }
}

# Optional: Custom domain for CF Pages
resource "cloudflare_pages_domain" "client_domain" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.client.name
  domain       = var.custom_domain
}
```

```hcl
# infra/opentofu/variables.tf
variable "fly_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_account_id" {
  type = string
}

variable "fly_org" {
  type    = string
  default = "personal"
}

variable "fly_region" {
  type    = string
  default = "sjc"  # San Jose
}

variable "project_name" {
  type    = string
  default = "shit-head"
}

variable "github_repo" {
  type    = string
  default = "username/shit-head"
}

variable "allowed_origins" {
  type        = string
  description = "Comma-separated list of allowed WebSocket origins"
  default     = "https://shit-head.pages.dev"
}

variable "custom_domain" {
  type        = string
  description = "Optional custom domain for CF Pages"
  default     = ""
}
```

```hcl
# infra/opentofu/outputs.tf
output "server_url" {
  value = "https://${fly_app.server.name}.fly.dev"
}

output "client_url" {
  value = "https://${cloudflare_pages_project.client.name}.pages.dev"
}

output "fly_app_name" {
  value = fly_app.server.name
}

output "cf_pages_project_name" {
  value = cloudflare_pages_project.client.name
}
```

**Key elements:**
- Two providers: fly-apps/fly + cloudflare/cloudflare
- Server on Fly.io with `ALLOWED_ORIGINS` including CF Pages URL
- Client on CF Pages with `VITE_SERVER_URL` pointing to Fly.io
- Optional custom domain for CF Pages (requires DNS setup)

### Pattern 8: Time-Based Room Cleanup
**What:** Periodic sweep deleting rooms inactive for 24 hours
**When to use:** Production (success criteria: "Abandoned rooms cleaned up after 24 hours")
**Example:**
```typescript
// Source: https://aws.amazon.com/blogs/compute/managing-sessions-of-anonymous-users-in-websocket-api-based-applications/
// packages/server/src/rooms/RoomManager.ts

export class RoomManager {
  private rooms: Map<string, Room>;
  private lastActivityTimes: Map<string, number>; // roomCode -> timestamp

  constructor() {
    this.rooms = new Map();
    this.lastActivityTimes = new Map();

    // Run cleanup every 5 minutes
    setInterval(() => this.cleanupAbandonedRooms(), 5 * 60 * 1000);
  }

  markActivity(roomCode: string) {
    this.lastActivityTimes.set(roomCode, Date.now());
  }

  private cleanupAbandonedRooms() {
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    for (const [roomCode, lastActivity] of this.lastActivityTimes) {
      if (now - lastActivity > TWENTY_FOUR_HOURS) {
        const room = this.rooms.get(roomCode);
        if (room) {
          console.log(`Cleaning up abandoned room: ${roomCode}`);
          // Remove all players from index
          const state = room.getState();
          state.players.forEach(player => {
            this.playerRoomIndex.delete(player.id);
          });
          this.rooms.delete(roomCode);
          this.lastActivityTimes.delete(roomCode);
        }
      }
    }
  }

  getRoomCount(): number { return this.rooms.size; }
  getPlayerCount(): number { return this.playerRoomIndex.size; }
}
```

**Call markActivity() on:**
- Room creation
- Player join/leave
- Game start
- Any card play or game action

### Anti-Patterns to Avoid
- **Don't skip Origin validation:** Split deployment = different origins = CSWSH vulnerability. MUST validate Origin header in WebSocket upgrade.
- **Don't use wildcards in ALLOWED_ORIGINS:** Explicit allowlist only. `*.pages.dev` is unsafe (attackers can create CF Pages projects).
- **Don't forget to set VITE_SERVER_URL:** Client build fails silently if missing, WebSocket connection fails at runtime.
- **Don't use http:// in production:** Always `wss://` (secure WebSocket) and `https://`. Fly.io and CF Pages enforce TLS.
- **Don't commit API tokens:** `CLOUDFLARE_API_TOKEN` and `FLY_API_TOKEN` must be in GitHub Secrets, not code.
- **Don't use `latest` tag for server rollback:** No specific version to roll back to. Use SHA tags (`prod-sha-abc123f`).
- **Don't deploy client and server independently without coordination:** Client expects specific server API version. Tag both with same version/commit.
- **Don't rebuild client on every server deploy:** Only rebuild client when `VITE_SERVER_URL` changes or client code changes.
- **Don't exceed CF Pages free tier limits:** 500 builds/month, 25MB max file size, 20,000 files. Monitor usage in CF dashboard.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Static CDN hosting | Self-hosted nginx + CDN config | Cloudflare Pages | Free unlimited bandwidth, 300+ edge locations, automatic SSL, preview deployments |
| WebSocket Origin validation | Custom header checks | Origin header validation against allowlist | Browsers enforce Origin header, JavaScript cannot spoof, standard CSWSH prevention |
| Docker layer caching | Manual cache management | GitHub Actions cache backend (type=gha) | 10GB free, automatic eviction, 2-3x faster builds |
| Image tag generation | Manual SHA extraction | docker/metadata-action | Automatic branch/SHA tagging, standardized format |
| Client-server connection URL | Hardcoded URLs | Vite environment variables (VITE_SERVER_URL) | Build-time static replacement, environment-specific URLs |
| WebSocket reconnection | Custom retry logic | Exponential backoff with jitter | Thundering herd problem, jitter prevents synchronized reconnects |
| Room ID generation | Math.random() or UUID | nanoid (already in use) | Shorter codes (6 chars), collision-resistant, URL-safe |
| Log aggregation | Custom log server | Fly.io built-in logs | Captures stdout, 7-day retention, search, tail |
| CF Pages deployment | Custom rsync/FTP | wrangler-action (cloudflare/wrangler-action@v3) | Official GH Action, handles auth, atomic deployments, preview URLs |

**Key insight:** Cloudflare Pages and Fly.io free tiers provide enterprise-grade infrastructure ($0/month). Don't build custom solutions for CDN hosting, SSL, global edge caching, or container orchestration. Focus on game logic, not DevOps plumbing.

## Common Pitfalls

### Pitfall 1: Missing Origin Validation = CSWSH Vulnerability
**What goes wrong:** Attacker creates malicious site that opens WebSocket to your server, hijacks user session via cookies
**Why it happens:** Split deployment = different origins (CF Pages vs Fly.io). Browser allows cross-origin WebSocket by default.
**How to avoid:** Validate Origin header in WebSocket upgrade (see Pattern 2). Reject if not in `ALLOWED_ORIGINS` allowlist.
**Warning signs:** Security audit tools flag "Missing WebSocket Origin validation", penetration test succeeds in hijacking sessions

**Source:** [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [Cross-Site WebSocket Hijacking Explained](https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking)

### Pitfall 2: VITE_SERVER_URL Not Set = WebSocket Connection Fails
**What goes wrong:** Client tries to connect to `undefined/game-ws`, WebSocket fails, game broken
**Why it happens:** Forgot to set `VITE_SERVER_URL` in CF Pages dashboard or GH Actions workflow
**How to avoid:** Set in CF Pages Settings > Environment variables (both Production and Preview). Verify in build logs.
**Warning signs:** Client console error "WebSocket connection failed", `import.meta.env.VITE_SERVER_URL` is `undefined`

### Pitfall 3: ALLOWED_ORIGINS Mismatch = WebSocket Upgrade 403
**What goes wrong:** Client opens WebSocket, server returns 403 Forbidden, connection fails
**Why it happens:** CF Pages URL not in `ALLOWED_ORIGINS` env var on Fly.io (e.g., forgot `.pages.dev` suffix)
**How to avoid:** Exact match required. Include all origins: `https://shit-head.pages.dev,https://yourdomain.com`. Test in dev.
**Warning signs:** Server logs "Rejected WebSocket from unauthorized origin", client sees 403 error

### Pitfall 4: Wildcard ALLOWED_ORIGINS = Security Vulnerability
**What goes wrong:** Attacker creates CF Pages project (free), inherits `*.pages.dev` wildcard, bypasses Origin validation
**Why it happens:** Used `*.pages.dev` or `*` in `ALLOWED_ORIGINS` thinking it's convenient
**How to avoid:** Explicit allowlist only. No wildcards. Each origin listed individually.
**Warning signs:** Security audit flags "Overly permissive Origin validation"

**Source:** [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### Pitfall 5: Client Rebuild Required for Server URL Change
**What goes wrong:** Changed Fly.io server URL, client still connects to old URL (cached in built assets)
**Why it happens:** `VITE_SERVER_URL` baked into client at build time (static string replacement), not runtime
**How to avoid:** Rebuild and redeploy client whenever `VITE_SERVER_URL` changes. This is expected for split deployments.
**Warning signs:** CF Pages shows old server URL in built assets, client connects to wrong server

### Pitfall 6: Exceeded CF Pages Free Tier = Build Failures
**What goes wrong:** Build fails with quota exceeded error, client not deployed
**Why it happens:** >500 builds/month or >25MB file size or >20,000 files
**How to avoid:** Monitor CF Pages dashboard usage. Optimize build frequency (don't deploy every commit). Check bundle size.
**Warning signs:** CF Pages build error "Quota exceeded", builds fail intermittently at end of month

**Source:** [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)

### Pitfall 7: Missing Graceful Shutdown = Abrupt WebSocket Disconnects
**What goes wrong:** Fly.io deploys new version, kills old process mid-connection, clients see 1006 (abnormal closure)
**Why it happens:** No SIGTERM handler, Fly.io forcefully kills after 60 seconds
**How to avoid:** Implement graceful shutdown (Pattern 2), send close(1000) to all connections, wait up to 55 seconds
**Warning signs:** Client logs show code 1006 during deploys instead of 1000 (normal closure)

**Source:** [Fly.io Deployment Docs](https://fly.io/docs/reference/configuration/)

### Pitfall 8: Abandoned Rooms Consume Memory
**What goes wrong:** Players disconnect without leaving room, rooms persist forever, memory leak
**Why it happens:** RoomManager deletes rooms only when host explicitly leaves, disconnection ≠ leave
**How to avoid:** Implement time-based cleanup (Pattern 8), sweep every 5 minutes, delete 24h inactive rooms
**Warning signs:** `/health` activeRooms metric increases indefinitely, memory usage grows over days

### Pitfall 9: Wrong Origin in Development = Can't Test WebSocket
**What goes wrong:** Dev client on `localhost:5173`, server rejects Origin, can't test locally
**Why it happens:** `ALLOWED_ORIGINS` includes only production URLs, forgot dev origins
**How to avoid:** Conditionally allow localhost in development (see Pattern 2). Production = strict validation only.
**Warning signs:** Dev WebSocket fails with 403, production works fine

### Pitfall 10: Rollback Client Without Rollback Server = Version Mismatch
**What goes wrong:** Client rolled back to v1, server still on v2, protocol mismatch breaks game
**Why it happens:** Split deployment = independent rollbacks, forgot to coordinate
**How to avoid:** Tag client and server deployments with same commit SHA. Rollback both together or ensure backward compatibility.
**Warning signs:** After rollback, WebSocket messages fail validation, game broken

## Code Examples

Verified patterns from official sources:

### Complete Server Example (Split Deployment)
See Pattern 2 above for full server code with Origin validation.

### Complete Client WebSocket Manager (Split Deployment)
See Pattern 3 above for full client code with VITE_SERVER_URL.

### GitHub Actions Complete Workflow (Split Deployment)
See Pattern 4 above for full CI/CD pipeline (build server, deploy client, deploy server).

### Rollback Workflow (Split Deployment)
```yaml
# Source: https://medium.com/@ignatovich.dm/implementing-a-release-process-with-github-actions-for-docker-image-management-and-rollback-9e385bb7c99a
# .github/workflows/rollback.yml

name: Rollback to Previous Version

on:
  workflow_dispatch:
    inputs:
      target_sha:
        description: 'Git SHA to rollback to (short or full)'
        required: true
        type: string

jobs:
  rollback-server:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy rollback to Fly.io
        uses: superfly/flyctl-actions@v1.5
        with:
          args: "deploy --image ghcr.io/${{ github.repository }}-server:prod-sha-${{ inputs.target_sha }}"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  rollback-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.target_sha }}

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile
        working-directory: packages/client

      - name: Build client at target SHA
        run: bun run build
        working-directory: packages/client
        env:
          VITE_SERVER_URL: wss://shit-head-server.fly.dev

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy packages/client/dist --project-name=shit-head
```

**Usage:**
1. Navigate to Actions tab > Rollback workflow > Run workflow
2. Enter target SHA (from git log or deployment history)
3. Workflow rolls back both server (10-30 sec) and client (rebuild + deploy ~2 min)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unified deployment | Split deployment (CF Pages + Fly.io) | 2026 best practice | Better CDN performance, unlimited bandwidth, independent scaling |
| Render paid tier | Fly.io free tier (3 VMs) | Fly.io pricing update 2025 | $0/month vs $14/month for persistent WebSockets |
| GitHub Pages | Cloudflare Pages | CF Pages launched 2021, matured 2024+ | Build-time env vars, unlimited bandwidth, better DX |
| Socket.IO + Redis pub/sub | Bun native pub/sub (single instance) | Bun 1.0 (2023) | Eliminate Socket.IO + Redis for single-instance apps |
| Node.js + ws library | Bun native WebSocket | Bun 1.0 (2023) | 7x throughput, built-in pub/sub, TypeScript native |
| Heroku free tier | Fly.io free tier | Heroku ended free (2022) | Fly.io best free tier for WebSockets (no spin-down) |
| Manual CORS headers | Origin validation in upgrade | WebSocket CSRF awareness (2018+) | Security requirement for split deployments |
| cloudflare/pages-action | cloudflare/wrangler-action@v3 | pages-action deprecated 2024 | Unified Wrangler CLI, better DX, active maintenance |
| VITE_SERVER_URL hardcoded | CF Pages env vars | Vite 2.0 (2021) + CF Pages support | Environment-specific server URLs, no code changes |
| Rebuild on every deploy | GHCR with SHA-tagged images | Container registry maturity 2023+ | 10-30 sec server rollback vs 5-10 min rebuild |
| Manual Docker layer caching | GitHub Actions cache (type=gha) | GH Actions cache backend 2021+ | 10GB free, automatic, 2-3x faster builds |

**Deprecated/outdated:**
- **cloudflare/pages-action:** Deprecated in favor of cloudflare/wrangler-action@v3 (unified Wrangler CLI)
- **GitHub Pages for SPAs:** No build-time env vars, inferior to CF Pages for dynamic config
- **Netlify for unlimited bandwidth:** 100GB limit vs CF Pages unlimited (free tier)
- **Vercel free tier for commercial:** Terms discourage commercial use, CF Pages has no such restriction
- **Render free tier for WebSockets:** 15-min spin-down makes unusable for real-time. Use Fly.io.
- **Socket.IO for single-instance:** Bun native pub/sub sufficient when not horizontally scaled
- **Unified deployment by default:** Split is now simpler (free CDNs, better tools) and more performant

## Open Questions

Things that couldn't be fully resolved:

1. **CF Pages build concurrency limits**
   - What we know: 500 builds/month free tier (16 builds/day average), 20-min timeout
   - What's unclear: Concurrent build limit (multiple PRs at once), queue behavior
   - Recommendation: Start with free tier, monitor usage. Upgrade to Workers Paid ($5/month) if hitting limits.

2. **Fly.io free tier persistence guarantee**
   - What we know: Free tier includes 3x shared-cpu-1x VMs (256MB each), no spin-down if `auto_stop_machines = false`
   - What's unclear: Whether free tier has hidden activity-based spin-down
   - Recommendation: Deploy and test with 15+ minutes idle. Community reports suggest no spin-down.

3. **WebSocket connection count on Fly.io free tier**
   - What we know: Free tier machine is 256MB RAM, ~1KB per WebSocket connection = ~250,000 connections theoretical
   - What's unclear: Practical limit with game state per connection, CPU constraints
   - Recommendation: Start with free tier, monitor `/health` metrics. Expect <1000 concurrent comfortable.

4. **GHCR package visibility for private repos**
   - What we know: Private repo → packages default to private (500MB limit). Public packages = unlimited.
   - Decision: Make GHCR packages public after first push (repo stays private, images contain no secrets).
   - Fallback: If must stay private, use `actions/delete-package-versions@v5` to prune old tags (keep last 10).

5. **Optimal VITE_SERVER_URL for preview deployments**
   - What we know: CF Pages creates preview deployments for PRs automatically
   - What's unclear: Should preview deployments connect to production Fly.io or separate preview server?
   - Recommendation: Preview deployments connect to production server (simpler). If need preview server, deploy second Fly.io machine on PR.

## Sources

### Primary (HIGH confidence)
- [Cloudflare Pages Direct Upload CI/CD](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/) - wrangler-action deployment
- [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/) - Free tier specifications
- [Cloudflare Pages Build Configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) - Environment variables
- [Cloudflare Pages Free Tier Infographic](https://www.freetiers.com/directory/cloudflare-pages) - Unlimited bandwidth confirmation
- [Bun WebSocket API](https://bun.com/docs/runtime/http/websockets) - WebSocket + HTTP serving patterns
- [Fly.io Configuration Reference](https://fly.io/docs/reference/configuration/) - fly.toml format, graceful shutdown
- [Fly.io Pricing](https://fly.io/pricing/) - Free tier details (3 VMs, 256MB RAM)
- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) - GHCR setup and usage
- [Docker Build GitHub Actions Cache](https://docs.docker.com/build/cache/backends/gha/) - Layer caching patterns
- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html) - Origin validation best practices
- [Cross-Site WebSocket Hijacking (CSWSH)](https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking) - Attack explanation and prevention

### Secondary (MEDIUM confidence)
- [Vercel vs Netlify vs GitHub Pages Comparison](https://namastedev.com/blog/hosting-a-static-website-comparing-github-pages-netlify-and-vercel/) - Free tier comparison
- [Deploying Full Stack Apps 2026](https://www.nucamp.co/blog/deploying-full-stack-apps-in-2026-vercel-netlify-railway-and-cloud-options) - Split deployment patterns
- [WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view) - Exponential backoff pattern
- [AWS WebSocket Session Management](https://aws.amazon.com/blogs/compute/managing-sessions-of-anonymous-users-in-websocket-api-based-applications/) - Room cleanup patterns
- [Docker Rollback Best Practices](https://medium.com/@ignatovich.dm/implementing-a-release-process-with-github-actions-for-docker-image-management-and-rollback-9e385bb7c99a) - SHA tagging patterns
- [Cloudflare Wrangler Action Marketplace](https://github.com/marketplace/actions/deploy-to-cloudflare-workers-with-wrangler) - GH Action usage
- [Fly.io CORS Discussion](https://community.fly.io/t/cors-between-frontend-and-backend-apps/20734) - Split deployment CORS patterns

### Tertiary (LOW confidence - community/unverified)
- [Cloudflare Pages Deployment Recommendation](https://community.cloudflare.com/t/deploying-pages-via-github-actions-still-recommended/659805) - Community opinion on GH Actions vs native Git integration

## Metadata

**Confidence breakdown:**
- Split deployment architecture: HIGH - Official docs from CF Pages, Fly.io, multiple verification sources
- Cloudflare Pages free tier: HIGH - Official documentation confirms unlimited bandwidth, 500 builds/month
- Origin validation requirement: HIGH - OWASP best practices, security research papers, official recommendations
- wrangler-action usage: HIGH - Official Cloudflare documentation and examples
- Architecture patterns: HIGH - Verified with official Bun, CF, Fly.io docs
- Performance comparison: MEDIUM - Limited benchmarks comparing unified vs split at hobby scale
- Pitfalls: MEDIUM-HIGH - Mix of official docs and community reports
- Open questions: LOW-MEDIUM - Areas requiring production validation

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - pricing and platform features change quarterly)

**Key assumptions & decisions:**
1. Private GitHub repo — GHCR packages made public for unlimited storage (no secrets in images)
2. Split deployment — CF Pages for client, Fly.io for server (better CDN performance and bandwidth)
3. OpenTofu for IaC — Two providers (fly-apps/fly + cloudflare/cloudflare)
4. Pipeline: Build server → GHCR, build client → CF Pages, deploy server → Fly.io
5. Low-to-medium traffic (<100 concurrent users), single-instance server deployment
6. In-memory room state acceptable (rooms lost on redeploy, but 24h cleanup handles abandoned)
7. Cost target: $0/month (CF Pages + Fly.io free tiers + GHCR public)

**Blockers resolved:**
- ✅ Split deployment architecture confirmed as optimal for this use case
- ✅ Cloudflare Pages wrangler-action deployment verified (replaces deprecated pages-action)
- ✅ VITE_SERVER_URL environment variable setup documented (CF Pages dashboard)
- ✅ Origin validation requirement identified and pattern provided (CSWSH prevention)
- ✅ Two-provider OpenTofu configuration documented (Fly.io + Cloudflare)
- ✅ Server-only Dockerfile pattern (no client build stage needed)
- ✅ GitHub Actions pipeline with three jobs (build server, deploy client, deploy server)
- ✅ Rollback strategy for both client and server documented
- ✅ Free tier limits verified (CF Pages: unlimited bandwidth, 500 builds; Fly.io: 3 VMs, 256MB)

**Cost summary:**
- **Cloudflare Pages:** $0/month (unlimited bandwidth, 500 builds)
- **Fly.io:** $0/month (3 VMs free tier, 160GB bandwidth)
- **GHCR:** $0/month (public packages unlimited)
- **Total:** $0/month

**Next phase dependencies:**
- Phase 12 planning requires this research to determine tasks for:
  1. Update server Dockerfile (remove client build stage, server-only)
  2. Update server index.ts (remove static file serving, add Origin validation)
  3. Update client websocket.ts (use VITE_SERVER_URL env var)
  4. Set VITE_SERVER_URL in CF Pages dashboard (both Production and Preview)
  5. Update fly.toml (add ALLOWED_ORIGINS env var)
  6. Create/update OpenTofu config (two providers: Fly.io + Cloudflare)
  7. Update GH Actions deploy.yml (three jobs: build server, deploy client, deploy server)
  8. Add graceful shutdown handlers (SIGTERM, connection tracking)
  9. Add time-based room cleanup (24h abandoned rooms)
  10. Create rollback.yml workflow (coordinate server + client rollback)
  11. Make GHCR packages public after first push
  12. Test Origin validation in production (security verification)
