# Phase 12: Deployment & Production Polish - Research

**Researched:** 2026-02-08
**Domain:** Bun monorepo deployment to Render with WebSocket server and Vue/Vite SPA
**Confidence:** MEDIUM-HIGH

## Summary

Phase 12 deploys a Bun monorepo with native WebSocket server and Vue/Vite SPA client to Render hosting. The architecture uses Docker multi-stage builds with separate services for server (Bun on oven/bun:1) and client (nginx:alpine serving static assets). Render provides native Bun support and first-class WebSocket infrastructure without connection timeouts, but free tier spin-down (15 min inactivity) makes paid tier necessary for production.

Key considerations: Bun's native WebSocket pub/sub eliminates external dependencies like Socket.IO or Redis for single-instance deployments. Health checks are mandatory for zero-downtime deploys. Origin validation must be manually implemented since WebSockets bypass browser CORS. Vite environment variables require VITE_ prefix and are statically replaced at build time. Room cleanup requires time-based sweeps for abandoned sessions since Render doesn't enforce WebSocket connection limits.

**Primary recommendation:** Use Render's paid tier ($7/month starter) to avoid free tier spin-down. Implement health check endpoint, Origin header validation, graceful shutdown handlers, and time-based room cleanup. Configure nginx with try_files for SPA routing. Use simple JSON logging to stdout for observability (Render captures logs automatically).

## Standard Stack

The established deployment stack for Bun monorepo with WebSocket on Render:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Render | 2026 | PaaS hosting | Native Bun support, first-class WebSocket, no connection timeouts |
| Docker | Multi-stage | Containerization | Required by Render, optimizes image size, separates dev/prod |
| nginx:alpine | Latest | Static file serving | Industry standard for SPA hosting, minimal footprint |
| oven/bun:1 | Latest | Runtime base image | Official Bun Docker image, production-optimized |
| OpenTofu | ~1.0 | Infrastructure as Code | render-oss/render provider manages services declaratively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Uptrace | Self-hosted | OpenTelemetry monitoring | If observability beyond logs needed (requires manual setup with Bun) |
| Grafana + Loki | Self-hosted | Log aggregation | If multi-service log correlation needed (overkill for small game) |
| nanoid | 5.x | Room code generation | Already in use, short collision-resistant IDs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Render paid tier | Railway, Fly.io | Similar pricing, different DX (Render has better WebSocket docs) |
| Docker deployment | Native Bun on Render | Simpler but less portable, Docker provides dev/prod parity |
| Bun native WebSocket | Socket.IO + Redis | Socket.IO adds reconnection/rooms but requires Redis for multi-instance |
| In-memory state | Database persistence | Database adds complexity but enables multi-instance scaling |

**Installation:**
```bash
# OpenTofu Render provider (already configured)
cd infra/opentofu
tofu init

# No additional runtime dependencies needed
# Health check and monitoring use standard library
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── server/
│   ├── Dockerfile              # Multi-stage: dev + production
│   ├── src/
│   │   ├── index.ts            # Bun.serve with /health endpoint
│   │   ├── websocket/handlers.ts
│   │   └── rooms/RoomManager.ts
│   └── package.json
├── client/
│   ├── Dockerfile              # Multi-stage: build + nginx production
│   ├── nginx.conf              # SPA routing config (NEW)
│   ├── src/
│   │   └── services/websocket.ts  # wss:// connection manager
│   └── vite.config.ts          # VITE_SERVER_URL for WS endpoint
infra/
└── opentofu/
    └── main.tf                 # Render web services
.github/workflows/
└── deploy.yml                  # JorgeLNJunior/render-deploy action
```

