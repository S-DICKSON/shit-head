# Phase 18: Discord Authentication - Research

**Researched:** 2026-02-17
**Domain:** Discord Embedded App SDK OAuth2, server-side token exchange, iframe cookie handling
**Confidence:** HIGH

## Summary

Discord Authentication for Activities follows a well-documented 4-step OAuth2 flow: SDK initialization (`ready()`), client-side authorization (`commands.authorize()` returning a code), server-side token exchange (POST to `https://discord.com/api/oauth2/token`), and SDK authentication (`commands.authenticate()` returning user identity). The existing adapter pattern from Phase 17 provides clean injection points for `DiscordAuthAdapter`, `DiscordConnectionAdapter`, and `DiscordRoomAdapter` implementations.

The server needs a new `/api/token` HTTP endpoint that exchanges OAuth2 authorization codes for access tokens using the app's client secret. This is a standard `application/x-www-form-urlencoded` POST to Discord's API. The existing `Bun.serve` fetch handler just needs a new route. Cookies in the Activity iframe require `SameSite=None; Partitioned; Secure` attributes due to third-party iframe restrictions.

The `commands.authenticate()` response includes a full User object with `id`, `username`, `global_name`, and `avatar` hash, which maps directly to the existing player identity system (nickname becomes `global_name || username`, avatar URL constructed from CDN pattern).

**Primary recommendation:** Implement the 4-step OAuth2 flow with Discord SDK on client, token exchange on server, and wire Discord user identity into existing player system through the adapter pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@discord/embedded-app-sdk` | 2.4.0 | Discord Activity SDK - OAuth2, user identity, iframe communication | Official Discord SDK, only supported option |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | Server token exchange uses native `fetch()` (Bun built-in) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch for token exchange | `discord-oauth2` npm package | Adds unnecessary dependency; token exchange is a single POST request |
| Express/Hono for HTTP routes | Bun.serve fetch handler | Project already uses Bun.serve; adding a framework for one route is overkill |

**Installation:**
```bash
cd packages/client && bun add @discord/embedded-app-sdk
```

No server dependencies needed -- Bun's built-in `fetch()` handles the Discord API call.

## Architecture Patterns

### Recommended Project Structure
```
packages/
  client/src/
    platform/
      adapters/
        web/           # Existing web adapters (Phase 17)
        discord/       # NEW: Discord adapter implementations
          DiscordAuthAdapter.ts      # OAuth2 flow, user identity
          DiscordConnectionAdapter.ts # WS through Discord proxy
          DiscordRoomAdapter.ts      # Room ops with Discord identity
      detection.ts     # Existing platform detection
      keys.ts          # Existing injection keys
      index.ts         # Updated barrel export
    main.ts            # Updated: wire Discord adapters when platform === 'discord'
  server/src/
    index.ts           # Updated: add /api/token route
```

### Pattern 1: Discord OAuth2 Flow (4-Step)

**What:** Complete authentication sequence from SDK init to user identity
**When to use:** Every time app loads in Discord Activity context

```typescript
// Source: Discord official example + SDK docs
import { DiscordSDK } from '@discord/embedded-app-sdk';

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

