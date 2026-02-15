# Technology Stack: v2.0 Discord Activity + Mobile UI

**Project:** Shithead Online v2.0
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

This document specifies ONLY the stack additions needed for v2.0 features (Discord Activity integration and mobile UI improvements). The existing validated stack (Vue 3, Bun, Vite, Tailwind CSS v4, WebSockets) remains unchanged and is NOT re-researched here.

**Key additions:**
- `@discord/embedded-app-sdk` v2.4.0 for Discord Activity integration
- `@vueuse/sound` v2.1.3 for sound effects with mute toggle
- Environment variable patterns for Discord client ID
- No new build tools or frameworks required

## New Dependencies

### Client (packages/client)

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@discord/embedded-app-sdk` | ^2.4.0 | Discord Activity integration | Official Discord SDK for embedded apps, handles OAuth2 and iframe communication |
| `@vueuse/sound` | ^2.1.3 | Sound effects management | Vue 3 composable wrapping Howler.js, provides reactive control for mute toggle |

### Server (packages/server)

No new dependencies required. OAuth2 token exchange can be implemented with native Bun `fetch()` and existing `zod` for validation.

## Discord Embedded App SDK Integration

### Overview

The Discord Embedded App SDK v2.4.0 (released September 2025) enables the game to run as an Activity inside Discord's client (desktop, web, mobile). Activities are web applications hosted in an iframe with proxy networking for security.

**Key capabilities:**
- OAuth2 authentication flow (authorize/authenticate methods)
- User identity and guild information access
- Activity lifecycle management (ready, close events)
- Network request proxying through Discord's Cloudflare Workers

### Installation

```bash
cd packages/client
bun add @discord/embedded-app-sdk
```

### Client-Side Setup

```typescript
// src/discord/sdk.ts
import { DiscordSDK } from '@discord/embedded-app-sdk';

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

export async function initializeDiscordSdk() {
  await discordSdk.ready();

  // Authorize with required scopes
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  // Exchange code for access token via backend
  const response = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const { access_token } = await response.json();

  // Authenticate SDK with token
  const auth = await discordSdk.commands.authenticate({ access_token });

  return { discordSdk, auth };
}

export { discordSdk };
```

### Environment Variables

Vite requires the `VITE_` prefix for client-side environment variables.

**`.env` (development):**
```bash
VITE_DISCORD_CLIENT_ID=your_discord_client_id_here
```

**TypeScript support (`src/vite-env.d.ts`):**
```typescript
interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**Access in code:**
```typescript
const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
```

### Server-Side OAuth2 Token Exchange

Discord Activity OAuth2 requires backend token exchange to prevent client secret exposure.

**Backend endpoint (`packages/server/src/routes/discord.ts`):**
```typescript
import { nanoid } from 'nanoid';
import { z } from 'zod';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;

const tokenRequestSchema = z.object({
  code: z.string(),
});

export async function handleTokenExchange(req: Request): Promise<Response> {
  const body = await req.json();
  const { code } = tokenRequestSchema.parse(body);

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Discord code for token');
  }

  const data = await response.json();
  return Response.json({ access_token: data.access_token });
}
```

### Proxy Networking Requirements

All Discord Activity network traffic is routed through Discord's proxy for security (hides user IPs, blocks malicious endpoints).

**Supported protocols:**
- WebSockets (current)
- HTTPS
- DASH/HLS streaming

**Not supported:**
- WebRTC
- WebTransport (coming soon)

**URL pattern:**
```
https://{clientId}.discordsays.com{resourcePath}
```

**Cookie requirements:**
```typescript
// If using cookies for Activity requests
document.cookie = `sessionId=${id}; domain=${clientId}.discordsays.com; SameSite=None; Partitioned; Secure`;
```

**URL Mappings:**
Configure in Discord Developer Portal under your application's URL Mappings:
- Prefix: `/.proxy/`
- Target: `https://your-production-domain.com`

Development requests to `/.proxy/api/token` are rewritten by Vite dev server:

