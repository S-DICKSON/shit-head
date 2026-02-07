# Phase 2: WebSocket Infrastructure & Room Management - Research

**Researched:** 2026-02-07
**Domain:** Real-time WebSocket communication, room management, multiplayer game architecture
**Confidence:** HIGH

## Summary

This phase implements real-time WebSocket infrastructure for a multiplayer card game using Bun's native WebSocket API. Research reveals that Bun provides a performant, type-safe WebSocket implementation (7x throughput vs Node.js alternatives) with built-in pub/sub capabilities that map directly to room broadcasting needs. The standard approach uses: (1) Bun's native WebSocket server with typed data contexts, (2) nanoid for collision-free room code generation, (3) in-memory Map-based room state management with server-authoritative validation, and (4) Zod for runtime message validation paired with TypeScript discriminated unions for type-safe event handling.

Key architectural insight: Bun's handler-per-server design (not per-connection) reduces memory overhead for concurrent connections, making it ideal for multiplayer lobbies. The pub/sub API provides natural room isolation without external dependencies like Redis (though Redis becomes necessary for horizontal scaling beyond single-instance deployment).

**Primary recommendation:** Use Bun's native WebSocket API with typed data contexts, implement discriminated union message types validated with Zod, manage rooms in-memory with Map<roomCode, RoomState>, and leverage Bun's pub/sub for room-scoped broadcasts.

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

**Technical Implementation Choices:**
- Room code format and length (user wants balance between usability and uniqueness)
- Shared link join flow (auto-fill code vs direct to nickname entry)
- Exact UI layout and spacing
- WebSocket message protocol design
- Room state management architecture
- Error state handling beyond the specified cases

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

The established libraries/tools for WebSocket room management in Bun:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun native WebSocket | Built-in | WebSocket server with pub/sub | 7x throughput vs Node.js, native TypeScript, built-in pub/sub for room broadcasts, no external dependencies |
| nanoid | ^5.0.0 | Short unique ID generation | Industry standard (60% faster than UUID), URL-safe, 21-char default with UUID-equivalent collision resistance, tiny bundle (118 bytes) |
| zod | ^3.23.0 | Runtime schema validation | TypeScript-first validation, automatic type inference, zero dependencies, standard for WebSocket message validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/bun | latest | TypeScript definitions for Bun | Already in project (devDependency in server package) |
| ws (client) | ^8.18.0 | WebSocket client for testing | Integration tests that simulate client connections (Vitest compatible) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bun WebSocket | Socket.io | Socket.io adds 50KB+ bundle, fallback transport (not needed for modern browsers), auto-reconnect (add manually if needed). Use Bun for simplicity and performance. |
| nanoid | UUID v4 | UUIDs are 36 chars vs nanoid's 21 for equivalent collision safety. Use UUID only if external systems require RFC-compliant UUIDs. |
| nanoid | sqids | Sqids encodes sequential IDs (reveals room count). Use only if you need reversible encoding of database IDs. Nanoid preferred for privacy. |
| Zod | Valibot | Valibot is 90% smaller bundle but less mature ecosystem. Use Zod unless bundle size is critical (not an issue for Bun server). |
| In-memory Map | Redis | Redis adds deployment complexity and is overkill for single-instance deployment. Add Redis only when horizontally scaling (Phase 6+). |

**Installation:**
```bash
# In packages/server
bun add nanoid zod

# For testing (devDependencies)
bun add -d ws @types/ws
```

## Architecture Patterns

### Recommended Project Structure

```
packages/server/src/
├── index.ts              # Main server entry (Bun.serve)
├── websocket/
│   ├── handler.ts        # WebSocket handler implementation (open, message, close)
│   ├── rooms.ts          # Room state management (Map<code, Room>)
│   └── messages.ts       # Message type definitions (Zod schemas + TS types)
├── types/
│   └── websocket.ts      # WebSocket data context types
└── utils/
    └── room-codes.ts     # Room code generation (nanoid wrapper)

packages/shared/src/
├── types/
│   └── messages.ts       # Shared message type definitions (for client+server)
└── schemas/
    └── messages.ts       # Shared Zod schemas (for validation on both ends)
```

**Rationale:** Shared package contains message contracts consumed by both client and server. Server owns room state management and WebSocket handler logic. This structure supports the existing Bun workspace with no build step for shared package (TypeScript resolved natively).

### Pattern 1: Typed WebSocket Data Context