### Pattern 1: Health Check Endpoint (MANDATORY)
**What:** HTTP GET endpoint returning 2xx/3xx status within 5 seconds
**When to use:** Every Render web service (required for zero-downtime deploys)
**Example:**
```typescript
// Source: https://render.com/docs/health-checks
// packages/server/src/index.ts (already exists)
if (url.pathname === '/health') {
  return new Response(
    JSON.stringify({
      status: 'ok',
      version: APP_VERSION,
      uptime: process.uptime(),
      activeRooms: roomManager.getRoomCount(),  // NEW: add metrics
      activePlayers: roomManager.getPlayerCount(), // NEW
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Render configuration:**
- Dashboard: Service Settings → Health Check Path → `/health`
- Blueprint: `healthCheckPath: /health` in render.yaml
- Render pings every few seconds
- 15 sec failure → stop routing traffic
- 60 sec failure → automatic restart

### Pattern 2: Origin Validation for WebSocket (SECURITY CRITICAL)
**What:** Manual Origin header check during WebSocket upgrade
**When to use:** Always in production (WebSockets bypass browser CORS)
**Example:**
```typescript
// Source: https://cwe.mitre.org/data/definitions/1385.html
// packages/server/src/index.ts
if (url.pathname === '/game-ws') {
  const origin = req.headers.get('Origin');
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

  if (origin !== allowedOrigin) {
    console.warn(`Rejected WebSocket from unauthorized origin: ${origin}`);
    return new Response('Forbidden', { status: 403 });
  }

  const upgraded = server.upgrade(req, {
    data: { playerId: nanoid(), roomCode: null },
  });
  // ... rest of upgrade logic
}
```

**Why critical:** Browsers send cookies/credentials in WebSocket handshake from any origin. Without validation, attacker sites can establish connections and hijack sessions (Cross-Site WebSocket Hijacking).

### Pattern 3: Graceful Shutdown with Connection Tracking
**What:** Track active WebSocket connections, drain on SIGTERM, close cleanly
**When to use:** Production (Render gives 30 sec shutdown window, extendable to 300 sec)
**Example:**
```typescript
// Source: https://render.com/docs/websocket
// packages/server/src/index.ts
const activeConnections = new Set<ServerWebSocket>();

websocket: {
  open(ws) {
    activeConnections.add(ws);
    handleOpen(ws);
  },
  close(ws) {
    activeConnections.delete(ws);
    handleClose(ws, roomManager);
  },
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  server.stop();

  // Close existing WebSocket connections with 1000 (normal closure)
  for (const ws of activeConnections) {
    ws.close(1000, 'Server shutting down');
  }

  // Wait for connections to close (max 25 sec, leave buffer)
  const timeout = setTimeout(() => {
    console.warn('Shutdown timeout, forcing exit');
    process.exit(0);
  }, 25000);

  // Check every 100ms if all connections closed
  const checkInterval = setInterval(() => {
    if (activeConnections.size === 0) {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      console.log('All connections closed, exiting');
      process.exit(0);
    }
  }, 100);
});
```

### Pattern 4: Time-Based Room Cleanup (Abandoned Sessions)
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

### Pattern 5: Nginx SPA Routing Configuration
**What:** Configure nginx to serve index.html for all client-side routes
**When to use:** Production client deployment (required for Vue Router)
**Example:**
```nginx
# Source: https://oneuptime.com/blog/post/2026-01-15-configure-nginx-production-react-spa
# packages/client/nginx.conf (NEW FILE)
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 256;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check for Render
    location /health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }
}
```

**Update Dockerfile:**
```dockerfile
# packages/client/Dockerfile - production stage
FROM nginx:alpine AS production
# Copy custom nginx config
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
# Copy built assets from build stage
COPY --from=build /app/packages/client/dist /usr/share/nginx/html
EXPOSE 80
```

### Pattern 6: WebSocket Connection Manager (Client)
**What:** WSS protocol selection, exponential backoff reconnection, state recovery
**When to use:** Vue client connecting to production WebSocket server
**Example:**
```typescript
// Source: https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection
// packages/client/src/services/websocket.ts
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect() {
    // Use wss:// in production, ws:// in dev
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'localhost:3000';
    const wsUrl = `${protocol}//${serverUrl}/game-ws`;

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
}
```

### Pattern 7: Environment Variables for Production
**What:** Vite requires VITE_ prefix, statically replaced at build time
**When to use:** Client needs server URL (wss://), server needs allowed origin
**Example:**
```bash
# Render Dashboard → Environment Variables
# Server service:
ALLOWED_ORIGIN=https://shit-head-client.onrender.com
PORT=3000  # Already configured in OpenTofu