async function authenticateWithDiscord(): Promise<{
  accessToken: string;
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
}> {
  // Step 1: Wait for iframe handshake with Discord client
  await discordSdk.ready();

  // Step 2: Request OAuth2 authorization (prompt: 'none' skips popup if already authorized)
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify'],
  });

  // Step 3: Exchange code for access_token via our server (secret never on client)
  const response = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const { access_token } = await response.json();

  // Step 4: Authenticate with Discord SDK using the token
  const auth = await discordSdk.commands.authenticate({ access_token });

  return {
    accessToken: auth.access_token,
    user: auth.user,
  };
}
```

### Pattern 2: Server-Side Token Exchange (Bun.serve)

**What:** HTTP endpoint that exchanges OAuth2 code for access token
**When to use:** Called by client Step 3 above

```typescript
// In packages/server/src/index.ts fetch handler
if (url.pathname === '/api/token' && req.method === 'POST') {
  const { code } = await req.json() as { code: string };

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
    }),
  });

  const { access_token } = await tokenResponse.json() as { access_token: string };

  return new Response(JSON.stringify({ access_token }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Pattern 3: Discord Avatar URL Construction

**What:** Build CDN URL from user avatar hash
**When to use:** Displaying Discord user avatar in game UI

```typescript
function getDiscordAvatarUrl(userId: string, avatarHash: string | null, size = 128): string {
  if (!avatarHash) {
    // Default Discord avatar (based on user ID or discriminator)
    const defaultIndex = Number(BigInt(userId) >> 22n) % 6;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}
```

### Pattern 4: DiscordAuthAdapter Implementation

**What:** AuthAdapter interface implementation using Discord SDK
**When to use:** When platform === 'discord'

```typescript
import type { AuthAdapter } from '../../interfaces/AuthAdapter';

export class DiscordAuthAdapter implements AuthAdapter {
  private user: { id: string; name: string } | null = null;
  private discordUser: { id: string; username: string; global_name: string | null; avatar: string | null } | null = null;

  async authenticate(): Promise<void> {
    const result = await authenticateWithDiscord(); // The 4-step flow above
    this.discordUser = result.user;
    this.user = {
      id: result.user.id,
      name: result.user.global_name || result.user.username,
    };
  }

  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  async signOut(): Promise<void> {
    this.user = null;
    this.discordUser = null;
  }

  // Discord-specific: expose avatar and raw Discord user for UI
  getDiscordUser() {
    return this.discordUser;
  }
}
```

### Pattern 5: Cookie Attributes for Discord iframe

**What:** Server must set cookies with specific attributes for third-party iframe context
**When to use:** Any cookie set by the server that needs to persist in Discord Activity

```typescript
// Cookie attributes required for Discord Activity iframe
const cookieAttributes = 'SameSite=None; Partitioned; Secure';
// Example: Set-Cookie: session=abc123; SameSite=None; Partitioned; Secure; HttpOnly
```

**NOTE:** The current game does NOT use cookies for authentication (uses WebSocket + localStorage). This is documented for awareness if cookies are introduced later. The token exchange endpoint is stateless (no session cookie needed).

### Anti-Patterns to Avoid
- **Exposing client_secret on the client:** NEVER send DISCORD_CLIENT_SECRET to the browser. Token exchange MUST happen server-side.
- **Using `prompt: 'consent'` unnecessarily:** Use `prompt: 'none'` for seamless UX since user already consented by launching the Activity.
- **Requesting excessive scopes:** Only request `identify` scope -- the game needs username and avatar, nothing more.
- **Storing access_token in localStorage in Discord mode:** The token is short-lived and only needed for the initial authenticate() call. Keep it in memory.
- **Using `patchUrlMappings` when unnecessary:** The existing `/.proxy/` URL pattern from Phase 16 handles routing. Don't patch global fetch/WebSocket.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Discord iframe communication | Custom postMessage protocol | `@discord/embedded-app-sdk` | SDK handles handshake, RPC, events |
| OAuth2 authorization UI | Custom auth modal | `commands.authorize()` with `prompt: 'none'` | Discord handles the consent flow internally |
| Token exchange validation | Custom OAuth2 library | Single `fetch()` to Discord API | It's literally one POST request |
| Avatar URL generation | CDN URL guessing | Standard pattern: `cdn.discordapp.com/avatars/{id}/{hash}.png` | Discord has specific rules for animated/default avatars |
| Default avatar fallback | Custom placeholder | Discord default avatar CDN: `cdn.discordapp.com/embed/avatars/{index}.png` | Discord uses index derived from user ID |

**Key insight:** The Discord SDK handles all the complex iframe communication and OAuth2 flow. The server-side work is minimal (one POST endpoint). Most complexity is in correctly wiring the SDK output into the existing adapter pattern.

## Common Pitfalls

### Pitfall 1: Content-Type on Token Exchange
**What goes wrong:** Server sends JSON body to Discord's `/oauth2/token` endpoint
**Why it happens:** Developers default to `application/json` for APIs
**How to avoid:** Discord's token endpoint ONLY accepts `application/x-www-form-urlencoded`. Use `URLSearchParams` for the body.
**Warning signs:** 400 Bad Request from Discord API

### Pitfall 2: Missing CORS Headers on /api/token
**What goes wrong:** Browser blocks the fetch to `/api/token` from Discord Activity iframe
**Why it happens:** Same-origin policy in iframe context
**How to avoid:** The `/.proxy/` routing through Discord's proxy handles this -- the request goes to `/.proxy/api/token` which Discord proxies to your server. No CORS headers needed as long as the proxy is configured. In development (localhost), Vite proxy handles it.
**Warning signs:** CORS errors in browser console

### Pitfall 3: SDK Initialization Before DOM
**What goes wrong:** `new DiscordSDK()` fails or `ready()` never resolves
**Why it happens:** SDK initialized too early or outside Discord iframe context
**How to avoid:** Initialize SDK only when `detectPlatform() === 'discord'`. Guard with try/catch. Set a reasonable timeout on `ready()`.
**Warning signs:** Infinite loading state, no error message

### Pitfall 4: Player Identity Mismatch
**What goes wrong:** Discord user's `id` doesn't match the server's `playerId`
**Why it happens:** Server assigns `nanoid()` playerId on WebSocket connect, Discord user has their own ID
**How to avoid:** In Discord mode, the server should use the Discord user ID as the playerId, OR the client should map between them. The simplest approach: pass the Discord identity (username, avatar) alongside the existing nickname system.
**Warning signs:** Player appears twice in room, or loses state on reconnect

### Pitfall 5: `prompt: 'none'` Fails for First-Time Users
**What goes wrong:** `authorize()` returns an error instead of a code
**Why it happens:** User hasn't previously authorized the app with these scopes
**How to avoid:** Catch the error and retry with `prompt: 'consent'` (shows the Discord authorization popup). In practice, Activities handle this automatically -- the Discord client prompts when launching the Activity.
**Warning signs:** Auth flow fails only for new users

### Pitfall 6: Environment Variables Not Available
**What goes wrong:** `VITE_DISCORD_CLIENT_ID` is undefined in client, `DISCORD_CLIENT_SECRET` is undefined on server
**Why it happens:** .env file not set up or variables not prefixed correctly
**How to avoid:** Vite requires `VITE_` prefix for client-exposed vars. Server vars have no prefix requirement. Create `.env.example` documenting required variables.
**Warning signs:** Empty string passed to DiscordSDK constructor

### Pitfall 7: Redirect URI Not Configured
**What goes wrong:** Discord API returns "Invalid OAuth2 redirect_uri" during token exchange
**Why it happens:** No redirect URI registered in Discord Developer Portal
**How to avoid:** Register `https://127.0.0.1` as a redirect URI in the Discord app's OAuth2 settings. The Embedded App SDK handles redirects internally, but Discord requires at least one URI registered.
**Warning signs:** 400 response from Discord token endpoint with redirect_uri error

## Code Examples

### Complete DiscordAuthAdapter (verified pattern from official examples)
```typescript
// Source: Discord embedded-app-sdk-examples + SDK docs
import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { AuthAdapter } from '../../interfaces/AuthAdapter';

export class DiscordAuthAdapter implements AuthAdapter {
  private sdk: DiscordSDK;
  private user: { id: string; name: string } | null = null;
  private rawUser: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
  } | null = null;

  constructor(clientId: string) {
    this.sdk = new DiscordSDK(clientId);
  }

  async authenticate(): Promise<void> {
    // Step 1: Wait for Discord client handshake
    await this.sdk.ready();

    // Step 2: Get OAuth2 authorization code
    const { code } = await this.sdk.commands.authorize({
      client_id: this.sdk.clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    });

    // Step 3: Exchange code for token via server
    const tokenResponse = await fetch('/.proxy/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const { access_token } = await tokenResponse.json();

    // Step 4: Authenticate with SDK
    const auth = await this.sdk.commands.authenticate({ access_token });

    this.rawUser = {
      id: auth.user.id,
      username: auth.user.username,
      global_name: auth.user.global_name ?? null,
      avatar: auth.user.avatar ?? null,
    };

    this.user = {
      id: auth.user.id,
      name: auth.user.global_name || auth.user.username,
    };
  }

  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  async signOut(): Promise<void> {
    this.user = null;
    this.rawUser = null;
  }

  /** Discord-specific: get raw Discord user for avatar display */
  getDiscordUser() {
    return this.rawUser;
  }

  /** Get the underlying SDK instance (needed for other Discord adapters) */
  getSdk(): DiscordSDK {
    return this.sdk;
  }
}
```

### Server Token Exchange Route (Bun.serve)
```typescript
// Source: Discord official example adapted for Bun.serve
// Add to packages/server/src/index.ts fetch handler, BEFORE the 404 fallback

if (url.pathname === '/api/token' && req.method === 'POST') {
  try {
    const body = await req.json() as { code: string };

    if (!body.code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const discordClientId = process.env.DISCORD_CLIENT_ID;
    const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!discordClientId || !discordClientSecret) {
      console.error('Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET env vars');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: discordClientId,
        client_secret: discordClientSecret,
        grant_type: 'authorization_code',
        code: body.code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Discord token exchange failed: ${tokenResponse.status} ${errorText}`);
      return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
        status: tokenResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { access_token } = await tokenResponse.json() as { access_token: string };

    return new Response(JSON.stringify({ access_token }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Vite Proxy Config Addition
```typescript
// Add to vite.config.ts server.proxy section for local development
'/.proxy/api': {
  target: 'http://host.docker.internal:3000',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/.proxy/, ''),
},
```

**NOTE:** This proxy rewrite already exists in the current vite.config.ts from Phase 16.

### main.ts Discord Adapter Wiring
```typescript
// Replace the throw in packages/client/src/main.ts
} else if (platform === 'discord') {
  const discordAuth = new DiscordAuthAdapter(import.meta.env.VITE_DISCORD_CLIENT_ID);
  app.provide(AuthAdapterKey, discordAuth);
  app.provide(ConnectionAdapterKey, new DiscordConnectionAdapter());
  app.provide(RoomAdapterKey, new DiscordRoomAdapter());
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/.proxy/` prefix required | Direct requests allowed (both formats supported) | 2025 policy update | Can use either format; keep `/.proxy/` for backward compat |
| SDK v1.x | SDK v2.4.0 | 2025 | New commands (quests, ACTIVITY_JOIN), same auth flow |
| `discriminator` as identity | `global_name` as display name | Discord username migration (2023) | Use `global_name \|\| username` for display |

**Deprecated/outdated:**
- `discriminator` field: Still present in User object but no longer meaningful (all users migrated to global names). Use `global_name` for display, fall back to `username`.
- `activities.read` / `activities.write` scopes: Listed in OAuth2 docs but "not currently available for apps".

## Open Questions

1. **Discord Connection/Room Adapters Implementation**
   - What we know: Auth adapter is clearly needed in this phase. Connection and Room adapters need to wrap the existing WebSocket singleton.
   - What's unclear: Whether Discord Connection/Room adapters differ meaningfully from web ones (both use the same WebSocket, just different URL). The connection URL resolution already handles `*.discordsays.com` in `useGameSocket.ts`.
   - Recommendation: Discord Connection/Room adapters may be thin wrappers identical to web adapters since the WebSocket proxy routing is already handled. Consider making them delegate to the same `useGameSocket` singleton but with Discord-specific initialization order (auth first, then connect).

2. **Player Identity Integration Strategy**
   - What we know: Discord provides a user `id` (snowflake), `username`, `global_name`, `avatar` hash. Existing system uses server-assigned `nanoid()` for `playerId` and client-provided `nickname`.
   - What's unclear: Whether to pass Discord user ID as the playerId or keep the nanoid system and map between them.
   - Recommendation: In Discord mode, pass `nickname` as `global_name || username` when creating/joining rooms. Keep the server's nanoid playerId system intact for now -- changing it would require modifying reconnection logic. Avatar display is a client-only concern (store Discord user data in the auth adapter, components read from it).

3. **SDK Instance Sharing**
   - What we know: `DiscordSDK` instance is needed for auth, and might be needed by Connection/Room adapters for event subscriptions.
   - What's unclear: Best way to share the SDK instance across adapters.
   - Recommendation: DiscordAuthAdapter creates and owns the SDK instance, exposes it via `getSdk()`. Other Discord adapters receive it as a constructor parameter.

## Sources

### Primary (HIGH confidence)
- [Discord Embedded App SDK README](https://github.com/discord/embedded-app-sdk/blob/main/README.md) - Auth flow, SDK usage
- [Discord Embedded App SDK Reference](https://docs.discord.com/developers/developer-tools/embedded-app-sdk) - `commands.authorize()`, `commands.authenticate()` API
- [Discord embedded-app-sdk-examples](https://github.com/discord/embedded-app-sdk-examples/blob/main/discord-activity-starter/packages/server/src/app.ts) - Server-side token exchange implementation
- [Discord OAuth2 docs](https://docs.discord.com/developers/topics/oauth2) - Token endpoint, parameters, content-type requirement
- [Discord Activities Networking docs](https://docs.discord.com/developers/activities/development-guides/networking) - Cookie requirements (SameSite=None; Partitioned; Secure)
- [Discord Building an Activity](https://docs.discord.com/developers/activities/building-an-activity) - Redirect URI placeholder, env vars, scopes
- [Discord SDK generated schemas](https://github.com/discord/embedded-app-sdk/blob/main/src/generated/schemas.ts) - AuthenticateResponse exact type
- [Discord SDK common.ts](https://github.com/discord/embedded-app-sdk/blob/main/src/schema/common.ts) - User type definition

### Secondary (MEDIUM confidence)
- [Discord SDK releases](https://github.com/discord/embedded-app-sdk/releases) - v2.4.0 is latest (Sep 2025)
- Discord CDN avatar URL format - `cdn.discordapp.com/avatars/{id}/{hash}.{ext}?size={size}`

### Tertiary (LOW confidence)
- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Discord SDK is the only option, version verified
- Architecture: HIGH - Official examples show exact pattern, adapter interfaces already defined
- Pitfalls: HIGH - Content-Type issue documented in official docs, cookie requirements in networking docs
- Token exchange: HIGH - Exact code from official example, adapted for Bun
- Player identity mapping: MEDIUM - Recommended approach based on existing codebase analysis, not officially prescribed

**Research date:** 2026-02-17
**Valid until:** 2026-04-17 (SDK is stable at v2.4.0, auth flow is well-established)
