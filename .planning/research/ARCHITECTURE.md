# Architecture Patterns: Dual-Mode Web App + Discord Activity

**Project:** Shithead Online
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

Discord Activities are **iframe-based web applications** with specialized communication protocols. The key architectural insight: ~80% of your existing codebase can remain unchanged. The integration requires an **adapter layer** that abstracts authentication, connection, and room management differences between standalone web and Discord modes.

Your existing architecture is well-positioned for this integration because:
- Server-authoritative game state (already necessary)
- Player-specific views via WebSocket (compatible with Discord proxy)
- Composable Vue 3 frontend (easy to inject adapters)
- Monorepo structure (shared logic already extracted)

The Discord proxy architecture routes all traffic through Cloudflare Workers at `{clientId}.discordsays.com`, providing IP hiding and malicious endpoint blocking. WebSocket connections work identically from the server's perspective—the proxy is transparent to your Bun WebSocket implementation.

## Recommended Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Platform Detection Layer                      │  │
│  │  (Detects: Standalone Web vs Discord Activity)       │  │
│  └────────────────┬──────────────────┬──────────────────┘  │
│                   │                  │                      │
│       ┌───────────▼──────────┐  ┌───▼────────────┐         │
│       │ Web Auth Adapter     │  │ Discord Adapter │         │
│       │ - Nickname input     │  │ - OAuth2 flow   │         │
│       │ - Anonymous UUID     │  │ - Discord SDK   │         │
│       └───────────┬──────────┘  └───┬────────────┘         │
│                   │                  │                      │
│       ┌───────────▼──────────────────▼──────────┐          │
│       │     Connection Abstraction Layer        │          │
│       │  - WebSocket URL resolution             │          │
│       │  - Direct vs proxy routing              │          │
│       └───────────┬──────────────────────────────┘          │
│                   │                                          │
│       ┌───────────▼──────────────────────────────┐          │
│       │     Room Management Abstraction          │          │
│       │  - Room codes (web) vs instance ID       │          │
│       │  - Player identity (nickname vs Discord) │          │
│       └───────────┬──────────────────────────────┘          │
│                   │                                          │
│       ┌───────────▼──────────────────────────────┐          │
│       │   Existing Game Logic (UNCHANGED)        │          │
│       │  - useGameSocket composable              │          │
│       │  - useSwapPhase composable               │          │
│       │  - usePlayingPhase composable            │          │
│       │  - Game components                       │          │
│       └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (direct or proxied)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Server (MINIMAL CHANGES)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Validation Layer (NEW)                         │  │
│  │  - POST /auth/discord endpoint                       │  │
│  │  - Validate Discord tokens                           │  │
│  │  - Accept anonymous players (existing)               │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│       ┌───────────▼──────────────────────────────┐          │
│       │  Existing Server Logic (UNCHANGED)       │          │
│       │  - RoomManager                           │          │
│       │  - Room                                  │          │
│       │  - GameEngine                            │          │
│       │  - WebSocket handlers                    │          │
│       └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### New Components (Discord Integration)

| Component | Responsibility | Location | Dependencies |
|-----------|---------------|----------|--------------|
| **PlatformDetector** | Detect execution environment (web vs Discord iframe) | `packages/client/src/platform/detector.ts` | None |
| **DiscordAuthAdapter** | Handle Discord OAuth2 flow, manage Discord SDK | `packages/client/src/platform/discord/auth.ts` | `@discord/embedded-app-sdk` |
| **WebAuthAdapter** | Handle nickname-based auth (existing behavior) | `packages/client/src/platform/web/auth.ts` | None |
| **ConnectionAdapter** | Abstract WebSocket URL construction (direct vs proxy) | `packages/client/src/platform/connection.ts` | Platform detector |
| **RoomAdapter** | Abstract room creation (codes vs instance ID) | `packages/client/src/platform/room.ts` | Platform detector |
| **usePlatform composable** | Provide platform-specific adapters | `packages/client/src/platform/index.ts` | All adapters |
| **DiscordTokenExchange** | Exchange OAuth code for token (server-side) | `packages/server/src/auth/discord.ts` | Discord OAuth2 API |

