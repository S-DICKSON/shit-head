# Phase 9: Connection Management & Reconnection - Research

**Researched:** 2026-02-08
**Domain:** WebSocket connection lifecycle, reconnection handling, player-specific state views
**Confidence:** HIGH

## Summary

This phase implements graceful disconnect/reconnect handling with player-specific state views and connection grace periods. The architecture builds on existing patterns: Bun's native WebSocket data persistence (`ws.data`), the VueUse auto-reconnect already configured in Phase 2, and the player WebSocket registry (`Map<playerId, WebSocket>`) from Phase 3.

Key technical requirements: (1) Per-player state filtering to hide opponent hands/face-down cards, (2) Reconnection with state restoration using persistent playerId tokens, (3) Grace period mechanism with timeout-based cleanup, and (4) Game continuation logic when players disconnect/reconnect.

The existing codebase already has foundational pieces in place: client-side auto-reconnect with 5 retries (useGameSocket.ts:37-43), heartbeat mechanism (30s ping, 5s pong timeout), per-player messaging via playerSockets Map, and server-authoritative player views via `getPlayerView()`. Phase 9 extends these patterns to handle mid-game disconnects gracefully.

**Primary recommendation:** Store playerId in localStorage for reconnection identity, add disconnect timestamp tracking to Room class, implement grace period timer (60-90s) before player removal, extend existing per-player messaging to support reconnection state sync, and leverage existing `getPlayerView()` to ensure proper state filtering.

## Standard Stack

The established libraries/tools for this domain:

### Core

No additional dependencies required — leveraging existing stack:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun WebSocket (native) | - | Connection state persistence via ws.data | Built-in feature, already used for playerId/roomCode storage |
| VueUse useWebSocket | 11.x | Client reconnection with exponential backoff | Already configured in Phase 2 (5 retries, 1s delay) |
| localStorage (native) | - | Persist playerId across page reloads | Browser standard for session continuity |
| Map<playerId, WebSocket> | - | Player socket registry | Existing pattern from Phase 3, enables per-player messaging |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| setInterval (native) | - | Grace period countdown | Same pattern as swap timer, turn timer |
| Date.now() | - | Disconnect timestamp tracking | Simple unix timestamp for grace period calculation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage playerId | JWT session tokens | JWT adds auth complexity for anonymous game; localStorage simpler |
| 60-90s grace period | Immediate kick on disconnect | No grace period creates harsh UX for momentary network blips |
| Player socket Map | connectionId-based tracking | connectionId changes on reconnect; playerId stable across reconnections |
| Manual state restore | Full game snapshot on reconnect | Existing getPlayerView() already filters correctly; no need for snapshots |

**Installation:**
```bash
# No additional dependencies required
# Existing stack provides all necessary features
```

## Architecture Patterns

### Recommended Player Connection State Structure

Add disconnect tracking to Room class (following existing timer patterns):

```typescript
// In Room.ts
private disconnectedPlayers: Map<string, {
  disconnectTime: number;
  gracePeriodTimer: ReturnType<typeof setTimeout> | null;
}> = new Map();

private readonly DISCONNECT_GRACE_PERIOD = 90000; // 90 seconds (90s grace period)
private onPlayerDisconnected?: (playerId: string, nickname: string) => void;
private onPlayerReconnected?: (playerId: string, nickname: string) => void;
private onPlayerRemoved?: (playerId: string, nickname: string, reason: 'timeout' | 'host-left') => void;
```

### Pattern 1: Reconnection with Persistent Identity

**What:** Store playerId in localStorage on first connection, reuse on reconnect to restore session
**When to use:** Anonymous multiplayer games where players need to rejoin without accounts

**Example:**
```typescript
// Source: Adapted from Bun WebSocket docs + VueUse patterns

// Client-side: Store playerId on first connection
// In useGameSocket.ts
watch(playerId, (newId) => {
  if (newId) {
    localStorage.setItem('shithead-player-id', newId);
  }
});

// On reconnect, send stored playerId to server
const send = (msg: ClientMessage) => {
  // Check if reconnecting
  const storedPlayerId = localStorage.getItem('shithead-player-id');
  if (storedPlayerId && msg.type === 'create-room' || msg.type === 'join-room') {
    // Include reconnection context in upgrade or initial message
    // Server can use this to restore session
  }
  wsSend(JSON.stringify(msg));
};
```

