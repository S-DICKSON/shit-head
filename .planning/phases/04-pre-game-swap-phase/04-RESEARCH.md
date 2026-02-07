# Phase 4: Pre-Game Swap Phase - Research

**Researched:** 2026-02-07
**Domain:** Real-time multiplayer game state synchronization with WebSocket
**Confidence:** HIGH

## Summary

This phase implements a 30-second simultaneous swap phase where players exchange hand cards with face-up cards. The core technical challenge is server-authoritative state management with real-time synchronization across all connected clients. The domain requires: (1) WebSocket message protocol for swap actions, (2) server-side validation and broadcasting, (3) countdown timer with early completion on ready state, and (4) debounced client-to-server messaging to prevent spam.

The existing codebase already implements the foundational patterns: discriminated union message protocol, server-authoritative Room/GameEngine architecture, pub/sub broadcasting via Bun WebSocket, and Zod schemas as single source of truth. This phase extends these patterns with new message types (swap-cards, ready-up, swap-phase-complete) and game state transitions.

**Primary recommendation:** Extend existing message protocol with swap message types, add GameEngine.swapCards() static method for server-side validation, use VueUse's useDebounceFn for swap message throttling, and implement countdown timer with setInterval on server that broadcasts remaining time every second.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Swap mechanics:**
- Tap-tap swap: player taps a hand card, then taps a face-up card — they swap instantly
- Unlimited swaps within the 30-second window, no cap on number of swaps
- Swapping back and forth freely serves as the undo mechanism (no explicit undo button)
- Each swap syncs to server immediately with a debounce to prevent spam
- Server is authoritative — swap validated and applied server-side

**Timer behavior:**
- Fixed 30-second duration, not configurable (host settings deferred to future version)
- Simple numeric countdown display (e.g., "27s")
- No urgency effects (no color change, no flashing in last seconds)
- When timer hits zero: brief 2-3 second "Let's play!" transition message before first turn begins

**Opponent visibility:**
- No swap activity indicators — you can't see when opponents are swapping (game log deferred)
- Opponents' face-up cards are visible throughout the swap phase (public information)
- Face-up cards update in real-time as opponents swap (natural result of server sync + broadcast)

**Ready state:**
- "Ready" button available — player can signal they're done swapping
- All players readying up skips remaining timer, game starts immediately
- Ready status is visible to all players (e.g., checkmark next to player name)

### Claude's Discretion

- Whether swapping after readying auto-un-readies the player or locks them out
- Debounce duration for swap messages
- Exact "Let's play!" transition design and timing
- How to display the ready button (placement, styling)

### Deferred Ideas (OUT OF SCOPE)

- Game log feature — swaps should be visible in a game log showing what cards were swapped
- Shithead indicator at game start — show who the current shithead is with a poo emoji
- Host-configurable swap timer duration — allow host to set 15s/30s/60s in lobby

</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun WebSocket | 1.x | Server-side WebSocket | Native Bun API, pub/sub pattern already established |
| Zod | 4.3.6 | Message validation | Project standard for schemas, discriminated unions |
| VueUse | 14.2.0 | Client-side utilities | Already in use for WebSocket, provides useDebounceFn |
| Vitest | 2.0.0 | Testing | Project standard for both client and server |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vueuse/core | 14.2.0 | Debounce, reactive utilities | Client-side state management and event throttling |
| Vue 3 Composition API | 3.5.0 | Reactive state | Client-side game UI and countdown display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setInterval (server) | setTimeout recursive | setInterval simpler for countdown, no concern about drift in 30s window |
| VueUse useDebounceFn | Lodash debounce | VueUse already in project, better TypeScript support, Vue-aware lifecycle |
| Server-side timer | Client-side countdown | Server authority prevents cheating, handles disconnects gracefully |

**Installation:**
No new dependencies required — all necessary libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── game/
│   ├── GameEngine.ts       # Add swapCards(), canTransitionToPlaying()
│   └── SwapTimer.ts        # NEW: Timer state management
├── rooms/
│   └── Room.ts             # Add swap state, ready tracking
└── websocket/
    └── handlers.ts         # Add swap-cards, ready-up handlers

packages/client/src/
├── composables/
│   ├── useGameSocket.ts    # Message handler for swap updates
│   └── useSwapPhase.ts     # NEW: Swap interaction logic with debounce
└── components/
    └── SwapPhase.vue       # NEW: Swap UI with timer and ready button

packages/shared/src/
├── schemas/
│   └── messages.ts         # Add swapCardsSchema, readyUpSchema
└── types/
    └── game.ts             # Add SwapState type, ready flags