# Client service (build-time):
VITE_SERVER_URL=shit-head-server.onrender.com  # No protocol, client adds wss://
```

**vite.config.ts (already configured):**
```typescript
const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:3000'
```

**Client usage:**
```typescript
// MUST use full static string (Vite limitation)
const serverUrl = import.meta.env.VITE_SERVER_URL;  // ✅ Works
const key = 'VITE_SERVER_URL';
const serverUrl = import.meta.env[key];  // ❌ Doesn't work (not static)
```

**Pitfall:** Environment variables are embedded in client bundle at build time. Changing VITE_SERVER_URL requires rebuild and redeploy.

### Anti-Patterns to Avoid
- **Don't use free tier for production WebSockets:** 15-minute spin-down kills all connections, violates real-time requirements
- **Don't skip Origin validation:** WebSocket CSRF vulnerability, browser sends cookies from any origin
- **Don't use ws:// in production:** Render responds with 301 redirect, most WebSocket clients fail handshake
- **Don't use Socket.IO "just in case":** Bun native WebSocket pub/sub is sufficient for single-instance, adds unnecessary complexity
- **Don't store secrets in Dockerfile:** Build args are embedded in image layers, use Render environment variables instead
- **Don't assume instant spin-up:** Free tier takes 60+ seconds, paid tier still takes 10-20 seconds on deploy

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log aggregation | Custom log server | Render built-in logs + stdout JSON | Render captures stdout, provides 7-day retention, search, tail |
| Metrics/monitoring | Custom /metrics endpoint | Health check + simple counters | Small game doesn't need Prometheus, activeRooms/activePlayers in /health sufficient |
| WebSocket reconnection | Custom retry logic | Exponential backoff pattern | Thundering herd problem, jitter prevents synchronized reconnects |
| Room ID generation | Math.random() or UUID | nanoid (already in use) | Shorter codes (6 chars), collision-resistant, URL-safe |
| Nginx config | Default nginx:alpine | Custom nginx.conf | Default doesn't handle SPA routing, serves 404 for /game route |
| OpenTelemetry | Manual span creation | Uptrace bunotel (if needed) | Bun doesn't have native OTEL yet, bunotel provides DB instrumentation |
| Connection tracking | Complex state machine | Set data structure | Simple add on open, delete on close, size property for count |

**Key insight:** Render's platform handles most DevOps concerns (logs, health monitoring, zero-downtime deploys) if you follow their patterns. Don't build observability infrastructure unless you have >10,000 concurrent players.

## Common Pitfalls

### Pitfall 1: Free Tier Spin-Down Kills WebSocket Connections
**What goes wrong:** Free tier spins down after 15 minutes inactivity. All WebSocket connections terminate, rooms lost (in-memory state).
**Why it happens:** Render defines "inactivity" as no HTTP requests. Open WebSocket connections don't count as activity.
**How to avoid:** Use paid tier ($7/month Starter minimum). If budget constrained, implement ping/pong heartbeat every 14 minutes to simulate activity (hacky, violates ToS spirit).
**Warning signs:** Players report "disconnected" after 15 minutes idle, rooms disappear without player action.

**Source:** https://render.com/docs/free

### Pitfall 2: Missing Origin Validation → WebSocket CSRF
**What goes wrong:** Attacker site opens WebSocket to your server, sends malicious commands using victim's session cookies.
**Why it happens:** Browsers don't enforce CORS on WebSocket handshakes. Server must manually check Origin header.
**How to avoid:** Validate `req.headers.get('Origin')` against `ALLOWED_ORIGIN` environment variable during upgrade.
**Warning signs:** Unexpected WebSocket connections from unknown origins in logs, unauthorized game actions.

**Source:** https://cwe.mitre.org/data/definitions/1385.html

### Pitfall 3: Vite Env Vars Not Available in Production
**What goes wrong:** `import.meta.env.VITE_SERVER_URL` works in dev, returns undefined in production.
**Why it happens:** Forgot to set environment variable in Render dashboard during build, or variable doesn't have VITE_ prefix.
**How to avoid:**
1. Prefix all client env vars with `VITE_`
2. Set in Render dashboard before deploy (affects build)
3. Test with `bunx vite build` locally, check dist/assets/*.js for embedded value
**Warning signs:** Client connects to `wss://undefined/game-ws`, immediate connection failure.

**Source:** https://vite.dev/guide/env-and-mode

### Pitfall 4: nginx Serves 404 for Vue Routes
**What goes wrong:** Navigating to `https://client.onrender.com/game` returns nginx 404, not Vue app.
**Why it happens:** Default nginx config looks for `/game` file on disk. Client-side routing requires serving index.html for all routes.
**How to avoid:** Add custom nginx.conf with `try_files $uri $uri/ /index.html;` directive (see Pattern 5).
**Warning signs:** Direct navigation or page refresh on `/game` fails, but clicking router-link works.

