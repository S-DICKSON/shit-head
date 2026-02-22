# Phase 25: Bot Player - Research

**Researched:** 2026-02-22
**Domain:** Server-side bot AI, room management, game loop integration
**Confidence:** HIGH

## Summary

The bot player implementation is entirely server-side: no new libraries are required. A bot is a server-managed entity that is registered as a regular player in an existing `Room` instance, bypasses the WebSocket layer entirely (it calls `Room` methods directly), and uses the existing `GameEngine` logic to select moves.

The key insight from reading the codebase is that **all game logic is already server-authoritative**. `GameEngine.autoPlayOnTimeout` already implements a random-valid-card strategy that can serve as the bot's move engine with minor enhancements for smarter play. The bot needs: a unique player ID, registration into the `Room.players` Map, and a timer-based game loop that fires actions when the game state shows the bot as the current player.

The host adds/removes bots from the lobby via new WebSocket messages (`add-bot`, `remove-bot`). The bot's move loop lives inside a `BotPlayer` class on the server. When a bot's turn arrives (detected via a room callback or a polling loop), it calls the same `Room.playCards`, `Room.pickupPile`, etc. methods that WebSocket handlers call for human players. After each bot action, the handler code broadcasts to all connected human players exactly as it does for human actions.

**Primary recommendation:** Implement bots as pure server-side `BotPlayer` objects registered directly into `Room` without any WebSocket connection. Reuse the existing broadcast logic in `websocket/handlers.ts` by extracting shared "broadcast game state" helpers.

## Standard Stack

No new dependencies required.

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nanoid` | existing | Generate bot player IDs | Already used for human player IDs |
| `@shit-head/shared` | workspace | `canPlayOnPile`, `GameEngine`, card types | Single source of truth for all game logic |

### No External Bot AI Libraries Needed
The game is simple enough (finite card set, clear rules) that a heuristic strategy implemented in plain TypeScript is sufficient. External MCTS or minimax libraries would be massive overkill.

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── game/
│   ├── GameEngine.ts       # (existing) - bot reuses autoPlayOnTimeout logic
│   └── BotPlayer.ts        # NEW: bot state machine + move selection logic
├── rooms/
│   ├── Room.ts             # (modify) - addBot/removeBot methods, isBot() flag
│   └── RoomManager.ts      # (modify) - bot player ID tracking
└── websocket/
    └── handlers.ts         # (modify) - add-bot/remove-bot message handlers,
                            #            extract broadcastGameState helpers
```

### Pattern 1: Bot as an Internal Room Player

**What:** Bot has a `playerId` (nanoid-generated, prefixed `bot_` for identification), is added to `Room.players` map like a human, and has a separate `BotPlayer` instance that holds the turn-taking logic.

**When to use:** This is the only viable approach — the server needs to track bots in game state exactly like human players (same `PlayerGameState` with cards dealt), and broadcast from the same code paths.

**Example (conceptual):**
```typescript
// BotPlayer.ts
export class BotPlayer {
  public readonly playerId: string;
  public readonly nickname: string;
  private room: Room;
  private moveDelayMs: number = 1500; // Simulate human think time

  constructor(nickname: string, room: Room) {
    this.playerId = `bot_${nanoid()}`;
    this.nickname = nickname;
    this.room = room;
  }

  // Called when it becomes this bot's turn
  takeTurn(gameState: GameState): void {
    setTimeout(() => {
      this.selectAndPlayMove(gameState);
    }, this.moveDelayMs);
  }

  private selectAndPlayMove(state: GameState): void {
    // Use shared canPlayOnPile logic for move selection
    // Strategy: play best valid card(s), pickup if none
    // ...
  }
}
```

### Pattern 2: Turn Detection via Existing Callbacks

**What:** `Room` fires `onPlayPhaseStart`, `onTurnTimerTick` callbacks. The bot turn detection hooks into `onPlayPhaseStart` (and the turn timeout `onTimeout` already auto-plays — bots can piggyback this).

**When to use:** Bot needs to know when its turn starts. The existing `onPlayPhaseStart(currentPlayerIndex, firstTurn)` callback in `Room.ts` is already broadcast to all players. A bot coordinator in `handlers.ts` checks if the new current player is a bot and triggers `BotPlayer.takeTurn()`.

**Critical detail:** The bot must call `room.clearTurnTimer()` before making its move (same as `room.playCards` does — already embedded in those methods). The existing `Room.playCards`, `Room.pickupPile` etc. already call `clearTurnTimer()` internally, so no special handling needed.

### Pattern 3: Swap Phase Handling