**Server-side reconnection handling:**
```typescript
// Source: AWS WebSocket session management patterns + Bun docs

// In index.ts fetch handler during WebSocket upgrade
if (url.pathname === '/game-ws') {
  // Check for reconnection cookie or query param
  const urlObj = new URL(req.url);
  const reconnectPlayerId = urlObj.searchParams.get('playerId');

  const upgraded = server.upgrade(req, {
    data: {
      playerId: reconnectPlayerId || nanoid(), // Reuse ID if reconnecting
      roomCode: null, // Will be restored on rejoin-room message
    },
  });

  if (upgraded) {
    return undefined;
  }

  return new Response('WebSocket upgrade failed', { status: 500 });
}
```

### Pattern 2: Grace Period with Timeout Cleanup

**What:** Track disconnect time, wait configurable period before removing player from game
**When to use:** Multiplayer games where momentary disconnects shouldn't end the game

**Example:**
```typescript
// Source: Unity multiplayer reconnection patterns + timer callback pattern from Room.ts

handlePlayerDisconnect(playerId: string): void {
  if (!this.gameState || this.gameState.phase === 'finished') {
    // Game not active, no grace period needed
    this.removePlayer(playerId);
    return;
  }

  const player = this.players.get(playerId);
  if (!player) return;

  // Track disconnect
  const gracePeriodTimer = setTimeout(() => {
    // Grace period expired - remove player
    this.removePlayerAfterTimeout(playerId);
  }, this.DISCONNECT_GRACE_PERIOD);

  this.disconnectedPlayers.set(playerId, {
    disconnectTime: Date.now(),
    gracePeriodTimer,
  });

  // Notify other players
  this.onPlayerDisconnected?.(playerId, player.nickname);
}

handlePlayerReconnect(playerId: string): void {
  const disconnectData = this.disconnectedPlayers.get(playerId);

  if (disconnectData) {
    // Clear grace period timer
    if (disconnectData.gracePeriodTimer) {
      clearTimeout(disconnectData.gracePeriodTimer);
    }
    this.disconnectedPlayers.delete(playerId);

    const player = this.players.get(playerId);
    if (player) {
      this.onPlayerReconnected?.(playerId, player.nickname);
    }
  }
}

private removePlayerAfterTimeout(playerId: string): void {
  this.disconnectedPlayers.delete(playerId);

  const player = this.players.get(playerId);
  if (!player) return;

  // Check if player is host
  const isHost = player.id === this.hostId;

  if (isHost) {
    // Host timeout destroys room
    this.onPlayerRemoved?.(playerId, player.nickname, 'host-left');
  } else {
    // Non-host timeout - continue with remaining players
    this.removePlayer(playerId);
    this.onPlayerRemoved?.(playerId, player.nickname, 'timeout');

    // If in game, advance to next active player if it was disconnected player's turn
    if (this.gameState && this.gameState.phase === 'playing') {
      const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
      if (currentPlayer?.playerId === playerId) {
        // Was disconnected player's turn - skip to next player
        this.gameState.currentPlayerIndex = GameEngine.nextActivePlayerIndex(
          this.gameState,
          this.gameState.currentPlayerIndex
        );
      }
    }
  }
}
```

### Pattern 3: Player-Specific State Views (Server-Authoritative)

**What:** Server filters game state per player, hiding opponent hands and face-down cards
**When to use:** Card games with hidden information where server must be authoritative

**Example:**
```typescript
// Source: Existing GameEngine.getPlayerView() + server-authoritative patterns

// Already implemented in GameEngine.ts! Just ensure it's used correctly:
static getPlayerView(state: GameState, playerId: string): PlayerGameView | null {
  const player = state.players.find(p => p.playerId === playerId);
  if (!player) return null;

  // Opponent views - hide hands and face-down cards
  const opponents: OpponentView[] = state.players
    .filter(p => p.playerId !== playerId)
    .map(p => ({
      playerId: p.playerId,
      nickname: p.nickname,
      faceDownCount: p.faceDown.length,  // Count only, not actual cards
      faceUp: p.faceUp,                   // Visible to all
      handCount: p.hand.length,           // Count only, not actual cards
    }));

  return {
    phase: state.phase,
    hand: player.hand,                    // Own cards visible
    faceUp: player.faceUp,
    faceDownCount: player.faceDown.length, // Own face-down shown as count (hidden until played)
    opponents,
    drawPileCount: state.drawPile.length,
    discardPile: state.discardPile,
    currentPlayerIndex: state.currentPlayerIndex,
    dealerIndex: state.dealerIndex,
  };
}
```