**`packages/client/vite.config.ts`:**
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/.proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy/, ''),
      },
    },
  },
});
```

## Sound Management with VueUse Sound

### Overview

`@vueuse/sound` v2.1.3 is a Vue 3 composable wrapping Howler.js. It provides reactive sound effect management with minimal bundle impact (~1kb + ~10kb async Howler.js after user interaction).

**Key features:**
- Framework support: Vue 2 & 3, Nuxt 2 & 3 (via vue-demi)
- TypeScript support
- Reactive playback controls (rate, volume, mute)
- Audio sprite support
- Lazy loading (respects browser autoplay policies)

**Note:** Package hasn't had updates in 12+ months but is stable and functional. Underlying Howler.js is at v2.2.4 (released 2 years ago) and is mature/stable.

### Installation

```bash
cd packages/client
bun add @vueuse/sound
```

### Usage Pattern

```typescript
// src/composables/useGameSounds.ts
import { useSound } from '@vueuse/sound';
import { ref, watch } from 'vue';

const isMuted = ref(false);

export function useGameSounds() {
  const [playCardSound, { sound: cardSound }] = useSound('/sounds/card-play.mp3', {
    volume: 0.5,
  });

  const [playBurnSound, { sound: burnSound }] = useSound('/sounds/burn.mp3', {
    volume: 0.7,
  });

  // Watch mute state and update all sound volumes
  watch(isMuted, (muted) => {
    if (cardSound.value) cardSound.value.volume(muted ? 0 : 0.5);
    if (burnSound.value) burnSound.value.volume(muted ? 0 : 0.7);
  });

  function toggleMute() {
    isMuted.value = !isMuted.value;
  }

  return {
    isMuted,
    toggleMute,
    playCardSound,
    playBurnSound,
  };
}
```

**Reactive mute toggle:**
```vue
<script setup lang="ts">
import { useGameSounds } from '@/composables/useGameSounds';

const { isMuted, toggleMute } = useGameSounds();
</script>

<template>
  <button @click="toggleMute">
    {{ isMuted ? 'Unmute' : 'Mute' }}
  </button>
</template>
```

## Mobile UI Improvements (No New Dependencies)

### Tailwind CSS v4 Touch Utilities

Tailwind CSS v4 (already installed) provides touch gesture utilities out of the box.

**Available touch-action utilities:**
- `touch-auto` - Allow all touch gestures (default)
- `touch-none` - Disable all touch gestures
- `touch-pan-x` - Allow horizontal panning only
- `touch-pan-left` - Allow panning left only
- `touch-pan-right` - Allow panning right only
- `touch-pan-y` - Allow vertical panning only
- `touch-pan-up` - Allow panning up only
- `touch-pan-down` - Allow panning down only
- `touch-pinch-zoom` - Allow pinch-to-zoom gestures
- `touch-manipulation` - Allow panning and pinch-zoom, but disable double-tap-to-zoom

**Responsive touch patterns:**
```html
<!-- Enable horizontal swipe on mobile, unrestricted on desktop -->
<div class="touch-pan-x md:touch-auto">
  <!-- Card carousel -->
</div>
```

**Hover state handling:**
Tailwind v4 automatically wraps hover utilities in `@media (hover: hover)`, preventing "stuck" hover states on touch devices. This is a v4 default behavior change - hover styles only apply on devices with true hover capability (mouse/trackpad), not touch devices.

```css
/* Generated by Tailwind v4 automatically */
@media (hover: hover) {
  .hover\:bg-blue-500:hover {
    background-color: #3b82f6;
  }
}
```

**Implication:** Design UI to work WITHOUT hover as baseline, use hover as progressive enhancement. For mobile, rely on explicit tap states (`:active` or click events).

### Card Category UI Pattern

No new libraries needed. Use existing Vue 3 composition API + Tailwind CSS v4 for categorizing cards into "normal" and "power" categories when hand exceeds 5 cards.

**Implementation approach:**
```typescript
// Categorize cards by power
const normalCards = computed(() =>
  playerHand.value.filter(c => !['2', '7', '8', '10', 'Joker'].includes(c.value))
);