**What:** Attach typed metadata to each WebSocket connection during upgrade for access throughout the socket's lifetime.

**When to use:** Store per-connection state (user ID, room code, nickname) that handlers need without external lookups.

**Example:**
```typescript
// Source: https://bun.com/docs/api/websockets
type WebSocketData = {
  playerId: string;      // nanoid-generated unique player ID
  roomCode: string | null; // null until joined/created a room
  nickname: string;
};

const server = Bun.serve<WebSocketData>({
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      const success = server.upgrade(req, {
        data: {
          playerId: nanoid(),
          roomCode: null,
          nickname: '', // Set when player sends JOIN or CREATE
        }
      });

      return success ? undefined : new Response('Upgrade failed', { status: 500 });
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      console.log(`Player ${ws.data.playerId} connected`);
    },

    message(ws, message) {
      // ws.data is properly typed as WebSocketData
      console.log(`Message from ${ws.data.nickname} in room ${ws.data.roomCode}`);
    },

    close(ws) {
      // Clean up room membership using ws.data.roomCode
    },
  },
});
```

### Pattern 2: Pub/Sub for Room Broadcasting

**What:** Use Bun's native pub/sub to broadcast messages to all players in a room.

**When to use:** Any event that all room members need to see (player joined, player left, game starting, etc.)

**Example:**
```typescript
// Source: https://bun.com/docs/api/websockets
websocket: {
  open(ws) {
    // Subscribe to room-specific topic when player joins
    const roomTopic = `room:${ws.data.roomCode}`;
    ws.subscribe(roomTopic);

    // Notify others that player joined (excludes sender)
    ws.publish(roomTopic, JSON.stringify({
      type: 'PLAYER_JOINED',
      nickname: ws.data.nickname,
      playerId: ws.data.playerId,
    }));
  },

  message(ws, message) {
    const msg = JSON.parse(message as string);

    if (msg.type === 'START_GAME') {
      const roomTopic = `room:${ws.data.roomCode}`;

      // Broadcast to all subscribers (use server.publish to include sender)
      server.publish(roomTopic, JSON.stringify({
        type: 'GAME_STARTING',
        countdown: 3,
      }));
    }
  },

  close(ws) {
    // Automatically unsubscribed on close
    const roomTopic = `room:${ws.data.roomCode}`;
    ws.publish(roomTopic, JSON.stringify({
      type: 'PLAYER_LEFT',
      playerId: ws.data.playerId,
    }));
  },
}
```

**Key insight:** `ws.publish()` excludes the sender (use for player actions). `server.publish()` includes all subscribers (use for authoritative server announcements).

### Pattern 3: Discriminated Unions for Type-Safe Messages

**What:** Use TypeScript discriminated unions with a `type` field to model all possible WebSocket messages.

**When to use:** Ensures exhaustive handling of all message types at compile time, prevents missing handlers.

**Example:**
```typescript
// Source: TypeScript discriminated unions pattern
// packages/shared/src/types/messages.ts

// Client -> Server messages
type ClientMessage =
  | { type: 'CREATE_ROOM'; nickname: string }
  | { type: 'JOIN_ROOM'; roomCode: string; nickname: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'START_GAME' };

// Server -> Client messages
type ServerMessage =
  | { type: 'ROOM_CREATED'; roomCode: string; playerId: string }
  | { type: 'ROOM_JOINED'; roomCode: string; players: Player[] }
  | { type: 'PLAYER_JOINED'; nickname: string; playerId: string }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'GAME_STARTING'; countdown: number }
  | { type: 'ERROR'; message: string; code: ErrorCode };

// Handler with exhaustive type checking
function handleClientMessage(ws: ServerWebSocket<WebSocketData>, msg: ClientMessage) {
  switch (msg.type) {
    case 'CREATE_ROOM':
      // TypeScript knows msg.nickname exists here
      return handleCreateRoom(ws, msg.nickname);

    case 'JOIN_ROOM':
      // TypeScript knows msg.roomCode and msg.nickname exist
      return handleJoinRoom(ws, msg.roomCode, msg.nickname);

    case 'LEAVE_ROOM':
      return handleLeaveRoom(ws);

    case 'START_GAME':
      return handleStartGame(ws);

    default:
      // Exhaustiveness check - will error if a case is missing
      const exhaustive: never = msg;
      return exhaustive;
  }
}
```

### Pattern 4: Runtime Validation with Zod

**What:** Define Zod schemas that validate incoming messages and infer TypeScript types.