### Pattern 4: Reconnection State Sync

**What:** On reconnect, send full current state filtered for the reconnecting player
**When to use:** After successful reconnection, player needs current game state

**Example:**
```typescript
// Source: WebSocket reconnection patterns + existing per-player messaging

// New client message for reconnection
export const reconnectSchema = z.object({
  type: z.literal('reconnect'),
  roomCode: z.string().length(6),
});

// Server handler in handlers.ts
case 'reconnect': {
  const room = manager.getRoom(message.roomCode);

  if (!room) {
    sendMessage(ws, {
      type: 'error',
      message: 'Room not found',
      code: 'ROOM_NOT_FOUND',
    });
    return;
  }

  // Check if player was in this room
  const roomState = room.getState();
  const wasInRoom = roomState.players.some(p => p.id === ws.data.playerId);

  if (!wasInRoom) {
    sendMessage(ws, {
      type: 'error',
      message: 'Player not in this room',
      code: 'PLAYER_NOT_FOUND',
    });
    return;
  }

  // Register reconnected player
  ws.data.roomCode = message.roomCode;
  ws.subscribe(message.roomCode);
  playerSockets.set(ws.data.playerId, ws);

  // Handle reconnection in room
  room.handlePlayerReconnect(ws.data.playerId);

  // Send current room state
  sendMessage(ws, {
    type: 'room-joined',  // Reuse existing message type
    room: roomState,
    playerId: ws.data.playerId,
  });

  // If game in progress, send current game state
  const gameView = room.getPlayerView(ws.data.playerId);
  if (gameView) {
    sendMessage(ws, {
      type: 'game-dealt',  // Reuse existing message type
      phase: gameView.phase,
      hand: gameView.hand,
      faceUp: gameView.faceUp,
      faceDownCount: gameView.faceDownCount,
      opponents: gameView.opponents,
      drawPileCount: gameView.drawPileCount,
      discardPile: gameView.discardPile,
      currentPlayerIndex: gameView.currentPlayerIndex,
      dealerIndex: gameView.dealerIndex,
    });
  }

  // Notify other players of reconnection
  publishToRoom(ws, message.roomCode, {
    type: 'player-reconnected',
    playerId: ws.data.playerId,
    nickname: roomState.players.find(p => p.id === ws.data.playerId)?.nickname || '',
  });

  break;
}
```

### Anti-Patterns to Avoid

- **No grace period on disconnect:** Immediately removing players creates harsh UX and ruins games due to momentary network blips. Always implement a reasonable grace period (60-90s).
- **Sending full game state to all players:** Including opponent hands/face-down cards in broadcasts enables cheating via browser DevTools. Always use per-player filtered views.
- **Using WebSocket connectionId for player identity:** ConnectionId changes on reconnect. Use persistent playerId stored in localStorage/cookies.
- **Grace period during lobby phase:** Only apply grace period during active games. In lobby, immediate removal is fine (no game state to preserve).
- **Forgetting to clear grace period timers:** Memory leak if timers aren't cleared on reconnect or room destruction. Always clean up timers.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection with backoff | Custom retry logic with setTimeout | VueUse useWebSocket autoReconnect | Already configured in Phase 2, handles retries/backoff/failure callbacks |
| Player identity across connections | Custom session token system | localStorage + playerId | Simple, works without auth, persists across refreshes |
| State filtering per player | Manual field selection on client | Server-side getPlayerView() | Already implemented, server-authoritative, prevents cheating |
| Grace period timer management | Custom timeout tracking | setInterval/setTimeout pattern from swap timer | Proven pattern in codebase, callback-based, easy to test |

**Key insight:** Phase 2 already implemented client-side auto-reconnect. Phase 3 already implemented per-player messaging. Phase 9 is about connecting these pieces with server-side grace periods and reconnection handlers.

## Common Pitfalls