**Source:** https://oneuptime.com/blog/post/2026-01-15-configure-nginx-production-react-spa

### Pitfall 5: WebSocket Connections Not Closed on Deploy
**What goes wrong:** Old server process killed mid-connection, clients see abrupt disconnect (error code 1006), may not reconnect.
**Why it happens:** No SIGTERM handler, Render forcefully kills after 30 seconds.
**How to avoid:** Implement graceful shutdown pattern (Pattern 3), track connections, send close(1000) on SIGTERM.
**Warning signs:** Client logs show code 1006 (abnormal closure) during deploys instead of 1000 (normal).

**Source:** https://render.com/docs/websocket

### Pitfall 6: Abandoned Rooms Consume Memory
**What goes wrong:** Players disconnect without leaving room (browser crash, network loss), rooms persist forever, memory leak.
**Why it happens:** RoomManager only deletes rooms when host explicitly leaves, disconnection ≠ leave.
**How to avoid:** Implement time-based cleanup (Pattern 4), sweep every 5 minutes, delete rooms with 24h inactivity.
**Warning signs:** `activeRooms` metric in /health keeps increasing, never decreases, memory usage grows over days.

**Source:** https://aws.amazon.com/blogs/compute/managing-sessions-of-anonymous-users-in-websocket-api-based-applications/

### Pitfall 7: Docker Multi-Stage Build Copies Wrong Target
**What goes wrong:** Production Dockerfile builds dev target, includes --watch flag, or build stage copies from wrong layer.
**Why it happens:** Dockerfile has multiple targets (dev, build, production), Render default builds final stage but may copy from wrong intermediate.
**How to avoid:** Explicitly name build stages (`FROM oven/bun:1 AS base`), use `--from=build` in COPY commands, test with `docker build --target production`.
**Warning signs:** Production image is 800MB+ (includes dev dependencies), server restarts on file changes (--watch active).

**Source:** https://render.com/docs/docker

## Code Examples

Verified patterns from official sources:

### Bun Native WebSocket Pub/Sub for Room Broadcasting
```typescript
// Source: https://bun.com/docs/runtime/http/websockets
// packages/server/src/websocket/handlers.ts

export function handleMessage(ws: ServerWebSocket<WebSocketData>, message: string, roomManager: RoomManager) {
  const msg = JSON.parse(message);

  if (msg.type === 'JOIN_ROOM') {
    const result = roomManager.joinRoom(msg.roomCode, ws.data.playerId, msg.nickname);

    if (result.success) {
      // Subscribe to room topic for broadcasts
      ws.subscribe(msg.roomCode);
      ws.data.roomCode = msg.roomCode;

      // Notify all players in room (including sender)
      ws.publish(msg.roomCode, JSON.stringify({
        type: 'PLAYER_JOINED',
        player: { id: ws.data.playerId, nickname: msg.nickname },
      }));

      // Send current room state to joiner
      ws.send(JSON.stringify({
        type: 'ROOM_STATE',
        state: result.data,
      }));
    }
  }

  if (msg.type === 'GAME_ACTION') {
    // Broadcast to room (excludes sender by default)
    ws.publish(ws.data.roomCode!, JSON.stringify({
      type: 'GAME_UPDATE',
      action: msg.action,
    }));
  }
}

export function handleClose(ws: ServerWebSocket<WebSocketData>, roomManager: RoomManager) {
  if (ws.data.roomCode) {
    ws.unsubscribe(ws.data.roomCode);
    roomManager.leaveRoom(ws.data.playerId);

    // Notify remaining players
    ws.publish(ws.data.roomCode, JSON.stringify({
      type: 'PLAYER_LEFT',
      playerId: ws.data.playerId,
    }));
  }
}
```

**Key APIs:**
- `ws.subscribe(topic)` - Join pub/sub topic
- `ws.publish(topic, data)` - Send to all subscribers except self
- `ws.unsubscribe(topic)` - Leave topic
- No external pub/sub service needed for single-instance

