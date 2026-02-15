# Phase 16: Networking Foundation - Research

**Researched:** 2026-02-15
**Domain:** Discord Activity proxy networking, WebSocket resilience, cloudflared tunneling
**Confidence:** HIGH

## Summary

Phase 16 validates WebSocket connections through Discord's proxy infrastructure (discordsays.com) and improves connection resilience for both standalone and Discord Activity modes. Discord routes all Activity traffic through Cloudflare Workers proxy for security and privacy. The standard approach uses cloudflared tunnel for local development, Vite's `server.proxy` for path-based routing (/.proxy prefix), and enhanced WebSocket reconnection with exponential backoff + jitter.

The existing codebase already uses @vueuse/core's `useWebSocket` with basic `autoReconnect` and `heartbeat` configured. We need to enhance this with better UX feedback (reconnecting overlays), configure Vite proxy for Discord's `/.proxy` path mapping, and create a separate `make dev-discord` command that handles cloudflared tunnel setup.

**Primary recommendation:** Use Vite's `server.proxy.rewrite` to strip `/.proxy` prefix for backend routing, enhance existing @vueuse/core reconnection with exponential backoff delay function and connection state UI, run cloudflared tunnel manually or via Makefile for Discord testing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Dev workflow**: Separate command for Discord Activity dev (e.g. `make dev-discord`) — not integrated into `make dev`
- **Discord dev setup**: Additional setup (cloudflared, Discord app config) shouldn't be imposed on normal development
- **URL mapping standard**: Follow Discord's standard `/.proxy` path prefix — backend requests through `/.proxy/api/*`, WebSocket through `/.proxy/ws`
- **Documentation location**: Deployment/URL mapping documentation lives in project root (e.g. `DISCORD-SETUP.md`) for discoverability
- **Validation scope**: WebSocket connects, player joins room, sees lobby state, game starts — through the proxy path (no need for full game playthrough)
- **Testing approach**: Manual testing with documented checklist AND automated tests in CI
- **CI tests**: Both mock proxy tests (URL mapping/config validation, fast) AND real cloudflared tunnel test (experimental, delete if flaky)
- **Error capture**: Structured error info for debugging (not just pass/fail)
- **User feedback**: "Reconnecting..." overlay/toast shown to player when connection drops (not silent)
- **Reconnection failure**: Show error with manual retry button after multiple failed attempts
- **Dual-mode resilience**: Reconnection logic applies to BOTH standalone web and Discord proxy modes (one resilient connection layer)
- **Reconnect scope**: On successful reconnect, reconnect to room only (NOT full game state restoration)
- **Error structure**: Errors captured with structured info for future observability

### Claude's Discretion
- Whether to auto-start cloudflared in the Discord dev command or keep it manual
- Reconnection timing (backoff strategy, max attempts)
- Mock proxy test implementation approach
- Exact overlay/toast design for reconnection feedback

### Deferred Ideas (OUT OF SCOPE)
- Observability stack (OpenTelemetry, Grafana, error logging/monitoring) — future phase for production monitoring
- Full game state restoration on reconnect — possible future enhancement after basic reconnection works
</user_constraints>

## Standard Stack

### Core Libraries (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vueuse/core | Latest | WebSocket composable with reconnection | De facto Vue 3 composable library, handles reconnection/heartbeat |
| Vite | 6.x | Dev server with proxy support | Standard Vue build tool, built-in proxy via http-proxy |
| Bun.serve | 1.x | Native WebSocket server | Already in use, works with standard WebSocket protocol |
| cloudflared | Latest | Local tunnel for Discord testing | Official Discord recommendation for Activity development |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest-websocket-mock | Latest | Mock WebSocket server for tests | Unit/integration tests of WS client behavior |
| http-proxy | (via Vite) | Underlying proxy for path rewriting | Built-in, configured via vite.config.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cloudflared | ngrok | ngrok free tier has interstitial that breaks mobile WS (project history lesson) |
| @vueuse/core | Custom reconnection | Reinventing well-tested library, no benefit |
| Vite proxy | Nginx in Docker | Over-engineering for dev workflow, slower iteration |

