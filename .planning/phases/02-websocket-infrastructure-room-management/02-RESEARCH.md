# Phase 2: WebSocket Infrastructure & Room Management - Research

**Researched:** 2026-02-07
**Domain:** Bun native WebSocket, room management, real-time multiplayer architecture
**Confidence:** HIGH

## Summary

This phase builds a real-time WebSocket infrastructure for room-based multiplayer using Bun's native WebSocket implementation. The research confirms that Bun's built-in WebSocket support (based on uWebSockets) provides all necessary features including pub/sub for room broadcasting, contextual data for room/player state, and excellent performance (7x faster than Node.js + ws). The user has already made key UI/UX decisions in CONTEXT.md, leaving technical implementation details to our discretion.

Key findings: (1) Bun's native pub/sub eliminates need for Redis or external message brokers for single-server deployments, (2) VueUse provides production-ready `useWebSocket` composable with auto-reconnect and heartbeat support, (3) Zod provides runtime message validation essential for preventing client manipulation in server-authoritative architecture, (4) Nanoid is the standard for short, collision-resistant room codes with customizable alphabet, and (5) Server-authoritative architecture requires careful validation of all client messages to prevent cheating and state corruption.

**Primary recommendation:** Use Bun's native WebSocket with pub/sub topics (one per room), Zod for message validation in packages/shared, VueUse `useWebSocket` composable on client for connection management, and Nanoid for 6-character room codes using custom alphabet (uppercase + digits, excluding confusables like 0/O, 1/I).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Room Creation Flow:**
- Landing page shows nickname field + Create/Join options all on one screen
- Nickname is entered once on the landing page, then used for either create or join
- No room options or settings — just create and go (always 2-4 players, standard rules)
- After creating, show the room code prominently AND a shareable URL to send to friends

**Join Experience:**
- Nicknames: keep it simple — basic length limit, no complex rules
- Invalid/full room: simple error message ("Room is full" / "Game already started"), stay on join screen

**Lobby & Player List:**
- Simple vertical list of nicknames, host marked with a crown/star icon
- No ready-up system — host decides when to start
- No chat — players are already on a call or texting
- When a player leaves the lobby, they just disappear from the list (no notification)

**Game Start Trigger:**
- Minimum 2 players to start (1v1 allowed)
- Short countdown (3-5 seconds) after host clicks start
- Start button disabled until minimum players met, with hint like "Waiting for players..."
- No room idle timeout — room stays open until host leaves or game starts

### Claude's Discretion

- Room code format and length
- Shared link join flow (auto-fill code vs direct to nickname entry)
- Exact UI layout and spacing
- WebSocket message protocol design
- Room state management architecture
- Error state handling beyond the specified cases

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

The established libraries/tools for this implementation:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun native WebSocket | Built-in | Server WebSocket implementation | 7x faster than Node.js+ws, built-in pub/sub, no external dependencies, native TypeScript |
| VueUse | ^11.0.0 | Client WebSocket composable | De facto standard for Vue 3 utilities, provides `useWebSocket` with auto-reconnect, heartbeat, reactive state |
| Zod | ^3.23.0 | Runtime message validation | TypeScript-first schema validation, ensures type safety + runtime safety for WebSocket messages |
| Nanoid | ^5.1.0 | Room code generation | Tiny (118 bytes), secure, URL-friendly, customizable alphabet for short codes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vueuse/core | ^11.0.0 | Vue composables collection | Already includes useWebSocket, no need for separate WebSocket library |
| @types/bun | latest | TypeScript types for Bun APIs | Already in devDependencies, covers ServerWebSocket types |
| ws (for testing) | ^8.18.0 | WebSocket client for integration tests | Simulate client connections in Vitest tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bun pub/sub | Redis pub/sub | Redis adds complexity, external dependency, and latency for a single-server setup; only needed for multi-server horizontal scaling (out of scope) |
| VueUse | Socket.IO client | Socket.IO adds 50KB+ to bundle, provides fallbacks we don't need (targeting modern browsers), and requires Socket.IO server library |
| Zod | Manual validation | Manual validation is error-prone, verbose, and loses type inference; Zod provides both compile-time and runtime safety |
| Nanoid | UUID/CUID | UUIDs are too long for human entry (36 chars), CUIDs are sortable but longer (25 chars); room codes need to be short (6 chars) |