### Pitfall 1: Forgetting to Update playerSockets Map on Reconnect

**What goes wrong:** Reconnected player doesn't receive messages because playerSockets still points to old (closed) WebSocket

**Why it happens:** handleClose removes from map, but reconnect handler doesn't re-add

**How to avoid:**
- Always call `playerSockets.set(ws.data.playerId, ws)` in reconnect handler
- Remove from map in handleClose, but only if not reconnecting
- Test by disconnecting/reconnecting and verifying messages are received

**Warning signs:**
- Reconnected player sees frozen game state
- Server logs show messages being sent, but client doesn't receive them
- Other players' actions don't appear for reconnected player

### Pitfall 2: Race Condition Between Disconnect and Grace Period Expiry

**What goes wrong:** Player reconnects just as grace period timer fires, gets kicked despite being reconnected

**Why it happens:** Grace period setTimeout fires before reconnect handler clears it

**How to avoid:**
- Check if player still disconnected before removing in timeout callback
- Use `disconnectedPlayers.has(playerId)` check in removePlayerAfterTimeout
- Clear timer before deleting from disconnectedPlayers map in reconnect handler
- Always follow pattern: check → clearTimeout → delete from map

**Warning signs:**
- Player reconnects but immediately gets "room not found" error
- Logs show reconnect and timeout happening within milliseconds
- Flaky behavior where sometimes reconnect works, sometimes doesn't

### Pitfall 3: Sending Opponent Cards in State Updates

**What goes wrong:** Client receives opponent hand/face-down cards, enabling cheating via DevTools

**Why it happens:** Broadcasting same state object to all players without filtering

**How to avoid:**
- NEVER use `publishToRoom()` for game state updates
- ALWAYS use per-player loop with `getPlayerView(playerId)` + `sendMessage()`
- Validate OpponentView type only includes counts, not actual cards
- Code review: search codebase for any `publish` calls with `hand` or `faceDown` fields

**Warning signs:**
- Network tab shows full game state with all hands visible
- OpponentView type includes Card[] instead of number for hands
- Using ws.publish() for game-dealt or card-played messages

### Pitfall 4: No playerId Persistence Across Page Reloads

**What goes wrong:** Player refreshes browser, gets new playerId, can't rejoin their game

**Why it happens:** playerId only stored in memory, not localStorage

**How to avoid:**
- Store playerId in localStorage on first connection
- Read from localStorage before connecting (check if exists)
- Include stored playerId in WebSocket upgrade URL as query param
- Server reuses playerId if provided, generates new one if not
- Test by refreshing page mid-game and verifying rejoin works

**Warning signs:**
- Page refresh kicks player out of game
- "Player not found" errors after refresh
- New playerId generated on every reconnect
- localStorage.getItem('shithead-player-id') returns null after disconnect

### Pitfall 5: Grace Period Applies During Lobby Phase

**What goes wrong:** Player disconnects from lobby, grace period keeps slot reserved, blocking new players

**Why it happens:** Grace period logic doesn't check game phase

**How to avoid:**
- Only start grace period if `gameState exists` and `phase !== 'finished'`
- In lobby (waiting/countdown), immediate removal is fine
- Check `this.gameState?.phase === 'playing'` before starting grace period timer
- Test lobby disconnect vs in-game disconnect behavior separately

**Warning signs:**
- Lobby shows disconnected player for 90 seconds
- "Room full" error even though player list shows 3/4 players
- Grace period timer running when no game in progress

### Pitfall 6: Clearing Turn Timer on Disconnect but Not Restarting on Reconnect

**What goes wrong:** Disconnected player reconnects, but their turn has no timer (waits forever)

**Why it happens:** Timer cleared on disconnect but not restarted when they return

**How to avoid:**
- If disconnected player's turn, pause timer but don't clear
- On reconnect, restart timer with remaining time (or full duration)
- Alternative: skip to next player's turn while disconnected, return to their turn if they reconnect
- User decision in Phase 9 requirements: after grace period, remove player (game continues without them)

**Warning signs:**
- Reconnected player's turn has no countdown
- Game stuck waiting for reconnected player to act
- Turn timer shows 0s or negative time

## Code Examples

Verified patterns from official sources and existing codebase:

### Client-Side Reconnection with playerId Persistence