**What:** Bots should auto-ready during the swap phase. Since the swap phase uses `room.markPlayerReady(playerId)`, the bot coordinator calls this immediately (or with a short delay) when the swap phase starts.

**When to use:** Bot join triggers `onSwapPhaseComplete` or the existing swap timer. Bot strategy: skip swapping (or randomly swap one card) and immediately call `markPlayerReady`.

### Pattern 4: Bot Strategy — Enhanced autoPlayOnTimeout

The existing `GameEngine.autoPlayOnTimeout` already does random valid card selection. For a slightly smarter bot:

```typescript
// Prefer playing multiple same-rank cards in one turn (already validated by GameEngine)
// When playing from hand: group cards by rank, prefer playing all of lowest valid rank
// When 7 is effective top: play highest card that is <= 7 (strategic)
// Special cards (2, 8, 10): always play them if available (they're always valid)
// Face-down: pure random (must be, cards are hidden)
```

**Important:** The bot uses `GameEngine.determinePlaySource()` (already exported) to know whether to play from hand, face-up, or face-down — same as humans.

### Anti-Patterns to Avoid

- **Creating a WebSocket connection for the bot:** Unnecessary complexity. The bot lives in-process on the server; calling `Room` methods directly is cleaner and avoids connection overhead.
- **Storing bot state in `Room.players` with extra fields:** Use a separate `Set<string>` of bot IDs in `Room` to distinguish bots from humans (e.g., `this.botPlayerIds: Set<string>`). The `GameState.players` array should stay identical for bot and human (both are `PlayerGameState` objects).
- **Putting bot move logic in `Room.ts`:** Keep `Room.ts` focused on state management. `BotPlayer.ts` owns move selection; the handler wires them together.
- **Using the turn timer auto-timeout for bots:** Bots should act proactively (within 1-2s of their turn starting), not wait for the full 30-45s turn timer. If bots rely on auto-timeout, games become very slow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Valid move detection | Custom bot card validator | `canPlayOnPile` from `@shit-head/shared` | Already handles all special card rules, 7-constraint, empty pile |
| Play source detection | Custom bot card source logic | `GameEngine.determinePlaySource()` | Already handles hand→face-up→face-down progression |
| Game state broadcasting | Bot-specific broadcast code | Existing per-player broadcast loops in handlers.ts | Bots don't receive messages but human players still need updates after bot moves |
| Bot turn randomness | Custom random delay | `setTimeout` with 1000-2000ms | Simple, sufficient, prevents "instant bot" feel |

**Key insight:** The server is already authoritative and already has all the logic needed. The bot is just a client that calls server methods directly instead of over WebSocket.

## Common Pitfalls

### Pitfall 1: Bot ID Collisions with Human Players
**What goes wrong:** Bot IDs generated without a prefix could theoretically match stored human player IDs, causing reconnection confusion.
**Why it happens:** `nanoid()` is used for both.
**How to avoid:** Prefix bot IDs with `bot_` (e.g., `bot_${nanoid()}`). This also makes it easy to identify bots in logs and the `isBot()` check.
**Warning signs:** A human tries to reconnect with a bot's ID.