**Installation:**
```bash
# cloudflared (macOS)
brew install cloudflared

# or download binary from GitHub releases
# https://github.com/cloudflare/cloudflared/releases

# Testing libraries (already in devDependencies)
bun add -d vitest-websocket-mock
```

## Architecture Patterns

### Recommended Project Structure
```
packages/client/
├── src/
│   ├── composables/
│   │   └── useGameSocket.ts          # Enhanced with reconnection UI state
│   └── components/
│       └── ConnectionStatus.vue       # NEW: Reconnection overlay/toast
packages/server/
└── src/
    └── index.ts                        # Add /.proxy path handling (optional)
.planning/phases/16-networking-foundation/
└── tests/
    ├── proxy-mapping.test.ts           # Mock proxy config validation
    └── cloudflared-integration.test.ts # Real tunnel test (experimental)
DISCORD-SETUP.md                        # NEW: Discord Activity setup guide
```

### Pattern 1: Vite Proxy Path Rewriting for Discord
**What:** Configure Vite dev server to strip `/.proxy` prefix and route to backend
**When to use:** Always — both standalone and Discord Activity modes need this
**Example:**
```typescript
// packages/client/vite.config.ts
// Source: https://vite.dev/config/server-options
export default defineConfig({
  server: {
    proxy: {
      // Existing routes (standalone mode)
      '/api': {
        target: 'http://host.docker.internal:3000',
        changeOrigin: true,
      },
      '/game-ws': {
        target: 'ws://host.docker.internal:3000',
        ws: true,
        changeOrigin: true,
      },
      // NEW: Discord Activity proxy paths
      '/.proxy/api': {
        target: 'http://host.docker.internal:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy/, ''), // Strip /.proxy prefix
      },
      '/.proxy/ws': {
        target: 'ws://host.docker.internal:3000',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy\/ws/, '/game-ws'), // Map to existing WS endpoint
      },
    },
  },
});
```

### Pattern 2: Enhanced WebSocket Reconnection with Exponential Backoff + Jitter
**What:** Configure @vueuse/core's autoReconnect with exponential backoff delay function
**When to use:** Always — improves both standalone and Discord Activity resilience
**Example:**
```typescript
// packages/client/src/composables/useGameSocket.ts
// Source: https://vueuse.org/core/usewebsocket/ + https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view
const { status, data, send: wsSend, close, open } = scope.run(() =>
  useWebSocket(wsUrl, {
    autoReconnect: {
      retries: 10, // Max attempts before showing error
      delay: (retries) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
        const baseDelay = Math.min(1000 * Math.pow(2, retries - 1), 30000);
        // Add 10% jitter to prevent thundering herd
        const jitter = baseDelay * 0.1 * (Math.random() - 0.5);
        return Math.round(baseDelay + jitter);
      },
      onFailed() {
        error.value = 'Failed to connect to server after multiple attempts';
        // Show error overlay with manual retry button
      },
    },
    heartbeat: {
      message: 'ping',
      interval: 30000,
      pongTimeout: 5000,
    },
    immediate: true,
  })
)!;

// Track reconnection state for UI feedback
const isReconnecting = computed(() =>
  status.value === 'CONNECTING' && playerId.value !== null
);
```

### Pattern 3: Connection State UI Feedback
**What:** Show reconnection status to user with overlay/toast
**When to use:** Always — user should know connection state (locked decision)
**Example:**
```vue
<!-- packages/client/src/components/ConnectionStatus.vue -->
<script setup lang="ts">
import { useGameSocket } from '@/composables/useGameSocket';
const { status, reconnecting, error } = useGameSocket();
</script>

<template>
  <!-- Reconnecting overlay -->
  <div v-if="status === 'CONNECTING' && reconnecting" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <p class="mt-4">Reconnecting...</p>
    </div>
  </div>

  <!-- Connection failed error -->
  <div v-if="error" class="fixed bottom-4 right-4 bg-red-500 text-white rounded-lg p-4 z-50">
    <p>{{ error }}</p>
    <button @click="open()" class="mt-2 px-4 py-2 bg-white text-red-500 rounded">
      Retry Connection
    </button>
  </div>
</template>
```