### Render GitHub Action Deployment
```yaml
# Source: https://github.com/JorgeLNJunior/render-deploy
# .github/workflows/deploy.yml (already exists, verify configuration)

name: Deploy

on:
  push:
    branches:
      - main  # Change from 'production' to 'main' if needed

jobs:
  deploy-server:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Render
        uses: JorgeLNJunior/render-deploy@v1.5.0
        with:
          service_id: ${{ secrets.RENDER_SERVER_SERVICE_ID }}
          api_key: ${{ secrets.RENDER_API_KEY }}
          wait_deploy: true  # Blocks until health check passes

  deploy-client:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Render
        uses: JorgeLNJunior/render-deploy@v1.5.0
        with:
          service_id: ${{ secrets.RENDER_CLIENT_SERVICE_ID }}
          api_key: ${{ secrets.RENDER_API_KEY }}
          wait_deploy: true
```

**Setup:**
1. Get service IDs from Render dashboard (service Settings → Info)
2. Create API key from Render dashboard (Account Settings → API Keys)
3. Add secrets to GitHub: Settings → Secrets → Actions → New repository secret

### OpenTofu Render Configuration (Already Exists)
```hcl
# Source: https://registry.terraform.io/providers/render-oss/render/latest/docs
# infra/opentofu/main.tf (verify and update)

terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.0"
    }
  }
}

provider "render" {
  api_key = var.render_api_key
}

resource "render_web_service" "server" {
  name               = "${var.project_name}-server"
  plan               = "starter"  # CHANGE from "free" to "starter" ($7/mo)
  region             = var.region
  runtime            = "docker"
  repo_url           = var.repo_url
  auto_deploy        = true
  dockerfile_path    = "packages/server/Dockerfile"
  docker_command     = ""  # Uses Dockerfile CMD

  # NEW: Health check configuration
  health_check_path  = "/health"

  env_vars = {
    PORT = { value = "10000" }  # Render internal port
    ALLOWED_ORIGIN = { value = "https://${render_web_service.client.url}" }  # Reference client URL
    NODE_ENV = { value = "production" }
  }
}

resource "render_web_service" "client" {
  name               = "${var.project_name}-client"
  plan               = "starter"  # CHANGE from "free" to "starter"
  region             = var.region
  runtime            = "docker"
  repo_url           = var.repo_url
  auto_deploy        = true
  dockerfile_path    = "packages/client/Dockerfile"
  docker_command     = ""

  # NEW: Health check configuration
  health_check_path  = "/health"

  env_vars = {
    VITE_SERVER_URL = { value = render_web_service.server.url }  # Reference server URL
  }
}

# NEW: Output URLs for reference
output "server_url" {
  value = render_web_service.server.url
}

output "client_url" {
  value = render_web_service.client.url
}
```