**Installation:**
```bash
# Server dependencies
cd packages/server
bun add zod nanoid

# Client dependencies
cd packages/client
bun add @vueuse/core zod

# Shared dependencies (message types)
cd packages/shared
bun add zod
```

## Architecture Patterns

### Recommended Project Structure

```
packages/
├── server/
│   ├── src/
│   │   ├── index.ts                    # Main server entry (existing)
│   │   ├── rooms/
│   │   │   ├── RoomManager.ts          # Central room lifecycle management
│   │   │   └── Room.ts                 # Individual room state + logic
│   │   └── websocket/
│   │       ├── handlers.ts             # Message handlers (create, join, start, etc.)
│   │       └── validation.ts           # Message validation with Zod
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.vue             # Nickname + Create/Join
│   │   │   ├── Lobby.vue               # Player list + host controls
│   │   │   └── RoomCode.vue            # Display code + shareable link
│   │   └── composables/
│   │       └── useGameSocket.ts        # Wraps useWebSocket with game logic
└── shared/
    └── src/
        ├── types/
        │   ├── messages.ts              # WebSocket message type unions
        │   └── room.ts                  # Room state types
        └── schemas/
            └── messages.ts              # Zod schemas for validation
```

### Pattern 1: Bun Pub/Sub for Room Broadcasting

**What:** Each room is a pub/sub topic. Players subscribe on join, server publishes state updates to topic.

**When to use:** Any time you need to broadcast to all players in a room (state updates, player joined/left, game started).

**Example:**
```typescript
// Source: https://bun.sh/docs/api/websockets

// Server-side room management
const server = Bun.serve({
  websocket: {
    open(ws) {
      // Subscribe socket to room topic
      ws.subscribe(`room:${ws.data.roomCode}`);
    },
    message(ws, message) {
      // Broadcast to all players in room (excluding sender)
      ws.publish(`room:${ws.data.roomCode}`, JSON.stringify({
        type: 'PLAYER_JOINED',
        nickname: ws.data.nickname
      }));

      // Or broadcast from server instance (includes sender)
      server.publish(`room:${ws.data.roomCode}`, message);
    },
    close(ws) {
      ws.unsubscribe(`room:${ws.data.roomCode}`);
    }
  }
});
```

**Key insight:** Bun's pub/sub is topic-based and lightweight — no need for Redis unless scaling to multiple server instances (out of scope for this phase).

### Pattern 2: Contextual Data for Room State

**What:** Attach room/player context to WebSocket via `data` property during upgrade.

**When to use:** Store room code, player ID, nickname, and host status per connection.

**Example:**
```typescript
// Source: https://bun.sh/docs/api/websockets

type WebSocketData = {
  playerId: string;
  roomCode: string;
  nickname: string;
  isHost: boolean;
};

Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);

    // Extract nickname and room code from query params or request
    const roomCode = getRoomCodeFromRequest(req);
    const nickname = getNicknameFromRequest(req);

    server.upgrade(req, {
      data: {
        playerId: generatePlayerId(),
        roomCode,
        nickname,
        isHost: false, // Set based on room state
      }
    });
  },
  websocket: {
    // Type ws.data across all handlers
    data: {} as WebSocketData,

    message(ws, message) {
      // ws.data is now properly typed
      console.log(`${ws.data.nickname} sent message in room ${ws.data.roomCode}`);
    }
  }
});
```

**Key insight:** Strongly type `ws.data` using the `data` property on websocket handler (newer pattern, replaces deprecated `Bun.serve<T>` generic).

### Pattern 3: Zod Message Validation

**What:** Define message schemas in `packages/shared`, validate incoming messages server-side, infer TypeScript types.

**When to use:** Every incoming WebSocket message must be validated to prevent client manipulation.