const powerCards = computed(() =>
  playerHand.value.filter(c => ['2', '7', '8', '10', 'Joker'].includes(c.value))
);
```

## What NOT to Add

| Consideration | Why NOT |
|---------------|---------|
| `discord.js` | Server-side bot library, not needed for Activities (client-side SDK only) |
| `discord-oauth2` npm package | Unnecessary abstraction; native `fetch()` is sufficient for token exchange |
| Custom WebSocket proxy | Discord handles all proxying; no custom implementation needed |
| Howler.js directly | `@vueuse/sound` wraps Howler and provides Vue-native reactivity |
| Touch gesture libraries (Hammer.js, etc.) | Tailwind v4 touch utilities + native browser events are sufficient |
| Mobile UI component libraries | Existing Tailwind v4 + Vue 3 patterns work well; avoid bloat |
| Separate Discord Activity build | Same Vite build serves both standalone and Discord Activity contexts |

## Vite Configuration Changes

### Development Proxy

Add proxy for Discord Activity development (routes `/.proxy/*` to local backend):

```typescript
// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/.proxy': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy/, ''),
      },
    },
  },
});
```

### CSP Headers (Production)

Discord Activities run in a sandboxed iframe with Content Security Policy enforced by Discord. Your backend must set appropriate headers, but no Vite changes are needed (handled by Caddy/reverse proxy in production).

## Runtime Detection Pattern

Detect whether running as Discord Activity or standalone web app:

```typescript
// src/utils/platform.ts
export function isDiscordActivity(): boolean {
  return window.location.hostname.endsWith('.discordsays.com');
}

export function getGameMode(): 'discord' | 'standalone' {
  return isDiscordActivity() ? 'discord' : 'standalone';
}
```

**Usage in router or initialization:**
```typescript
import { getGameMode } from '@/utils/platform';

if (getGameMode() === 'discord') {
  await initializeDiscordSdk();
} else {
  // Standalone web app flow
}
```

**Alternative: Try SDK initialization with timeout**
```typescript
export async function detectDiscordContext(): Promise<boolean> {
  try {
    const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
    await Promise.race([
      discordSdk.ready(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]);
    return true; // Running in Discord
  } catch {
    return false; // Standalone web app
  }
}
```

## Deployment Considerations

### Environment Variables

**Client (Vite build):**
- `VITE_DISCORD_CLIENT_ID` - Discord application client ID (public, embedded in build)

**Server (Bun runtime):**
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application client secret (never expose to client)

**Infisical integration (existing pattern):**
```bash
# Fetch from Infisical in deployment pipeline
infisical export --env=production --format=dotenv > .env.production
```

### URL Mappings (Discord Developer Portal)

Configure under your Discord application:

| Environment | Prefix | Target |
|-------------|--------|--------|
| Development | `/.proxy/` | `http://localhost:3000` (via Vite proxy) |
| Production | `/.proxy/` | `https://your-domain.com` |

**Important:** Omit protocol from targets in Discord Developer Portal (use `your-domain.com` not `https://your-domain.com`). Targets must point to a directory, not a file.

### Local Development Tunnel

For testing Discord Activity locally, use `cloudflared` (NOT ngrok - mobile WebSocket issues):

```bash
# Install cloudflared
brew install cloudflared  # macOS
# or download from https://github.com/cloudflare/cloudflared

# Start local tunnel pointing to Vite dev server
cloudflared tunnel --url http://localhost:5173
```

Configure the generated HTTPS URL in Discord Developer Portal URL Mappings for development testing.

### CSP Headers (Caddy/Reverse Proxy)

Discord enforces CSP on the iframe. Your server must allow:
- `connect-src 'self' https://discord.com wss://your-domain.com`
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline'`

## Migration Checklist

- [ ] Add `@discord/embedded-app-sdk` to `packages/client/package.json`
- [ ] Add `@vueuse/sound` to `packages/client/package.json`
- [ ] Create `src/vite-env.d.ts` with `VITE_DISCORD_CLIENT_ID` type
- [ ] Update `packages/client/vite.config.ts` with `/.proxy/` dev proxy
- [ ] Add `VITE_DISCORD_CLIENT_ID` to `.env` (local) and Infisical (production)
- [ ] Add `DISCORD_CLIENT_SECRET` to Infisical (server secrets only)
- [ ] Create Discord OAuth2 token exchange endpoint in `packages/server`
- [ ] Create `src/discord/sdk.ts` with initialization logic
- [ ] Create `src/composables/useGameSounds.ts` for sound management
- [ ] Configure Discord Developer Portal URL Mappings
- [ ] Test Discord Activity locally with `cloudflared tunnel` (not ngrok)

## Version Summary

| Package | Current | Add | Purpose |
|---------|---------|-----|---------|
| Vue 3 | ^3.5.0 | *(no change)* | Frontend framework |
| Vite | ^5.0.0 | *(no change)* | Build tool |
| Tailwind CSS | ^4.0.0 | *(no change)* | CSS framework |
| @vueuse/core | ^14.2.0 | *(no change)* | Vue composables |
| `@discord/embedded-app-sdk` | -- | **^2.4.0** | Discord Activity integration |
| `@vueuse/sound` | -- | **^2.1.3** | Sound effects management |

**Total new dependencies:** 2 (both client-side)
**Total new devDependencies:** 0
**Breaking changes:** None
**Existing stack impact:** Minimal (additive only)

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Discord SDK | HIGH | Official Discord SDK v2.4.0, verified via npm and GitHub releases (Sept 2025) |
| OAuth2 Flow | HIGH | Verified via official Discord OAuth2 documentation and Developer Portal guides |
| Proxy Networking | HIGH | Confirmed via Discord Activities Networking documentation (discordsays.com pattern) |
| Sound Management | MEDIUM | @vueuse/sound stable but unmaintained (12+ months), underlying Howler.js is mature |
| Touch Utilities | HIGH | Tailwind CSS v4 official documentation, touch-action utilities verified |
| Hover Behavior | HIGH | Tailwind CSS v4 automatic @media (hover: hover) wrapping confirmed in docs and community |

## Sources

### Discord Embedded App SDK
- [Discord Embedded App SDK GitHub](https://github.com/discord/embedded-app-sdk)
- [Discord Embedded App SDK npm](https://www.npmjs.com/package/@discord/embedded-app-sdk)
- [Discord Embedded App SDK Documentation](https://docs.discord.com/developers/developer-tools/embedded-app-sdk)
- [Discord Embedded App SDK Releases](https://github.com/discord/embedded-app-sdk/releases)
- [Discord Embedded App SDK Examples](https://github.com/discord/embedded-app-sdk-examples)

### Discord Activity Development
- [Discord Activities Local Development Guide](https://docs.discord.com/developers/activities/development-guides/local-development)
- [Discord Activities Networking Guide](https://docs.discord.com/developers/activities/development-guides/networking)
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)

### VueUse Sound
- [VueUse Sound GitHub](https://github.com/vueuse/sound)
- [VueUse Sound npm](https://www.npmjs.com/package/@vueuse/sound)
- [VueUse Sound Documentation](https://sound.vueuse.org/)

### Howler.js
- [Howler.js Official Site](https://howlerjs.com/)
- [Howler.js npm](https://www.npmjs.com/package/howler)

### Vite Configuration
- [Vite Environment Variables Guide](https://vite.dev/guide/env-and-mode)
- [Vite Server Options](https://vite.dev/config/server-options)

### Tailwind CSS v4
- [Tailwind CSS Touch Action Utilities](https://tailwindcss.com/docs/touch-action)
- [Tailwind CSS v4 Hover on Touch Devices](https://bordermedia.org/blog/tailwind-css-4-hover-on-touch-device)

### Cloudflare Tunnel
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)
- [Cloudflare Tunnel Local Development](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/)