```typescript
// Source: useGameSocket.ts + localStorage pattern

function createGameSocket() {
  const scope = effectScope(true);

  // Check for existing playerId from previous session
  const storedPlayerId = localStorage.getItem('shithead-player-id');

  // Build WebSocket URL with reconnection support
  const serverUrl = import.meta.env.VITE_WS_URL;
  let wsUrl = serverUrl
    ? serverUrl
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/game-ws`;

  // Include playerId in URL if reconnecting
  if (storedPlayerId) {
    wsUrl += `?playerId=${encodeURIComponent(storedPlayerId)}`;
  }

  const playerId = ref<string | null>(storedPlayerId);
  const roomState = ref<RoomState | null>(null);

  // ... existing WebSocket setup with autoReconnect

  // Watch for new playerId and persist it
  scope.run(() => watch(playerId, (newId) => {
    if (newId && newId !== storedPlayerId) {
      localStorage.setItem('shithead-player-id', newId);
    }
  }));

  // On connection open, attempt to reconnect to room if applicable
  scope.run(() => watch(status, (newStatus) => {
    if (newStatus === 'OPEN' && storedPlayerId) {
      const storedRoomCode = localStorage.getItem('shithead-room-code');
      if (storedRoomCode) {
        // Attempt to reconnect to room
        send({ type: 'reconnect', roomCode: storedRoomCode });
      }
    }
  }));

  // Store room code for reconnection
  scope.run(() => watch(roomState, (newRoom) => {
    if (newRoom) {
      localStorage.setItem('shithead-room-code', newRoom.code);
    }
  }));

  return { /* ... existing return */ };
}
```

### Server-Side Disconnect Tracking in Room

```typescript
// Source: Room.ts pattern + disconnect grace period logic

export class Room {
  // ... existing properties

  private disconnectedPlayers: Map<string, {
    disconnectTime: number;
    gracePeriodTimer: ReturnType<typeof setTimeout> | null;
  }> = new Map();

  private readonly DISCONNECT_GRACE_PERIOD = 90000; // 90 seconds
  private onPlayerDisconnected?: (playerId: string, nickname: string) => void;
  private onPlayerReconnected?: (playerId: string, nickname: string) => void;
  private onPlayerRemoved?: (playerId: string, nickname: string, reason: 'timeout' | 'host-left') => void;

  setDisconnectCallbacks(callbacks: {
    onDisconnected: (playerId: string, nickname: string) => void;
    onReconnected: (playerId: string, nickname: string) => void;
    onRemoved: (playerId: string, nickname: string, reason: 'timeout' | 'host-left') => void;
  }): void {
    this.onPlayerDisconnected = callbacks.onDisconnected;
    this.onPlayerReconnected = callbacks.onReconnected;
    this.onPlayerRemoved = callbacks.onRemoved;
  }

  handlePlayerDisconnect(playerId: string): void {
    // If no active game, remove immediately
    if (!this.gameState || this.gameState.phase === 'finished') {
      const player = this.players.get(playerId);
      if (player) {
        const isHost = player.id === this.hostId;
        this.removePlayer(playerId);
        this.onPlayerRemoved?.(playerId, player.nickname, isHost ? 'host-left' : 'timeout');
      }
      return;
    }

    const player = this.players.get(playerId);
    if (!player) return;

    // Start grace period
    const gracePeriodTimer = setTimeout(() => {
      this.removePlayerAfterTimeout(playerId);
    }, this.DISCONNECT_GRACE_PERIOD);

    this.disconnectedPlayers.set(playerId, {
      disconnectTime: Date.now(),
      gracePeriodTimer,
    });

    // Notify other players
    this.onPlayerDisconnected?.(playerId, player.nickname);

    // If it's disconnected player's turn, pause turn timer
    if (this.gameState.phase === 'playing' &&
        this.gameState.players[this.gameState.currentPlayerIndex]?.playerId === playerId) {
      this.clearTurnTimer();
    }
  }