**Example:**
```typescript
// Source: https://egghead.io/lessons/make-a-type-safe-and-runtime-safe-web-socket-communication-with-zod~efw0y
// packages/shared/src/schemas/messages.ts

import { z } from 'zod';

export const CreateRoomMessageSchema = z.object({
  type: z.literal('CREATE_ROOM'),
  nickname: z.string().min(1).max(20),
});

export const JoinRoomMessageSchema = z.object({
  type: z.literal('JOIN_ROOM'),
  roomCode: z.string().length(6),
  nickname: z.string().min(1).max(20),
});

export const StartGameMessageSchema = z.object({
  type: z.literal('START_GAME'),
});

// Union type for all client messages
export const ClientMessageSchema = z.discriminatedUnion('type', [
  CreateRoomMessageSchema,
  JoinRoomMessageSchema,
  StartGameMessageSchema,
]);

// Infer TypeScript types from schemas
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Server-side validation
websocket: {
  message(ws, message) {
    const parsed = ClientMessageSchema.safeParse(JSON.parse(message));
    if (!parsed.success) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message' }));
      return;
    }

    // Now parsed.data is properly typed
    switch (parsed.data.type) {
      case 'CREATE_ROOM':
        // Handle create room
        break;
      case 'JOIN_ROOM':
        // Handle join room
        break;
      // ...
    }
  }
}
```

**Key insight:** Zod provides both compile-time TypeScript inference AND runtime validation. Critical for server-authoritative architecture.

### Pattern 4: VueUse WebSocket Composable

**What:** Use `useWebSocket` from VueUse for client-side connection with auto-reconnect and reactive state.

**When to use:** All client-side WebSocket communication.

**Example:**
```typescript
// Source: https://vueuse.org/core/useWebSocket/
// packages/client/src/composables/useGameSocket.ts

import { useWebSocket } from '@vueuse/core';
import { ref } from 'vue';
import type { ClientMessage } from '@shit-head/shared';

export function useGameSocket() {
  const roomCode = ref<string | null>(null);
  const players = ref<Array<{ nickname: string; isHost: boolean }>>([]);

  const { status, data, send, open, close } = useWebSocket('ws://localhost:3000/ws', {
    autoReconnect: {
      retries: 3,
      delay: 1000,
      onFailed() {
        console.error('Failed to reconnect');
      }
    },
    heartbeat: {
      message: 'ping',
      interval: 30000,
    },
    onMessage(ws, event) {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'ROOM_CREATED':
          roomCode.value = message.roomCode;
          break;
        case 'PLAYER_JOINED':
          players.value.push(message.player);
          break;
        // ...
      }
    }
  });

  const createRoom = (nickname: string) => {
    send(JSON.stringify({ type: 'CREATE_ROOM', nickname }));
  };

  return { status, roomCode, players, createRoom, /* ... */ };
}
```

**Key insight:** VueUse handles reconnection, heartbeat, and reactive state. Wrap it in a game-specific composable for cleaner component code.

### Pattern 5: Room Code Generation with Nanoid

**What:** Generate short, collision-resistant room codes using custom alphabet.

**When to use:** When creating a new room.

**Example:**
```typescript
// Source: https://github.com/ai/nanoid
// packages/server/src/rooms/RoomManager.ts

import { customAlphabet } from 'nanoid';

// Exclude confusable characters: 0/O, 1/I/l, etc.
const ROOM_CODE_ALPHABET = '234679ABCDEFGHJKLMNPQRSTUVWXYZ';
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 6);

class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(hostNickname: string): string {
    let roomCode: string;

    // Ensure uniqueness (extremely rare collision with 6 chars from 29-char alphabet)
    do {
      roomCode = generateRoomCode();
    } while (this.rooms.has(roomCode));

    const room = new Room(roomCode, hostNickname);
    this.rooms.set(roomCode, room);

    return roomCode;
  }
}
```

**Key insight:** Custom alphabet improves human readability by removing confusable characters. 6 characters from 29-char alphabet = 29^6 = ~600 million combinations — collision probability is negligible for short-lived rooms.

### Pattern 6: Server-Authoritative State Updates

**What:** Server owns the room state. Clients send actions, server validates and broadcasts state updates.

**When to use:** All game state changes (player joined, game started, etc.).