### Pattern 4: Cloudflared Tunnel for Discord Dev
**What:** Run cloudflared tunnel pointing to Vite dev server for Discord Activity testing
**When to use:** Only when testing Discord Activity mode (not normal dev)
**Example:**
```bash
# Manual approach (Claude's discretion: keep manual or auto-start)
# Source: https://docs.discord.com/developers/activities/development-guides/local-development

# Terminal 1: Start dev server
make dev

# Terminal 2: Start cloudflared tunnel pointing to Vite
cloudflared tunnel --url http://localhost:5173

# Output will show: https://random-words.trycloudflare.com
# Copy this URL to Discord Developer Portal → Activities → URL Mappings
# Set prefix: / → target: random-words.trycloudflare.com
```

**Makefile option (auto-start approach):**
```makefile
# Makefile addition
dev-discord: install ## Start Discord Activity dev environment with tunnel
	@echo "Starting Discord Activity development environment..."
	@echo "1. Vite dev server: http://localhost:5173"
	@echo "2. Backend server: http://localhost:3000"
	@echo ""
	@echo "Starting cloudflared tunnel (will print URL)..."
	@echo "Copy the tunnel URL to Discord Developer Portal → Activities → URL Mappings"
	@echo "Set prefix: / → target: [tunnel-domain-without-https]"
	@echo ""
	docker compose up --build &
	# Wait for servers to be ready
	sleep 5
	cloudflared tunnel --url http://localhost:5173
```

### Anti-Patterns to Avoid
- **Silent reconnection**: Never reconnect without user feedback (violates locked decision)
- **Same delay retry**: Fixed delay causes thundering herd on server restart
- **Unlimited retries**: Must cap retries and show manual retry button (locked decision)
- **Proxy path in backend**: Don't modify backend to handle `/.proxy` — Vite strips it
- **Integrating cloudflared into main dev**: Keeps setup separate per locked decision
- **ngrok for Discord**: Free tier interstitial breaks WebSocket upgrade on mobile (project history)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection | Custom reconnection loop | @vueuse/core useWebSocket with autoReconnect | Handles edge cases (manual close, connection state, cleanup) |
| Local tunneling | Custom proxy server | cloudflared | Discord-recommended, free, handles HTTPS upgrade, reliable |
| Exponential backoff | Custom retry timing | autoReconnect delay function | Prevents thundering herd with jitter, caps max delay |
| Proxy path rewriting | Custom middleware in backend | Vite server.proxy.rewrite | Built-in, dev-only, no backend changes needed |
| WebSocket mocking | Custom mock WebSocket class | vitest-websocket-mock | Handles message ordering, connection lifecycle, assertions |

**Key insight:** Discord Activity networking looks simple (just proxy requests) but has subtle complexity: CSP sandbox, proxy URL transformation, mobile WebSocket gotchas, reconnection race conditions. Use established patterns and tools.

## Common Pitfalls

### Pitfall 1: Forgetting to Update Discord URL Mapping
**What goes wrong:** Cloudflared generates new random URL each run; old mapping breaks
**Why it happens:** Cloudflared free tier doesn't provide persistent URLs
**How to avoid:** Document clear setup steps in DISCORD-SETUP.md with checklist
**Warning signs:** WebSocket fails to connect in Discord, works in standalone mode

### Pitfall 2: Proxy Path Confusion (/.proxy vs /game-ws)
**What goes wrong:** Client tries to connect to `/.proxy/ws` but backend expects `/game-ws`
**Why it happens:** Discord's `/.proxy` is a front-end convention, backend uses `/game-ws`
**How to avoid:** Vite proxy rewrites `/.proxy/ws` → `/game-ws` transparently
**Warning signs:** 404 errors on WebSocket upgrade in Discord mode