**When to use:** All WebSocket message handling to prevent malformed/malicious data from causing runtime errors.

**Example:**
```typescript
// Source: Zod WebSocket validation patterns
// packages/shared/src/schemas/messages.ts
import { z } from 'zod';

const createRoomSchema = z.object({
  type: z.literal('CREATE_ROOM'),
  nickname: z.string().min(1).max(20),
});

const joinRoomSchema = z.object({
  type: z.literal('JOIN_ROOM'),
  roomCode: z.string().length(6), // Assuming 6-char codes
  nickname: z.string().min(1).max(20),
});

const clientMessageSchema = z.discriminatedUnion('type', [
  createRoomSchema,
  joinRoomSchema,
  z.object({ type: z.literal('LEAVE_ROOM') }),
  z.object({ type: z.literal('START_GAME') }),
]);

// Infer TypeScript type from Zod schema
export type ClientMessage = z.infer<typeof clientMessageSchema>;

// packages/server/src/websocket/handler.ts
websocket: {
  message(ws, message) {
    try {
      const parsed = JSON.parse(message as string);
      const validated = clientMessageSchema.parse(parsed);

      // validated is now type-safe ClientMessage
      handleClientMessage(ws, validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format',
          code: 'VALIDATION_ERROR',
        }));
      }
    }
  },
}
```

### Pattern 5: In-Memory Room State Management

**What:** Use a Map to store room state server-side as the authoritative source of truth.

**When to use:** Single-instance deployments (Phase 2). Replace with Redis for horizontal scaling (Phase 6+).

**Example:**
```typescript
// Source: In-memory state management patterns
// packages/server/src/websocket/rooms.ts
import { nanoid } from 'nanoid';

interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
}

interface Room {
  code: string;
  players: Map<string, Player>; // playerId -> Player
  state: 'LOBBY' | 'STARTING' | 'PLAYING';
  createdAt: number;
}

const rooms = new Map<string, Room>();

export function createRoom(hostId: string, nickname: string): string {
  const code = generateRoomCode();

  rooms.set(code, {
    code,
    players: new Map([[hostId, { id: hostId, nickname, isHost: true }]]),
    state: 'LOBBY',
    createdAt: Date.now(),
  });

  return code;
}

export function joinRoom(roomCode: string, playerId: string, nickname: string): Room | null {
  const room = rooms.get(roomCode);

  if (!room) return null; // Room doesn't exist
  if (room.state !== 'LOBBY') return null; // Game already started
  if (room.players.size >= 4) return null; // Room full

  room.players.set(playerId, { id: playerId, nickname, isHost: false });
  return room;
}

export function leaveRoom(roomCode: string, playerId: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.delete(playerId);

  // Delete room if empty or host left
  const wasHost = room.players.has(playerId) && room.players.get(playerId)!.isHost;
  if (room.players.size === 0 || wasHost) {
    rooms.delete(roomCode);
  }
}

function generateRoomCode(): string {
  // Generate unique 6-char uppercase code
  const code = nanoid(6).toUpperCase();

  // Ensure uniqueness (extremely rare collision with nanoid)
  return rooms.has(code) ? generateRoomCode() : code;
}
```

**Note on WeakMap:** Research found WeakMap useful for DOM node metadata, but not applicable here (room codes are strings, not objects; we need explicit room lifecycle control, not garbage collection).

### Anti-Patterns to Avoid

- **Storing room state in WebSocket data context:** This creates inconsistent views across connections. Room state must live in a shared Map accessible to all connections.

- **Broadcasting to all connections instead of using pub/sub:** Iterating all sockets and checking room membership is O(n) per message. Pub/sub is O(1) with topic-based filtering.

- **Trusting client-provided player IDs:** Always generate player IDs server-side during upgrade to prevent impersonation.

- **Forgetting to unsubscribe on leave/disconnect:** Leads to ghost subscriptions and messages sent to closed connections (Bun auto-unsubscribes on close, but explicit leave needs manual unsubscribe).

- **Using Math.random() for room codes:** Not cryptographically secure. Use nanoid which uses hardware random generator (Crypto.getRandomValues).