```

### Pattern 1: Server-Authoritative Swap Validation

**What:** Server validates every swap request before applying state change and broadcasting to all clients.

**When to use:** All player actions that modify game state (follows existing pattern from Room.addPlayer, GameEngine.createGame).

**Example:**
```typescript
// Server-side validation in GameEngine
static swapCards(
  state: GameState,
  playerId: string,
  handIndex: number,
  faceUpIndex: number
): OperationResult<GameState> {
  // Validate phase
  if (state.phase !== 'swapping') {
    return { success: false, error: 'Not in swap phase', code: 'INVALID_ACTION' };
  }

  // Find player
  const player = state.players.find(p => p.playerId === playerId);
  if (!player) {
    return { success: false, error: 'Player not found', code: 'PLAYER_NOT_FOUND' };
  }

  // Validate indices
  if (handIndex < 0 || handIndex >= player.hand.length) {
    return { success: false, error: 'Invalid hand index', code: 'INVALID_ACTION' };
  }
  if (faceUpIndex < 0 || faceUpIndex >= player.faceUp.length) {
    return { success: false, error: 'Invalid face-up index', code: 'INVALID_ACTION' };
  }

  // Perform swap (immutable update)
  const newState = { ...state };
  const newPlayer = { ...player };
  [newPlayer.hand[handIndex], newPlayer.faceUp[faceUpIndex]] =
    [newPlayer.faceUp[faceUpIndex], newPlayer.hand[handIndex]];

  newState.players = state.players.map(p =>
    p.playerId === playerId ? newPlayer : p
  );

  return { success: true, data: newState };
}
```

### Pattern 2: Debounced Client-Side Swap Submission

**What:** Client immediately updates local optimistic UI, debounces server sync to prevent message spam.

**When to use:** High-frequency user interactions (card swapping) where immediate feedback is needed but server doesn't need every intermediate state.

**Example:**
```typescript
// Client-side composable
import { useDebounceFn } from '@vueuse/core';

export function useSwapPhase() {
  const { send } = useGameSocket();

  // Debounce swap messages to 150ms
  const sendSwapDebounced = useDebounceFn(
    (handIndex: number, faceUpIndex: number) => {
      send({
        type: 'swap-cards',
        handIndex,
        faceUpIndex,
      });
    },
    150, // 150ms debounce - balances responsiveness and server load
    { maxWait: 500 } // Force send after 500ms even with continuous swapping
  );

  const swapCards = (handIndex: number, faceUpIndex: number) => {
    // Optimistic local update (if needed)
    // ...

    // Debounced server sync
    sendSwapDebounced(handIndex, faceUpIndex);
  };

  return { swapCards };
}
```

### Pattern 3: Server-Broadcast Countdown Timer

**What:** Server manages timer state, broadcasts updates to all clients every second.

**When to use:** Synchronized state that must be consistent across all clients and prevent client-side manipulation.

**Example:**
```typescript
// Server-side timer in Room class
private swapTimer: NodeJS.Timeout | null = null;
private swapTimeRemaining: number = 30;

startSwapTimer(): void {
  this.swapTimeRemaining = 30;

  this.swapTimer = setInterval(() => {
    this.swapTimeRemaining--;

    // Broadcast countdown to all players
    const roomCode = this.code;
    this.broadcastToRoom({
      type: 'swap-timer-tick',
      timeRemaining: this.swapTimeRemaining,
    });

    if (this.swapTimeRemaining <= 0) {
      this.endSwapPhase();
    }
  }, 1000);
}

endSwapPhase(): void {
  if (this.swapTimer) {
    clearInterval(this.swapTimer);
    this.swapTimer = null;
  }

  // Transition to playing phase
  this.transitionToPlaying();
}
```

### Pattern 4: Ready State with Early Completion

**What:** Track per-player ready state, end phase early when all players ready.

**When to use:** Waiting phases where faster players shouldn't be blocked by timer (common in turn-based games).

**Example:**
```typescript
// In Room class
private readyPlayers: Set<string> = new Set();

