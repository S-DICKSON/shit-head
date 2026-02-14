# Phase 12: Deployment & Production Polish - Research

**Researched:** 2026-02-14 (RE-RESEARCHED with alternative deployment options)
**Domain:** Bun monorepo deployment with WebSocket server and Vue/Vite SPA
**Confidence:** HIGH

## Summary

This research explores **alternative deployment architectures** for a Bun + WebSocket multiplayer game. The previous research recommended **split deployment** (Cloudflare Pages + Fly.io), but this re-research evaluates **simpler unified deployment** options that are easier to manage for small teams.

**Key finding:** For a small-scale multiplayer card game with WebSocket requirements, **unified deployment** (single platform hosting both client and server) offers significant advantages: simpler configuration, no CORS/Origin validation complexity, single deployment target, and easier debugging. The split architecture's CDN benefits are less relevant for a WebSocket-heavy app where most traffic is persistent connections, not static assets.

**Primary recommendation:** **Railway Hobby Plan ($5/month)** with unified Bun.serve() deployment. Bun natively serves static files from built client assets while handling WebSocket connections on the same origin. Railway provides Docker deployment, persistent connections (no spin-down), automatic HTTPS, and usage-based pricing that fits hobby-scale projects perfectly.

**Alternative options:** Render paid tier ($7/month for persistent), self-hosted VPS with Coolify (Hetzner €4/month + free Coolify), or Fly.io unified ($0 free tier but more complex than Railway).

**Why unified over split:** For this project size (<100 concurrent users), a unified deployment eliminates split-architecture complexity (Origin validation, CORS, VITE_SERVER_URL management, coordinated rollbacks) while maintaining production-ready performance. The Docker container serves both client assets and WebSocket connections from a single Bun process.

## Deployment Architecture Options

Comparison of viable deployment architectures for Bun + WebSocket + Vue SPA:

### Option 1: Unified Railway Deployment (RECOMMENDED)

**Architecture:** Single Docker container running Bun.serve() that serves both static client assets and WebSocket server.

| Aspect | Details |
|--------|---------|
| **Platform** | Railway Hobby Plan |
| **Cost** | $5/month (includes $5 usage credit) |
| **Deployment** | Docker image from GitHub Actions → Railway |
| **Client Serving** | Bun.file() serves built client assets from `/dist` |
| **WebSocket** | Same origin (no CORS/Origin issues) |
| **HTTPS/SSL** | Automatic (Railway managed) |
| **Persistence** | Always-on (no spin-down) |
| **Limits** | 8 vCPU, 8 GB RAM per service (far exceeds needs) |
| **Bandwidth** | Usage-based ($0.05/GB egress) |
| **Complexity** | **LOW** - Single deployment target, one Dockerfile |

**Why recommended:**
- **Simplicity:** Single platform, single deployment, no multi-service coordination
- **Cost-effective:** $5/month covers typical hobby usage entirely
- **No CORS complexity:** Same-origin = no Origin validation needed
- **Easy debugging:** All logs in one place, single process to monitor
- **WebSocket-friendly:** Persistent connections, no spin-down issues
- **Docker-native:** Existing Dockerfile works with minimal changes