- **Parsing JSON without try/catch:** Malformed JSON crashes the handler. Always wrap JSON.parse and validate with Zod.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique short IDs | Custom random alphanumeric generator with collision checks | nanoid | Handles collision resistance (126 random bits), URL-safe alphabet, profanity filtering, cryptographic randomness. Custom solutions miss edge cases (birthday paradox, weak randomness). |
| Message validation | Manual property checks and type guards | Zod schemas with discriminated unions | Zod provides automatic TypeScript inference, detailed error messages, composable schemas, and runtime safety. Manual validation is verbose and error-prone. |
| WebSocket reconnection | Custom ping/pong heartbeat logic | Built-in idleTimeout + client library with exponential backoff | Bun's idleTimeout (default 120s) handles server-side cleanup. Client reconnection needs exponential backoff with jitter to prevent thundering herd. Don't build from scratch. |
| Room code profanity filtering | Custom word list checks | nanoid's default alphabet (no vowels = fewer words) or nanoid-dictionary | Profanity detection is hard (unicode, leetspeak, cultural differences). Nanoid's consonant-heavy alphabet naturally avoids most issues. |

**Key insight:** WebSocket infrastructure has well-documented pitfalls (backpressure, reconnection storms, memory leaks). Bun's built-in features (pub/sub, idleTimeout, backpressure limits) handle these better than custom solutions.

## Common Pitfalls

### Pitfall 1: Not Handling Backpressure

**What goes wrong:** When clients are slow to consume messages (slow network, frozen browser tab), the server's send buffer fills up. Without checking `.send()` return values, memory usage grows unbounded and eventually crashes the server.

**Why it happens:** WebSocket `.send()` is non-blocking. If the client's receive buffer is full, Bun queues the message. Developers assume send always succeeds immediately.

**How to avoid:**
- Check `.send()` return value: `-1` means backpressure (message queued), `0` means connection closed, `1+` means bytes sent
- Configure `backpressureLimit` (default 1MB) to control buffer size
- For high-frequency updates (game state), skip stale updates if backpressure is detected

**Warning signs:** Memory usage growing over time, slow clients causing server slowdown, WebSocket close with code 1009 (message too big)

**Example:**
```typescript
// Source: Bun backpressure handling documentation
websocket: {
  message(ws, message) {
    const response = JSON.stringify({ type: 'ACK' });
    const result = ws.send(response);

    if (result === -1) {
      console.warn(`Backpressure for player ${ws.data.playerId}`);
      // Option 1: Skip this update (acceptable for frequent game state)
      // Option 2: Close slow connections after threshold
      // Option 3: Reduce update frequency for this client
    } else if (result === 0) {
      console.error(`Failed to send to ${ws.data.playerId} - connection closed`);
    }
  }
}
```

### Pitfall 2: Connection Lifecycle Mismanagement

**What goes wrong:** Not cleaning up resources on disconnect leads to memory leaks (room state retaining disconnected players), ghost subscriptions (messages sent to closed sockets), and stale room listings.

**Why it happens:** Developers implement `open` and `message` handlers but forget robust `close` handling, assuming clients will send graceful "LEAVE_ROOM" messages. Network failures and browser closes bypass application-level leave messages.

**How to avoid:**
- Always implement `close` handler to clean up room membership
- Don't rely on application-level "LEAVE" messages for cleanup (they're hints, not guarantees)
- Use idleTimeout (default 120s) to detect zombies
- Remove empty rooms or host-abandoned rooms immediately

**Warning signs:** Room list growing indefinitely, player count in UI doesn't match server state, memory usage growing with connection churn

**Example:**
```typescript
// Source: WebSocket lifecycle best practices
websocket: {
  close(ws, code, message) {
    const { playerId, roomCode, nickname } = ws.data;

    if (roomCode) {
      // Remove player from room
      leaveRoom(roomCode, playerId);

      // Notify remaining players
      ws.publish(`room:${roomCode}`, JSON.stringify({
        type: 'PLAYER_LEFT',
        playerId,
      }));

      console.log(`Player ${nickname} disconnected from room ${roomCode} (code: ${code})`);
    }
  }
}
```

### Pitfall 3: Reconnection Storms

**What goes wrong:** Server restarts or network blips cause all clients to reconnect simultaneously. Without exponential backoff and jitter, thousands of clients hammer the server in sync, preventing recovery.

**Why it happens:** Clients detect disconnect and immediately reconnect. If all clients disconnect at the same moment (server crash), they all reconnect at the same moment.

**How to avoid:**
- Client-side: Implement exponential backoff (1s, 2s, 4s, 8s, up to max like 30s)
- Client-side: Add random jitter (e.g., ±25% of delay) to spread reconnection attempts
- Server-side: Rate limit WebSocket upgrades per IP to detect storms
- Server-side: Provide "server busy" response (503) to slow clients when overloaded