### Existing Components (Unchanged)

| Component | Why No Changes | Notes |
|-----------|---------------|-------|
| **RoomManager** | Already handles arbitrary player IDs | Room codes work for both modes |
| **Room** | Manages game state agnostically | Doesn't care about auth source |
| **GameEngine** | Pure game logic | No network concerns |
| **useGameSocket** | Already abstracts WebSocket protocol | Receives URL from adapter |
| **useSwapPhase** | Game phase logic | Consumes WebSocket state |
| **usePlayingPhase** | Game phase logic | Consumes WebSocket state |
| **Game components** | Render game state | Receives same props regardless of mode |

## Data Flow Analysis

### Authentication Flow

**Standalone Web (Existing):**
```
1. User enters nickname
2. Client generates UUID for playerId (crypto.randomUUID())
3. UUID stored in localStorage as 'shithead-player-id'
4. WebSocket connection includes playerId in query param
5. Server accepts connection without validation
6. create-room or join-room message includes nickname
```

**Discord Activity (New):**
```
1. DiscordSDK.ready() confirms iframe loaded (awaits READY payload)
2. authorize({ scopes: ['identify'] }) opens OAuth modal → user approves
3. Client receives OAuth code
4. Client → Server: POST /auth/discord with { code }
5. Server → Discord: Exchange code + client_secret for access_token
6. Server → Client: Return { access_token }
7. Client: authenticate({ access_token }) establishes Discord session
8. Client gets Discord user info (username, avatar, id)
9. WebSocket connection includes Discord ID as playerId
10. create-room or join-room uses Discord username/avatar
```

**Abstraction Pattern:**
```typescript
interface AuthAdapter {
  initialize(): Promise<void>;
  getPlayerId(): string;
  getPlayerInfo(): { nickname: string; avatar?: string };
  isReady(): boolean;
}

class WebAuthAdapter implements AuthAdapter {
  private playerId: string;
  private nickname: string;

  async initialize() {
    // Show nickname form (existing UI)
    this.nickname = await showNicknamePrompt();
    this.playerId = crypto.randomUUID();
  }

  getPlayerId() { return this.playerId; }
  getPlayerInfo() { return { nickname: this.nickname }; }
  isReady() { return !!this.playerId; }
}

class DiscordAuthAdapter implements AuthAdapter {
  private sdk: DiscordSDK;
  private user: { id: string; username: string; avatar: string };

  async initialize() {
    // Initialize Discord SDK
    this.sdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
    await this.sdk.ready();

    // OAuth flow
    const { code } = await this.sdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify']
    });

    // Exchange code for token via server
    const response = await fetch('/auth/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const { access_token } = await response.json();

    // Authenticate with Discord client
    const auth = await this.sdk.commands.authenticate({ access_token });
    this.user = auth.user;
  }

  getPlayerId() { return this.user.id; }
  getPlayerInfo() {
    return {
      nickname: this.user.username,
      avatar: `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png`
    };
  }
  isReady() { return !!this.user; }
}
```

### WebSocket Connection Flow

**Standalone Web (Existing):**
```typescript
// From useGameSocket.ts (lines 22-36)
const serverUrl = import.meta.env.VITE_SERVER_URL;
const isLocalhost = window.location.hostname === 'localhost';

let wsUrl: string;
if (serverUrl) {
  // Split deployment: connect to separate server origin
  wsUrl = `${serverUrl}/game-ws`;
} else if (isLocalhost) {
  // Local dev: connect directly to server
  wsUrl = `ws://${window.location.hostname}:3000/game-ws`;
} else {
  // Tunnel/proxy: use current host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  wsUrl = `${protocol}//${window.location.host}/game-ws`;
}
```

**Discord Activity (New):**
```typescript
// Discord requires relative URLs — proxy handles routing
// Format: wss://{clientId}.discordsays.com/game-ws
// But in code, use relative path:
const wsUrl = `/game-ws?playerId=${playerId}`;

