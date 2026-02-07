# Architecture Patterns: Real-Time Multiplayer Card Game

**Domain:** Browser-based multiplayer card game (Shithead Online)
**Researched:** 2026-02-07
**Confidence:** MEDIUM (based on established patterns, not verified with current sources)

## Executive Summary

Real-time multiplayer card games require **server-authoritative architecture** with bidirectional WebSocket communication. The server owns game state and logic; clients render state and send player actions. For Shithead Online's requirements (2-4 players, complex card interactions, disconnect handling), a clear separation between lobby management, game rooms, and game state machines is critical.

**Key architectural principle:** Server is source of truth. Clients never mutate game state directly.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   UI Layer   │   State      │   Network    │   Validation   │
│   (React)    │   Manager    │   Client     │   (Optimistic) │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       └──────────────┴──────────────┴────────────────┘
                            │
                      WebSocket (wss://)
                            │
       ┌────────────────────┴────────────────────┐
       │                                         │
┌──────▼─────────────────────────────────────────▼──────┐
│              SERVER LAYER (Node.js)                    │
├──────────────┬──────────────┬──────────────────────────┤
│   WebSocket  │    Lobby     │      Game Room           │
│   Manager    │    Manager   │      Manager             │
└──────┬───────┴──────┬───────┴──────┬───────────────────┘
       │              │              │
       │              │    ┌─────────▼──────────┐
       │              │    │   Game Instance    │
       │              │    │   (State Machine)  │
       │              │    ├────────────────────┤
       │              │    │ - Game State       │
       │              │    │ - Turn Manager     │
       │              │    │ - Rules Engine     │
       │              │    │ - Event Emitter    │
       │              │    └────────────────────┘
       │              │
       └──────────────┴────────────────────────────────┐
                                                       │
                                              ┌────────▼─────────┐
                                              │  Persistence     │
                                              │  (Optional)      │
                                              └──────────────────┘
```

## Component Boundaries

### 1. Client Layer Components

#### UI Layer (React/Svelte/Vue)
**Responsibility:**
- Render game state (cards, players, turn indicators)
- Capture user interactions (click card, end turn)
- Show connection status
- Display timers and animations

**Communicates With:** State Manager

**Key Pattern:** Pure presentation. Never computes game logic.

```typescript
// UI only renders, never decides validity
function Card({ card, onPlay }) {
  return (
    <div onClick={() => onPlay(card)}>
      {card.rank}{card.suit}
    </div>
  );
}
```

#### State Manager
**Responsibility:**
- Store current game state (immutable)
- Queue optimistic updates (for responsiveness)
- Reconcile server authoritative state
- Emit state changes to UI

**Communicates With:** UI Layer, Network Client

**Key Pattern:** Single source of truth on client. All updates flow through here.

```typescript
class GameStateManager {
  private state: GameState;
  private optimisticActions: Queue<Action>;

  // Server sends authoritative state
  onServerUpdate(newState: GameState) {
    this.state = newState;
    this.reconcileOptimistic();
    this.notifySubscribers();
  }

  // Client predicts for responsiveness
  optimisticUpdate(action: Action) {
    this.optimisticActions.push(action);
    this.render(this.applyOptimistic(this.state, action));
  }
}
```

#### Network Client
**Responsibility:**
- Manage WebSocket connection
- Send player actions to server
- Receive state updates from server
- Handle reconnection logic

**Communicates With:** State Manager, WebSocket Manager (server)

**Key Pattern:** Message-based protocol with action/event separation.

```typescript
class NetworkClient {
  private ws: WebSocket;

  // Outbound: Player actions
  sendAction(action: PlayerAction) {
    this.ws.send(JSON.stringify({
      type: 'ACTION',
      action
    }));
  }

  // Inbound: State updates
  onMessage(msg: Message) {
    switch(msg.type) {
      case 'STATE_UPDATE':
        stateManager.onServerUpdate(msg.state);
        break;
      case 'ERROR':
        // Handle validation errors
        break;
    }
  }

  // Reconnection
  reconnect(roomCode: string, playerId: string) {
    this.ws = new WebSocket(`wss://...`);
    this.ws.send(JSON.stringify({
      type: 'RECONNECT',
      roomCode,
      playerId
    }));
  }
}
```

#### Client-Side Validation (Optimistic)
**Responsibility:**
- Pre-validate actions before sending (UX only)
- Provide instant feedback
- Never trusted by server

**Communicates With:** UI Layer

**Key Pattern:** Duplicate of server validation for responsiveness, but server always wins.

---

### 2. Server Layer Components

#### WebSocket Manager
**Responsibility:**
- Accept WebSocket connections
- Authenticate connections (room code + player ID)
- Route messages to appropriate handlers
- Broadcast messages to clients
- Track connection health (heartbeat)

**Communicates With:** Lobby Manager, Game Room Manager, Network Clients

**Key Pattern:** Thin routing layer. Doesn't know game logic.

```typescript
class WebSocketManager {
  private connections: Map<PlayerId, WebSocket>;

  onConnection(ws: WebSocket, req: Request) {
    const { roomCode, playerId } = authenticate(req);

    this.connections.set(playerId, ws);

    ws.on('message', (msg) => {
      this.routeMessage(playerId, roomCode, msg);
    });

    ws.on('close', () => {
      this.handleDisconnect(playerId, roomCode);
    });

    // Heartbeat every 30s
    setInterval(() => ws.ping(), 30000);
  }

  broadcast(roomCode: string, message: any) {
    const players = roomManager.getPlayers(roomCode);
    players.forEach(p => {
      this.connections.get(p.id)?.send(JSON.stringify(message));
    });
  }
}
```

#### Lobby Manager
**Responsibility:**
- Create rooms (generate unique codes)
- Track available rooms
- Handle player join/leave before game starts
- Start game when ready

**Communicates With:** WebSocket Manager, Game Room Manager

**Key Pattern:** Pre-game state only. Once game starts, hand off to Game Room Manager.

```typescript
class LobbyManager {
  private lobbies: Map<RoomCode, Lobby>;

  createRoom(): RoomCode {
    const code = generateRoomCode(); // e.g., 4-char alphanumeric
    this.lobbies.set(code, {
      code,
      players: [],
      status: 'WAITING',
      createdAt: Date.now()
    });
    return code;
  }

  joinRoom(roomCode: string, playerName: string): PlayerId {
    const lobby = this.lobbies.get(roomCode);
    if (!lobby) throw new Error('Room not found');
    if (lobby.players.length >= 4) throw new Error('Room full');
    if (lobby.status !== 'WAITING') throw new Error('Game in progress');

    const playerId = uuid();
    lobby.players.push({ id: playerId, name: playerName });

    this.broadcast(roomCode, {
      type: 'LOBBY_UPDATE',
      players: lobby.players
    });

    return playerId;
  }

  startGame(roomCode: string) {
    const lobby = this.lobbies.get(roomCode);
    if (lobby.players.length < 2) throw new Error('Need at least 2 players');

    lobby.status = 'STARTING';
    gameRoomManager.createGame(roomCode, lobby.players);
    this.lobbies.delete(roomCode); // Clean up lobby
  }
}
```

#### Game Room Manager
**Responsibility:**
- Manage active game instances
- Route player actions to correct game
- Handle disconnect/reconnect
- Clean up finished games

**Communicates With:** WebSocket Manager, Game Instance

**Key Pattern:** One Game Instance per room. Isolates game logic.

```typescript
class GameRoomManager {
  private games: Map<RoomCode, GameInstance>;
  private playerToRoom: Map<PlayerId, RoomCode>;

  createGame(roomCode: string, players: Player[]) {
    const game = new GameInstance(roomCode, players);
    this.games.set(roomCode, game);

    players.forEach(p => this.playerToRoom.set(p.id, roomCode));

    // Listen to game events
    game.on('state_change', (state) => {
      this.broadcastState(roomCode, state);
    });

    game.on('game_end', () => {
      this.cleanupGame(roomCode);
    });

    game.start();
  }

  handleAction(playerId: string, action: PlayerAction) {
    const roomCode = this.playerToRoom.get(playerId);
    const game = this.games.get(roomCode);

    try {
      game.processAction(playerId, action);
    } catch (error) {
      // Send error to player
      wsManager.sendToPlayer(playerId, {
        type: 'ERROR',
        message: error.message
      });
    }
  }

  handleDisconnect(playerId: string) {
    const roomCode = this.playerToRoom.get(playerId);
    const game = this.games.get(roomCode);

    game.markPlayerDisconnected(playerId);

    // Wait 60s for reconnect
    setTimeout(() => {
      if (!game.isPlayerConnected(playerId)) {
        game.removePlayer(playerId);
      }
    }, 60000);
  }

  handleReconnect(playerId: string, roomCode: string) {
    const game = this.games.get(roomCode);
    if (!game) throw new Error('Game not found');

    game.markPlayerConnected(playerId);

    // Send full state to reconnected player
    wsManager.sendToPlayer(playerId, {
      type: 'FULL_STATE',
      state: game.getStateForPlayer(playerId)
    });
  }
}
```

#### Game Instance (State Machine)
**Responsibility:**
- Own complete game state
- Enforce game rules
- Process player actions
- Manage turn progression
- Emit state changes

**Communicates With:** Game Room Manager

**Key Pattern:** Finite state machine. Each phase has valid transitions.

```typescript
class GameInstance extends EventEmitter {
  private state: GameState;
  private turnManager: TurnManager;
  private rulesEngine: RulesEngine;

  constructor(roomCode: string, players: Player[]) {
    this.state = {
      roomCode,
      phase: 'SWAP', // SWAP -> PLAYING -> FINISHED
      players: this.initializePlayers(players),
      deck: shuffleDeck(),
      pile: [],
      currentPlayerId: null,
      lastActionAt: Date.now()
    };

    this.turnManager = new TurnManager(this.state.players);
    this.rulesEngine = new RulesEngine();
  }

  start() {
    // Deal cards
    this.dealInitialCards();
    this.state.phase = 'SWAP';
    this.emitStateChange();

    // After 30s, auto-progress to PLAYING
    setTimeout(() => this.endSwapPhase(), 30000);
  }

  processAction(playerId: string, action: PlayerAction) {
    // Validate it's player's turn
    if (this.state.currentPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    // Validate action is legal
    if (!this.rulesEngine.isValidPlay(action, this.state)) {
      throw new Error('Invalid play');
    }

    // Apply action (mutate state)
    this.applyAction(action);

    // Check for special conditions (burn, etc.)
    this.checkSpecialConditions();

    // Advance turn
    this.turnManager.nextTurn();

    // Emit state change
    this.emitStateChange();

    // Reset turn timer
    this.startTurnTimer();
  }

  private applyAction(action: PlayerAction) {
    switch (action.type) {
      case 'PLAY_CARD':
        // Move card from hand to pile
        const player = this.state.players[action.playerId];
        const cardIndex = player.hand.findIndex(c => c.id === action.cardId);
        const card = player.hand.splice(cardIndex, 1)[0];
        this.state.pile.push(card);

        // Draw replacement if deck available
        if (this.state.deck.length > 0 && player.hand.length < 3) {
          player.hand.push(this.state.deck.pop());
        }
        break;

      case 'PICK_UP_PILE':
        const player = this.state.players[action.playerId];
        player.hand.push(...this.state.pile);
        this.state.pile = [];
        break;

      case 'SWAP_CARDS':
        // Only valid in SWAP phase
        // ...
        break;
    }
  }

  private checkSpecialConditions() {
    // Check for burn (4 of same rank)
    if (this.rulesEngine.isBurn(this.state.pile)) {
      this.state.pile = [];
      // Current player goes again
      this.turnManager.repeatTurn();
    }

    // Check for win condition
    const winner = this.rulesEngine.checkWinner(this.state);
    if (winner) {
      this.state.phase = 'FINISHED';
      this.state.winner = winner;
      this.emit('game_end', winner);
    }
  }

  private startTurnTimer() {
    clearTimeout(this.turnTimer);
    this.turnTimer = setTimeout(() => {
      // Auto-pick up pile if time expires
      this.processAction(this.state.currentPlayerId, {
        type: 'PICK_UP_PILE'
      });
    }, 30000);
  }

  private emitStateChange() {
    this.state.lastActionAt = Date.now();
    this.emit('state_change', this.state);
  }

  getStateForPlayer(playerId: string): PlayerGameState {
    // Return state with hidden information filtered
    return {
      ...this.state,
      players: this.state.players.map(p => ({
        ...p,
        hand: p.id === playerId ? p.hand : p.hand.length, // Others see count only
        faceDown: p.faceDown.map(c => ({ faceDown: true })) // Hidden until played
      }))
    };
  }
}
```

#### Turn Manager
**Responsibility:**
- Track whose turn it is
- Advance to next player
- Handle disconnected players (skip)
- Support special cases (repeat turn on burn)

**Communicates With:** Game Instance

```typescript
class TurnManager {
  private players: Player[];
  private currentIndex: number = 0;

  getCurrentPlayer(): PlayerId {
    return this.players[this.currentIndex].id;
  }

  nextTurn() {
    do {
      this.currentIndex = (this.currentIndex + 1) % this.players.length;
    } while (!this.players[this.currentIndex].connected);
  }

  repeatTurn() {
    // Stay on current player (for burns)
  }
}
```

#### Rules Engine
**Responsibility:**
- Validate card plays against Shithead rules
- Check for special card effects (2s, 8s, 10s)
- Determine win conditions
- Encapsulate all game logic

**Communicates With:** Game Instance

```typescript
class RulesEngine {
  isValidPlay(action: PlayerAction, state: GameState): boolean {
    if (action.type !== 'PLAY_CARD') return true;

    const topCard = state.pile[state.pile.length - 1];
    const playedCard = action.card;

    // 2s and 10s always valid
    if (playedCard.rank === '2' || playedCard.rank === '10') return true;

    // Must be >= top card
    return this.compareRanks(playedCard.rank, topCard.rank) >= 0;
  }

  isBurn(pile: Card[]): boolean {
    if (pile.length < 4) return false;
    const last4 = pile.slice(-4);
    return last4.every(c => c.rank === last4[0].rank);
  }

  checkWinner(state: GameState): PlayerId | null {
    const player = state.players.find(p =>
      p.hand.length === 0 &&
      p.faceUp.length === 0 &&
      p.faceDown.length === 0
    );
    return player?.id || null;
  }
}
```

---

### 3. Persistence Layer (Optional for MVP)

#### Database
**Responsibility:**
- Store game history (optional)
- Track room cleanup (TTL)
- Analytics (games played, etc.)

**For MVP:** Not required. In-memory is sufficient.

**For Production:** Consider Redis for:
- Active room state (recovery on server restart)
- Distributed deployment (multiple server instances)

---

## Data Flow

### Game Start Flow
```
1. Player A creates room
   Client → WS Manager → Lobby Manager
   Lobby Manager returns room code

2. Players B, C join room
   Client → WS Manager → Lobby Manager
   Lobby Manager broadcasts LOBBY_UPDATE

3. Player A starts game
   Client → WS Manager → Lobby Manager
   Lobby Manager → Game Room Manager creates Game Instance
   Game Instance deals cards, emits STATE_UPDATE
   Game Room Manager → WS Manager broadcasts state to all players
```

### Turn Flow
```
1. Player plays card
   Client (UI) → Client (Network) sends ACTION

2. Server receives action
   WS Manager → Game Room Manager → Game Instance

3. Game validates and applies
   Game Instance:
   - Validates turn ownership
   - Validates card play (Rules Engine)
   - Applies state mutation
   - Checks special conditions
   - Advances turn
   - Emits STATE_UPDATE

4. Server broadcasts new state
   Game Room Manager → WS Manager → All Clients

5. Clients render
   Client (Network) → Client (State Manager) → Client (UI)
```

### Disconnect Flow
```
1. WebSocket closes
   WS Manager detects close event
   WS Manager → Game Room Manager.handleDisconnect()

2. Game marks player disconnected
   Game Instance sets player.connected = false
   Game Instance emits STATE_UPDATE (show "Player X disconnected")
   Turn Manager skips disconnected player on their turn

3. Wait for reconnect (60s)
   If player reconnects:
     - WS Manager authenticates with playerId + roomCode
     - Game Room Manager.handleReconnect()
     - Game Instance sends FULL_STATE to player
     - Game continues

   If timeout:
     - Game Instance removes player
     - Game continues with remaining players (or ends if < 2)
```

### Reconnect Flow
```
1. Client detects disconnect
   WebSocket 'close' event
   Client stores: roomCode, playerId (localStorage)

2. Client attempts reconnect
   Create new WebSocket connection
   Send RECONNECT message with credentials

3. Server validates and restores
   WS Manager authenticates
   Game Room Manager finds game instance
   Game Instance marks player connected
   WS Manager sends FULL_STATE

4. Client reconciles state
   State Manager replaces local state with server state
   UI re-renders
```

---

## Patterns to Follow

### Pattern 1: Server-Authoritative State
**What:** Server owns the game state. Clients display it. Server processes all actions.

**When:** Always for multiplayer games. Prevents cheating and ensures consistency.

**Example:**
```typescript
// CLIENT: Never do this
function playCard(card) {
  myHand.remove(card);  // ❌ Client mutates state
  pile.add(card);
  networkClient.send({ type: 'I_PLAYED', card });
}

// CLIENT: Do this
function playCard(card) {
  // Optimistic update for UI responsiveness
  stateManager.optimisticUpdate({ type: 'PLAY_CARD', card });

  // Send to server
  networkClient.send({ type: 'PLAY_CARD', card });

  // Wait for server confirmation (or rollback on error)
}

// SERVER: Single source of truth
function handlePlayCard(playerId, action) {
  if (!isValidPlay(action, gameState)) {
    sendError(playerId, 'Invalid play');
    return;
  }

  applyAction(action); // Mutate authoritative state
  broadcastState();    // Send to all clients
}
```

### Pattern 2: Message-Based Protocol
**What:** Use typed messages with clear action/event separation.

**When:** All WebSocket communication.

**Example:**
```typescript
// Client → Server: Actions (imperatives)
type ClientMessage =
  | { type: 'JOIN_ROOM', roomCode: string, playerName: string }
  | { type: 'PLAY_CARD', cardId: string }
  | { type: 'PICK_UP_PILE' }
  | { type: 'SWAP_CARDS', handCard: string, faceUpCard: string };

// Server → Client: Events (past tense)
type ServerMessage =
  | { type: 'LOBBY_UPDATE', players: Player[] }
  | { type: 'GAME_STARTED', state: GameState }
  | { type: 'STATE_UPDATE', state: GameState }
  | { type: 'ERROR', message: string }
  | { type: 'PLAYER_DISCONNECTED', playerId: string };
```

### Pattern 3: State Reconciliation
**What:** Client shows optimistic updates, but server state always wins.

**When:** For responsive UX without compromising server authority.

**Example:**
```typescript
class StateManager {
  private authoritative: GameState;
  private optimistic: GameState;

  // User action: show immediately
  onUserAction(action: Action) {
    this.optimistic = applyAction(this.optimistic, action);
    this.render(this.optimistic);
    this.network.send(action);
  }

  // Server update: replace everything
  onServerUpdate(state: GameState) {
    this.authoritative = state;
    this.optimistic = state;
    this.render(state);
  }

  // Server rejects: rollback
  onServerError(error: Error) {
    this.optimistic = this.authoritative; // Rollback
    this.render(this.authoritative);
    this.showError(error);
  }
}
```

### Pattern 4: Hidden Information
**What:** Server filters state before sending to each client.

**When:** Always. Clients should never see other players' hidden cards.

**Example:**
```typescript
// SERVER
function getStateForPlayer(playerId: string): PlayerGameState {
  return {
    ...gameState,
    players: gameState.players.map(p => {
      if (p.id === playerId) {
        // Own cards: full visibility
        return p;
      } else {
        // Other players: hide hand and face-down cards
        return {
          ...p,
          hand: { count: p.hand.length }, // Count only
          faceDown: p.faceDown.map(() => ({ faceDown: true })) // No rank/suit
        };
      }
    })
  };
}
```

### Pattern 5: Turn Timer as Server Authority
**What:** Server enforces turn timers, not clients.

**When:** Always. Prevents timing manipulation.

**Example:**
```typescript
// SERVER
class GameInstance {
  private turnTimer: NodeJS.Timeout;

  private startTurnTimer() {
    clearTimeout(this.turnTimer);

    this.turnTimer = setTimeout(() => {
      // Time expired: force action
      this.processAction(this.state.currentPlayerId, {
        type: 'PICK_UP_PILE'
      });
    }, 30000);
  }
}

// CLIENT: Only shows countdown (informational)
function TurnTimer({ expiresAt }) {
  const remaining = expiresAt - Date.now();
  return <div>{remaining}s</div>;
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Game Logic
**What:** Implementing game rules on client and trusting results.

**Why bad:** Clients can be modified to cheat. Example: Modified client says "I can play this card" when rules don't allow it.

**Instead:** Client validates for UX only (show "can't play this"). Server validates authoritatively and rejects invalid actions.

```typescript
// ❌ BAD
// Client
if (isValidPlay(card)) {
  socket.send({ type: 'PLAY_CARD', card });
}
// Server
socket.on('PLAY_CARD', (card) => {
  applyPlay(card); // Trusts client
});

// ✅ GOOD
// Client
if (clientRules.isValidPlay(card)) { // UX validation only
  socket.send({ type: 'PLAY_CARD', card });
}
// Server
socket.on('PLAY_CARD', (card) => {
  if (!serverRules.isValidPlay(card)) { // Authority
    sendError('Invalid play');
    return;
  }
  applyPlay(card);
});
```

### Anti-Pattern 2: Synchronous Request-Response
**What:** Using HTTP polling or request-response pattern for real-time game.

**Why bad:** High latency, poor UX, inefficient. Player plays card → waits for response → sees result is slow.

**Instead:** WebSocket with server-pushed updates. Player plays card → sees optimistic update immediately → server broadcasts authoritative state to all players.

### Anti-Pattern 3: Storing State in WebSocket Connection
**What:** Keeping game state as properties of the WebSocket connection object.

**Why bad:** Tight coupling. Can't handle reconnects (new WebSocket = lost state). Can't serialize for persistence.

**Instead:** Store state in Game Instance. WebSocket Manager only routes messages.

```typescript
// ❌ BAD
wsManager.on('connection', (ws) => {
  ws.gameState = {}; // State lives on connection
  ws.on('message', (msg) => {
    ws.gameState = applyAction(ws.gameState, msg);
  });
});

// ✅ GOOD
wsManager.on('connection', (ws, playerId, roomCode) => {
  const game = gameManager.getGame(roomCode); // State lives in game
  ws.on('message', (msg) => {
    game.processAction(playerId, msg);
  });
});
```

### Anti-Pattern 4: Broadcasting Full State Every Action
**What:** Sending complete game state to all clients after every action.

**Why bad:** Bandwidth waste. Most actions change small parts of state.

**Instead:** Send full state on join/reconnect. Send deltas for actions.

**Exception for MVP:** Full state broadcast is simpler to implement and fine for 4-player card game. Optimize later if needed.

```typescript
// MVP: Full state is OK
broadcastState(gameState); // ~10KB per message, 4 players = 40KB per action

// Optimization (later): Deltas
broadcast({
  type: 'CARD_PLAYED',
  playerId: 'p1',
  cardId: 'c5',
  pileTop: { rank: '7', suit: 'H' },
  handCount: { p1: 2 }
}); // ~200 bytes per message
```

### Anti-Pattern 5: No Reconnection Grace Period
**What:** Immediately removing players when they disconnect.

**Why bad:** Network blips, tab refresh, phone call interruption end games prematurely.

**Instead:** Mark player as disconnected, continue game (skip their turns), wait 60s for reconnect before removing.

---

## Suggested Build Order

Build in this order to minimize blocked work and enable testing at each stage.

### Phase 1: WebSocket Foundation
**Build:**
- WebSocket Manager (connection handling)
- Basic message routing
- Heartbeat/ping mechanism

**Why first:** Everything depends on communication layer. Get this stable early.

**Test:** Multiple clients can connect and receive echo messages.

**Estimated complexity:** Low

---

### Phase 2: Lobby System
**Build:**
- Lobby Manager (create room, join room, leave room)
- Room code generation
- Player roster management
- Start game trigger

**Why second:** Need lobby before games. Simple state, no complex logic.

**Test:** Multiple clients can join a room and see each other in lobby.

**Estimated complexity:** Low

---

### Phase 3: Game State Foundation
**Build:**
- GameInstance class (empty state machine)
- Deck initialization and shuffling
- Card dealing
- Basic state broadcast (no actions yet)

**Why third:** Establishes data structures for game. No rules yet.

**Test:** Starting a game deals cards to all players.

**Estimated complexity:** Medium

---

### Phase 4: Turn Management
**Build:**
- TurnManager class
- Current player tracking
- Turn advancement
- Turn timer (basic timeout)

**Why fourth:** Needed before any actions can be processed.

**Test:** Turn rotates through players. Timer expires and advances turn.

**Estimated complexity:** Low

---

### Phase 5: Core Rules Engine
**Build:**
- RulesEngine class
- Card rank comparison
- Basic play validation (must be >= top card)
- Pick up pile logic

**Why fifth:** Core game loop. Most critical logic.

**Test:** Players can play valid cards. Invalid cards are rejected.

**Estimated complexity:** High (Shithead rules are complex)

**Sub-tasks:**
1. Basic play rules (rank comparison)
2. Special cards (2s, 8s, 10s)
3. Hand depletion → face-up → face-down progression
4. Burn logic (4 same rank)
5. Multiple cards of same rank
6. Invisible 8s (pile "memory")

---

### Phase 6: Swap Phase
**Build:**
- Pre-game swap phase
- Swap validation (hand ↔ face-up only)
- Phase transition (SWAP → PLAYING)

**Why sixth:** Separate from main game loop, can be built independently.

**Test:** Players can swap cards before game starts.

**Estimated complexity:** Medium

---

### Phase 7: Disconnect Handling
**Build:**
- Player connected/disconnected tracking
- Turn skipping for disconnected players
- Reconnection flow (authenticate + send full state)
- Grace period timer (60s)

**Why seventh:** Core game works without this, but critical for production.

**Test:** Player disconnects, reconnects with same ID, sees correct state.

**Estimated complexity:** Medium

---

### Phase 8: Win Conditions & Game End
**Build:**
- Win detection (all cards gone)
- Game end flow
- Final rankings (who finished 1st, 2nd, etc.)
- Room cleanup

**Why eighth:** Needs working game loop first.

**Test:** Player who gets rid of all cards wins. Game ends. Room cleans up.

**Estimated complexity:** Low

---

### Phase 9: Client State Management
**Build:**
- State Manager (client-side)
- Optimistic updates
- Reconciliation on server update
- Error rollback

**Why ninth:** Game is functional server-side, this adds responsiveness.

**Test:** Card play shows immediately, reconciles with server.

**Estimated complexity:** Medium

---

### Phase 10: Polish & Edge Cases
**Build:**
- Animation sync
- Better error messages
- Edge case handling (everyone disconnects, etc.)
- Performance optimization

**Why last:** Game is complete, this is refinement.

**Estimated complexity:** Variable

---

## Component Dependencies

```
Legend: A → B means "A depends on B" (build B first)

CLIENT SIDE:
UI Layer → State Manager → Network Client → WebSocket Manager (server)
Optimistic Validation → Rules Engine (duplicated client-side)

SERVER SIDE:
Lobby Manager → WebSocket Manager
Game Room Manager → WebSocket Manager, Game Instance
Game Instance → Turn Manager, Rules Engine
Turn Manager → (no dependencies)
Rules Engine → (no dependencies)

BUILD ORDER (most independent first):
1. WebSocket Manager (no deps)
2. Lobby Manager (depends on WS Manager)
3. Turn Manager (no deps, but not useful alone)
4. Rules Engine (no deps, but not useful alone)
5. Game Instance (depends on Turn Manager, Rules Engine)
6. Game Room Manager (depends on Game Instance, WS Manager)
7. Network Client (depends on WS Manager)
8. State Manager (depends on Network Client)
9. UI Layer (depends on State Manager)
```

---

## Scalability Considerations

### At 100 concurrent users (~25 games)
**Approach:** Single Node.js server, in-memory state

**Sufficient:** Yes. Node.js handles thousands of WebSocket connections easily.

**Infrastructure:**
- Single EC2 instance (t3.medium)
- No database needed
- ~5ms message latency

---

### At 10K concurrent users (~2,500 games)
**Approach:** Multiple Node.js servers behind load balancer

**Challenges:**
- Game state must be shared across servers (player connects to different server on reconnect)
- Need sticky sessions OR shared state store

**Infrastructure:**
- 10-20 EC2 instances behind ALB
- Redis for shared state (game state serialized)
- Sticky sessions by room code (all players in room → same server)

**Alternative:** Use Redis pub/sub for cross-server communication instead of sticky sessions.

---

### At 1M concurrent users (~250K games)
**Approach:** Microservices with distributed state

**Architecture changes:**
- Separate Lobby service from Game service
- Shard games across servers by room code hash
- Redis cluster for state
- Message queue for async processing (analytics, etc.)

**Infrastructure:**
- Kubernetes cluster
- Redis cluster (sharded)
- Kafka/SQS for events
- CDN for static assets

**Cost-benefit:** Not needed for MVP. Premature optimization.

---

## Technology Stack Implications

Based on this architecture, recommended stack:

**Server:**
- **Node.js** with **TypeScript** - Async I/O perfect for WebSocket concurrency
- **ws library** - Fast, mature WebSocket implementation
- **Express** (minimal) - For health checks, room creation endpoint (optional)

**Client:**
- **React** or **Svelte** - Component-based UI for card game
- **Native WebSocket API** - No need for Socket.io for this use case
- **Zustand** or **Jotai** - Lightweight state management

**Optional:**
- **Redis** - For multi-server deployment (not MVP)
- **PostgreSQL** - For game history/analytics (not MVP)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Server-authoritative pattern | HIGH | Industry standard for multiplayer games |
| WebSocket architecture | HIGH | Established pattern, well-documented |
| Component boundaries | HIGH | Clear separation of concerns |
| Build order | MEDIUM | Based on dependency analysis, but flexible |
| Scalability numbers | MEDIUM | Estimates, not verified with current sources |
| Shithead-specific rules | LOW | Complex game, may have edge cases not covered |

---

## Sources

This architecture is based on established patterns for real-time multiplayer games:

- Server-authoritative state: Industry standard (prevents cheating)
- WebSocket for bidirectional communication: Standard for real-time web apps
- State machine pattern: Common in game development
- Component boundaries: Software engineering best practices

**Note:** This document was created without access to current external sources (WebSearch, Context7 unavailable). Patterns are based on training data through January 2025. Recommendations should be verified against current documentation for specific libraries (ws, Socket.io alternatives, etc.) during implementation.

---

## Open Questions for Phase-Specific Research

These questions should be answered during implementation of specific phases:

1. **Phase 5 (Rules Engine):** Invisible 8s implementation - how to track "memory" of pile before 8 played?
2. **Phase 7 (Disconnect):** Should reconnected players see game history (what happened while disconnected)?
3. **Phase 9 (Client State):** How aggressive should optimistic updates be? (Every card play or only own actions?)
4. **Phase 10 (Polish):** Animation timing - wait for server confirmation or show immediately?

These are implementation details that require prototyping to determine best approach.