**Warning signs:** CPU spike after deployment, "thundering herd" in logs, legitimate connections failing during recovery

**Example:**
```typescript
// Source: Exponential backoff pattern for WebSocket reconnection
// Client-side (packages/client/src/websocket.ts)
class ReconnectingWebSocket {
  private attempt = 0;
  private maxDelay = 30000; // 30 seconds
  private baseDelay = 1000; // 1 second

  private async reconnect() {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt),
      this.maxDelay
    );

    // Add jitter: ±25%
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    const actualDelay = delay + jitter;

    console.log(`Reconnecting in ${actualDelay}ms (attempt ${this.attempt + 1})`);
    await new Promise(resolve => setTimeout(resolve, actualDelay));

    this.attempt++;
    this.connect();
  }

  private onClose() {
    // Don't reconnect if closed intentionally
    if (this.shouldReconnect) {
      this.reconnect();
    }
  }

  private onOpen() {
    // Reset backoff on successful connection
    this.attempt = 0;
  }
}
```

### Pitfall 4: Race Conditions with Room State Updates

**What goes wrong:** Two players try to join the same full room simultaneously. Both read "3/4 players", both join, room now has 5/4 players. Or host clicks "Start Game" while another player leaves, leading to inconsistent state.

**Why it happens:** JavaScript is single-threaded but async. Between reading room state and updating it, another handler can run. Developers assume atomic operations.