// Or with patchUrlMappings:
import { patchUrlMappings } from '@discord/embedded-app-sdk';
patchUrlMappings([{
  prefix: '/',
  target: 'your-server.com'
}]);
```

**Key Insight:** Discord's proxy infrastructure routes requests automatically. You configure URL mappings in Discord Developer Portal:
- **Application → Activities → URL Mappings**
- Root mapping: `prefix: /` → `target: https://your-client.com`
- WebSocket mapping: Automatic with root mapping

**Abstraction Pattern:**
```typescript
interface ConnectionAdapter {
  getWebSocketUrl(playerId: string): string;
}

class WebConnectionAdapter implements ConnectionAdapter {
  getWebSocketUrl(playerId: string): string {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    const isLocalhost = window.location.hostname === 'localhost';

    let wsUrl: string;
    if (serverUrl) {
      wsUrl = `${serverUrl}/game-ws`;
    } else if (isLocalhost) {
      wsUrl = `ws://${window.location.hostname}:3000/game-ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/game-ws`;
    }

    return `${wsUrl}?playerId=${encodeURIComponent(playerId)}`;
  }
}

class DiscordConnectionAdapter implements ConnectionAdapter {
  constructor(private clientId: string) {}

  getWebSocketUrl(playerId: string): string {
    // Discord proxy handles routing — use relative path
    // Or use full proxy URL format for explicit routing
    return `wss://${this.clientId}.discordsays.com/game-ws?playerId=${encodeURIComponent(playerId)}`;
  }
}
```

### Room Management Flow

**Standalone Web (Existing):**
```
1. Host clicks "Create Room"
2. Client sends create-room message with nickname
3. Server generates 6-character room code (customAlphabet)
4. Server creates Room instance
5. Host receives room-created message with code
6. Host shares code with friends (copy/paste, QR code)
7. Friends manually enter code to join
```

**Discord Activity (New):**
```
1. User launches Activity in Discord voice channel
2. Discord provides instance_id in SDK (sdk.instanceId)
3. Client auto-creates room with instance_id
4. Client sends create-room with { instanceId }
5. Server generates deterministic code from instance_id hash
6. Server creates Room instance
7. Friends in same voice channel auto-join same instance
   (Discord shows Activity to all voice channel members)
```

**Key Insight:** Discord Activities are **launched in a voice channel context**. The `instance_id` uniquely identifies that voice channel session. Multiple users clicking the same Activity join the same instance automatically.

**Abstraction Pattern:**
```typescript
interface RoomAdapter {
  shouldAutoCreateRoom(): boolean;
  getRoomIdentifier(): string | null;
  formatPlayerForServer(info: PlayerInfo): any;
}

class WebRoomAdapter implements RoomAdapter {
  shouldAutoCreateRoom() {
    return false; // User manually creates
  }

  getRoomIdentifier() {
    return null; // No pre-existing identifier
  }

  formatPlayerForServer(info: PlayerInfo) {
    return { nickname: info.nickname };
  }
}

class DiscordRoomAdapter implements RoomAdapter {
  constructor(private sdk: DiscordSDK) {}

  shouldAutoCreateRoom() {
    return true; // Auto-create on Activity launch
  }

  getRoomIdentifier() {
    // Discord provides instance ID
    return this.sdk.instanceId;
  }