**Example:**
```typescript
// Server-side validation pattern
class Room {
  private players: Map<string, Player> = new Map();
  private state: 'waiting' | 'countdown' | 'playing' = 'waiting';

  addPlayer(playerId: string, nickname: string): boolean {
    // Server validates constraints
    if (this.players.size >= 4) return false;
    if (this.state !== 'waiting') return false;

    this.players.set(playerId, { nickname, joinedAt: Date.now() });
    return true;
  }

  startGame(requesterId: string): boolean {
    // Server validates requester is host
    if (!this.isHost(requesterId)) return false;

    // Server validates state
    if (this.players.size < 2) return false;
    if (this.state !== 'waiting') return false;

    this.state = 'countdown';
    return true;
  }
}
```

**Key insight:** Never trust client messages. Server must validate every state transition and broadcast the authoritative state to all clients.

### Anti-Patterns to Avoid

- **Client-side state ownership:** Clients send desired state → Server validates and owns state, broadcasts updates
- **Missing message validation:** Trust all WebSocket messages → Validate all messages with Zod before processing
- **ws:// in production:** Unencrypted WebSocket → Use wss:// (WebSocket Secure) in production
- **Missing origin validation:** Accept all WebSocket connections → Validate Origin header to prevent CSWSH (Cross-Site WebSocket Hijacking)
- **Long-lived tokens without refresh:** WebSocket stays open for hours → No auth tokens in this phase, but future phases should implement token refresh for long sessions
- **Synchronous message handlers:** Block on slow operations → Use async handlers, return errors to client on timeout
- **Global room storage in module scope:** Room state in module-level Map → Encapsulate in RoomManager class for testability and cleanup

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection logic | Custom retry + exponential backoff | VueUse `useWebSocket` with `autoReconnect` | Handles edge cases: network flapping, max retries, jitter to prevent thundering herd |
| Room broadcasting | Loop through sockets and `.send()` | Bun's native `.publish()` on topic | Built-in, optimized, handles unsubscribe on disconnect |
| Message validation | Manual `if/else` type checking | Zod discriminated unions | Type-safe, runtime-safe, auto-inferred types, clear error messages |
| Unique ID generation | `Math.random().toString(36)` | Nanoid with custom alphabet | Cryptographically secure, collision-resistant, customizable |
| WebSocket state management (client) | Manual `readyState` tracking | VueUse `status` ref | Reactive, handles CONNECTING/OPEN/CLOSED states, integrates with Vue lifecycle |
| Heartbeat/ping-pong | Manual `setInterval` + timeout tracking | VueUse `heartbeat` option | Handles timeouts, reconnection on missed pong, configurable intervals |

**Key insight:** The WebSocket ecosystem has matured. For a multiplayer lobby, the standard stack (Bun pub/sub + VueUse + Zod + Nanoid) covers 95% of needs without custom infrastructure code.

## Common Pitfalls

### Pitfall 1: Cross-Site WebSocket Hijacking (CSWSH)

**What goes wrong:** Attacker creates malicious page that opens WebSocket to your server using victim's cookies/session.

**Why it happens:** WebSocket handshakes don't enforce same-origin policy. If you only rely on cookies for auth, any site can initiate a connection.

**How to avoid:**
```typescript
// Validate Origin header during upgrade
fetch(req, server) {
  const origin = req.headers.get('origin');
  const allowedOrigins = ['http://localhost:5173', 'https://yourapp.com'];

  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  server.upgrade(req, { /* ... */ });
}
```

**Warning signs:** Security audit flags missing origin validation, penetration test shows WebSocket hijacking.