  handlePlayerReconnect(playerId: string): void {
    const disconnectData = this.disconnectedPlayers.get(playerId);

    if (disconnectData) {
      // Clear grace period timer
      if (disconnectData.gracePeriodTimer) {
        clearTimeout(disconnectData.gracePeriodTimer);
      }
      this.disconnectedPlayers.delete(playerId);

      const player = this.players.get(playerId);
      if (player) {
        this.onPlayerReconnected?.(playerId, player.nickname);

        // If it's reconnected player's turn, restart turn timer
        if (this.gameState?.phase === 'playing' &&
            this.gameState.players[this.gameState.currentPlayerIndex]?.playerId === playerId) {
          this.startTurnTimer(this.gameState.currentPlayerIndex);
        }
      }
    }
  }

  private removePlayerAfterTimeout(playerId: string): void {
    // Double-check player is still disconnected (race condition safety)
    if (!this.disconnectedPlayers.has(playerId)) {
      return;
    }

    this.disconnectedPlayers.delete(playerId);

    const player = this.players.get(playerId);
    if (!player) return;

    const isHost = player.id === this.hostId;

    if (isHost) {
      // Host timeout destroys entire room
      this.onPlayerRemoved?.(playerId, player.nickname, 'host-left');
      return;
    }

    // Non-host timeout - remove player and continue game
    this.removePlayer(playerId);
    this.onPlayerRemoved?.(playerId, player.nickname, 'timeout');

    // If game in progress and was removed player's turn, advance to next player
    if (this.gameState && this.gameState.phase === 'playing') {
      const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
      if (currentPlayer?.playerId === playerId) {
        // Advance to next active player
        const nextIndex = GameEngine.nextActivePlayerIndex(
          this.gameState,
          this.gameState.currentPlayerIndex
        );
        this.gameState.currentPlayerIndex = nextIndex;

        // Start timer for next player
        this.clearTurnTimer();
        this.startTurnTimer(nextIndex);

        // Notify players of turn change
        this.onPlayPhaseStart?.(nextIndex);
      }
    }

    // Check if game should end (less than 2 active players)
    if (this.gameState && this.gameState.phase === 'playing') {
      const activePlayers = this.gameState.players.filter(p =>
        p.hand.length > 0 || p.faceUp.length > 0 || p.faceDown.length > 0
      );
      if (activePlayers.length < 2) {
        // Not enough players to continue - end game
        this.gameState.phase = 'finished';
        // Winner is the remaining active player (or last eliminated if all eliminated)
        const winner = activePlayers[0] || this.gameState.players[0];
        this.onGameOver?.(winner.playerId, winner.nickname);
      }
    }
  }

  isPlayerDisconnected(playerId: string): boolean {
    return this.disconnectedPlayers.has(playerId);
  }

  getDisconnectTimeRemaining(playerId: string): number | null {
    const disconnectData = this.disconnectedPlayers.get(playerId);
    if (!disconnectData) return null;

    const elapsed = Date.now() - disconnectData.disconnectTime;
    const remaining = this.DISCONNECT_GRACE_PERIOD - elapsed;
    return Math.max(0, remaining);
  }
}
```

### WebSocket Handler for Reconnection

```typescript
// Source: handlers.ts pattern + reconnection message handling

// Add to handleClose to track disconnects
export function handleClose(ws: ServerWebSocket<WebSocketData>, manager: RoomManager): void {
  const room = manager.getRoomByPlayerId(ws.data.playerId);

  if (room) {
    // Mark player as disconnected (start grace period)
    room.handlePlayerDisconnect(ws.data.playerId);
  }

  // Remove from active sockets
  playerSockets.delete(ws.data.playerId);

  // Note: Don't remove from room yet - grace period allows reconnection
}

// Add to handleOpen to detect reconnections
export function handleOpen(ws: ServerWebSocket<WebSocketData>): void {
  const room = manager.getRoomByPlayerId(ws.data.playerId);

  if (room) {
    // Player is reconnecting to existing room
    room.handlePlayerReconnect(ws.data.playerId);

    // Re-register socket
    playerSockets.set(ws.data.playerId, ws);

    // Re-subscribe to room topic
    if (ws.data.roomCode) {
      ws.subscribe(ws.data.roomCode);
    }
  } else {
    // New connection
    playerSockets.set(ws.data.playerId, ws);
  }
}