**How to avoid:**
- Check room state immediately before mutation (don't cache room lookups)
- Perform check-and-update in a single function (JavaScript's event loop guarantees synchronous code is atomic)
- Validate state transitions (can't start game in 'PLAYING' state)
- Broadcast state changes immediately so clients stay in sync

**Warning signs:** Room player counts don't match UI, games starting with wrong player count, "room full" errors when room looks joinable

**Example:**
```typescript
// Source: Atomic state updates for room management
export function joinRoom(roomCode: string, playerId: string, nickname: string):
  { success: true; room: Room } | { success: false; reason: string } {

  const room = rooms.get(roomCode);

  // All validation happens synchronously before mutation
  if (!room) {
    return { success: false, reason: 'Room not found' };
  }

  if (room.state !== 'LOBBY') {
    return { success: false, reason: 'Game already started' };
  }

  if (room.players.size >= 4) {
    return { success: false, reason: 'Room is full' };
  }

  // Atomic update (no async between check and update)
  room.players.set(playerId, { id: playerId, nickname, isHost: false });

  return { success: true, room };
}
```

### Pitfall 5: Not Validating Client Input

**What goes wrong:** Client sends nickname: `"<script>alert('xss')</script>"` or roomCode: `"../../../../etc/passwd"`. Server blindly broadcasts or uses in operations, causing XSS, injection, or crashes.

**Why it happens:** Developers trust client data or assume browser validation is sufficient. Validation is only a UX hint; malicious actors bypass it.

**How to avoid:**
- Validate ALL incoming messages with Zod schemas
- Enforce length limits (nickname 1-20 chars, room code exactly 6 chars)
- Sanitize or reject special characters if broadcasting to web UI
- Use Zod's built-in string validators (.min(), .max(), .regex(), .email(), etc.)

**Warning signs:** Crashes on unexpected input, room codes with weird characters, player names breaking UI layout, security scans flagging injection vulnerabilities

**Example:**
```typescript
// Source: Zod validation for WebSocket security
const nicknameSchema = z.string()
  .min(1, 'Nickname required')
  .max(20, 'Nickname too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Nickname contains invalid characters');

const roomCodeSchema = z.string()
  .length(6, 'Room code must be 6 characters')
  .regex(/^[A-Z0-9]+$/, 'Invalid room code format');

const joinRoomSchema = z.object({
  type: z.literal('JOIN_ROOM'),
  roomCode: roomCodeSchema,
  nickname: nicknameSchema,
});

// In handler
websocket: {
  message(ws, message) {
    try {
      const parsed = JSON.parse(message as string);
      const validated = joinRoomSchema.parse(parsed);
      // validated.nickname and validated.roomCode are now safe
    } catch (error) {
      if (error instanceof z.ZodError) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: error.errors[0].message,
          code: 'VALIDATION_ERROR',
        }));
      }
    }
  }
}
```

## Code Examples

Verified patterns from official sources:

### Example 1: Complete WebSocket Server Setup

```typescript
// Source: https://bun.com/docs/api/websockets
// packages/server/src/index.ts
import type { ServerWebSocket } from 'bun';

type WebSocketData = {
  playerId: string;
  roomCode: string | null;
  nickname: string;
};

const server = Bun.serve<WebSocketData>({
  port: Number(process.env.PORT) || 3000,

  fetch(req, server) {
    const url = new URL(req.url);

    // Health check (already exists from Phase 1)
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req, {
        data: {
          playerId: nanoid(),
          roomCode: null,
          nickname: '',
        },
      });

      return upgraded ? undefined : new Response('Upgrade failed', { status: 500 });
    }

    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    // Handler options
    idleTimeout: 120, // Close after 120s of inactivity
    maxPayloadLength: 16 * 1024, // 16KB message limit
    backpressureLimit: 1024 * 1024, // 1MB buffer limit

    open(ws) {
      console.log(`Player ${ws.data.playerId} connected`);
    },

    message(ws, message) {
      // Handle incoming messages (validate, route, respond)
      handleMessage(ws, message);
    },

    close(ws, code, reason) {
      console.log(`Player ${ws.data.playerId} disconnected: ${code} ${reason}`);

      if (ws.data.roomCode) {
        leaveRoom(ws.data.roomCode, ws.data.playerId);
        ws.publish(`room:${ws.data.roomCode}`, JSON.stringify({
          type: 'PLAYER_LEFT',
          playerId: ws.data.playerId,
        }));
      }
    },

    drain(ws) {
      // Called when backpressure is relieved
      console.log(`Backpressure drained for ${ws.data.playerId}`);
    },
  },
});

console.log(`Server listening on port ${server.port}`);
```

### Example 2: Room Code Generation with Nanoid

```typescript
// Source: https://github.com/ai/nanoid
// packages/server/src/utils/room-codes.ts
import { customAlphabet } from 'nanoid';

// Custom alphabet: uppercase letters + numbers, no lookalikes (0/O, 1/I)
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 6);

export function generateRoomCode(): string {
  return nanoid(); // e.g., "3K7XP2"
}

// Collision probability calculation:
// With 32-char alphabet and 6-char length:
// Total possible codes = 32^6 = 1,073,741,824 (1 billion+)
// Birthday paradox: 50% collision at ~37,000 codes
// For typical game (hundreds of concurrent rooms), collision is negligible
```

**Rationale for 6 characters:** Balance between usability (easy to type/read) and uniqueness (1B+ possible codes). Research shows UUID-equivalent collision safety needs 21 chars with full alphabet, but reduced alphabet (32 chars) + shorter length (6) still provides sufficient uniqueness for game lobbies (hundreds of concurrent rooms, not millions of persistent records).

### Example 3: Testing WebSocket Handlers with Vitest

```typescript
// Source: WebSocket testing best practices + Vitest patterns
// packages/server/src/websocket/__tests__/rooms.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, leaveRoom, getRoomState } from '../rooms';

describe('Room Management', () => {
  beforeEach(() => {
    // Clear rooms before each test
    clearAllRooms();
  });

  test('creates room with host as first player', () => {
    const hostId = 'player-1';
    const nickname = 'Alice';

    const roomCode = createRoom(hostId, nickname);

    expect(roomCode).toHaveLength(6);

    const room = getRoomState(roomCode);
    expect(room).toBeDefined();
    expect(room!.players.size).toBe(1);
    expect(room!.players.get(hostId)).toEqual({
      id: hostId,
      nickname: 'Alice',
      isHost: true,
    });
    expect(room!.state).toBe('LOBBY');
  });

  test('allows up to 4 players to join', () => {
    const roomCode = createRoom('host', 'Host');

    const result1 = joinRoom(roomCode, 'p2', 'Player2');
    expect(result1?.players.size).toBe(2);

    const result2 = joinRoom(roomCode, 'p3', 'Player3');
    expect(result2?.players.size).toBe(3);

    const result3 = joinRoom(roomCode, 'p4', 'Player4');
    expect(result3?.players.size).toBe(4);

    // 5th player should be rejected
    const result4 = joinRoom(roomCode, 'p5', 'Player5');
    expect(result4).toBeNull();
  });

  test('prevents joining non-existent room', () => {
    const result = joinRoom('INVALID', 'p1', 'Player');
    expect(result).toBeNull();
  });

  test('deletes room when last player leaves', () => {
    const roomCode = createRoom('host', 'Host');
    joinRoom(roomCode, 'p2', 'Player2');

    leaveRoom(roomCode, 'p2');
    expect(getRoomState(roomCode)).toBeDefined();

    leaveRoom(roomCode, 'host');
    expect(getRoomState(roomCode)).toBeUndefined();
  });
});
```

### Example 4: Integration Test with Real WebSocket Client

```typescript
// Source: https://github.com/ITenthusiasm/testing-websockets
// packages/server/src/websocket/__tests__/integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

describe('WebSocket Integration', () => {
  let serverUrl: string;

  beforeAll(() => {
    // Assume server is running on port 3000 for tests
    serverUrl = 'ws://localhost:3000/ws';
  });

  test('client can create and join room', async () => {
    const client1 = new WebSocket(serverUrl);
    const client2 = new WebSocket(serverUrl);

    await new Promise<void>((resolve) => {
      let opened = 0;
      const onOpen = () => {
        opened++;
        if (opened === 2) resolve();
      };

      client1.on('open', onOpen);
      client2.on('open', onOpen);
    });

    // Client 1 creates room
    const createPromise = new Promise<string>((resolve) => {
      client1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ROOM_CREATED') {
          resolve(msg.roomCode);
        }
      });
    });

    client1.send(JSON.stringify({
      type: 'CREATE_ROOM',
      nickname: 'Alice',
    }));

    const roomCode = await createPromise;
    expect(roomCode).toHaveLength(6);

    // Client 2 joins room
    const joinPromise = new Promise<number>((resolve) => {
      client2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ROOM_JOINED') {
          resolve(msg.players.length);
        }
      });
    });

    client2.send(JSON.stringify({
      type: 'JOIN_ROOM',
      roomCode,
      nickname: 'Bob',
    }));

    const playerCount = await joinPromise;
    expect(playerCount).toBe(2);

    // Cleanup
    client1.close();
    client2.close();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Socket.io for all WebSocket needs | Bun native WebSocket for new projects | Bun 1.0 (Sep 2023) | Simpler stack (no external deps), 7x throughput, native TypeScript, built-in pub/sub. Socket.io still valid for browser fallbacks or Node.js. |
| Manual JSON validation with type guards | Zod schemas with type inference | Zod stable 2022, mainstream 2024+ | Single source of truth for types and validation, eliminates drift between runtime checks and TypeScript types. |
| Custom short ID generators | nanoid or UUID v7 | nanoid stable 2020, UUID v7 ratified 2024 | nanoid for random IDs (URL-safe, tiny bundle), UUID v7 for time-sortable IDs. Don't hand-roll ID generation. |
| In-memory state for multi-instance | Redis pub/sub from day 1 | Pragmatic shift 2024+ | Start simple (in-memory Map) for single instance. Add Redis only when scaling horizontally. Premature optimization wastes effort. |
| String message types checked with === | Discriminated unions with exhaustive checking | TypeScript 2.0+, best practice 2024+ | Compile-time guarantee all message types handled, autocomplete for message properties, refactor-safe. |

**Deprecated/outdated:**
- **hashids:** Renamed to sqids. Sqids is the maintained version with modern API.
- **shortid:** Unmaintained since 2018. Use nanoid instead (same use case, actively maintained).
- **ws library's custom room management:** Don't build custom Map<roomId, Set<WebSocket>>. Use Bun's pub/sub topics for natural room isolation.
- **Parsing cookies for WebSocket auth:** Use upgrade headers or query params. Cookie parsing is inconsistent across browsers for WebSocket upgrades.

## Open Questions

Things that couldn't be fully resolved:

1. **Shared URL behavior (auto-fill vs direct to lobby)**
   - What we know: User left this to Claude's discretion. Both patterns exist in the wild.
   - What's unclear: Whether query param (?room=ABC123) should auto-fill code input or bypass landing page entirely.
   - Recommendation: Auto-fill is safer (gives player chance to review/edit). Direct join is faster UX. Suggest auto-fill for Phase 2, gather feedback, add direct join later if requested.

2. **Room cleanup on server restart**
   - What we know: In-memory Map means all rooms lost on restart. No persistence in Phase 2.
   - What's unclear: Should server persist rooms to disk/DB for crash recovery?
   - Recommendation: Accept ephemeral rooms for Phase 2. User said "no idle timeout" but didn't address restart behavior. Rooms lost on restart is acceptable for MVP (players recreate room). Add persistence in Phase 4+ if needed.

3. **Nickname uniqueness within a room**
   - What we know: User said "basic length limit, no complex rules" and wants simple nickname handling.
   - What's unclear: Can two players in the same room have the same nickname?
   - Recommendation: Allow duplicates for Phase 2 simplicity (display player IDs in UI if needed for disambiguation). Enforce uniqueness later if it causes confusion.

4. **Client reconnection after network blip**
   - What we know: User didn't specify reconnection behavior. No "session resume" mentioned.
   - What's unclear: Should client auto-reconnect and rejoin room? Or require manual refresh and rejoin?
   - Recommendation: Phase 2 doesn't implement auto-reconnect (simplicity). Player must manually rejoin room after disconnect. Add reconnection in Phase 3+ with session tokens.

5. **WebSocket message compression**
   - What we know: Bun supports per-message deflate compression. Disabled by default.
   - What's unclear: Should Phase 2 enable compression? Tradeoff is CPU vs bandwidth.
   - Recommendation: Leave disabled for Phase 2 (simpler, local dev doesn't need compression). Enable in production if bandwidth costs are high (unlikely for small JSON messages and low player count).

## Sources

### Primary (HIGH confidence)

- [Bun WebSocket API Documentation](https://bun.com/docs/api/websockets) - Official API reference for Bun's native WebSocket implementation
- [Bun WebSocket Guide](https://bun.com/guides/websocket/simple) - Official guide for building WebSocket servers
- [How to Build WebSocket Servers with Bun](https://oneuptime.com/blog/post/2026-01-31-bun-websocket-servers/view) - Recent 2026 best practices
- [nanoid GitHub Repository](https://github.com/ai/nanoid) - Official nanoid documentation and API
- [Zod GitHub Repository](https://github.com/colinhacks/zod) - Official Zod schema validation library
- [Zod Documentation](https://zod.dev/) - Official Zod docs with examples

### Secondary (MEDIUM confidence)

- [Building a Real-Time Multiplayer Game Server with Socket.io and Redis](https://dev.to/dowerdev/building-a-real-time-multiplayer-game-server-with-socketio-and-redis-architecture-and-583m) - Multiplayer architecture patterns (verified with multiple sources)
- [WebSocket Rooms: Complete Guide](https://copyprogramming.com/howto/how-to-make-a-room-on-websocket) - Room management patterns
- [Sqids - Generate Short Unique IDs](https://sqids.org/) - Short ID generation (alternative to nanoid)
- [Type-safe WebSocket Applications with Bun and Zod](https://medium.com/@koistya/building-type-safe-websocket-applications-with-bun-and-zod-f0aef259a53e) - Zod + Bun patterns (title referenced, content blocked)
- [bun-ws-router](https://github.com/kriasoft/bun-ws-router) - Type-safe routing library demonstrating Zod + Bun patterns
- [TypeScript Discriminated Unions](https://www.fullstory.com/blog/discriminated-unions-and-exhaustiveness-checking-in-typescript/) - Exhaustive type checking patterns
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) - WeakMap vs Map for state management
- [How to Implement Reconnection Logic for WebSockets](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view) - Exponential backoff patterns
- [Backpressure in WebSocket Streams](https://skylinecodes.substack.com/p/backpressure-in-websocket-streams) - Backpressure handling deep dive
- [Writing Integration Tests for WebSocket Servers](https://thomason-isaiah.medium.com/writing-integration-tests-for-websocket-servers-using-jest-and-ws-8e5c61726b2a) - Vitest/Jest testing patterns
- [testing-websockets GitHub](https://github.com/ITenthusiasm/testing-websockets) - WebSocket testing examples

### Tertiary (LOW confidence)

- WebSearch results for ecosystem discovery (cross-referenced with official docs where possible)
- Community blog posts on multiplayer game patterns (used for patterns, not technical details)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Bun docs, established libraries with stable APIs
- Architecture patterns: HIGH - Verified with official docs and multiple sources
- Room management: HIGH - Standard Map-based approach, well-documented pub/sub
- Message validation: HIGH - Zod is standard for TypeScript validation, discriminated unions are core TS feature
- Pitfalls: MEDIUM - Based on community experience and best practices articles (not official docs)
- Testing patterns: MEDIUM - Vitest + ws library is standard but less documented for Bun specifically

**Research date:** 2026-02-07
**Valid until:** ~30 days (Bun and libraries are stable, architecture patterns are timeless)