markPlayerReady(playerId: string): void {
  this.readyPlayers.add(playerId);

  // Broadcast updated ready state
  this.broadcastToRoom({
    type: 'player-ready',
    playerId,
    readyCount: this.readyPlayers.size,
    totalPlayers: this.players.size,
  });

  // Check if all ready
  if (this.readyPlayers.size === this.players.size) {
    this.endSwapPhase();
  }
}
```

### Anti-Patterns to Avoid

- **Client-side timer as source of truth:** Timer must be server-authoritative to prevent cheating and handle disconnects. Client timers are for display only.
- **Synchronous swap validation blocking UI:** Use optimistic UI updates for instant feedback, let server reconciliation happen asynchronously.
- **No debounce on rapid swaps:** Without debounce, a player can spam hundreds of messages in 30 seconds, overloading server and network.
- **Broadcasting full game state on every swap:** Only broadcast the changed player's face-up cards, not entire game state (efficiency).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debouncing function calls | Custom setTimeout wrapper | VueUse useDebounceFn | Handles edge cases (maxWait, leading/trailing), Vue lifecycle aware, cancellation on unmount |
| WebSocket reconnection | Manual retry logic | VueUse useWebSocket | Already in use, handles exponential backoff, heartbeat, connection state |
| Countdown timer UI | Custom setInterval component | Reactive ref with computed formatting | Vue reactivity handles updates, simpler mental model |
| Discriminated union validation | Manual type checking | Zod discriminatedUnion | Runtime validation, type inference, consistent with project patterns |

**Key insight:** The project's existing architecture (Zod schemas, Bun WebSocket pub/sub, VueUse composables) already solves most hard problems. This phase is primarily about extending patterns, not creating new ones.

## Common Pitfalls

### Pitfall 1: Race Conditions on Rapid Swaps

**What goes wrong:** Player swaps card A with B, then immediately swaps B with C. Due to network latency, server receives requests out of order or with stale indices.

**Why it happens:** Indices become invalid after first swap completes, but second swap was sent before client received first swap confirmation.

**How to avoid:**
- Server validates indices on every swap (fail gracefully with error message)
- Don't rely on optimistic UI for indices — always use server state as truth
- Debounce prevents most rapid-fire conflicts (150ms window)

**Warning signs:** Client console errors "Invalid hand index" after rapid swapping, cards don't end up where expected.

### Pitfall 2: Timer Continues After Early Ready Completion

**What goes wrong:** All players ready up, game starts, but timer interval continues running and broadcasts dead messages.

**Why it happens:** Forgot to clear interval when ready state triggers early completion.

**How to avoid:**
```typescript
endSwapPhase(): void {
  // ALWAYS clear timer first
  if (this.swapTimer) {
    clearInterval(this.swapTimer);
    this.swapTimer = null;
  }

  // Then transition state
  this.transitionToPlaying();
}
```

**Warning signs:** Server logs show timer ticks after phase transition, memory leak from uncleaned intervals.

### Pitfall 3: Ready State Not Reset Between Games

**What goes wrong:** Player marked ready in first game stays "ready" for subsequent games without action.

**Why it happens:** Ready state persists in Room instance across multiple games.

**How to avoid:** Clear ready state in Room.startGame() or Room.dealCards():
```typescript
dealCards(): void {
  // Reset ready state for new swap phase
  this.readyPlayers.clear();

  const players = Array.from(this.players.values())...
}
```

**Warning signs:** Second game starts instantly without waiting for players, ready checkmarks show from previous game.

### Pitfall 4: Broadcasting Swap Updates to All Players Including Sender

**What goes wrong:** Player swaps card, server broadcasts update, player receives their own action back and applies it twice.

**Why it happens:** Using ws.publish() includes the sender in broadcast (unlike expected pub/sub behavior).

**How to avoid:**
- Use ws.publish() for room broadcasts (Bun's publish excludes sender)
- Document: "publish excludes sender" in code comments
- Test: Verify sender doesn't receive their own swap-cards-updated message

**Warning signs:** Cards swap twice on sender's screen, other players see correct state.

### Pitfall 5: Swap After Timeout but Before Phase Transition

**What goes wrong:** Timer hits zero, 2-3 second "Let's play!" transition shows, player manages to send swap during transition, swap succeeds.

**Why it happens:** Phase transitions from 'swapping' to 'playing' isn't atomic with timer expiration.

**How to avoid:** Set phase to 'transitioning' immediately when timer hits zero, reject swaps in any phase except 'swapping':
```typescript
// In endSwapPhase()
this.gameState.phase = 'transitioning';
this.broadcastTransitionMessage();

setTimeout(() => {
  this.gameState.phase = 'playing';
  this.broadcastGameStart();
}, 2500);
```

**Warning signs:** Swaps succeed during "Let's play!" message, final game state differs from expected.

## Code Examples

Verified patterns from existing codebase:

### Discriminated Union Message Schema
```typescript
// packages/shared/src/schemas/messages.ts
export const swapCardsSchema = z.object({
  type: z.literal('swap-cards'),
  handIndex: z.number().int().min(0).max(2), // 0-2 for 3 cards
  faceUpIndex: z.number().int().min(0).max(2),
});