// Add reconnect message handler
case 'reconnect': {
  const room = manager.getRoom(message.roomCode);

  if (!room) {
    sendMessage(ws, {
      type: 'error',
      message: 'Room not found',
      code: 'ROOM_NOT_FOUND',
    });
    return;
  }

  const roomState = room.getState();
  const playerInRoom = roomState.players.some(p => p.id === ws.data.playerId);

  if (!playerInRoom) {
    sendMessage(ws, {
      type: 'error',
      message: 'You are not in this room',
      code: 'PLAYER_NOT_FOUND',
    });
    return;
  }

  // Update connection data
  ws.data.roomCode = message.roomCode;
  ws.subscribe(message.roomCode);
  playerSockets.set(ws.data.playerId, ws);

  // Handle reconnection (clears grace period)
  room.handlePlayerReconnect(ws.data.playerId);

  // Send current room state
  sendMessage(ws, {
    type: 'room-joined',
    room: roomState,
    playerId: ws.data.playerId,
  });

  // If game in progress, send player's current view
  const gameView = room.getPlayerView(ws.data.playerId);
  if (gameView) {
    sendMessage(ws, {
      type: 'game-dealt',
      phase: gameView.phase,
      hand: gameView.hand,
      faceUp: gameView.faceUp,
      faceDownCount: gameView.faceDownCount,
      opponents: gameView.opponents,
      drawPileCount: gameView.drawPileCount,
      discardPile: gameView.discardPile,
      currentPlayerIndex: gameView.currentPlayerIndex,
      dealerIndex: gameView.dealerIndex,
    });
  }

  // Notify other players of reconnection
  const player = roomState.players.find(p => p.id === ws.data.playerId);
  if (player) {
    publishToRoom(ws, message.roomCode, {
      type: 'player-reconnected',
      playerId: ws.data.playerId,
      nickname: player.nickname,
    });
  }

  break;
}
```

### Message Schemas for Reconnection

```typescript
// Source: packages/shared/src/schemas/messages.ts pattern

// Client-to-server: Reconnect to room
export const reconnectSchema = z.object({
  type: z.literal('reconnect'),
  roomCode: z.string().length(6),
});

// Server-to-client: Player disconnected (in grace period)
export const playerDisconnectedSchema = z.object({
  type: z.literal('player-disconnected'),
  playerId: z.string(),
  nickname: z.string(),
  graceTimeRemaining: z.number(), // milliseconds until removal
});

// Server-to-client: Player reconnected
export const playerReconnectedSchema = z.object({
  type: z.literal('player-reconnected'),
  playerId: z.string(),
  nickname: z.string(),
});

// Server-to-client: Player removed (timeout or host left)
export const playerRemovedSchema = z.object({
  type: z.literal('player-removed'),
  playerId: z.string(),
  nickname: z.string(),
  reason: z.enum(['timeout', 'host-left']),
});

// Add to clientMessageSchema
export const clientMessageSchema = z.discriminatedUnion('type', [
  // ... existing schemas
  reconnectSchema,
]);