### Pitfall 3: Silent Reconnection Attempts
**What goes wrong:** User thinks they're connected but they're not; messages silently lost
**Why it happens:** Default useWebSocket behavior doesn't surface reconnection state
**How to avoid:** Track `status === 'CONNECTING' && reconnecting` for overlay UI
**Warning signs:** User reports "game froze" or "nothing happens" after network hiccup

### Pitfall 4: Fixed Retry Delay Thundering Herd
**What goes wrong:** Server restarts, 100 clients reconnect simultaneously at exact 1-second intervals
**Why it happens:** All clients use same fixed retry delay
**How to avoid:** Exponential backoff + 10% jitter spreads reconnections over time
**Warning signs:** Server CPU spike after brief outage, cascading failures

### Pitfall 5: Testing Against Production Discord Proxy Too Late
**What goes wrong:** App works in dev, breaks in Discord Activity deployment
**Why it happens:** Local dev bypasses Discord proxy; URL mapping issues surface in prod
**How to avoid:** Test through cloudflared tunnel regularly (why Phase 16 validates this first)
**Warning signs:** "Works on my machine" but fails in Discord Activity embed

### Pitfall 6: WebSocket Origin Validation Blocks Discord Proxy
**What goes wrong:** Backend rejects WebSocket upgrade from discordsays.com origin
**Why it happens:** Server origin validation expects client origin, Discord proxy changes it
**How to avoid:** Add `*.discordsays.com` to ALLOWED_ORIGINS, or disable origin check for proxy
**Warning signs:** 403 Forbidden on WebSocket upgrade in Discord, works standalone

### Pitfall 7: Cloudflared CI Test Flakiness
**What goes wrong:** CI test with real cloudflared tunnel times out or fails randomly
**Why it happens:** Network latency, tunnel startup time, rate limits
**How to avoid:** Run fast mock proxy tests always, real tunnel test as experimental (locked decision: delete if flaky)
**Warning signs:** CI occasionally fails with "tunnel not ready" or timeout errors

## Code Examples

Verified patterns from official sources:

### Discord URL Mapping Configuration
```javascript
// Source: https://github.com/discord/embedded-app-sdk/blob/main/patch-url-mappings.md
// packages/client/src/discord-sdk-init.ts (FUTURE: Phase 17+)
import { patchUrlMappings } from '@discord/embedded-app-sdk';

// Map external resources to /.proxy paths
patchUrlMappings([
  { prefix: '/api', target: 'your-backend-domain.com' },
  { prefix: '/ws', target: 'your-backend-domain.com' },
]);
```

### Exponential Backoff with Jitter
```typescript
// Source: https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view
function exponentialBackoffWithJitter(retries: number): number {
  const maxDelay = 30000; // 30 seconds
  const baseDelay = Math.min(1000 * Math.pow(2, retries - 1), maxDelay);
  const jitterPercent = 0.1; // 10% jitter
  const jitterRange = baseDelay * jitterPercent;
  const jitter = Math.random() * jitterRange - (jitterRange / 2);
  return Math.round(baseDelay + jitter);
}

// Usage in useWebSocket config
autoReconnect: {
  retries: 10,
  delay: exponentialBackoffWithJitter,
  onFailed() {
    // Show error UI with manual retry
  },
}
```

### Vite Proxy Configuration (Complete)
```typescript
// Source: https://vite.dev/config/server-options
// packages/client/vite.config.ts
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true, // Allow tunnel hostnames (cloudflared, ngrok)
    hmr: {
      path: '/__hmr', // Avoid conflict with game-ws proxy
    },
    proxy: {
      // Standalone mode routes
      '/api': {
        target: 'http://host.docker.internal:3000',
        changeOrigin: true,
      },
      '/game-ws': {
        target: 'ws://host.docker.internal:3000',
        ws: true,
        changeOrigin: true,
      },
      // Discord Activity mode routes (NEW)
      '/.proxy/api': {
        target: 'http://host.docker.internal:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy/, ''),
      },
      '/.proxy/ws': {
        target: 'ws://host.docker.internal:3000',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy\/ws/, '/game-ws'),
      },
    },
  },
});
```