export const readyUpSchema = z.object({
  type: z.literal('ready-up'),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  startGameSchema,
  swapCardsSchema, // NEW
  readyUpSchema,   // NEW
]);

export const swapTimerTickSchema = z.object({
  type: z.literal('swap-timer-tick'),
  timeRemaining: z.number().int().min(0).max(30),
});

export const playerReadySchema = z.object({
  type: z.literal('player-ready'),
  playerId: z.string(),
  readyPlayers: z.array(z.string()), // List of ready player IDs
});

export const swapPhaseCompleteSchema = z.object({
  type: z.literal('swap-phase-complete'),
  reason: z.enum(['timer-expired', 'all-ready']),
  transitionMessage: z.string(), // "Let's play!"
});

export const serverMessageSchema = z.discriminatedUnion('type', [
  roomCreatedSchema,
  roomJoinedSchema,
  roomUpdatedSchema,
  playerLeftSchema,
  gameStartingSchema,
  gameDealtSchema,
  swapTimerTickSchema,        // NEW
  playerReadySchema,           // NEW
  swapPhaseCompleteSchema,     // NEW
  errorSchema,
]);
```

### WebSocket Handler Pattern
```typescript
// packages/server/src/websocket/handlers.ts
case 'swap-cards': {
  const roomCode = ws.data.roomCode;
  if (!roomCode) {
    sendMessage(ws, {
      type: 'error',
      message: 'Not in a room',
      code: 'ROOM_NOT_FOUND',
    });
    return;
  }

  const room = manager.getRoom(roomCode);
  if (!room) {
    sendMessage(ws, {
      type: 'error',
      message: 'Room not found',
      code: 'ROOM_NOT_FOUND',
    });
    return;
  }

  const result = room.swapCards(
    ws.data.playerId,
    message.handIndex,
    message.faceUpIndex
  );

  if (!result.success) {
    sendMessage(ws, {
      type: 'error',
      message: result.error,
      code: result.code,
    });
    return;
  }

  // Broadcast updated face-up cards to all players
  const playerIds = room.getPlayerIds();
  for (const playerId of playerIds) {
    const view = room.getPlayerView(playerId);
    const playerWs = playerSockets.get(playerId);

    if (view && playerWs) {
      sendMessage(playerWs, {
        type: 'swap-cards-updated',
        hand: view.hand,
        faceUp: view.faceUp,
        opponents: view.opponents, // Updated face-up visible to all
      });
    }
  }
  break;
}
```

### TDD Test Pattern
```typescript
// packages/server/src/__tests__/swap-phase.test.ts
import { describe, it, expect } from 'vitest';
import { GameEngine } from '../game/GameEngine';