  formatPlayerForServer(info: PlayerInfo) {
    return {
      nickname: info.nickname,
      avatar: info.avatar,
      discordId: info.discordId,
      instanceId: this.sdk.instanceId
    };
  }
}
```

## Integration Points with Existing Code

### 1. `useGameSocket.ts` Modification

**Current approach (lines 10-42):**
```typescript
function createGameSocket() {
  // Hard-coded URL construction logic
  const serverUrl = import.meta.env.VITE_SERVER_URL;
  const isLocalhost = window.location.hostname === 'localhost';

  let wsUrl: string;
  if (serverUrl) { ... }
  else if (isLocalhost) { ... }
  else { ... }

  const { status, data, send, close, open } = useWebSocket(wsUrl, { ... });
}
```

**New approach (inject adapters):**
```typescript
function createGameSocket(
  connectionAdapter: ConnectionAdapter,
  authAdapter: AuthAdapter
) {
  // Adapter provides URL
  const playerId = authAdapter.getPlayerId();
  const wsUrl = connectionAdapter.getWebSocketUrl(playerId);

  const { status, data, send, close, open } = useWebSocket(wsUrl, { ... });

  // Rest of logic unchanged
}

export function useGameSocket() {
  if (!socketInstance) {
    const platform = usePlatform(); // New composable
    socketInstance = createGameSocket(
      platform.connectionAdapter,
      platform.authAdapter
    );
  }
  return socketInstance;
}
```

### 2. `main.ts` Initialization

**Current approach:**
```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';

createApp(App)
  .use(router)
  .mount('#app');
```

**New approach (platform detection):**
```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { initializePlatform } from './platform';

async function bootstrap() {
  // Detect platform and initialize adapters
  await initializePlatform();

  createApp(App)
    .use(router)
    .mount('#app');
}