**Source:** [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [WebSocket Security | Heroku](https://devcenter.heroku.com/articles/websocket-security)

### Pitfall 2: Missing Input Validation

**What goes wrong:** Client sends malformed or malicious messages → Server crashes or behaves unexpectedly.

**Why it happens:** Developers assume clients send well-formed messages. WebSocket messages have `any` type by default in TypeScript.

**How to avoid:**
```typescript
// Always parse and validate
message(ws, message) {
  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
    return;
  }

  const validated = ClientMessageSchema.safeParse(parsed);
  if (!validated.success) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message schema' }));
    return;
  }

  // Now safe to process
  handleMessage(ws, validated.data);
}
```

**Warning signs:** Server crashes on unexpected client messages, TypeScript `any` types in message handlers.

**Source:** [WebSocket Security: How to prevent 9 common vulnerabilities](https://ably.com/topic/websocket-security)

### Pitfall 3: Reconnection Storms (Thundering Herd)

**What goes wrong:** Server restart causes thousands of clients to reconnect simultaneously → Server overload.

**Why it happens:** Clients retry immediately or at same interval, creating synchronized load spike.

**How to avoid:**
```typescript
// Client-side: Use jittered exponential backoff
useWebSocket(url, {
  autoReconnect: {
    retries: 5,
    delay: 1000, // Can also be a function for exponential backoff
    onFailed() {
      // After max retries, wait random interval before next attempt
      setTimeout(() => open(), Math.random() * 30000);
    }
  }
});
```

**Warning signs:** Server CPU spikes on restart, connection accept queue fills up.

**Source:** [Deal with Reconnection Storm — Two Strategies](https://amirsoleimani.medium.com/deal-with-reconnection-storm-two-strategies-4a835d0457f6)

### Pitfall 4: Memory Leaks from Abandoned Rooms

**What goes wrong:** Rooms stay in memory forever after all players disconnect → Memory grows unbounded.

**Why it happens:** No cleanup logic for empty rooms.

**How to avoid:**
```typescript
class RoomManager {
  private rooms = new Map<string, Room>();

  removePlayer(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.removePlayer(playerId);

    // Clean up empty rooms
    if (room.isEmpty()) {
      this.rooms.delete(roomCode);
      console.log(`Room ${roomCode} cleaned up (empty)`);
    }
  }
}
```

**Warning signs:** Memory usage grows over time, `rooms` Map size increases indefinitely.

**Source:** Common multiplayer game server pattern, documented in [Building a Real-Time Multiplayer Game Server](https://dev.to/dowerdev/building-a-real-time-multiplayer-game-server-with-socketio-and-redis-architecture-and-583m)

### Pitfall 5: Race Conditions on Room Join

**What goes wrong:** Two players join simultaneously when only one slot available → Room has 5 players (exceeds max 4).

**Why it happens:** Non-atomic check-then-add operations.

**How to avoid:**
```typescript
class Room {
  addPlayer(playerId: string, nickname: string): boolean {
    // Atomic check and add
    if (this.players.size >= 4) {
      return false; // Room full
    }

    this.players.set(playerId, { nickname });

    // Double-check after add (defensive)
    if (this.players.size > 4) {
      this.players.delete(playerId);
      return false;
    }

    return true;
  }
}
```

**Warning signs:** Rooms occasionally exceed max players, race condition errors in logs.

**Source:** Standard concurrency pattern for multiplayer games

### Pitfall 6: Unhandled WebSocket Backpressure

**What goes wrong:** Sending too many messages to slow clients → Memory builds up, connection drops.

**Why it happens:** Not checking `.send()` return value or handling backpressure.

**How to avoid:**
```typescript
// Bun's .send() returns number indicating backpressure
websocket: {
  message(ws, message) {
    const result = ws.send(message);

    if (result === -1) {
      // Backpressure: message queued but socket is slow
      console.warn('Backpressure detected, slowing down');
    } else if (result === 0) {
      // Connection issue: message dropped
      console.error('Message dropped due to connection issue');
    }
    // result > 0: bytes sent successfully
  },

  drain(ws) {
    // Called when socket is ready to receive more data after backpressure
    console.log('Backpressure cleared');
  }
}
```

**Warning signs:** Connections drop under high message volume, memory usage spikes.

**Source:** [Bun WebSocket Documentation - Backpressure](https://bun.sh/docs/api/websockets)

### Pitfall 7: Forgetting to Unsubscribe on Disconnect

**What goes wrong:** Player disconnects but remains subscribed to room topic → Ghost player receives messages.

**Why it happens:** No cleanup in `close` handler.

**How to avoid:**
```typescript
websocket: {
  close(ws) {
    const { roomCode, playerId } = ws.data;

    // Unsubscribe from room topic
    ws.unsubscribe(`room:${roomCode}`);

    // Remove player from room state
    roomManager.removePlayer(roomCode, playerId);

    // Notify other players
    server.publish(`room:${roomCode}`, JSON.stringify({
      type: 'PLAYER_LEFT',
      playerId
    }));
  }
}
```

**Warning signs:** `server.publish()` sends to disconnected sockets, subscription count grows over time.

**Source:** [Bun WebSocket Documentation - Pub/Sub](https://bun.sh/docs/api/websockets)

## Code Examples

Verified patterns from official sources:

### Server Setup with WebSocket Upgrade

```typescript
// Source: https://bun.sh/docs/api/websockets

type WebSocketData = {
  playerId: string;
  roomCode: string;
  nickname: string;
  isHost: boolean;
};

const server = Bun.serve({
  port: 3000,

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      // Validate origin
      const origin = req.headers.get('origin');
      const allowed = ['http://localhost:5173'];
      if (origin && !allowed.includes(origin)) {
        return new Response('Forbidden', { status: 403 });
      }

      // Extract connection params from query
      const roomCode = url.searchParams.get('roomCode');
      const nickname = url.searchParams.get('nickname');

      // Upgrade with contextual data
      const success = server.upgrade(req, {
        data: {
          playerId: generatePlayerId(),
          roomCode: roomCode || '',
          nickname: nickname || '',
          isHost: false,
        }
      });

      return success ? undefined : new Response('Upgrade failed', { status: 500 });
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    data: {} as WebSocketData,

    open(ws) {
      console.log(`Player ${ws.data.playerId} connected`);
    },

    message(ws, message) {
      // Validate and handle messages
    },

    close(ws) {
      // Cleanup
    },

    // Configure timeouts
    idleTimeout: 120, // 2 minutes
    maxPayloadLength: 1024 * 1024, // 1 MB
  }
});
```

### Client WebSocket Connection

```typescript
// Source: https://vueuse.org/core/useWebSocket/
// packages/client/src/composables/useGameSocket.ts

import { useWebSocket } from '@vueuse/core';
import { ref, computed } from 'vue';

export function useGameSocket() {
  const roomCode = ref<string | null>(null);
  const nickname = ref<string>('');

  const wsUrl = computed(() => {
    if (!roomCode.value || !nickname.value) return null;
    return `ws://localhost:3000/ws?roomCode=${roomCode.value}&nickname=${nickname.value}`;
  });

  const { status, data, send, open, close } = useWebSocket(wsUrl, {
    immediate: false, // Don't connect until we have roomCode + nickname
    autoReconnect: {
      retries: 3,
      delay: 1000,
    },
    heartbeat: {
      message: JSON.stringify({ type: 'PING' }),
      interval: 30000,
    },
    onMessage(ws, event) {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    },
    onConnected() {
      console.log('Connected to game server');
    },
    onDisconnected() {
      console.log('Disconnected from game server');
    }
  });

  return { status, send, open, close, roomCode, nickname };
}
```

### Shared Message Types with Zod

```typescript
// Source: https://github.com/colinhacks/zod
// packages/shared/src/schemas/messages.ts

import { z } from 'zod';

// Nickname validation (reused across messages)
const NicknameSchema = z.string().min(1).max(20).trim();

// Client → Server messages
export const CreateRoomMessageSchema = z.object({
  type: z.literal('CREATE_ROOM'),
  nickname: NicknameSchema,
});

export const JoinRoomMessageSchema = z.object({
  type: z.literal('JOIN_ROOM'),
  roomCode: z.string().length(6).toUpperCase(),
  nickname: NicknameSchema,
});

export const StartGameMessageSchema = z.object({
  type: z.literal('START_GAME'),
});

export const LeaveRoomMessageSchema = z.object({
  type: z.literal('LEAVE_ROOM'),
});

// Discriminated union for type-safe handling
export const ClientMessageSchema = z.discriminatedUnion('type', [
  CreateRoomMessageSchema,
  JoinRoomMessageSchema,
  StartGameMessageSchema,
  LeaveRoomMessageSchema,
]);

// Server → Client messages
export const RoomCreatedMessageSchema = z.object({
  type: z.literal('ROOM_CREATED'),
  roomCode: z.string(),
});

export const PlayerJoinedMessageSchema = z.object({
  type: z.literal('PLAYER_JOINED'),
  player: z.object({
    id: z.string(),
    nickname: z.string(),
    isHost: z.boolean(),
  }),
});

export const GameStartingMessageSchema = z.object({
  type: z.literal('GAME_STARTING'),
  countdown: z.number(),
});

export const ErrorMessageSchema = z.object({
  type: z.literal('ERROR'),
  message: z.string(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  RoomCreatedMessageSchema,
  PlayerJoinedMessageSchema,
  GameStartingMessageSchema,
  ErrorMessageSchema,
]);

// Infer TypeScript types
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
```

### Room State Management

```typescript
// packages/server/src/rooms/Room.ts

export class Room {
  public readonly code: string;
  private players = new Map<string, Player>();
  private hostId: string;
  private state: 'waiting' | 'countdown' | 'playing' = 'waiting';
  private createdAt = Date.now();

  constructor(code: string, hostId: string, hostNickname: string) {
    this.code = code;
    this.hostId = hostId;
    this.players.set(hostId, {
      id: hostId,
      nickname: hostNickname,
      isHost: true,
      joinedAt: Date.now(),
    });
  }

  addPlayer(playerId: string, nickname: string): boolean {
    // Validate room state
    if (this.state !== 'waiting') return false;
    if (this.players.size >= 4) return false;
    if (this.players.has(playerId)) return false;

    this.players.set(playerId, {
      id: playerId,
      nickname,
      isHost: false,
      joinedAt: Date.now(),
    });

    return true;
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);

    // If host leaves, close room or promote new host
    if (playerId === this.hostId && this.players.size > 0) {
      // Promote first joined player to host
      const newHost = Array.from(this.players.values())[0];
      this.hostId = newHost.id;
      newHost.isHost = true;
    }
  }

  startGame(requesterId: string): boolean {
    if (requesterId !== this.hostId) return false;
    if (this.players.size < 2) return false;
    if (this.state !== 'waiting') return false;

    this.state = 'countdown';
    return true;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }
}
```

### Room Code Generation

```typescript
// Source: https://github.com/ai/nanoid
// packages/server/src/rooms/RoomManager.ts

import { customAlphabet } from 'nanoid';

// Alphabet excludes confusable characters: 0/O, 1/I/L, 5/S
const ALPHABET = '234679ABCDEFGHJKLMNPQRTUVWXYZ';
const generateRoomCode = customAlphabet(ALPHABET, 6);

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(hostId: string, hostNickname: string): string {
    let roomCode: string;

    // Ensure uniqueness (collision extremely rare with 6 chars)
    do {
      roomCode = generateRoomCode();
    } while (this.rooms.has(roomCode));

    const room = new Room(roomCode, hostId, hostNickname);
    this.rooms.set(roomCode, room);

    return roomCode;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  removePlayer(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.removePlayer(playerId);

    // Clean up empty rooms
    if (room.isEmpty()) {
      this.rooms.delete(roomCode);
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Socket.IO for all WebSocket needs | Native WebSocket with Bun/browser APIs | 2021-2024 | Smaller bundles, simpler code, Bun's native impl is 7x faster |
| Manual TypeScript types for messages | Zod schemas with inferred types | 2020-present | Runtime + compile-time safety, less boilerplate, auto-sync types |
| Redis pub/sub for all room broadcasting | Native pub/sub for single-server, Redis for multi-server | 2023-2024 | Bun's built-in pub/sub eliminates dependency for simple cases |
| Manual reconnection logic | Library-provided auto-reconnect (VueUse, etc.) | 2020-present | More reliable, handles edge cases (jitter, max retries) |
| UUID for all IDs | Nanoid for user-facing short codes | 2019-present | Shorter, customizable alphabet, better UX for manual entry |
| Pinia stores for WebSocket state | Composables with `useWebSocket` | 2021-present | Lighter weight, better composition, less global state |

**Deprecated/outdated:**
- **Socket.IO for browser-to-server communication:** Still maintained but overkill for modern browsers with native WebSocket. Only needed for old browser fallbacks (polling) or advanced features like rooms with multiple servers.
- **shortid package:** No longer maintained, recommend Nanoid instead.
- **`Bun.serve<T>` generic for typing ws.data:** Deprecated due to TypeScript limitation. Use `data: {} as T` in websocket handler instead.

## Open Questions

Things that couldn't be fully resolved:

1. **Room cleanup timing**
   - What we know: Rooms should be cleaned up when empty
   - What's unclear: Should there be a grace period for reconnection? (e.g., keep room alive for 30s after last player disconnects)
   - Recommendation: Start with immediate cleanup. Add grace period in future phase if users report issues with accidental disconnects. CONTEXT.md specifies "no room idle timeout" but that's for active lobbies, not empty ones.

2. **Shared link join flow**
   - What we know: User can share URL with room code embedded
   - What's unclear: URL structure (`/join?code=ABC123` vs `/room/ABC123`), whether URL auto-fills code or directly joins
   - Recommendation: Use `/join?code=ABC123` format that pre-fills the code but still requires nickname entry. Respects "nickname is entered once on landing page" decision.

3. **Heartbeat/ping-pong configuration**
   - What we know: VueUse supports heartbeat, Bun supports `sendPings` option
   - What's unclear: Optimal interval for card game (30s? 60s?), whether server should send pings or rely on client heartbeat
   - Recommendation: Use VueUse client heartbeat with 30s interval (standard for real-time apps). Enable Bun's `sendPings: true` (default) as backup.

4. **Error message specificity**
   - What we know: User decisions specify simple error messages ("Room is full" / "Game already started")
   - What's unclear: Should errors distinguish between "room doesn't exist" vs "invalid room code format"?
   - Recommendation: Keep it simple: "Room not found" covers both cases. Prevents information leakage about which rooms exist.

## Sources

### Primary (HIGH confidence)

- [Bun WebSocket Documentation](https://bun.sh/docs/api/websockets) - Official Bun docs, WebSocket API reference
- [VueUse useWebSocket](https://vueuse.org/core/useWebSocket/) - Official VueUse composable documentation
- [Zod GitHub](https://github.com/colinhacks/zod) - Official Zod repository and examples
- [Nanoid GitHub](https://github.com/ai/nanoid) - Official Nanoid repository
- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html) - Security best practices

### Secondary (MEDIUM confidence)

- [How to Build WebSocket Servers with Bun](https://oneuptime.com/blog/post/2026-01-31-bun-websocket-servers/view) - Recent 2026 guide
- [Building Type-Safe WebSocket Applications with Bun and Zod](https://medium.com/@koistya/building-type-safe-websocket-applications-with-bun-and-zod-f0aef259a53e) - Community pattern
- [Building a Real-Time Multiplayer Game Server](https://dev.to/dowerdev/building-a-real-time-multiplayer-game-server-with-socketio-and-redis-architecture-and-583m) - Multiplayer patterns
- [WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view) - Recent 2026 guide
- [WebSocket Security | Heroku](https://devcenter.heroku.com/articles/websocket-security) - Platform security guide

### Tertiary (LOW confidence)

- [Comparing UUID, CUID, and Nanoid](https://dev.to/turck/comparing-uuid-cuid-and-nanoid-a-developers-guide-50c) - Community comparison
- [Vue 3 Composables Best Practices](https://learnwebcraft.com/learn/vuejs/vue-3-composables) - Tutorial site
- [WebSocket Use Cases in System Design](https://blog.algomaster.io/p/websocket-use-cases-system-design) - General overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are official, well-documented, and widely adopted
- Architecture patterns: HIGH - Bun pub/sub, VueUse, and Zod patterns verified with official documentation
- Pitfalls: MEDIUM-HIGH - Security pitfalls from OWASP (HIGH), implementation pitfalls from community sources (MEDIUM)

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days) - Stack is stable, Bun WebSocket API is mature
