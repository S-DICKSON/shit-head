# Phase 19: Discord Room Management - Research

**Researched:** 2026-02-18
**Domain:** Discord Activity integration, room lifecycle, spectator mode, safe area CSS, production deployment
**Confidence:** HIGH (primary sources: SDK type definitions, existing codebase, official Discord docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auto-join experience**
- Straight to lobby — no loading screen, no name entry (Discord identity already known from Phase 18)
- Room code is fully hidden in Discord — instance ID handles everything behind the scenes
- Connection failures retry silently using existing Phase 16 backoff logic with spinner; no error screen
- When another player opens the Activity, they just appear in the player list — no join toast/notification

**Room lifecycle (applies to BOTH Discord and web)**
- First player to join becomes host (same as current web behavior)
- Auto-migrate host: when host disconnects, next player automatically becomes host — both Discord and web
- Room dies immediately when all players disconnect — no persistence window, same as current web behavior
- After game finishes, all players auto-return to lobby for easy rematch — both Discord and web (replaces current "play again" button flow)
- The player who lost the last game (the shithead) gets a 💩 emoji next to their name in the lobby and during gameplay, until a new loser occurs — both Discord and web

**Mid-game arrival (applies to BOTH Discord and web)**
- Late joiners spectate the current game — see the public game state (pile, face-up cards, card counts) but NOT other players' hands
- Subtle banner at top or bottom: "Spectating — you'll join next game"
- Existing players see a spectator count indicator (e.g., "👁 1 watching") on the game screen
- When the game ends and everyone returns to lobby, spectators join the lobby as regular players

**Discord visual integration**
- Identical look to standalone web — no Discord-specific styling, colors, or fonts
- Safe area handling must work perfectly — no UI cutoff on iPhone notch, Android punch-hole, or home indicator area
- In Discord, hide web-specific lobby elements (room code input, create room button) — auto-join is the only path
- Show Discord avatars next to player names in lobby and during gameplay

### Claude's Discretion
- Technical deployment configuration (HTTPS, URL mappings, Render setup)
- cloudflared tunnel documentation details
- Cookie SameSite/Partitioned configuration
- Safe area CSS implementation approach
- Spectator banner exact styling and positioning
- How spectator count indicator is displayed

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 19 completes the Discord Activity integration by implementing instance ID-based auto-join, adding cross-platform room lifecycle improvements (host migration, spectator mode, auto-return to lobby, shithead marker), applying safe area CSS, and deploying to production.

The work spans three layers: (1) Discord SDK layer — using `discordSdk.instanceId` as the room key and `discordSdk.authenticate()` result for identity; (2) server layer — adding spectator player role, host migration on disconnect, and auto-return to lobby triggered by server rather than player button click; and (3) client layer — Discord Lobby component that hides web UI elements, shows Discord avatars, and triggers auto-join after authentication.

The existing Phase 18 authentication flow is complete. The `DiscordAuthAdapter.getSdk()` method exposes the SDK instance for Phase 19 instance ID access. The `DiscordRoomAdapter` has a comment placeholder explicitly for Phase 19's instance-based auto-join. All infrastructure (cloudflared tunnel via `make dev-discord`, URL mappings, proxy stripping) is already operational.

**Primary recommendation:** Use `discordSdk.instanceId` (available immediately after SDK construction, before `ready()`) as the server-side room key. When a Discord player authenticates, the client sends `join-or-create` with the instance ID as the room code. The server creates or joins that room. All players in the same Discord voice channel share the same instance ID, so they end up in the same room automatically.

---

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@discord/embedded-app-sdk` | 2.4.0 (already installed) | Instance ID, SDK events, avatar data | Required for Discord Activities |
| Vue 3 + Tailwind v4 | already in project | Discord Lobby UI component | Project standard |
| Bun WebSocket server | already in project | Server-side room management | Project standard |
| `@vueuse/core` useWebSocket | already in project | WebSocket with backoff | Project standard (Phase 16) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `env()` safe-area-inset-* | Browser native | Mobile notch/home indicator | Discord mobile UI |
| Discord CDN (`cdn.discordapp.com`) | N/A | Avatar image URLs | Discord avatar display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `discordSdk.instanceId` as room key | Separate room ID server-side | instanceId is the canonical approach per Discord docs — no benefit to abstraction |
| Auto-return on game-over (server-triggered) | Keep "Play Again" button | User decision: replace button with server-driven auto-return |

**Installation:** No new packages needed. `@discord/embedded-app-sdk` 2.4.0 is already installed.

---

## Architecture Patterns

### Key Existing Code Boundaries (What Phase 18 Left For Phase 19)

The `DiscordAuthAdapter` comment says: "Phase 19 UI uses getCurrentUser().name to auto-populate player nickname."

The `DiscordRoomAdapter` comment says: "Future Phase 19 enhancement: Add Discord instance-based auto-join logic here."

The `DiscordAuthAdapter.getSdk()` method exposes the SDK for Phase 19 to access `instanceId`.

The auth is triggered by component lifecycle (not at app startup) — the Discord Lobby component will call `authenticate()` on mount.

### Pattern 1: Discord Instance ID as Room Key

**What:** Use `discordSdk.instanceId` as the server-side room identifier. All players in the same Discord voice channel Activity share the same `instanceId`. The server creates the room on first join, subsequent players join the existing room.

**When to use:** Whenever a Discord player needs to join a room — replaces manual room code entry entirely.

**Key SDK fact:** `instanceId` is available immediately on SDK construction, before `ready()` is called. It comes from the URL query params that Discord injects when launching the Activity.

**Example (DiscordRoomAdapter.ts — Phase 19 implementation):**
```typescript
// Source: Discord.d.ts type definition (local node_modules)
// discordSdk.instanceId is available immediately after new DiscordSDK(clientId)
// No await needed — it's populated from URL query params Discord injects

export class DiscordRoomAdapter implements RoomAdapter {
  private sdk: DiscordSDK;

  constructor(sdk: DiscordSDK) {
    this.sdk = sdk;
  }

  /**
   * Discord auto-join: use instance ID as room code.
   * Server creates room if it doesn't exist, or joins existing room.
   * The nickname comes from authenticated Discord user.
   */
  joinOrCreate(nickname: string): void {
    const instanceId = this.sdk.instanceId;
    this.socket.send({ type: 'join-or-create', instanceId, nickname });
  }
}
```

**Caution on instance ID stability:** Per GitHub issue #202, instance ID changes when a solo user pops out the Activity. With multiple players present, the ID is stable. The `join-or-create` pattern handles this gracefully — the player just gets a new room if solo.

### Pattern 2: Server-Side `join-or-create` Message Handler

**What:** New message type that either creates a room with a given code or joins it if it already exists. The instance ID IS the room code for Discord mode.

**When to use:** Only for Discord mode; web mode uses existing `create-room` / `join-room` messages.

**Server implementation approach:**
```typescript
// In handlers.ts, new case:
case 'join-or-create': {
  const instanceId = message.instanceId; // used as room code
  const existingRoom = manager.getRoom(instanceId);

  if (existingRoom) {
    // Room exists — join it (game may be in progress → spectator)
    const result = manager.joinRoomOrSpectate(instanceId, ws.data.playerId, message.nickname);
    // ... handle spectator vs player join
  } else {
    // First player — create room with instanceId as code
    const result = manager.createRoomWithCode(instanceId, ws.data.playerId, message.nickname);
    // ...
  }
}
```

**Shared schema addition required:**
```typescript
// In packages/shared/src/schemas/messages.ts
export const joinOrCreateSchema = z.object({
  type: z.literal('join-or-create'),
  instanceId: z.string(),
  nickname: z.string().min(1).max(20).trim(),
});
```

### Pattern 3: Spectator Role

**What:** Players who join a room while a game is in progress become spectators. Spectators receive a limited game view (pile, face-up cards, card counts) but NOT hand cards. They see a "Spectating — you'll join next game" banner.

**Server changes needed:**
1. `Room.addSpectator()` — new method, spectators stored in a separate `spectators` Map
2. `Room.getSpectatorView()` — returns public game state only (no hand data)
3. `RoomState` type extended with `spectatorCount: number`
4. Server broadcasts spectator count updates to active players via `room-updated` (or a new `spectator-joined` message)
5. On `return-to-lobby`, all spectators are promoted to regular players

**Client changes needed:**
- `useGameSocket` handles a new spectator state (or uses existing `roomState` with a `isSpectator` flag)
- Spectator banner shown when player is spectating
- Spectator count indicator shown to active players on game screen

**Spectator state in useGameSocket:**
```typescript
// New reactive state in useGameSocket
const isSpectator = ref<boolean>(false);
const spectatorGameView = ref<SpectatorGameView | null>(null); // public state only
```

### Pattern 4: Host Migration on Disconnect

**What:** When the host disconnects (after grace period expires), rather than destroying the room, the next player in the player list becomes host. The room continues.

**Current behavior (what must change):** `removePlayer()` returns `true` when host leaves, triggering room destruction in `handleClose()`. The handler calls `manager.destroyRoom()` on host disconnect.

**New behavior:**
1. `Room.removePlayer()` or `Room.removePlayerAfterTimeout()` — instead of destroying on host-left, select new host from remaining players
2. `Room.migrateHost()` — picks next connected player as host, updates `isHost` flags, broadcasts `room-updated`
3. Handler layer: stop destroying rooms when host leaves (unless room is empty)

**Example server logic:**
```typescript
// In Room.ts removePlayerAfterTimeout() for host case:
if (isHost) {
  const remainingPlayers = Array.from(this.players.keys())
    .filter(pid => pid !== playerId && !this.disconnectedPlayers.has(pid));

  if (remainingPlayers.length > 0) {
    // Migrate host instead of destroying room
    const newHostId = remainingPlayers[0];
    this.hostId = newHostId;
    for (const [pid, player] of this.players) {
      player.isHost = pid === newHostId;
    }
    this.players.delete(playerId);
    this.onHostMigrated?.(playerId, newHostId);
    return; // Room continues
  }
  // No remaining players — destroy room
  this.onPlayerRemoved?.(playerId, player.nickname, 'host-left');
}
```

### Pattern 5: Auto-Return to Lobby (Replaces "Play Again" Button)

**What:** Instead of requiring each player to click "Play Again", the server automatically returns all players to lobby after a game ends. The decision is: immediate auto-return vs short delay.

**Decision:** Based on user context — "After game finishes, all players auto-return to lobby for easy rematch." This is automatic, not button-driven.

**Implementation approach:** On `game-over`, server waits a short delay (3-5 seconds to show the game-over screen), then automatically calls `resetToLobby()` and broadcasts `return-to-lobby` to all players.

**The existing `play-again` message and `markPlayAgain()` logic can be replaced** with a server-side timer that auto-triggers `resetToLobby()`. Alternatively, keep the play-again button but have it send immediately. The simplest approach: remove the "Play Again" button UI, have the server auto-return after a display delay.

**Server change:** After `onGameOver` fires and all clients show the game-over screen, trigger:
```typescript
// In handlers.ts, after broadcasting game-over:
setTimeout(() => {
  room.resetToLobby();
  // resetToLobby fires onReturnToLobby callback which broadcasts return-to-lobby
}, 5000); // 5 seconds to see who lost
```

### Pattern 6: Discord Avatar Display

**What:** Show Discord avatars next to player names in lobby and during gameplay.

**Avatar URL construction (HIGH confidence from SDK type definitions):**
```typescript
// From DiscordAuthAdapter.getDiscordUser():
// user.id and user.avatar hash are already stored in rawDiscordUser

function getDiscordAvatarUrl(userId: string, avatarHash: string | null, size = 64): string {
  if (!avatarHash) {
    // Default Discord avatar (based on discriminator modulo 5)
    return `https://cdn.discordapp.com/embed/avatars/0.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=${size}`;
}
```

**The CDN URL (`cdn.discordapp.com`) is accessible from within Discord Activities** — it's a known Discord domain that does not require URL mapping configuration.

**Storage:** Avatar URL/hash is already stored in `DiscordAuthAdapter.rawDiscordUser`. The question is how to make it available in room state. Options:
1. Pass avatar hash as part of the `join-or-create` message so the server can include it in `LobbyPlayer`
2. Store it client-side and look up by playerId

Option 1 is cleaner — add optional `avatarHash` to `LobbyPlayer` and `join-or-create` message. Web players have `avatarHash: null`.

### Pattern 7: Safe Area CSS

**What:** Apply CSS `env(safe-area-inset-*)` to prevent UI cutoff on mobile devices (iPhone notch, Android punch-hole, home indicator).

**How Discord Activities handle this:** Discord passes the native safe area values through the iframe. Standard CSS `env()` variables work.

**Requirement for `env()` to work:** The HTML `<meta name="viewport">` must include `viewport-fit=cover`. Without this, `env(safe-area-inset-*)` returns `0px` on iOS Safari.

**Current viewport:** Need to verify if `index.html` already has `viewport-fit=cover`.

**Implementation approach (Claude's Discretion):**

1. Add `viewport-fit=cover` to viewport meta tag in `index.html`
2. Apply padding via CSS custom properties in `style.css`:
```css
/* In style.css */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
}
```
3. Apply to the app root container in `App.vue`:
```html
<!-- In App.vue template -->
<div class="min-h-screen bg-green-900"
     style="padding-top: var(--safe-top); padding-bottom: var(--safe-bottom);">
```
4. Or use Tailwind v4 with explicit padding utility classes

**Alternative (Tailwind v4 approach):** Since Tailwind v4 supports arbitrary values with CSS variables, use `pt-[env(safe-area-inset-top)]` etc. However, the fallback `var(--safe-*)` CSS custom property approach is more reliable across browsers.

### Pattern 8: Discord-Specific Lobby vs Web Lobby

**What:** In Discord mode, the Lobby component must hide room code and create/join room controls. The lobby shows the player list and host-start button only.

**Implementation approach:** Check `inject(PlatformKey)` in Lobby.vue to conditionally render Discord-specific vs web UI. Or, create a separate `DiscordLobby.vue` component.

**Recommended:** Use `v-if="platform !== 'discord'"` inside existing `Lobby.vue` to hide web-specific elements. Avoid a full separate component since behavior is mostly identical.

**Discord Lobby flow:**
1. Component mounts → inject `AuthAdapterKey` → call `authAdapter.authenticate()` (if not already done)
2. On auth success → get username from `authAdapter.getCurrentUser()` → get SDK from `(authAdapter as DiscordAuthAdapter).getSdk()`
3. Send `join-or-create` with `instanceId` and Discord username as nickname
4. Receive `room-created` or `room-joined` → room appears, player is in lobby
5. Wait for host to start game (or if player becomes host automatically, show Start button)

### Pattern 9: Shithead Marker (💩 emoji)

**What:** The player who lost the last game gets a 💩 emoji next to their name until a new shithead is found.

**Server:** Track `shitheadPlayerId: string | null` on `Room`. Set it on game over. Clear it when a new game ends with a new shithead. Include it in `RoomState` or transmit via `game-over` with updated room state.

**Simplest approach:** Add `shitheadPlayerId: string | null` to `RoomState`. Server includes it in all `room-updated`, `room-created`, `room-joined`, and `return-to-lobby` messages. Client renders the emoji in the player list when `player.id === roomState.shitheadPlayerId`.

**During gameplay:** Add `shitheadPlayerId` to the game view state so the emoji can also appear in the opponent list during the game.

### Recommended Project Structure for New Files

```
packages/client/src/
├── components/
│   └── DiscordLobby.vue          # Discord-specific lobby (auto-join, no room codes)
│   └── SpectatorBanner.vue       # "Spectating — you'll join next game" banner
├── platform/adapters/discord/
│   └── DiscordRoomAdapter.ts     # UPDATED: add joinOrCreate() method

packages/server/src/
├── rooms/
│   └── Room.ts                   # UPDATED: spectators, host migration, auto-return
│   └── RoomManager.ts            # UPDATED: joinRoomOrSpectate(), createRoomWithCode()
├── websocket/
│   └── handlers.ts               # UPDATED: join-or-create handler

packages/shared/src/
├── schemas/messages.ts           # UPDATED: join-or-create schema
├── types/room.ts                 # UPDATED: spectatorCount, shitheadPlayerId, avatarHash
├── types/messages.ts             # UPDATED: new message types
```

### Anti-Patterns to Avoid

- **Querying Discord SDK for instanceId after ready():** `instanceId` is available immediately on construction — no need to wait. Waiting for `ready()` before getting it just adds latency.
- **Destroying rooms on host disconnect:** The current behavior destroys the room. Phase 19 must change this to host migration.
- **Storing avatar URLs in browser storage:** Avatar URLs change. Store the hash and reconstruct the URL each render.
- **Using patchUrlMappings for cdn.discordapp.com:** CDN is already accessible from Discord Activities without remapping. Only use `patchUrlMappings` for third-party libraries that hardcode external URLs.

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Discord instance ID access | Custom URL param parsing | `discordSdk.instanceId` (SDK property) | Already parsed from Discord query params |
| Participant list | Subscribe to ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE | `discordSdk.commands.getActivityInstanceConnectedParticipants()` | Returns participant objects with user data |
| WebSocket backoff | Custom retry logic | Existing `useGameSocket` with `@vueuse/core` autoReconnect | Phase 16 already implemented 5-retry exponential backoff |
| Avatar URL construction | Custom asset fetching | Construct `cdn.discordapp.com/avatars/{id}/{hash}.webp` URL directly | Standard Discord CDN pattern |
| Safe area insets | JS window size calculations | CSS `env(safe-area-inset-*)` | Browser native, no JS needed |

**Key insight:** The Discord SDK is the source of truth for anything Discord-specific. Don't replicate what it already provides.

---

## Common Pitfalls

### Pitfall 1: `authenticate()` Called Twice

**What goes wrong:** If `DiscordAuthAdapter.authenticate()` is called again after a successful auth (e.g., component re-mount), it reinitializes the flow. The SDK `ready()` call may throw or behave unexpectedly.

**Why it happens:** The Phase 18 decision is that `authenticate()` is triggered by component lifecycle. If the Discord Lobby component unmounts and remounts, this re-triggers auth.

**How to avoid:** Add an `isAuthenticated()` guard before calling `authenticate()` in the Discord Lobby component:
```typescript
onMounted(async () => {
  if (!authAdapter.isAuthenticated()) {
    await authAdapter.authenticate();
  }
  // Then proceed with join-or-create
});
```

### Pitfall 2: Host Migration on `leaveRoom` vs Disconnect

**What goes wrong:** The current `leave-room` message handler calls `manager.leaveRoom()` which calls `room.removePlayer()` — this returns `true` if the host left, triggering room destruction. Phase 19's host migration only applies to **disconnect** (timeout), not intentional leave.

**Why it happens:** Host migration and intentional leave have different semantics. Intentional host leave should migrate or destroy based on preference.

**How to avoid:** Apply host migration in `removePlayerAfterTimeout()` (disconnect) only. For intentional `leave-room`, decide: migrate or destroy. Given the decision "Room dies immediately when all players disconnect" (not "when host leaves"), an intentional host leave should also migrate the host if others are present.

### Pitfall 3: Spectator Gets Full Game View

**What goes wrong:** If `room.addPlayer()` is called for a late-arriving player, they get a full game view including the hand cards of all players.

**Why it happens:** `room.addPlayer()` gates on `status !== 'waiting'` and returns `GAME_ALREADY_STARTED`. This actually prevents late joins — but the Phase 19 requirement is that late joiners spectate, not get rejected.

**How to avoid:** Add `room.addSpectator()` path. When `join-or-create` arrives and the room is in `playing` status, add them as spectator (separate data structure) rather than returning an error. Send them a spectator-specific view without hand data.

### Pitfall 4: Safe Area Not Applied to Full App Height

**What goes wrong:** Only top-level components apply safe area padding, but inner components use `min-h-screen` without accounting for safe area already consumed by the wrapper. Results in double-padding or content too small.

**Why it happens:** Safe area applied at multiple levels.

**How to avoid:** Apply safe area ONLY at the App.vue root level (or in a single global CSS rule). Use `min-h-[calc(100vh-var(--safe-top)-var(--safe-bottom))]` for inner layouts, or apply padding-box approach at root.

### Pitfall 5: instance_id Used as 6-Character Room Code Fails Validation

**What goes wrong:** The existing `joinRoomSchema` validates `code: z.string().length(6)`. Discord's `instanceId` is not 6 characters — it's a longer string.

**Why it happens:** The existing `join-room` message has a 6-character room code constraint. Instance IDs are different.

**How to avoid:** Use a NEW message type `join-or-create` with `instanceId: z.string()` (no length constraint). Don't reuse the existing `join-room` schema.

### Pitfall 6: `viewport-fit=cover` Missing

**What goes wrong:** `env(safe-area-inset-top)` returns `0px` on iOS Safari even in Discord's web view, because the viewport meta tag doesn't include `viewport-fit=cover`.

**Why it happens:** `viewport-fit=cover` is required for the browser to expose safe area inset values to CSS.

**How to avoid:** Check `packages/client/index.html` viewport meta tag and add `viewport-fit=cover` if absent.

### Pitfall 7: Return-to-Lobby Does Not Include Spectators

**What goes wrong:** `room.resetToLobby()` operates on `this.players` only. Spectators stored separately are not promoted to players.

**Why it happens:** Spectators are a new data structure; existing `resetToLobby()` doesn't know about them.

**How to avoid:** Extend `resetToLobby()` to also move all spectators into `this.players` (as non-host players).

---

## Code Examples

Verified patterns from official sources and codebase:

### Discord SDK instanceId Access

```typescript
// Source: Discord.d.ts (packages/client/node_modules/@discord/embedded-app-sdk/output/Discord.d.ts)
// instanceId is a readonly property set during constructor from URL query params

const sdk = new DiscordSDK(clientId);
// instanceId is immediately available — no await needed
const instanceId = sdk.instanceId; // e.g., "abc123xyz789..."
```

### ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE Event Subscription

```typescript
// Source: events.d.ts local type definitions
// No scope required for this event

await discordSdk.subscribe(
  'ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE',
  (data: { participants: Array<{id: string; username: string; global_name?: string | null; avatar?: string | null}> }) => {
    // Called whenever someone joins or leaves the Activity
    console.log('Participants updated:', data.participants);
  }
);
```

### Get Current Participants (Command, not Event)

```typescript
// Source: Discord.d.ts — getActivityInstanceConnectedParticipants command
// Available immediately after authenticate()

const { participants } = await discordSdk.commands.getActivityInstanceConnectedParticipants();
// participants: Array<{ id, username, global_name, avatar, ... }>
```

### Discord Avatar URL Construction

```typescript
// Source: Discord CDN URL pattern (MEDIUM confidence — standard Discord pattern)
// cdn.discordapp.com is accessible from Discord Activities without URL mappings

function getAvatarUrl(userId: string, avatarHash: string | null, size = 64): string {
  if (!avatarHash) {
    // Use default avatar — Discord has 5 default avatars (0-4)
    const defaultIndex = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }
  const extension = avatarHash.startsWith('a_') ? 'gif' : 'webp';
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
}
```

### Safe Area CSS with Fallback

```css
/* Source: MDN env() documentation (MEDIUM confidence) */
/* In style.css or App.vue <style> */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
```

```html
<!-- In index.html - REQUIRED for safe area to work on iOS -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

### cloudflared Tunnel Setup for Local Discord Dev

```bash
# Already documented in DISCORD-SETUP.md and handled by make dev-discord
# The tunnel runs via docker-compose.discord.yml
make dev-discord
# Look for: https://randomly-generated-subdomain.trycloudflare.com
# Then configure in Discord Developer Portal:
# Activities → URL Mappings → Prefix "/" → Target: your-tunnel-url.trycloudflare.com
```

### Production URL Mapping Configuration

```
Discord Developer Portal → Activities → URL Mappings:

Root mapping:
  Prefix:  /
  Target:  your-production-domain.com

Proxy mapping (for /.proxy/* paths):
  Prefix:  /.proxy
  Target:  your-production-domain.com/.proxy
```

The server already strips `/.proxy` prefix via Vite proxy in dev, and via the existing Caddy/reverse-proxy in production (per DISCORD-SETUP.md).

### Server: New Message Schema (join-or-create)

```typescript
// In packages/shared/src/schemas/messages.ts
export const joinOrCreateSchema = z.object({
  type: z.literal('join-or-create'),
  instanceId: z.string().min(1).max(100), // Discord instanceId is longer than 6 chars
  nickname: z.string().min(1).max(20).trim(),
  avatarHash: z.string().nullable().optional(), // For Discord avatar display
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Room creation requires user to enter nickname | Discord identity auto-fills nickname from Phase 18 | Phase 18/19 | No name entry screen needed |
| Host leave destroys room | Host migration to next player | Phase 19 | Better multiplayer experience |
| "Play Again" button required | Auto-return to lobby after game | Phase 19 | Smoother rematch flow |
| No safe area handling | CSS env() safe area insets | Phase 19 | Mobile Discord support |
| All joiners become players | Late joiners become spectators | Phase 19 | Mid-game join support |
| `/.proxy` paths (legacy) | Both `/.proxy` and direct paths supported | Discord API update | Backward compatible |

**Deprecated/outdated:**
- "Play Again" button in Game.vue finished phase: replaced by server-triggered auto-return to lobby
- `room.markPlayAgain()` server method: may no longer be needed (replace with server-side timer)
- Room destruction on host disconnect: replaced by host migration (when other players remain)

---

## Current Codebase: What Must Change

### Server Changes (packages/server/src/)

1. **`rooms/Room.ts`** — Multiple changes:
   - Add `spectators` Map (separate from `players`)
   - Add `shitheadPlayerId: string | null` field
   - Add `addSpectator()` method
   - Add `getSpectatorView()` method (public game state only)
   - Change `removePlayerAfterTimeout()` for host: migrate instead of notify-destroy
   - Change `onGameOver` callback: trigger auto-return to lobby after delay (instead of waiting for `play-again` messages)
   - Update `resetToLobby()` to promote spectators to players
   - Add `migrateHost()` helper

2. **`rooms/RoomManager.ts`** — Add:
   - `joinRoomOrSpectate()` — creates or joins, routes to spectator if game in progress
   - `createRoomWithCode()` — creates room with a provided code (for Discord instanceId)

3. **`websocket/handlers.ts`** — Add:
   - `join-or-create` message handler
   - Updated disconnect handler for host migration (remove destroyRoom call)

### Shared Changes (packages/shared/src/)

1. **`types/room.ts`** — Add:
   - `spectatorCount: number` to `RoomState`
   - `shitheadPlayerId: string | null` to `RoomState`
   - `avatarHash?: string | null` to `LobbyPlayer`

2. **`schemas/messages.ts`** — Add:
   - `joinOrCreateSchema`

3. **`types/messages.ts`** — Add:
   - Types for new schemas

### Client Changes (packages/client/src/)

1. **`components/DiscordLobby.vue`** (new) — Discord-specific lobby that:
   - On mount: calls `authAdapter.authenticate()` if not authenticated
   - Gets instance ID from auth adapter's SDK
   - Sends `join-or-create` automatically
   - Shows player list without room code, create/join buttons
   - Shows Discord avatars next to player names
   - Shows host Start button (if host)

2. **`components/Lobby.vue`** — Update for:
   - Avatar display (shared between web and Discord)
   - Shithead marker (💩 next to player name)
   - Remove "Play Again" button (auto-return handles this)

3. **`components/Game.vue`** — Update for:
   - Remove "Play Again" button and `handlePlayAgain` function
   - Add spectator banner (`SpectatorBanner.vue`)
   - Add spectator count indicator

4. **`composables/useGameSocket.ts`** — Add:
   - `isSpectator` reactive ref
   - Handle new message types from server

5. **`platform/adapters/discord/DiscordRoomAdapter.ts`** — Update:
   - Add `joinOrCreate(nickname, instanceId)` method

6. **`index.html`** — Add `viewport-fit=cover` to viewport meta

7. **`style.css`** — Add safe area CSS custom properties

8. **Router** — Add Discord detection to route to DiscordLobby vs Lobby

---

## Open Questions

1. **Auto-return timing after game-over**
   - What we know: Server should trigger auto-return; user decision says "auto-return to lobby"
   - What's unclear: Exactly how long to show the game-over screen (3 seconds? 5 seconds?)
   - Recommendation: Use 5 seconds (enough to read who lost, see the 💩 emoji). Make it a constant in Room.ts.

2. **Shithead marker in game state**
   - What we know: `shitheadPlayerId` needs to be in `RoomState` for lobby display
   - What's unclear: How to show it during active gameplay (OpponentView only has playerId/nickname)
   - Recommendation: Add optional `isShithead?: boolean` to both `LobbyPlayer` and `OpponentView` OR pass `shitheadPlayerId` in game-dealt/card-played messages alongside current game state

3. **Discord Lobby routing**
   - What we know: Web uses `/` → Landing, `/:code` → Lobby. Discord skips Landing entirely.
   - What's unclear: How to route Discord directly to DiscordLobby without showing Landing first
   - Recommendation: In `main.ts` (already platform-detected), set initial route to `/discord-lobby` when `platform === 'discord'`, then navigate to `/room/:code` after auto-join, then `/game` when game starts

4. **Spectator view data**
   - What we know: Spectators should see pile, face-up cards, card counts (but not hands)
   - What's unclear: What new message type to use — `spectator-joined` acknowledgment? Reuse `game-dealt` with a spectator flag?
   - Recommendation: Introduce a `spectator-state` server message distinct from `game-dealt` to avoid conflating the two flows

5. **Render production deployment**
   - What we know: Existing deployment uses Render (from STATE.md context)
   - What's unclear: Exact environment variables needed for Render (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET)
   - Recommendation: Document in DISCORD-SETUP.md. Environment variables DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET already exist in server's `/api/token` handler. VITE_DISCORD_CLIENT_ID needed for client build.

---

## Sources

### Primary (HIGH confidence)
- Local: `packages/client/node_modules/@discord/embedded-app-sdk/output/Discord.d.ts` — DiscordSDK class definition, instanceId property, all commands
- Local: `packages/client/node_modules/@discord/embedded-app-sdk/output/schema/events.d.ts` — ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE event payload
- Local: `packages/server/src/rooms/Room.ts` — Complete current room lifecycle implementation
- Local: `packages/server/src/websocket/handlers.ts` — Current message handling
- Local: `packages/server/src/rooms/RoomManager.ts` — Room management
- Local: `DISCORD-SETUP.md` — cloudflared tunnel and URL mapping documentation already established in this project
- Local: `packages/client/src/platform/adapters/discord/DiscordAuthAdapter.ts` — Phase 18 auth implementation

### Secondary (MEDIUM confidence)
- Official: `https://docs.discord.com/developers/activities/development-guides/multiplayer-experience` — instanceId as room key pattern
- Official: `https://docs.discord.com/developers/developer-tools/embedded-app-sdk#sdk-events` — ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE event data
- MDN: `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env` — CSS env() safe area insets

### Tertiary (LOW confidence)
- WebSearch: Discord CDN URL pattern for user avatars (cross-verified with SDK type definitions showing `avatar` hash field)
- GitHub: discord/embedded-app-sdk issue #202 — instance ID stability on pop-out (single user caveat)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, SDK type definitions inspected directly
- Architecture: HIGH — codebase fully read, Phase 18 boundaries clearly documented in code comments
- Pitfalls: HIGH — derived from reading actual current code paths that will need to change
- Discord SDK API: HIGH — verified from local installed type definitions (not training data)
- Production deployment: MEDIUM — URL mapping process verified, Render-specific config not fully researched
- Safe area CSS: MEDIUM — standard browser API, Discord-specific iframe behavior not explicitly verified

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (Discord SDK version 2.4.0 is installed; API stable for this version)