### Mock Proxy Test (Fast CI Test)
```typescript
// Source: https://github.com/akiomik/vitest-websocket-mock
// .planning/phases/16-networking-foundation/tests/proxy-mapping.test.ts
import { describe, it, expect } from 'vitest';
import viteConfig from '../../../packages/client/vite.config';

describe('Discord Proxy URL Mapping', () => {
  it('should have /.proxy/api route configured', () => {
    const proxyConfig = viteConfig.server?.proxy;
    expect(proxyConfig).toHaveProperty('/.proxy/api');
    const apiProxy = proxyConfig['/.proxy/api'];
    expect(apiProxy.rewrite).toBeDefined();
    // Verify rewrite strips /.proxy prefix
    const rewritten = apiProxy.rewrite('/.proxy/api/health');
    expect(rewritten).toBe('/api/health');
  });

  it('should have /.proxy/ws WebSocket route configured', () => {
    const proxyConfig = viteConfig.server?.proxy;
    expect(proxyConfig).toHaveProperty('/.proxy/ws');
    const wsProxy = proxyConfig['/.proxy/ws'];
    expect(wsProxy.ws).toBe(true);
    expect(wsProxy.rewrite).toBeDefined();
    // Verify rewrite maps to /game-ws
    const rewritten = wsProxy.rewrite('/.proxy/ws');
    expect(rewritten).toBe('/game-ws');
  });
});
```