### Pitfall 2: Bot Acts on Stale Game State
**What goes wrong:** Bot captures game state at turn-start, then 1.5s later the state has changed (e.g., another event occurred — though this shouldn't happen in practice since turns are strictly sequential).
**Why it happens:** Async `setTimeout` in bot turn logic.
**How to avoid:** Re-fetch state from `room.getGameState()` at the moment of action, not from the captured closure. Validate `gameState.currentPlayerIndex` still points to the bot before acting.
**Warning signs:** Bot tries to play but gets `NOT_YOUR_TURN` error.

### Pitfall 3: Host Removes a Bot That Is Currently Taking Its Turn
**What goes wrong:** Host sends `remove-bot` while the bot's `setTimeout` for its move is pending. The bot's timeout fires after removal and tries to call `room.playCards()` for a player no longer in the room.
**Why it happens:** Race condition between removal and pending setTimeout.
**How to avoid:** Check `room.getGameState()?.players.find(p => p.playerId === this.playerId)` before acting. If player no longer exists, abort the move.
**Warning signs:** `PLAYER_NOT_FOUND` errors appearing in bot move callbacks.

### Pitfall 4: Bot Doesn't Handle Turn Timer Properly
**What goes wrong:** Bot takes its turn, but `Room.startTurnTimer()` starts running for the next player before the bot's response has been broadcast. Or worse, the timer fires while the bot is computing.
**Why it happens:** `Room.playCards` etc. already call `clearTurnTimer()` then `startTurnTimer()` internally — this is correct. But if the bot uses a `setTimeout(move, delay)` approach, the turn timer for the bot's turn is ticking down during that delay.
**How to avoid:** This is acceptable — the 1.5s bot delay is within the 30-45s turn timer. But the bot must make its move before the timer fires. If the timer fires first, `autoPlayOnTimeout` runs instead — which is fine as a fallback.
**Warning signs:** Bots frequently timing out instead of acting proactively.

### Pitfall 5: Broadcast Missing After Bot Actions
**What goes wrong:** Bot calls `room.playCards()`, state updates, but no `card-played` messages are sent to human players because the bot didn't go through `handlers.ts` which does the broadcasting.
**Why it happens:** The WebSocket handler's broadcast logic is interleaved with the action handling.
**How to avoid:** After each bot action, trigger the same broadcast logic that `handlers.ts` uses. Extract a `broadcastCardPlayed(room, playerId)` helper function in `handlers.ts` and call it from both the WebSocket handler and the bot action callback. The bot coordinator is set up in the same place callbacks are wired (inside the `start-game` handler's `setTimeout`).
**Warning signs:** Human players see a frozen game state after a bot plays.

### Pitfall 6: Lobby UI Shows Bot as Regular Player
**What goes wrong:** The client's player list shows bots identically to humans, with a "(You)" label and rename button.
**Why it happens:** `LobbyPlayer` in `RoomState` doesn't distinguish bots.
**How to avoid:** Add an `isBot?: boolean` field to `LobbyPlayer` (shared type). Bot players get `isBot: true`. The client can then show a robot icon and suppress rename/leave controls for bot entries.
**Warning signs:** Host tries to rename a bot and it works (undesirable).

### Pitfall 7: Play Again / Return to Lobby with Bots
**What goes wrong:** After game over, `resetToLobby()` removes players who didn't click play-again. Bots never click play-again, so they'd always be removed.
**Why it happens:** `markPlayAgain` requires a playerId from a human WebSocket message.
**How to avoid:** Either: (a) automatically include bot IDs in `playAgainPlayers` when the game ends, OR (b) remove all bots from the room on game over and let the host add them again in the next lobby. Option (b) is simpler. The `onReturnToLobby` callback can clean up bot references.
**Warning signs:** Room empties unexpectedly after game over.

## Code Examples

### Adding a Bot to a Room (server-side)

```typescript
// In Room.ts - new method
addBot(botId: string, botNickname: string): OperationResult {
  if (this.status !== 'waiting') {
    return { success: false, error: 'Cannot add bot after game starts', code: 'INVALID_ACTION' };
  }
  if (this.players.size >= this.maxPlayers) {
    return { success: false, error: 'Room is full', code: 'ROOM_FULL' };
  }
  this.players.set(botId, {
    id: botId,
    nickname: botNickname,
    isHost: false,
    avatarHash: null,
    discordUserId: null,
    isBot: true, // new field
  });
  this.botPlayerIds.add(botId);
  return { success: true };
}

removeBot(botId: string): OperationResult {
  if (!this.botPlayerIds.has(botId)) {
    return { success: false, error: 'Not a bot', code: 'PLAYER_NOT_FOUND' };
  }
  this.players.delete(botId);
  this.botPlayerIds.delete(botId);
  return { success: true };
}

isBot(playerId: string): boolean {
  return this.botPlayerIds.has(playerId);
}

getBotIds(): string[] {
  return Array.from(this.botPlayerIds);
}
```

### Bot Move Selection (BotPlayer.ts)

```typescript
// Source: existing GameEngine.autoPlayOnTimeout pattern, enhanced
selectMove(state: GameState): BotMove {
  const player = state.players.find(p => p.playerId === this.playerId)!;
  const playSource = GameEngine.determinePlaySource(player, state.drawPile.length === 0);

  if (playSource === 'hand') {
    return this.selectHandMove(player, state.discardPile, state.firstTurn);
  } else if (playSource === 'face-up') {
    return this.selectFaceUpMove(player, state.discardPile);
  } else {
    // face-down: random (hidden cards)
    const idx = Math.floor(Math.random() * player.faceDown.length);
    return { type: 'face-down', index: idx };
  }
}

private selectHandMove(player, discardPile, firstTurn): BotMove {
  if (firstTurn) {
    // Must play all lowest cards — GameEngine enforces this, just find them
    const lowestIndices = findLowestCardIndices(player.hand);
    return { type: 'play', indices: lowestIndices };
  }

  // Group valid cards by rank, prefer playing multiple same-rank
  const validByRank = groupValidCardsByRank(player.hand, discardPile);
  if (validByRank.size === 0) {
    return { type: 'pickup' };
  }

  // Simple strategy: play lowest valid rank (all copies)
  const lowestValid = findLowestRankGroup(validByRank);
  return { type: 'play', indices: lowestValid };
}
```

### Wiring Bot Callbacks in handlers.ts

```typescript
// After room.startGame() is called:
const botIds = room.getBotIds();
const botPlayers = new Map<string, BotPlayer>();

for (const botId of botIds) {
  const botPlayer = new BotPlayer(botId, room);
  botPlayers.set(botId, botPlayer);
}

// In onPlayPhaseStart callback:
onPlayPhaseStart: (currentPlayerIndex, firstTurn) => {
  broadcastToRoom(room, { type: 'turn-changed', currentPlayerIndex, firstTurn });

  // Check if it's a bot's turn
  const currentPlayerId = room.getGameState()?.players[currentPlayerIndex]?.playerId;
  if (currentPlayerId && room.isBot(currentPlayerId)) {
    const bot = botPlayers.get(currentPlayerId);
    bot?.scheduleTurn(() => {
      // After bot acts, broadcast result
      broadcastCardPlayed(room, currentPlayerId);
    });
  }
}
```

### New WebSocket Message Schemas (shared/src/schemas/messages.ts)

```typescript
export const addBotSchema = z.object({
  type: z.literal('add-bot'),
  // Optional: bot nickname override, otherwise server assigns "Bot 1", "Bot 2" etc.
  nickname: z.string().min(1).max(20).optional(),
});

export const removeBotSchema = z.object({
  type: z.literal('remove-bot'),
  botId: z.string(),
});

// Server response: room-updated (existing) with isBot field on player
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| External AI library | Pure heuristic TypeScript | No dep needed; game is simple enough |
| Separate bot WebSocket | Direct Room method calls | Simpler, no network overhead, no auth issues |
| Bot as spectator | Bot as full player (in GameState) | Correct — bot needs cards dealt to it |

## Open Questions

1. **Should bots survive room return-to-lobby?**
   - What we know: `resetToLobby()` removes players who didn't mark play-again. Bots can't mark play-again.
   - What's unclear: Whether users prefer bots to persist or be removed automatically.
   - Recommendation: Auto-remove bots on game over, let host re-add them. Simpler state management.

2. **Should bots be visible in Discord Activity mode?**
   - What we know: Discord rooms use `joinOrCreate` flow; bots would appear as `LobbyPlayer` entries with `isBot: true`.
   - What's unclear: Whether the Discord client UI (`DiscordLobby.vue`) needs special bot display handling.
   - Recommendation: Both `Lobby.vue` and `DiscordLobby.vue` should show bot entries with a robot icon and no rename/kick controls for non-host players. Host can remove bots.

3. **How many bots max?**
   - What we know: Room has `maxPlayers = 4`, `minPlayers = 2`.
   - Recommendation: Limit bots to `maxPlayers - 1` (3 bots max, so solo play with 1 human + 3 bots is possible).

4. **Should `LobbyPlayer.isBot` be added to the shared type?**
   - What we know: `LobbyPlayer` in `shared/src/types/room.ts` currently has no bot flag; the Room's player map has an `isBot` field but it's internal.
   - Recommendation: Yes, add `isBot?: boolean` to `LobbyPlayer` so the client can render bot entries distinctly.

## Sources

### Primary (HIGH confidence)
- Direct code reading: `/packages/server/src/rooms/Room.ts` - Room player management, callbacks, timers
- Direct code reading: `/packages/server/src/game/GameEngine.ts` - `autoPlayOnTimeout`, `determinePlaySource`, `playCards`, etc.
- Direct code reading: `/packages/server/src/websocket/handlers.ts` - Broadcast patterns, callback wiring
- Direct code reading: `/packages/shared/src/game/cardRules.ts` - `canPlayOnPile`, `detectBurn`, special card rules
- Direct code reading: `/packages/shared/src/types/room.ts` - `LobbyPlayer`, `RoomState` structures
- Direct code reading: `/packages/client/src/components/Lobby.vue` - UI patterns to understand what client changes are needed

### Secondary (MEDIUM confidence)
- Pattern inference: Bot-as-direct-room-caller pattern is standard for in-process game bots; no WebSocket needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, everything reuses existing code
- Architecture: HIGH - read all relevant server files; patterns are clear from existing callback/handler structure
- Pitfalls: HIGH - identified from reading actual Room.ts and handlers.ts code flows
- Bot strategy: HIGH - `canPlayOnPile` and `determinePlaySource` are the primitives; strategy is pure heuristic

**Research date:** 2026-02-22
**Valid until:** Stable (no external dependencies)