**Limitations:**
- Not free ($5/month minimum vs $0 for split CF Pages + Fly.io)
- No global CDN edge caching (but WebSocket apps don't benefit much anyway)
- Initial static asset load not CDN-accelerated

### Option 2: Unified Fly.io Deployment

**Architecture:** Single Docker container running Bun.serve() on Fly.io free tier.

| Aspect | Details |
|--------|---------|
| **Platform** | Fly.io Free Tier |
| **Cost** | $0/month (3 shared VMs, 256 MB each, 160 GB bandwidth) |
| **Deployment** | Docker image → Fly.io via flyctl |
| **Client Serving** | Bun.file() serves static assets |
| **WebSocket** | Same origin |
| **HTTPS/SSL** | Automatic |
| **Persistence** | Always-on (auto_stop_machines = false) |
| **Complexity** | **MEDIUM** - fly.toml config, flyctl CLI learning curve |

**Why consider:**
- **Free tier:** $0/month if usage stays within limits
- **Same simplicity:** Unified deployment like Railway
- **Global regions:** Can deploy to multiple regions for low latency

**Limitations:**
- More complex setup (fly.toml, flyctl commands, machine config)
- Free tier uncertainty (community reports mixed on long-term viability)
- 256 MB RAM limit on free tier (sufficient but less headroom than Railway)
- CLI-centric workflow (less friendly than Railway's dashboard)

### Option 3: Render Paid Tier

**Architecture:** Unified deployment on Render's paid Web Service tier.

| Aspect | Details |
|--------|---------|
| **Platform** | Render Web Service (paid) |
| **Cost** | $7/month minimum (always-on) |
| **Deployment** | Docker or native runtime → Render |
| **Client Serving** | Bun.file() serves static assets |
| **WebSocket** | Same origin, persistent connections |
| **Persistence** | Always-on (no spin-down on paid tier) |
| **Complexity** | **LOW** - Simple dashboard, render.yaml config |

**Why consider:**
- Simple UI and setup (beginner-friendly)
- Predictable pricing ($7/month flat)
- Good documentation for full-stack deployments

**Limitations:**
- **More expensive** than Railway ($7 vs $5)
- **Free tier unusable** for WebSockets (15-min spin-down kills connections)
- Less flexible pricing (flat $7 vs Railway's usage-based within $5 credit)

### Option 4: Self-Hosted VPS + Coolify

**Architecture:** VPS running Coolify (self-hosted PaaS) deploying Docker containers.

| Aspect | Details |
|--------|---------|
| **Platform** | Hetzner VPS + Coolify |
| **Cost** | €4-10/month VPS + $0 Coolify (open-source) |
| **Deployment** | Coolify pulls from GitHub → Docker on VPS |
| **Client Serving** | Bun.file() or Traefik reverse proxy |
| **WebSocket** | Automatic SSL via Traefik + Let's Encrypt |
| **Complexity** | **HIGH** - VPS management, Coolify setup, server maintenance |

**Why consider:**
- **Full control:** Own infrastructure, no vendor lock-in
- **Cheapest long-term:** €4/month Hetzner VPS + free Coolify
- **Learning opportunity:** Deep understanding of deployment infrastructure
- **Scalable:** Upgrade VPS resources as needed

**Limitations:**
- **High complexity:** Server management, security updates, backups, monitoring
- **Time investment:** Setup, maintenance, troubleshooting all on you
- **Single point of failure:** No automatic redundancy/failover
- **Requires DevOps skills:** Not beginner-friendly

### Option 5: Split Deployment (Previous Research)

**Architecture:** Cloudflare Pages (client) + Fly.io (server).

| Aspect | Details |
|--------|---------|
| **Platform** | CF Pages + Fly.io |
| **Cost** | $0/month (both free tiers) |
| **Deployment** | Client → CF Pages via wrangler, Server → Fly.io via flyctl |
| **Client Serving** | CF Pages CDN (300+ edge locations) |
| **WebSocket** | Cross-origin (requires Origin validation) |
| **Complexity** | **HIGH** - Two platforms, CORS config, Origin validation, VITE_SERVER_URL |

**Why previous research recommended it:**
- **Free tier:** $0/month total cost
- **Global CDN:** Client assets served from 300+ edge locations
- **Unlimited bandwidth:** CF Pages unlimited, Fly.io 160 GB/month
- **Best CDN performance:** Static assets globally cached

**Why reconsidering:**
- **High complexity:** Managing two platforms, coordinating deployments, debugging cross-origin issues
- **WebSocket-heavy app:** CDN benefits are minimal when 90%+ of traffic is persistent WebSocket connections
- **CORS overhead:** Origin validation, ALLOWED_ORIGINS management, security surface area
- **Rollback coordination:** Must roll back both client and server together
- **Dev/prod parity gap:** Split in production, unified in development

## Decision Matrix

| Criterion | Railway Unified | Fly.io Unified | Render Paid | VPS + Coolify | CF Pages + Fly.io |
|-----------|-----------------|----------------|-------------|---------------|-------------------|
| **Cost** | $5/mo | $0/mo | $7/mo | €4-10/mo | $0/mo |
| **Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **WebSocket Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Setup Time** | 30 min | 1-2 hrs | 30 min | 4-8 hrs | 2-3 hrs |
| **Debugging** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Dev/Prod Parity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Maintenance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Free Tier** | ❌ | ✅ | ❌ | ❌ | ✅ |

**Recommendation ranking for this project:**
1. **Railway Unified** - Best balance of simplicity, cost, and features
2. **Fly.io Unified** - Free tier but more complex setup
3. **Render Paid** - Simple but $2 more expensive than Railway
4. **VPS + Coolify** - Too complex for hobby project (overkill)
5. **CF Pages + Fly.io** - Unnecessary complexity for unified app

## Standard Stack (Unified Railway Deployment)

### Core

| Library/Tool | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| Railway | 2026 | Unified deployment platform | Docker-native, usage-based pricing, persistent connections, automatic HTTPS, simple dashboard |
| Bun.serve() | 1.x | Full-stack server (static + WebSocket) | Native static file serving, WebSocket support, single process, production-ready |
| Docker | Latest | Container packaging | Railway native, existing Dockerfiles work, reproducible builds |
| GitHub Actions | 2026 | CI/CD pipeline | Free (2000 min/month), Docker build + Railway deploy, existing workflows reusable |
| GitHub Container Registry | 2026 | Docker image storage | Free (500 MB private), SHA-tagged rollback, GitHub-native |

### Supporting

| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| railway CLI | Latest | Local deployment testing | Optional - can deploy via GitHub integration or CLI |
| docker/build-push-action | v5 | Docker image builds in CI | Build server + client container in GitHub Actions |
| docker/metadata-action | v5 | Docker tag generation | SHA-based tags for rollback capability |
| Bun.build | 1.x | Client asset bundling | Pre-build client assets before Docker COPY |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Railway | Fly.io unified | Free but more complex CLI setup |
| Railway | Render paid | $7/mo vs $5/mo, similar simplicity |
| Railway | VPS + Coolify | Cheaper long-term but high maintenance |
| Unified deployment | Split (CF Pages + Fly.io) | Free but much more complex |
| Bun.serve() static | Express + serve-static | More boilerplate, less performant |
| GitHub Actions | Railway auto-deploy | GH Actions gives more control over build/test |

**Installation (Railway):**

```bash
# Install Railway CLI (optional - can use web dashboard)
npm install -g @railway/cli

# Login to Railway
railway login

# Link project to Railway service (one-time)
railway link

# Deploy manually (or use GitHub integration)
railway up
```

## Architecture Patterns

### Recommended Project Structure (Unified Deployment)

```
.github/workflows/
├── ci.yml                      # PR checks (type-check, lint, test)
└── deploy-railway.yml          # Deploy unified container to Railway
packages/
├── server/
│   ├── Dockerfile              # Unified: builds client + serves with Bun
│   ├── src/
│   │   ├── index.ts            # Bun.serve with static file serving + WebSocket
│   │   ├── websocket/handlers.ts
│   │   └── rooms/RoomManager.ts
│   └── package.json
├── client/
│   ├── src/
│   │   ├── services/websocket.ts  # Connects to same origin (window.location)
│   │   └── App.vue
│   ├── vite.config.ts          # Build output to dist/
│   └── package.json
└── shared/
    └── types/
docker-compose.yml              # Local unified deployment for testing
.dockerignore
```

**Key differences from split deployment:**
- Single Dockerfile builds both client and server
- Server serves static files from built client assets
- Client WebSocket connects to same origin (no VITE_SERVER_URL needed)
- Single deployment workflow (not separate client/server jobs)
- No Origin validation needed (same-origin = secure by default)

### Pattern 1: Unified Dockerfile (Railway Deployment)

**What:** Multi-stage Dockerfile that builds client assets and bundles them with Bun server
**When to use:** Unified deployment on Railway, Fly.io, Render, or any Docker platform
**Example:**

```dockerfile
# Source: Bun fullstack docs + Railway best practices
# packages/server/Dockerfile (UNIFIED deployment)

FROM oven/bun:1 AS base
WORKDIR /app

# ----- Build Client Stage -----
FROM base AS build-client
# Copy root dependencies
COPY package.json bun.lockb* tsconfig.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/shared/package.json ./packages/shared/
# Install dependencies
RUN bun install --frozen-lockfile
# Copy client and shared source
COPY packages/client/ ./packages/client/
COPY packages/shared/ ./packages/shared/
# Build client assets
WORKDIR /app/packages/client
RUN bun run build
# Result: /app/packages/client/dist contains built assets

# ----- Production Server Stage -----
FROM base AS production
WORKDIR /app
# Copy package files for server dependencies
COPY package.json bun.lockb* tsconfig.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
# Install production dependencies only
RUN bun install --frozen-lockfile --production
# Copy server and shared source
COPY packages/server/ ./packages/server/
COPY packages/shared/ ./packages/shared/
# Copy built client assets from build stage
COPY --from=build-client /app/packages/client/dist ./packages/client/dist
# Expose port (Railway assigns PORT env var dynamically)
EXPOSE 3000
# Set production environment
ENV NODE_ENV=production
# Start unified server (serves static files + WebSocket)
CMD ["bun", "packages/server/src/index.ts"]
```

**Key elements:**
- Two stages: build-client (Vite build) + production (Bun server + client assets)
- Client assets copied from build stage into server image
- Server serves from `packages/client/dist` (already implemented in index.ts)
- Single process, single port, single container

### Pattern 2: Bun.serve() Unified Server (Static + WebSocket)

**What:** Bun.serve() serves static client assets from built dist folder AND handles WebSocket connections
**When to use:** Unified deployment (already implemented in project)
**Example:**

```typescript
// Source: Existing packages/server/src/index.ts (no changes needed!)
// This pattern is ALREADY IMPLEMENTED in the project

import { APP_VERSION } from '@shit-head/shared';
import { handleMessage, handleClose, handleOpen, roomManager } from './websocket/handlers';
import type { WebSocketData } from './websocket/handlers';
import { nanoid } from 'nanoid';
import type { ServerWebSocket } from 'bun';
import { join } from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Static file serving: check if client dist exists
const clientDistPath = join(import.meta.dir, '../../client/dist');
const indexHtml = Bun.file(join(clientDistPath, 'index.html'));
const serveStaticFiles = await indexHtml.exists();

// Connection tracking for graceful shutdown
const activeConnections = new Set<ServerWebSocket<WebSocketData>>();

const server = Bun.serve<WebSocketData>({
  port: Number(process.env.PORT) || 3000,

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
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // WebSocket upgrade endpoint (NO Origin validation needed - same origin!)
    if (url.pathname === '/game-ws') {
      const reconnectPlayerId = url.searchParams.get('playerId');

      const upgraded = server.upgrade(req, {
        data: {
          playerId: reconnectPlayerId || nanoid(),
          roomCode: null,
        },
      });

      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    // Serve static files from client/dist (unified deployment)
    if (serveStaticFiles) {
      const filePath = join(clientDistPath, url.pathname === '/' ? 'index.html' : url.pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
      // SPA fallback: serve index.html for client-side routes
      return new Response(indexHtml);
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      activeConnections.add(ws);
      handleOpen(ws);
    },
    message(ws, message) {
      const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
      handleMessage(ws, msgStr, roomManager);
    },
    close(ws) {
      activeConnections.delete(ws);
      handleClose(ws, roomManager);
    },
  },
});

// Graceful shutdown (SIGTERM handler)
process.on('SIGTERM', async () => {
  server.stop();
  for (const ws of activeConnections) {
    ws.close(1000, 'Server shutting down');
  }
  // Wait up to 55 seconds for connections to close
  const shutdownTimeout = 55000;
  const startTime = Date.now();
  while (activeConnections.size > 0 && Date.now() - startTime < shutdownTimeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  process.exit(0);
});

console.log(`Server listening on port ${server.port}`);
console.log(`Environment: ${NODE_ENV}`);
console.log(`Serving static files: ${serveStaticFiles}`);
```

**Key elements:**
- Serves static files from `../../client/dist` when present
- SPA fallback: returns index.html for unknown routes (client-side routing)
- Same-origin WebSocket: no CORS/Origin validation needed
- Graceful shutdown for Railway deployments
- Health endpoint for monitoring

### Pattern 3: Client WebSocket Connection (Same Origin)

**What:** Client connects to WebSocket at same origin (no VITE_SERVER_URL config needed)
**When to use:** Unified deployment where client and server on same origin
**Example:**

```typescript
// Source: Simplified from existing websocket.ts
// packages/client/src/services/websocket.ts (SIMPLIFIED for unified)

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect() {
    // Same-origin WebSocket URL (no env var needed!)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/game-ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed', event.code);

      // Don't reconnect if closed normally
      if (event.code === 1000 || event.wasClean) return;

      // Exponential backoff with jitter
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        const jitter = Math.random() * 1000;
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

**Key differences from split deployment:**
- Uses `window.location.host` instead of env var
- No VITE_SERVER_URL configuration needed
- Automatically works in dev (localhost) and production (Railway domain)
- No build-time env var injection complexity

### Pattern 4: GitHub Actions Railway Deployment

**What:** Build unified Docker image and deploy to Railway
**When to use:** Production deployments from GitHub
**Example:**

```yaml
# Source: Railway deployment docs + Docker best practices
# .github/workflows/deploy-railway.yml

name: Deploy to Railway

on:
  push:
    branches: [main, production]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=sha-
          flavor: |
            latest=true

      - name: Build and push unified image
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

      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Alternative (simpler): Railway GitHub Integration**

Railway can auto-deploy from GitHub without custom workflows:
1. Connect Railway to GitHub repository
2. Railway automatically builds and deploys on push to main
3. No GitHub Actions workflow needed

**GitHub Secrets required (CLI deployment):**
- `RAILWAY_TOKEN` - Railway API token (from railway.app dashboard)
- `RAILWAY_PROJECT_ID` - Project ID (from railway.app)
- `RAILWAY_SERVICE_ID` - Service ID (from railway.app)

### Pattern 5: Room Cleanup (Same as Before)

**What:** Periodic sweep deleting rooms inactive for 24 hours
**When to use:** Production (success criteria requirement)
**Example:**

```typescript
// Source: Existing RoomManager implementation (no changes needed)
// packages/server/src/rooms/RoomManager.ts

export class RoomManager {
  private rooms: Map<string, Room>;
  private lastActivityTimes: Map<string, number>;

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
        console.log(`Cleaning up abandoned room: ${roomCode}`);
        this.rooms.delete(roomCode);
        this.lastActivityTimes.delete(roomCode);
      }
    }
  }

  getRoomCount(): number { return this.rooms.size; }
  getPlayerCount(): number {
    return Array.from(this.rooms.values())
      .reduce((sum, room) => sum + room.getState().players.length, 0);
  }
}
```

**Call markActivity() on:**
- Room creation
- Player join/leave
- Game start
- Any card play or game action

### Anti-Patterns to Avoid

- **Don't use split deployment for WebSocket-heavy apps:** CDN benefits are minimal when 90%+ of traffic is persistent connections. Unified is simpler.
- **Don't overcomplicate with Origin validation in unified:** Same-origin = secure by default. No ALLOWED_ORIGINS needed.
- **Don't forget to build client before Docker COPY:** Multi-stage build must `vite build` before copying dist to server image.
- **Don't use Render free tier for WebSockets:** 15-minute spin-down kills all connections. Paid tier only.
- **Don't hardcode PORT in Dockerfile:** Railway assigns dynamic PORT via env var. Use `process.env.PORT`.
- **Don't skip graceful shutdown:** Railway sends SIGTERM on redeploy. Handle it or connections close abruptly.
- **Don't commit Railway tokens:** Use GitHub Secrets for `RAILWAY_TOKEN`, never commit to code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Static file serving | Custom routing logic | Bun.file() + Response | Built-in, performant, handles MIME types automatically |
| HTTPS/SSL | Manual Let's Encrypt setup | Railway/Fly.io managed SSL | Automatic certificate provisioning and renewal |
| Container orchestration | Custom deployment scripts | Railway/Fly.io Docker platform | Handles builds, deployments, rollbacks, health checks |
| WebSocket reconnection | Custom retry logic | Exponential backoff with jitter | Prevents thundering herd, well-tested pattern |
| Room ID generation | Math.random() or UUID | nanoid (already in use) | Shorter codes, collision-resistant, URL-safe |
| Log aggregation | Custom log server | Railway/Fly.io built-in logs | Automatic stdout capture, searchable, persistent |
| Health checks | Custom monitoring | `/health` endpoint + platform monitoring | Standard pattern, platform health checks built-in |
| Docker image caching | Manual layer optimization | GitHub Actions cache (type=gha) | 10GB free, automatic, 2-3x faster builds |

**Key insight:** Railway and Fly.io provide production-ready infrastructure (HTTPS, health checks, logs, metrics) out of the box. For a unified deployment, focus on game logic, not DevOps plumbing.

## Common Pitfalls

### Pitfall 1: Using Render Free Tier for WebSockets

**What goes wrong:** Render free tier spins down after 15 minutes, killing all WebSocket connections
**Why it happens:** Free tier designed for low-traffic websites, not persistent connections
**How to avoid:** Use Railway Hobby ($5), Fly.io free tier, or Render paid tier ($7) - all support persistent connections
**Warning signs:** Players disconnected after 15 min idle, "service unavailable" on reconnect

**Source:** [Render Free Tier Docs](https://render.com/docs/free)

### Pitfall 2: Forgetting to Build Client in Docker

**What goes wrong:** Docker build fails or server serves empty dist folder
**Why it happens:** Forgot `bun run build` in Dockerfile build stage
**How to avoid:** Use multi-stage Dockerfile with explicit build-client stage (Pattern 1)
**Warning signs:** Docker build succeeds but `packages/client/dist` is empty in container

### Pitfall 3: Hardcoding PORT in Production

**What goes wrong:** Railway assigns dynamic PORT (e.g., 8443), but server listens on hardcoded 3000
**Why it happens:** Dockerfile has `EXPOSE 3000` and ignores `process.env.PORT`
**How to avoid:** Always use `Number(process.env.PORT) || 3000` in Bun.serve()
**Warning signs:** Health checks fail, Railway shows "service unhealthy"

### Pitfall 4: No Graceful Shutdown on Railway

**What goes wrong:** Railway redeploys, sends SIGTERM, server ignores it, connections close with 1006 (abnormal)
**Why it happens:** No SIGTERM handler, Railway forcefully kills after 60 seconds
**How to avoid:** Implement graceful shutdown (Pattern 2), close connections with code 1000
**Warning signs:** Client logs show 1006 during deploys instead of 1000

### Pitfall 5: Exceeding Railway $5 Credit

**What goes wrong:** Usage exceeds $5, unexpected charges
**Why it happens:** High traffic, inefficient resource usage, or forgot to monitor
**How to avoid:** Monitor Railway dashboard metrics, set up billing alerts, optimize resource usage
**Warning signs:** Bandwidth spikes in metrics, Railway email warnings

**Railway pricing:**
- RAM: $10/GB/month
- CPU: $20/vCPU/month
- Bandwidth: $0.05/GB egress

**Example usage on $5 credit:**
- 0.5 GB RAM + 0.5 vCPU + 50 GB egress = ~$5/month
- Typical hobby app: 256 MB RAM + 0.25 vCPU + 20 GB egress = ~$2-3/month

### Pitfall 6: Missing Static Assets in Production

**What goes wrong:** Server returns 404 for all client routes, only `/health` works
**Why it happens:** Client build failed or assets not copied to Docker image
**How to avoid:** Verify multi-stage Dockerfile copies `--from=build-client` correctly
**Warning signs:** `/health` returns 200, but `GET /` returns 404

### Pitfall 7: Split Architecture Dev/Prod Parity

**What goes wrong:** Works perfectly in dev (unified), breaks in production (split)
**Why it happens:** Different architectures: dev uses Vite proxy, prod uses split CF Pages + Fly.io
**How to avoid:** Use unified deployment (Railway/Fly.io) for dev/prod parity
**Warning signs:** CORS errors only in production, Origin validation failures

### Pitfall 8: Abandoned Rooms Consume Memory

**What goes wrong:** Players disconnect without leaving room, rooms persist forever, memory leak
**Why it happens:** RoomManager deletes rooms only when host explicitly leaves
**How to avoid:** Implement time-based cleanup (Pattern 5), sweep every 5 minutes, delete 24h inactive
**Warning signs:** `/health` activeRooms metric increases indefinitely, memory usage grows

### Pitfall 9: Railway Service Unhealthy After Deploy

**What goes wrong:** Railway shows "unhealthy", rolls back deployment
**Why it happens:** Health check fails, server not responding on assigned PORT
**How to avoid:** Implement `/health` endpoint, use `process.env.PORT`, test locally with Docker
**Warning signs:** Railway dashboard shows "unhealthy", deploy logs show health check failures

### Pitfall 10: Docker Build OOM (Out of Memory)

**What goes wrong:** GitHub Actions Docker build fails with "out of memory"
**Why it happens:** Client build (Vite) consumes too much memory in GitHub Actions runner
**How to avoid:** Use Docker BuildKit with `--memory` limits, or split client build into separate step
**Warning signs:** GitHub Actions logs show "npm ERR! ENOMEM" or "killed"

## Code Examples

Verified patterns from official sources:

### Complete Unified Server Example

See Pattern 2 above for full unified server code (already implemented in project).

### Complete Client WebSocket Manager (Unified)

See Pattern 3 above for simplified same-origin WebSocket client.

### Railway Deployment via GitHub Actions

See Pattern 4 above for full CI/CD pipeline.

### Local Docker Compose Testing

```yaml
# docker-compose.yml (root of project)
# Test unified deployment locally before Railway

version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      # Optional: Mount for hot reload during testing
      - ./packages/server/src:/app/packages/server/src
      - ./packages/shared:/app/packages/shared
```

**Usage:**

```bash
# Build and run unified container
docker-compose up --build

# Test health endpoint
curl http://localhost:3000/health

# Test static assets
curl http://localhost:3000/

# Test WebSocket (use browser or wscat)
wscat -c ws://localhost:3000/game-ws
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Split deployment default | Unified for WebSocket-heavy apps | 2024-2026 trend | Simpler architecture, same-origin security, better dev/prod parity |
| Heroku free tier | Railway/Fly.io free tiers | Heroku ended free (2022) | Railway $5/mo is new "good enough" tier |
| Manual CORS config | Same-origin by default | WebSocket app awareness (2024+) | Eliminates CORS complexity for unified apps |
| Environment vars for server URL | window.location for same-origin | Unified deployment pattern | No build-time config needed |
| Nginx + Node.js | Bun.serve() unified | Bun 1.0 (2023) | Single process serves static + WebSocket, simpler stack |
| Express + serve-static | Bun.file() + Response | Bun native APIs (2023+) | Less boilerplate, better performance |
| Render free tier for WebSockets | Railway Hobby or Render paid | Render free spin-down (always) | $5-7/mo now minimum for persistent WebSocket |
| Multi-service Docker Compose | Single unified container | Monolith revival (2024-2026) | Simpler for small teams, easier debugging |
| CDN-first architecture | App-first architecture | WebSocket prevalence (2024+) | CDN benefits minimal for WebSocket-heavy apps |
| Vercel/Netlify free tiers | Railway/Fly.io Docker platforms | Edge function limitations | Better WebSocket/Docker support on Railway/Fly.io |

**Deprecated/outdated:**
- **Split deployment for unified apps:** Adds complexity without performance benefit for WebSocket-heavy apps
- **Render free tier for real-time apps:** 15-minute spin-down makes it unusable
- **Heroku free tier:** Ended in 2022
- **VITE_SERVER_URL for unified:** No longer needed with same-origin deployment
- **Origin validation in unified:** Same-origin = no CORS/CSWSH risk
- **Separate CDN for WebSocket apps:** CDN benefits minimal when most traffic is persistent connections

## Open Questions

Things that couldn't be fully resolved:

1. **Railway $5 credit actual usage for this app**
   - What we know: 256 MB RAM + 0.25 vCPU + 20 GB egress ≈ $2-3/month typical usage
   - What's unclear: Actual usage with 10-50 concurrent users (need production metrics)
   - Recommendation: Start with Railway, monitor dashboard, expect to stay within $5 credit

2. **Fly.io free tier long-term viability**
   - What we know: Free tier exists (3 VMs, 256 MB each), no official spin-down
   - What's unclear: Community reports mixed, some report surprise charges
   - Recommendation: Railway safer bet for "set and forget" deployment

3. **Bun.serve() static file performance vs nginx**
   - What we know: Bun.file() is fast, production-ready
   - What's unclear: Benchmark comparison vs nginx for static files at scale
   - Recommendation: Start with Bun.file(), only add nginx if benchmarks show need

4. **Railway vs Render for 100+ concurrent users**
   - What we know: Railway usage-based, Render flat $7/mo
   - What's unclear: Which is cheaper at higher traffic (breakeven point)
   - Recommendation: Railway usage-based is safer (pay for what you use), Render if predictable traffic

5. **Docker image size optimization**
   - What we know: Current multi-stage build includes client build dependencies
   - What's unclear: Can we further optimize by using alpine base or distroless?
   - Recommendation: Start with oven/bun:1, optimize if image size becomes issue

## Sources

### Primary (HIGH confidence)

- [Railway Pricing Plans 2026](https://docs.railway.com/reference/pricing/plans) - Hobby plan details, resource limits
- [Railway vs Render Comparison 2026](https://northflank.com/blog/railway-vs-render) - Platform comparison
- [Bun Fullstack Dev Server Docs](https://bun.sh/docs/bundler/fullstack) - Static file serving patterns
- [How to Deploy Bun Applications to Production](https://oneuptime.com/blog/post/2026-01-31-bun-production-deployment/view) - Production best practices
- [Render Free Tier Limitations](https://render.com/docs/free) - Spin-down behavior documented
- [Railway Free Tier Infographic 2025](https://www.freetiers.com/directory/railway) - Usage limits verified
- [Coolify Open-Source PaaS](https://coolify.io/) - Self-hosted alternative overview
- [Hetzner VPS Pricing 2026](https://costgoat.com/pricing/hetzner) - VPS cost comparison

### Secondary (MEDIUM confidence)

- [Railway vs Fly.io vs Render ROI Comparison](https://medium.com/ai-disruption/railway-vs-fly-io-vs-render-which-cloud-gives-you-the-best-roi-2e3305399e5b) - Cost analysis
- [Unified vs Split Deployment Comparison](https://bastakiss.com/blog/web-17/beyond-the-frontend-backend-split-when-a-monolithic-approach-makes-sense-610) - Architecture tradeoffs
- [Monorepo Benefits and Challenges](https://circleci.com/blog/monorepo-dev-practices/) - Unified deployment advantages
- [Fly.io Free Tier Community Discussion](https://community.fly.io/t/is-there-an-inactivity-delay-for-free-tier/10855) - Free tier behavior
- [DigitalOcean App Platform WebSocket Support](https://www.digitalocean.com/community/questions/how-do-i-run-a-web-service-with-websockets-on-app-platform) - Alternative platform details

### Tertiary (LOW confidence - requires verification)

- [Bun Production Deployment Reality Check 2026](https://vocal.media/01/bun-package-manager-reality-check-2026) - Community perspective
- [Railway Hobby Plan Discussions](https://station.railway.com/questions/what-is-the-hobby-plan-f4f36048) - User experiences

## Metadata

**Confidence breakdown:**
- Railway Hobby plan viability: HIGH - Official docs, clear pricing, verified limits
- Unified deployment benefits: HIGH - Well-documented pattern, existing code supports it
- Bun.serve() static file capability: HIGH - Official Bun docs, production-ready
- Railway vs alternatives: MEDIUM-HIGH - Mix of official docs and community comparisons
- Cost projections: MEDIUM - Based on documented pricing but actual usage varies
- Pitfalls: HIGH - Mix of official docs, community reports, and testing

**Research date:** 2026-02-14
**Valid until:** 2026-04-14 (60 days - pricing and platform features change quarterly)

**Key decisions made in this research:**

1. **Unified deployment recommended over split** - Simpler for WebSocket-heavy app, same-origin security, better dev/prod parity
2. **Railway Hobby as primary recommendation** - Best balance of cost ($5/mo), simplicity, and WebSocket support
3. **Existing server code already supports unified** - No major refactor needed, server already serves static files
4. **Docker multi-stage build pattern** - Build client assets in Docker, copy to server image
5. **Same-origin WebSocket pattern** - Use window.location instead of VITE_SERVER_URL

**Cost comparison summary:**

| Option | Monthly Cost | Complexity | Recommendation |
|--------|--------------|------------|----------------|
| Railway Unified | $5 | Low | ⭐ PRIMARY |
| Fly.io Unified | $0 | Medium | ⭐⭐ Alternative |
| Render Paid | $7 | Low | Alternative |
| VPS + Coolify | €4-10 | Very High | Advanced users only |
| CF Pages + Fly.io | $0 | High | Not recommended (over-engineered) |

**Blockers resolved:**

- ✅ Identified simpler deployment option (unified Railway vs split CF+Fly)
- ✅ Verified existing server code supports unified deployment (static file serving)
- ✅ Documented Railway Hobby plan pricing and limits ($5/mo covers typical usage)
- ✅ Provided multi-stage Dockerfile pattern for unified deployment
- ✅ Simplified client WebSocket connection (same-origin, no env vars)
- ✅ Compared free tier options (Fly.io free vs Railway $5)
- ✅ Evaluated VPS self-hosted option (too complex for hobby project)
- ✅ Analyzed split vs unified tradeoffs (unified wins for this project)

**Next phase planning will create tasks for:**

1. Update unified Dockerfile (multi-stage: build client + serve with Bun)
2. Verify server static file serving (already implemented, may need tweaks)
3. Simplify client WebSocket connection (use window.location, remove VITE_SERVER_URL)
4. Create Railway project and configure service
5. Update GitHub Actions deploy workflow (build + push + Railway deploy)
6. Test Docker image locally with docker-compose
7. Deploy to Railway and verify health endpoint
8. Test WebSocket connections in production
9. Verify room cleanup after 24 hours (monitor /health metrics)
10. Set up Railway billing alerts (stay within $5 credit)
11. Document rollback procedure (Railway CLI or dashboard)
12. Create production monitoring checklist (health, logs, metrics)

Sources:

- [Deploy Bun WebSockets on Railway](https://railway.com/deploy/BLofAq)
- [Deploy a Bun application on Railway - Bun](https://bun.com/docs/guides/deployment/railway)
- [Railway | The all-in-one intelligent cloud provider](https://railway.com/)
- [Full-Stack Deployment Without DevOps Headaches | Render](https://render.com/articles/full-stack-deployment-without-devops-headaches)
- [Deploy a Bun application on Render - Bun](https://bun.com/docs/guides/deployment/render)
- [App Platform Pricing | DigitalOcean](https://www.digitalocean.com/pricing/app-platform)
- [How do I run a web service with websockets on app platform? | DigitalOcean](https://www.digitalocean.com/community/questions/how-do-i-run-a-web-service-with-websockets-on-app-platform)
- [Coolify](https://coolify.io/)
- [GitHub - coollabsio/coolify](https://github.com/coollabsio/coolify)
- [Pricing Plans | Railway Docs](https://docs.railway.com/reference/pricing/plans)
- [Railway Pricing 2026: $5 Free Credit + Hobby $5/mo](https://www.saaspricepulse.com/tools/railway)
- [Do Web Services on a free tier go to sleep after some time inactive? - Render](https://community.render.com/t/do-web-services-on-a-free-tier-go-to-sleep-after-some-time-inactive/3303)
- [Deploy for Free – Render Docs](https://render.com/docs/free)
- [Beyond the Frontend-Backend Split: When a Monolithic Approach Makes Sense](https://bastakiss.com/blog/web-17/beyond-the-frontend-backend-split-when-a-monolithic-approach-makes-sense-610)
- [Railway vs Render (2026): Which cloud platform fits your workflow better](https://northflank.com/blog/railway-vs-render)
- [Railway vs Fly.io vs Render: Which Cloud Gives You the Best ROI?](https://medium.com/ai-disruption/railway-vs-fly-io-vs-render-which-cloud-gives-you-the-best-roi-2e3305399e5b)
- [Hetzner Cloud VPS Pricing Calculator (Feb 2026)](https://costgoat.com/pricing/hetzner)
- [Best VPS Providers for Self-Hosting in 2026](https://selfhostable.dev/blog/best-vps-providers-for-self-hosting-2026/)
- [Railway Hobby Plan Details](https://docs.railway.com/reference/pricing/plans)
- [Is there an "Inactivity Delay" for Free Tier? - Fly.io](https://community.fly.io/t/is-there-an-inactivity-delay-for-free-tier/10855)
- [How to Deploy Bun Applications to Production](https://oneuptime.com/blog/post/2026-01-31-bun-production-deployment/view)
- [Benefits and challenges of monorepo development practices - CircleCI](https://circleci.com/blog/monorepo-dev-practices/)