### Cloudflared Integration Test (Experimental CI Test)
```typescript
// Source: https://github.com/AnimMouse/setup-cloudflared
// .planning/phases/16-networking-foundation/tests/cloudflared-integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';

describe('Cloudflared Tunnel Integration', () => {
  let tunnelProcess: any;
  let tunnelUrl: string;

  beforeAll(async () => {
    // Start cloudflared tunnel (captures stdout for URL)
    tunnelProcess = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:5173']);

    // Wait for tunnel URL from stdout
    tunnelUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Tunnel startup timeout')), 30000);
      tunnelProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        const match = output.match(/https:\/\/[\w-]+\.trycloudflare\.com/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[0]);
        }
      });
    });
  }, 40000); // 40s timeout for tunnel startup

  afterAll(() => {
    tunnelProcess?.kill();
  });

  it('should connect WebSocket through tunnel', async () => {
    const wsUrl = tunnelUrl.replace('https://', 'wss://') + '/game-ws';
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  }, 15000);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed retry delay | Exponential backoff + jitter | 2024-2025 | Prevents thundering herd reconnections |
| Silent reconnection | Connection state UI feedback | 2025-2026 | Users aware of connection issues |
| ngrok for tunneling | cloudflared | 2023 (Discord docs) | Free tier works on mobile (no interstitial) |
| Custom reconnection logic | @vueuse/core autoReconnect | 2022+ | Handles edge cases, well-tested |
| /.proxy required for all requests | Optional (modern/legacy formats) | 2025-2026 | Both `/.proxy/api` and `/api` work |

**Deprecated/outdated:**
- **ngrok for Discord Activity**: Free tier interstitial breaks WebSocket upgrade on mobile (project documented this)
- **Manual WebSocket reconnection**: @vueuse/core handles this better
- **Fixed heartbeat interval**: Use configurable scheduler for flexibility
- **Silent connection failures**: User feedback is now expected behavior

## Open Questions

Things that couldn't be fully resolved:

1. **Auto-start cloudflared in make dev-discord vs manual**
   - What we know: Both approaches work; auto-start is convenient, manual gives control
   - What's unclear: Project preference for dev workflow simplicity vs explicitness
   - Recommendation: Start with manual (documented in DISCORD-SETUP.md), add auto-start if requested. Claude's discretion per locked decisions.

2. **Max reconnection attempts before showing error**
   - What we know: 10 attempts is common, @vueuse/core defaults to unlimited (-1)
   - What's unclear: Optimal number for game context (lobby vs in-game may differ)
   - Recommendation: Start with 10 attempts (~60 seconds with exponential backoff), adjust based on testing

3. **Cloudflared CI test stability**
   - What we know: Real tunnel tests can be flaky (network latency, rate limits, startup time)
   - What's unclear: Whether GitHub Actions environment will reliably support this
   - Recommendation: Implement as experimental test, delete if flaky per locked decision

4. **Backend origin validation for Discord proxy**
   - What we know: Server currently validates Origin header; Discord proxy uses `*.discordsays.com` origin
   - What's unclear: Whether to add wildcard `*.discordsays.com` to ALLOWED_ORIGINS or disable origin check conditionally
   - Recommendation: Add `*.discordsays.com` to ALLOWED_ORIGINS for production environment only (Phase 17+ deployment concern)

5. **Connection status overlay vs toast design**
   - What we know: User must see reconnection state (locked decision)
   - What's unclear: Full-screen overlay (blocking) vs corner toast (non-blocking)
   - Recommendation: Start with non-blocking corner toast for reconnecting, blocking overlay only for connection failed with retry button. Claude's discretion per locked decisions.

## Sources

### Primary (HIGH confidence)
- [Discord Activity Networking Documentation](https://docs.discord.com/developers/activities/development-guides/networking) - Proxy architecture, URL mapping
- [Discord Activity Local Development Guide](https://docs.discord.com/developers/activities/development-guides/local-development) - Cloudflared tunnel setup
- [Discord embedded-app-sdk patch-url-mappings.md](https://github.com/discord/embedded-app-sdk/blob/main/patch-url-mappings.md) - patchUrlMappings API
- [Vite Server Options Documentation](https://vite.dev/config/server-options) - Proxy configuration, rewrite function
- [VueUse useWebSocket Documentation](https://vueuse.org/core/usewebsocket/) - autoReconnect, heartbeat API
- [OneUptime WebSocket Reconnection Logic Guide (2026-01-24)](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view) - Exponential backoff + jitter implementation

### Secondary (MEDIUM confidence)
- [Robo.js Discord Proxy Guide](https://robojs.dev/discord-activities/proxy) - Community patterns
- [Waveplay Discord Proxy CSP Blog](https://blog.waveplay.com/discord-proxy-csp-patch/) - URL mapping explanation
- [GitHub AnimMouse/setup-cloudflared Action](https://github.com/AnimMouse/setup-cloudflared) - CI integration
- [GitHub akiomik/vitest-websocket-mock](https://github.com/akiomik/vitest-websocket-mock) - Mock WebSocket testing
- [Medium: WebSocket Integration Testing with Vitest](https://medium.com/@juaogui159/how-to-effectively-write-integration-tests-for-websockets-using-vitest-and-socket-io-360208978210) - Testing patterns
- [Apidog WebSocket Reconnect Strategies](https://apidog.com/blog/websocket-reconnect/) - Reconnection best practices

### Tertiary (LOW confidence - flagged for validation)
- WebSearch results on Discord Activities (2026) - General ecosystem knowledge, verify with official docs
- WebSearch results on Vite proxy patterns (2026) - Common configurations, verify with Vite docs
- Community discussions on cloudflared CI integration - Implementation approaches, may have stability issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use or Discord-recommended
- Architecture patterns: HIGH - Vite proxy and @vueuse/core patterns verified with official docs
- Pitfalls: HIGH - Based on project history (ngrok lesson) and documented Discord/WebSocket gotchas
- Cloudflared CI testing: MEDIUM - Experimental, may need deletion if flaky (per locked decision)
- UI design details: MEDIUM - Implementation details are Claude's discretion

**Research date:** 2026-02-15
**Valid until:** ~60 days (March 2026) - Discord docs stable, Vite stable, WebSocket patterns mature

---

**Notes for planner:**
- User locked many decisions in CONTEXT.md — honor these strictly
- Existing codebase already has useWebSocket with basic reconnection — enhance, don't replace
- Project history shows ngrok mobile WebSocket failure — cloudflared is validated alternative
- Separate dev workflow (`make dev-discord`) prevents imposing Discord setup on normal dev
- Mock proxy tests are fast and stable; real cloudflared CI test is experimental (delete if flaky)
- Connection resilience benefits both standalone and Discord modes (cross-cutting improvement)