describe('GameEngine.swapCards', () => {
  it('swaps hand card with face-up card', () => {
    const state = GameEngine.createGame(
      [{ id: 'p1', nickname: 'Alice' }, { id: 'p2', nickname: 'Bob' }],
      0
    );

    const player = state.players[0];
    const originalHandCard = player.hand[0];
    const originalFaceUpCard = player.faceUp[1];

    const result = GameEngine.swapCards(state, 'p1', 0, 1);

    expect(result.success).toBe(true);
    expect(result.data!.players[0].hand[0]).toEqual(originalFaceUpCard);
    expect(result.data!.players[0].faceUp[1]).toEqual(originalHandCard);
  });

  it('rejects swap when not in swapping phase', () => {
    const state = GameEngine.createGame(
      [{ id: 'p1', nickname: 'Alice' }, { id: 'p2', nickname: 'Bob' }],
      0
    );
    state.phase = 'playing';

    const result = GameEngine.swapCards(state, 'p1', 0, 1);

    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_ACTION');
  });

  it('rejects swap with invalid hand index', () => {
    const state = GameEngine.createGame(
      [{ id: 'p1', nickname: 'Alice' }, { id: 'p2', nickname: 'Bob' }],
      0
    );

    const result = GameEngine.swapCards(state, 'p1', 5, 1);

    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_ACTION');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lodash debounce | VueUse useDebounceFn | Vue 3 ecosystem (2020+) | Better TypeScript support, Vue lifecycle integration, auto-cleanup |
| Client-side game timers | Server-authoritative timers | Modern multiplayer standards (2015+) | Prevents cheating, handles disconnects, consistent state |
| Full state broadcasts | Delta updates (partial state) | WebSocket optimization patterns (2018+) | Reduces bandwidth, faster updates, scales better |
| Polling for state sync | WebSocket push model | WebSocket adoption (2012+) | Real-time updates, lower latency, more responsive UX |

**Deprecated/outdated:**
- Client-authoritative game state: Vulnerable to cheating, doesn't handle disconnects
- @tailwind directives: Tailwind v4 uses @import "tailwindcss" (already correct in this project)
- Vue 2 Options API: Composition API is standard for Vue 3 (already used in this project)

## Open Questions

Things that couldn't be fully resolved:

1. **Swap after ready-up behavior**
   - What we know: User wants ready button, ready state visible to all, all-ready skips timer
   - What's unclear: Should swapping after ready-up un-ready the player, or lock them out from further swaps?
   - Recommendation: Un-ready on swap (more flexible, players can change mind). Test both in implementation, choose based on UX feel. Document decision in code comment.

2. **Optimal debounce duration**
   - What we know: Need debounce to prevent spam, want instant feel
   - What's unclear: 100ms? 150ms? 250ms? Depends on typical swap patterns
   - Recommendation: Start with 150ms (VueUse default), add maxWait: 500ms to force send. Profile in UAT, adjust if needed.

3. **"Let's play!" transition timing**
   - What we know: Brief 2-3 second message before gameplay
   - What's unclear: Exact duration, whether to show on client or server triggers
   - Recommendation: 2.5 seconds (2500ms setTimeout), server broadcasts transition message, clients display overlay. Allows time to read message without feeling slow.

4. **Ready button visual placement**
   - What we know: Button should be available, ready state visible
   - What's unclear: Placement relative to hand/face-up cards
   - Recommendation: Fixed position bottom-center (above hand cards), shows checkmarks for ready players in player list. Defer exact styling to implementation.

## Sources

### Primary (HIGH confidence)

**Project Codebase:**
- /Users/stephendickson/Personal/shit-head/packages/server/src/rooms/Room.ts - Room class patterns
- /Users/stephendickson/Personal/shit-head/packages/server/src/game/GameEngine.ts - Static utility methods
- /Users/stephendickson/Personal/shit-head/packages/server/src/websocket/handlers.ts - Message handler patterns
- /Users/stephendickson/Personal/shit-head/packages/shared/src/schemas/messages.ts - Discriminated union schemas
- /Users/stephendickson/Personal/shit-head/packages/client/src/composables/useGameSocket.ts - Client WebSocket singleton
- /Users/stephendickson/Personal/shit-head/.planning/STATE.md - Accumulated decisions from Phases 1-3

**Official Documentation:**
- VueUse useDebounceFn: https://vueuse.org/shared/usedebouncefn/
- Bun WebSocket API: https://bun.sh/docs/api/websockets
- Zod Discriminated Unions: https://zod.dev/

### Secondary (MEDIUM confidence)

- [Dmitri Pavlutin - How to Debounce and Throttle Callbacks in Vue](https://dmitripavlutin.com/vue-debounce-throttle/)
- [LogRocket - How to debounce and throttle in Vue](https://blog.logrocket.com/debounce-throttle-vue/)
- [Heroic Labs - Authoritative Multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/)
- [Medium - What are Server-authoritative Realtime Games?](https://medium.com/mighty-bear-games/what-are-server-authoritative-realtime-games-e2463db534d1)

### Tertiary (LOW confidence)

- [GameDev.net - Websocket-based realtime multiplayer communication](https://www.gamedev.net/forums/topic/686253-websocket-based-realtime-multiplayer-game-client-and-server-communication/)
- [GitHub - osu - Reconsider multiplayer ready state behavior](https://github.com/ppy/osu/discussions/21966)
- [DEV Community - Optimistic UI with Remix](https://dev.to/isnan__h/implementing-optimistic-ui-with-remix-19ap)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified versions in package.json
- Architecture: HIGH - Patterns directly from existing codebase (Room, GameEngine, handlers)
- Pitfalls: MEDIUM - Based on common WebSocket/multiplayer game patterns, some inferred from codebase structure
- Timer implementation: HIGH - Server-side setInterval is standard for authoritative timers
- Debounce patterns: HIGH - VueUse useDebounceFn is well-documented and project-standard

**Research date:** 2026-02-07
**Valid until:** 2026-03-09 (30 days — stable domain, unlikely to change)

**Research completeness:**
- All technical domains investigated (WebSocket protocol, timer sync, debouncing, state management)
- No blocking unknowns — all open questions have reasonable default recommendations
- Existing codebase provides clear patterns to extend — no new architectural decisions required
- Ready for planning phase