// Add to serverMessageSchema
export const serverMessageSchema = z.discriminatedUnion('type', [
  // ... existing schemas
  playerDisconnectedSchema,
  playerReconnectedSchema,
  playerRemovedSchema,
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Immediate kick on disconnect | Grace period (60-90s) with reconnection | ~2020+ | Better UX for network blips, mobile switching between WiFi/cellular |
| Session tokens (JWT) for identity | localStorage playerId for anonymous games | ~2021+ | Simpler for no-account games, works across page reloads |
| Full game state broadcast | Per-player filtered views | Always | Prevents cheating, server-authoritative hidden information |
| Stateful WebSocket servers (sticky sessions) | Stateless with external state (Room objects) | ~2022+ | Better scalability, any server can handle reconnect |
| Manual heartbeat implementation | VueUse/library-provided heartbeat | ~2023+ | Fewer bugs, standard patterns, less code to maintain |

**Deprecated/outdated:**
- **Immediate disconnect = game over:** Modern multiplayer games all implement grace periods for momentary network issues
- **Client-side state management for hidden info:** Always caused cheating exploits; server-authoritative is standard now
- **Cookie-based WebSocket auth:** Query params or initial message auth is more common for WebSocket connections
- **No reconnection support:** Required feature for any serious multiplayer game as of 2024+

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal grace period duration**
   - What we know: Industry standard is 60-90 seconds based on search results
   - What's unclear: Whether 60s or 90s feels better for this specific game's pace
   - Recommendation: Start with 90s (upper range), can tune down based on playtesting

2. **Turn timer behavior during disconnect grace period**
   - What we know: Turn timer should pause when current player disconnects
   - What's unclear: Should other players see "Waiting for Player X to reconnect..." or just paused timer?
   - Recommendation: Show disconnect status with countdown ("Player X disconnected - 45s to reconnect"), pause turn timer, resume if they return

3. **Reconnection during swap phase**
   - What we know: Swap phase has its own 30s timer
   - What's unclear: If player disconnects during swap phase, should grace period extend beyond swap timer ending?
   - Recommendation: Grace period continues through swap phase end; if they reconnect after swap ended, they get whatever face-up cards they had (no swaps made while disconnected)

4. **Multiple simultaneous disconnects**
   - What we know: Each player has independent grace period
   - What's unclear: If 3 out of 4 players disconnect, should game pause entirely?
   - Recommendation: No special handling; each has grace period independently; if 2+ remain connected, game continues

5. **Reconnection after game ended**
   - What we know: Phase says grace period only during active game
   - What's unclear: Should we allow reconnection to see final game state/results screen?
   - Recommendation: Allow reconnection to 'finished' phase room to see results, but no grace period (immediate kick if they disconnect from lobby/finished state)

## Sources

### Primary (HIGH confidence)

- [Bun WebSocket Documentation](https://bun.com/docs/runtime/http/websockets) - Connection data persistence via ws.data, pub/sub, idleTimeout
- Existing codebase: useGameSocket.ts (lines 37-50) - VueUse autoReconnect with 5 retries, 1s delay, heartbeat
- Existing codebase: handlers.ts (lines 16-29) - playerSockets Map for per-player messaging
- Existing codebase: GameEngine.getPlayerView() (lines 80-110) - Player-specific state filtering (hides opponent cards)
- Existing codebase: Room.ts swap timer pattern (lines 229-272) - Callback-based timer with cleanup
- [MDN: localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) - Browser storage for session persistence

### Secondary (MEDIUM confidence)

- [How to Implement Reconnection Logic for WebSockets](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection/view) - Exponential backoff, state recovery, message queuing patterns (2026)
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view) - Production-grade reconnection with state restore (2026)
- [AWS: Managing sessions of anonymous users in WebSocket API-based applications](https://aws.amazon.com/blogs/compute/managing-sessions-of-anonymous-users-in-websocket-api-based-applications/) - Anonymous user session persistence patterns
- [Stateful vs Stateless WebSocket Servers](https://bugfree.ai/knowledge-hub/stateful-vs-stateless-websocket-servers) - Stateless servers allow reconnect to any server
- [Unity: Reconnecting mid-game](https://docs-multiplayer.unity3d.com/netcode/current/advanced-topics/reconnecting-mid-game/) - Grace period patterns (90s recommendation)
- [WebSocket Reconnect: Strategies for Reliable Communication](https://apidog.com/blog/websocket-reconnect/) - Retry management, user feedback patterns
- [Client-Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html) - Server-authoritative state for hidden information
- [VueUse: useWebSocket](https://vueuse.org/core/usewebsocket/) - autoReconnect configuration, status tracking

### Tertiary (LOW confidence)

- [GameDev.net: Timeouts, disconnecting and reconnecting](https://gamedev.net/forums/topic/575209-timeouts-disconnecting-and-reconnecting/4668666/) - Community discussion on 90s grace period
- [Building a Real-Time Multiplayer Game Server with Socket.io](https://dev.to/dowerdev/building-a-real-time-multiplayer-game-server-with-socketio-and-redis-architecture-and-583m) - Heartbeat mechanisms for connection health
- [RingCentral: Recovering a WebSocket session](https://developers.ringcentral.com/guide/notifications/websockets/session-recovery) - Token-based session recovery

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All required features exist in current stack (VueUse, Bun WebSocket, localStorage)
- Architecture: HIGH - Building on proven patterns from existing codebase (Room timers, per-player messaging, getPlayerView)
- Pitfalls: MEDIUM - Some from existing timer patterns, others from web search on reconnection best practices

**Research date:** 2026-02-08
**Valid until:** 30 days (stable WebSocket/browser APIs, patterns unlikely to change)