**Apply:**
```bash
cd infra/opentofu
tofu plan
tofu apply  # Creates/updates services on Render
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Socket.IO for rooms | Bun native pub/sub | Bun 1.0 (2023) | Eliminate Socket.IO + Redis dependencies, simpler architecture |
| Node.js + ws library | Bun native WebSocket | Bun 1.0 (2023) | 7x throughput, built-in pub/sub, TypeScript native |
| Heroku free tier | Render paid tier | Heroku ended free (2022) | Render free tier exists but unusable for WebSockets (spin-down) |
| process.env in Vite | import.meta.env.VITE_ | Vite 2.0 (2021) | Static replacement at build time, requires prefix |
| Manual CORS headers | Origin validation in upgrade | WebSocket CSRF awareness (2018+) | Security requirement, not optional |
| Dockerfile without stages | Multi-stage builds | Docker 17.05 (2017) | Smaller images, dev/prod parity, already implemented |

**Deprecated/outdated:**
- **Socket.IO for single-instance apps:** Bun native pub/sub handles room broadcasting without external dependencies. Only use Socket.IO if scaling to multi-instance with Redis.
- **ws library for Node.js:** Bun native implementation is faster and requires no packages. Not applicable to Bun projects.
- **Heroku:** Free tier ended November 2022. Render, Railway, Fly.io are current free/low-cost alternatives.
- **nginx default config for SPA:** Serves 404s for client routes. Custom nginx.conf with try_files is now standard pattern.

## Open Questions

Things that couldn't be fully resolved:

1. **Render free tier WebSocket viability**
   - What we know: Free tier spins down after 15 min inactivity, connections terminate
   - What's unclear: Whether heartbeat pings count as "inbound traffic" to prevent spin-down
   - Recommendation: Assume NO, use paid tier ($7/mo Starter). Free tier is for testing only, not production per success criteria.

2. **Multi-instance scaling approach**
   - What we know: Render supports horizontal scaling, but in-memory state doesn't share across instances
   - What's unclear: When to add Redis pub/sub vs. when single-instance is sufficient
   - Recommendation: Start single-instance (sufficient for <1000 concurrent players), add Redis when Render metrics show CPU >80% sustained.

3. **OpenTelemetry instrumentation value**
   - What we know: Bun doesn't have native OTEL support, requires manual bunotel setup for DB tracing
   - What's unclear: Whether distributed tracing adds value for 2-service monorepo
   - Recommendation: Skip initially, use health check metrics + Render logs. Add if debugging performance issues.

4. **Environment variable changes without rebuild**
   - What we know: Vite env vars are statically replaced at build time
   - What's unclear: How to deploy same client artifact to staging + production with different VITE_SERVER_URL
   - Recommendation: Accept rebuild requirement (Vite limitation), or use runtime config.js loaded by index.html (non-standard pattern).

## Sources

### Primary (HIGH confidence)
- Bun WebSocket API: https://bun.com/docs/runtime/http/websockets
- Render Health Checks: https://render.com/docs/health-checks
- Render WebSocket Support: https://render.com/docs/websocket
- Render Docker Deployment: https://render.com/docs/docker
- Render Free Tier Limitations: https://render.com/docs/free
- Vite Environment Variables: https://vite.dev/guide/env-and-mode
- CWE-1385 WebSocket Origin Validation: https://cwe.mitre.org/data/definitions/1385.html

### Secondary (MEDIUM confidence)
- [How to Build WebSocket Servers with Bun](https://oneuptime.com/blog/post/2026-01-31-bun-websocket-servers/view) - Production patterns, pub/sub, heartbeat
- [How to Implement Reconnection Logic for WebSockets](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view) - Exponential backoff pattern
- [How to Configure Nginx for Production React SPAs](https://oneuptime.com/blog/post/2026-01-15-configure-nginx-production-react-spa/view) - nginx.conf SPA routing
- [Managing sessions of anonymous users in WebSocket API-based applications](https://aws.amazon.com/blogs/compute/managing-sessions-of-anonymous-users-in-websocket-api-based-applications/) - Room cleanup patterns
- [Is Bun Production-Ready in 2026?](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h) - Production viability assessment
- [WebSocket architecture best practices](https://ably.com/topic/websocket-architecture-best-practices) - Reconnection, scaling, state recovery

### Tertiary (LOW confidence)
- [Building Real-Time AI Chat on Render](https://render.com/articles/real-time-ai-chat-websockets-infrastructure) - Render WebSocket case study
- [Bun Performance Monitoring](https://bun.uptrace.dev/guide/performance-monitoring.html) - OpenTelemetry bunotel integration
- [WebSocket Rooms: Complete Guide 2026](https://copyprogramming.com/howto/how-to-make-a-room-on-websocket) - Room management patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Render docs, Bun docs, existing infrastructure verified
- Architecture patterns: HIGH - Patterns verified in official documentation with code examples
- Pitfalls: MEDIUM-HIGH - Mix of official docs (Origin validation, free tier) and community reports (env vars, nginx)
- Open questions: LOW-MEDIUM - Areas requiring production validation (heartbeat effectiveness, scaling threshold)

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - stable deployment patterns, but Bun/Render evolving rapidly)

**Key assumptions:**
1. Production deployment will use Render paid tier (Starter $7/mo minimum)
2. Single-instance deployment is acceptable (no Redis pub/sub needed)
3. In-memory room state is acceptable (rooms lost on redeploy, acceptable for casual game)
4. Basic observability (health check metrics + logs) is sufficient for initial launch
5. GitHub Actions CI/CD with JorgeLNJunior/render-deploy is already configured

**Blockers resolved:**
- ✅ Bun production viability: Confirmed production-ready for WebSocket workloads in 2026
- ✅ Render WebSocket support: First-class support, no connection timeouts, paid tier required
- ✅ Multi-stage Docker builds: Already implemented, verified pattern
- ✅ Health check requirements: Mandatory for zero-downtime, /health endpoint exists
- ✅ Origin validation requirement: CSRF vulnerability, must implement

**Next phase dependencies:**
- Phase 12 planning requires this research to determine tasks for:
  1. Adding nginx.conf for SPA routing
  2. Implementing Origin validation
  3. Adding graceful shutdown handlers
  4. Implementing time-based room cleanup
  5. Updating OpenTofu config for paid tier + health checks
  6. Configuring production environment variables
  7. Writing deployment runbook