bootstrap();
```

### 3. Server-Side Token Validation

**Current approach (server/src/index.ts lines 56-85):**
```typescript
// WebSocket upgrade endpoint with Origin validation
if (url.pathname === '/game-ws') {
  const origin = req.headers.get('Origin');

  // Validate origin in production
  if (NODE_ENV === 'production' && !serveStaticFiles) {
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const reconnectPlayerId = url.searchParams.get('playerId');

  const upgraded = server.upgrade(req, {
    data: {
      playerId: reconnectPlayerId || nanoid(),
      roomCode: null,
    },
  });

  // ...
}
```

**New approach (validate Discord tokens):**
```typescript
// Add new endpoint for Discord OAuth token exchange
if (url.pathname === '/auth/discord' && req.method === 'POST') {
  const { code } = await req.json();

  // Exchange code for access_token with client_secret
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
    }),
  });

  const { access_token } = await tokenResponse.json();

  return new Response(JSON.stringify({ access_token }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// WebSocket upgrade with optional Discord validation
if (url.pathname === '/game-ws') {
  const origin = req.headers.get('Origin');

  // Check for Discord proxy origin
  const isDiscordProxy = origin?.includes('discordsays.com');

  // Validate origin (allow Discord proxy in production)
  if (NODE_ENV === 'production' && !serveStaticFiles && !isDiscordProxy) {
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const reconnectPlayerId = url.searchParams.get('playerId');
  const discordToken = url.searchParams.get('discord-token'); // Optional

  // Validate Discord token if provided
  if (discordToken && isDiscordProxy) {
    const isValid = await validateDiscordToken(discordToken, reconnectPlayerId);
    if (!isValid) {
      return new Response('Invalid Discord token', { status: 403 });
    }
  }

  const upgraded = server.upgrade(req, {
    data: {
      playerId: reconnectPlayerId || nanoid(),
      roomCode: null,
    },
  });

  // ...
}
```

### 4. Room Code Generation

**Current approach (server/src/rooms/Room.ts lines 7-8, 52-53):**
```typescript
const ALPHABET = '2346789ABCDEFGHJKMNPQRTUVWXYZ';
const generateRoomCode = customAlphabet(ALPHABET, 6);

constructor(hostId: string, hostNickname: string) {
  this.code = generateRoomCode();
  this.hostId = hostId;
  // ...
}
```

**New approach (support instance-based codes):**
```typescript
const ALPHABET = '2346789ABCDEFGHJKMNPQRTUVWXYZ';
const generateRoomCode = customAlphabet(ALPHABET, 6);

constructor(
  hostId: string,
  hostNickname: string,
  instanceId?: string // Optional Discord instance ID
) {
  if (instanceId) {
    // Generate deterministic code from instance ID
    this.code = generateCodeFromInstanceId(instanceId);
  } else {
    // Random code for web
    this.code = generateRoomCode();
  }
  this.hostId = hostId;
  // ...
}

function generateCodeFromInstanceId(instanceId: string): string {
  // Hash instance ID to 6-character code using ALPHABET
  const hash = createHash('sha256').update(instanceId).digest('hex');
  let code = '';
  for (let i = 0; i < 6; i++) {
    const byte = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}
```

## Discord-Specific Constraints

### 1. Content Security Policy (CSP)

Discord runs Activities in a **sandboxed iframe** with strict CSP. All network requests must use relative URLs or be proxied.

**What this means:**
- Absolute URLs are blocked: `fetch('https://api.example.com')` ❌
- Relative URLs are proxied: `fetch('/api')` ✅
- WebSocket absolute URLs work with full proxy format: `new WebSocket('wss://{clientId}.discordsays.com/ws')` ✅
- WebSocket relative URLs also work: `new WebSocket('/ws')` ✅

**Solution:** Your `DiscordConnectionAdapter` uses the full proxy URL format. No changes needed in game logic.

### 2. URL Mapping Configuration

In Discord Developer Portal → Your App → Activities → URL Mappings:

```
Root Mapping:
  - Prefix: /
  - Target: https://your-client.com

All paths automatically proxied through: https://{clientId}.discordsays.com/
```

**Local Development:**
- Use cloudflared tunnel (Discord requires HTTPS)
- Example: `cloudflared tunnel --url http://localhost:5173`
- Get tunnel URL: `https://abc123.trycloudflare.com`
- Configure in Discord Dev Portal:
  - Prefix: `/`
  - Target: `https://abc123.trycloudflare.com`

**Production:**
- Deploy client to static hosting (Cloudflare Pages, Vercel, etc.)
- Deploy server to VPS/container hosting
- Configure Discord mappings:
  - Prefix: `/`
  - Target: `https://your-client-domain.com`
- Server receives connections as if direct (proxy is transparent)

### 3. OAuth2 Token Exchange

**CRITICAL:** `client_secret` must **never** be in client code. Discord requires server-side token exchange.

**Flow:**
1. Client: `authorize()` → receives `code`
2. Client → Server: `POST /auth/discord` with `{ code }`
3. Server → Discord: Exchange `code` + `client_secret` for `access_token`
4. Server → Client: Return `{ access_token }`
5. Client: `authenticate({ access_token })` → established Discord session

**New Server Endpoint:**
```typescript
// packages/server/src/auth/discord.ts
export async function handleDiscordAuth(code: string): Promise<string> {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord OAuth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}
```

## Environment Detection Patterns

### How to Detect Discord Environment

Discord Activities run in an iframe with unique characteristics.

**Detection Strategy (Recommended):**
```typescript
// packages/client/src/platform/detector.ts
export function detectPlatform(): 'web' | 'discord' {
  // Check if we're in an iframe
  if (typeof window !== 'undefined' && window.parent !== window) {
    // Check URL parameters that Discord adds
    const params = new URLSearchParams(window.location.search);
    const hasDiscordParams =
      params.has('frame_id') ||
      params.has('instance_id') ||
      params.has('platform');

    if (hasDiscordParams) {
      return 'discord';
    }
  }

  return 'web';
}
```

**Alternative Detection (SDK-based, more robust):**
```typescript
export async function detectPlatform(): Promise<'web' | 'discord'> {
  try {
    // Lazy-load Discord SDK
    const { DiscordSDK } = await import('@discord/embedded-app-sdk');
    const sdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

    // If ready() succeeds within timeout, we're in Discord
    await Promise.race([
      sdk.ready(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);

    return 'discord';
  } catch {
    return 'web';
  }
}
```

## Recommended Build Order

### Phase 1: Platform Detection Infrastructure
**Goal:** Establish adapter pattern without breaking existing web app

**Tasks:**
1. Create `packages/client/src/platform/` directory structure
2. Implement `PlatformDetector` (always returns 'web' initially)
3. Create `AuthAdapter` interface and `WebAuthAdapter` (wraps existing nickname logic)
4. Create `ConnectionAdapter` interface and `WebConnectionAdapter` (wraps existing URL logic)
5. Create `RoomAdapter` interface and `WebRoomAdapter` (wraps existing room logic)
6. Create `usePlatform()` composable (returns web adapters)
7. Modify `useGameSocket.ts` to accept adapters (default to web adapters)
8. Modify `main.ts` to call `initializePlatform()` before mounting

**Verification:** Existing web app works unchanged. `make test` passes. `make lint` passes.

### Phase 2: Discord SDK Integration
**Goal:** Add Discord adapters without activating them

**Tasks:**
1. Install `@discord/embedded-app-sdk`
2. Add Discord env vars to `.env.example` and documentation
3. Implement `DiscordAuthAdapter` (OAuth2 flow with server exchange)
4. Implement `DiscordConnectionAdapter` (proxy URL format)
5. Implement `DiscordRoomAdapter` (instance ID handling)
6. Update `usePlatform()` to conditionally return Discord adapters
7. Update `detectPlatform()` to perform real detection

**Verification:** Web app still works. Discord code not executed in web mode.

### Phase 3: Server-Side Discord Support
**Goal:** Server can validate Discord tokens and handle instance IDs

**Tasks:**
1. Create `packages/server/src/auth/discord.ts` module
2. Add `POST /auth/discord` endpoint (code → token exchange)
3. Implement `validateDiscordToken()` helper (optional, for WebSocket validation)
4. Modify WebSocket upgrade handler to accept Discord proxy origin
5. Modify `RoomManager.createRoom()` to accept optional `instanceId`
6. Modify `Room` constructor to support deterministic codes from instance IDs
7. Add Discord env vars to server (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET)

**Verification:** Server handles web clients. Server ready for Discord clients. `make test-server` passes.

### Phase 4: Discord Activity Configuration
**Goal:** Deploy and test in Discord

**Tasks:**
1. Create Discord Application in Developer Portal
2. Configure Activity URL mappings (client + server)
3. Set up cloudflared tunnel for local testing
4. Test OAuth2 flow in Discord iframe
5. Test multiplayer in voice channel (instance ID routing)
6. Test room join/leave, game flow
7. Deploy to production with HTTPS

**Verification:** Discord Activity works. Web app still works independently. Both modes tested.

### Phase 5: Mobile UI Improvements (Separate Phase)
**Goal:** Optimize UI for mobile Discord users

**Tasks:**
1. Responsive card sizing
2. Touch-friendly hit targets
3. Mobile-optimized layouts
4. Test on iOS Discord app
5. Test on Android Discord app

**Verification:** Discord Activity works on mobile. Web app mobile experience improved.

## Architecture Anti-Patterns to Avoid

### Anti-Pattern 1: Hard-Coding Discord Logic in Game Components
**Why bad:** Couples game logic to Discord, breaks standalone web mode
**Instead:** Keep game components platform-agnostic, inject player info as props

### Anti-Pattern 2: Detecting Platform Multiple Times
**Why bad:** Race conditions, inconsistent behavior if detection differs
**Instead:** Detect once at app bootstrap, store in singleton or global state

### Anti-Pattern 3: Different WebSocket Message Protocols
**Why bad:** Server needs two protocol implementations, doubles testing surface
**Instead:** Use same message protocol, just different auth/connection setup

### Anti-Pattern 4: Fetching Discord User Info in Multiple Places
**Why bad:** Discord SDK calls sprinkled everywhere, hard to test, rate limiting risk
**Instead:** Auth adapter fetches once during initialization, provides info as needed

### Anti-Pattern 5: Conditional Imports Based on Platform
**Why bad:** Bundle bloat (both bundled anyway), hard to test, breaks tree-shaking
**Instead:** Import both adapters, select at runtime based on detection

### Anti-Pattern 6: Modifying Game State Based on Platform
**Why bad:** Game logic diverges between modes, hard to maintain
**Instead:** Game logic platform-agnostic, only auth/connection/room setup differs

## Scalability Considerations

| Concern | Standalone Web | Discord Activity | Solution |
|---------|----------------|------------------|----------|
| **User Identity** | Anonymous UUID | Discord user ID | Both are strings to server, no distinction needed |
| **Room Discovery** | Manual code entry | Voice channel auto-join | Room adapter abstracts this, server doesn't care |
| **Avatar Images** | No avatars (optional) | Discord CDN URLs | Optional avatar field in player data |
| **Server Load** | Direct WS connections | Proxied through Discord | No difference to server (proxy is transparent) |
| **Rate Limiting** | Per-IP | Per-Discord-user | Server tracks by playerId regardless of source |
| **Reconnection** | localStorage playerId | Discord SDK persists auth | Both use playerId for reconnect, same logic |
| **CORS/Origin** | Configured ALLOWED_ORIGINS | discordsays.com origin | Server validates both origin types |

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|-----------|--------|-------|
| **WebSocket Proxy** | HIGH | Discord official docs | Proxy routing well-documented, transparent to server |
| **OAuth2 Flow** | HIGH | Discord official docs | Standard OAuth2 with server-side exchange |
| **SDK Initialization** | HIGH | Discord SDK GitHub | Ready/authorize/authenticate flow clear |
| **Instance ID** | MEDIUM | Community examples | Documented but light on multiplayer coordination details |
| **URL Mappings** | HIGH | Discord official docs | patchUrlMappings and proxy config well-documented |
| **Adapter Pattern** | HIGH | Standard pattern | Vue composables + dependency injection proven |
| **Bun Compatibility** | HIGH | No conflicts found | Discord proxy is HTTP/WS standard, Bun handles normally |

## Sources

### Primary (HIGH confidence)
- [Discord Networking Guide](https://docs.discord.com/developers/activities/development-guides/networking) - WebSocket proxy architecture, URL format, CSP
- [Discord Embedded App SDK](https://github.com/discord/embedded-app-sdk) - SDK initialization, OAuth flow, patchUrlMappings
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2) - Token exchange, client_secret handling
- [Discord URL Mappings](https://github.com/discord/embedded-app-sdk/blob/main/patch-url-mappings.md) - Proxy configuration patterns

### Secondary (MEDIUM confidence)
- [Robo.js Discord Proxy Guide](https://robojs.dev/discord-activities/proxy) - Community proxy patterns, CSP workarounds
- [Colyseus Discord Activity](https://colyseus.io/blog/discord-embedded-sdk/) - Multiplayer integration patterns, instance ID usage
- [Waveplay Discord Proxy Blog](https://blog.waveplay.com/discord-proxy-csp-patch/) - patchUrlMappings best practices
- [Bun Real-Time Apps](https://oneuptime.com/blog/post/2026-01-31-bun-realtime-applications/view) - Bun WebSocket capabilities (confirms compatibility)

### Verified Findings
- WebSocket proxy routes through `wss://{clientId}.discordsays.com/` - VERIFIED in official docs
- OAuth requires server-side token exchange with client_secret - VERIFIED in official docs
- Discord SDK detects environment via iframe postMessage READY payload - VERIFIED in SDK source
- patchUrlMappings modifies global fetch/WebSocket - VERIFIED in official docs
- Instance ID provided by SDK for voice channel sessions - VERIFIED in community examples, MEDIUM confidence on multiplayer coordination
