# Phase 8: Turn Timing & Auto-Pickup - Research

**Researched:** 2026-02-08
**Domain:** Server-side turn timer with automatic play on timeout
**Confidence:** HIGH

## Summary

This phase implements a server-authoritative 45-second turn timer with automatic card play on timeout. The timer is enforced server-side using setInterval with tick broadcasting to all clients. On timeout, the server auto-plays a random valid card from the current player's available cards, or triggers pile pickup if no valid play exists. Face-down cards follow existing blind-play mechanics (random selection, check after flip).

The existing codebase already has a proven timer pattern from Phase 4's swap timer (Room.ts lines 229-241) that can be adapted for turn timing. Clients display a circular progress ring using SVG stroke animation. Timer synchronization follows a "server time broadcast" model where the server sends tick updates and clients render the countdown, avoiding clock drift issues common with client-side timers.

**Primary recommendation:** Extend the existing callback-based timer pattern from swap phase, add turn timer state to Room class, implement auto-play logic in GameEngine using existing canPlayOnPile validation, and use SVG stroke-dashoffset animation for the circular progress UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Timer duration & rules:**
- Fixed 45-second turn timer for all situations (hand, face-up, face-down)
- Same duration regardless of play phase — no special extensions
- No host configuration — 45s is the universal default
- Timer is server-authoritative (clients display, server enforces)

**Timeout auto-play behavior:**
- On timeout: server selects a random valid card from the player's playable cards and plays it
- If no valid card exists: player picks up the discard pile (auto-pickup)
- For face-down phase: pick a random face-down card blindly (consistent with Phase 7 blind play rules — check validity after flip, pickup pile if invalid)
- Auto-play triggers immediately when timer hits zero — no grace period
- After auto-play, normal game rules apply (burn gives extra turn, turn advances normally)
- No special penalty for timing out — game continues as if they played normally
- No AFK detection in this phase

**Timer visibility & feedback:**
- Circular progress ring that depletes as time runs out
- All players see the current player's countdown (shared tension)
- No color change or urgency cues — keep it simple for now
- No visual distinction between manual play and auto-play

### Claude's Discretion

- Brief delay before timer starts (1-2s after turn change) — Claude picks what feels natural
- Exact circular progress ring design and positioning
- How auto-play is communicated in the game event stream
- Timer synchronization approach between server and clients

### Deferred Ideas (OUT OF SCOPE)

- 3-second warning before timeout (visual urgency cue) — future version
- Color change on timer (green/yellow/red) — future version
- "Auto-played" label visible to other players — future version
- AFK detection (kick after N consecutive timeouts) — future version
- Host-configurable timer duration (30s/45s/60s presets) — future version

</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core

Since this is pure server-side timer logic with native JavaScript, no external libraries are required for core functionality:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| setInterval (native) | - | Server-side countdown | Built-in Node.js/Bun timer, proven in swap phase implementation |
| Math.random (native) | - | Random card selection for auto-play | Sufficient for game logic (not cryptographic use) |

### Supporting

For client-side circular progress visualization:

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SVG stroke-dashoffset | - | Circular progress animation | Standard web technique, no library needed |
| CSS animation | - | Smooth progress ring updates | Native browser capability |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setInterval | setTimeout (recursive) | setTimeout compensates for execution time but adds complexity; setInterval is simpler for 1-second ticks |
| Math.random | crypto.randomInt | Crypto adds unnecessary overhead for non-security game randomness |
| SVG stroke-dashoffset | vue3-circle-progress library | Library adds dependency for something achievable with ~10 lines of SVG |
| Server ticks | Client-side countdown with server validation | Risks clock drift and inconsistent timeouts across clients |

**Installation:**
```bash
# No additional dependencies required
# Existing stack (Bun, Vue 3, WebSocket) provides everything needed
```

## Architecture Patterns

### Recommended Timer State Structure

Add turn timer fields to Room class (following swap timer pattern):

```typescript
// In Room.ts
private turnTimer: ReturnType<typeof setInterval> | null = null;
private turnTimeRemaining: number = 45;
private turnStartDelay: number = 1500; // 1.5s delay before timer starts
private onTurnTimerTick?: (timeRemaining: number, currentPlayerIndex: number) => void;
private onTurnTimeout?: (playerId: string, playerIndex: number) => void;
```

### Pattern 1: Server-Authoritative Timer with Broadcast Ticks

**What:** Server manages the countdown using setInterval, broadcasts tick updates to all clients via WebSocket
**When to use:** Any multiplayer game with turn-based timing where synchronization matters

**Example:**
```typescript
// Source: Existing swap timer implementation (Room.ts:229-241)
startTurnTimer(playerIndex: number): void {
  this.turnTimeRemaining = 45;

  // Brief delay before starting countdown
  setTimeout(() => {
    this.onTurnTimerTick?.(this.turnTimeRemaining, playerIndex);

    this.turnTimer = setInterval(() => {
      this.turnTimeRemaining--;
      this.onTurnTimerTick?.(this.turnTimeRemaining, playerIndex);

      if (this.turnTimeRemaining <= 0) {
        this.handleTurnTimeout();
      }
    }, 1000);
  }, this.turnStartDelay);
}

clearTurnTimer(): void {
  if (this.turnTimer) {
    clearInterval(this.turnTimer);
    this.turnTimer = null;
  }
}
```

### Pattern 2: Auto-Play with Valid Card Detection

**What:** On timeout, find all valid cards the player can play, pick one randomly, execute play
**When to use:** Turn timeout logic where game should continue automatically

**Example:**
```typescript
// Source: Adapted from GameEngine.playCards validation logic
autoPlayForTimeout(state: GameState, playerId: string): OperationResult<GameState> {
  const player = state.players.find(p => p.playerId === playerId);
  if (!player) return { success: false, error: 'Player not found', code: 'PLAYER_NOT_FOUND' };

  const playSource = GameEngine.determinePlaySource(player, state.drawPile.length === 0);

  if (playSource === 'hand') {
    // Find all valid cards in hand
    const validIndices: number[] = [];
    for (let i = 0; i < player.hand.length; i++) {
      if (canPlayOnPile(player.hand[i], state.discardPile)) {
        validIndices.push(i);
      }
    }

    if (validIndices.length > 0) {
      // Random valid card
      const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      return GameEngine.playCards(state, playerId, [randomIndex]);
    } else {
      // No valid cards - pickup pile
      return GameEngine.pickupPile(state, playerId);
    }
  } else if (playSource === 'face-up') {
    // Similar logic for face-up cards
    const validIndices: number[] = [];
    for (let i = 0; i < player.faceUp.length; i++) {
      if (canPlayOnPile(player.faceUp[i], state.discardPile)) {
        validIndices.push(i);
      }
    }

    if (validIndices.length > 0) {
      const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      return GameEngine.playFromFaceUp(state, playerId, [randomIndex]);
    } else {
      return GameEngine.pickupPile(state, playerId);
    }
  } else if (playSource === 'face-down') {
    // Random blind play (always happens for face-down)
    const randomIndex = Math.floor(Math.random() * player.faceDown.length);
    return GameEngine.playFaceDownBlind(state, playerId, randomIndex);
  }

  return { success: false, error: 'No valid play source', code: 'INVALID_ACTION' };
}
```

### Pattern 3: SVG Circular Progress Ring

**What:** Use SVG circle with stroke-dasharray and stroke-dashoffset to create depleting ring animation
**When to use:** Circular countdown timers, progress indicators

**Example:**
```vue
<!-- Source: CSS-Tricks circular countdown timer pattern -->
<template>
  <div class="timer-ring">
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r="54"
        stroke="#e5e7eb"
        stroke-width="8"
        fill="none"
      />
      <circle
        cx="60"
        cy="60"
        r="54"
        stroke="#3b82f6"
        stroke-width="8"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeOffset"
        stroke-linecap="round"
        transform="rotate(-90 60 60)"
        class="timer-circle"
      />
    </svg>
    <div class="timer-text">{{ timeRemaining }}s</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  timeRemaining: number;
  totalTime: number;
}>();

const radius = 54;
const circumference = 2 * Math.PI * radius; // ~339.3

const strokeOffset = computed(() => {
  const progress = props.timeRemaining / props.totalTime;
  return circumference * (1 - progress);
});
</script>

<style scoped>
.timer-ring {
  position: relative;
  display: inline-block;
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  font-weight: bold;
}

.timer-circle {
  transition: stroke-dashoffset 1s linear;
}
</style>
```

### Pattern 4: Timer Lifecycle Management

**What:** Start timer on turn change, clear on player action, restart on next turn
**When to use:** Turn-based games with action timeouts

**Example:**
```typescript
// Source: Adapted from swap phase timer lifecycle

// In Room.ts playCards method - clear timer on action
playCards(playerId: string, cardIndices: number[]): OperationResult {
  // Clear current player's timer before processing action
  this.clearTurnTimer();

  if (!this.gameState) {
    return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
  }

  const result = GameEngine.playCards(this.gameState, playerId, cardIndices);

  if (result.success && result.data) {
    this.gameState = result.data;
    this.checkPostPlayState(playerId);

    // Start timer for next player
    if (this.gameState.phase === 'playing') {
      this.startTurnTimer(this.gameState.currentPlayerIndex);
    }

    return { success: true };
  }

  return result;
}
```

### Anti-Patterns to Avoid

- **Client-side countdown with server validation:** Creates timing inconsistencies across clients due to network latency and clock drift. Server should be the single source of truth.
- **No timer clear on action:** Letting timer run after player acts can cause double-action bugs. Always clear timer immediately on valid action.
- **Recursive setTimeout for initial start:** Using setTimeout to call itself for the countdown adds complexity. Use setTimeout once for the start delay, then setInterval for ticks.
- **Cryptographic random for card selection:** Using crypto.randomInt adds unnecessary overhead for non-security game mechanics where Math.random is sufficient.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timer drift compensation | Custom time tracking with performance.now() | Server-side ticks broadcast to clients | Server authoritative model eliminates drift; clients just display server time |
| Circular progress animation | Custom canvas rendering with frame updates | SVG stroke-dashoffset with CSS transition | Browser-native, hardware accelerated, 10 lines of code vs 100+ |
| Random without replacement (picking unique cards) | Custom shuffle algorithm | Math.random with existing valid card filter | Only picking one card at a time; no need for complex sampling |
| Client-server time sync protocol | Custom NTP-like ping/pong sync | Server broadcasts authoritative time | Game doesn't need millisecond precision; 1-second ticks sufficient |

**Key insight:** Timer accuracy is less critical than timer authority. It's acceptable if a client displays 44.8 seconds when server says 45, but unacceptable if clients disagree on when timeout occurs. Server-authoritative ticks solve this.

## Common Pitfalls

### Pitfall 1: Timer Continues After Player Acts

**What goes wrong:** Timer keeps running after player plays a card, causing timeout callback to fire on the next player's turn

**Why it happens:** Forgot to clear timer in action handlers (playCards, pickupPile, playFromFaceUp, playFaceDownBlind)

**How to avoid:**
- Add `this.clearTurnTimer()` at the start of every play action method
- Restart timer for new current player after state update
- Clear timer in Room cleanup/disconnect handlers

**Warning signs:**
- Timeout events firing for wrong player
- Multiple timeout events in quick succession
- Timer reaching zero when it's not the timed player's turn

### Pitfall 2: setInterval Accuracy Assumptions

**What goes wrong:** Assuming setInterval fires exactly every 1000ms, causing timer display to drift from actual elapsed time

**Why it happens:** JavaScript event loop delays can make setInterval fire slightly late (1002ms, 1005ms, etc.) which accumulates over 45 seconds

**How to avoid:**
- Accept ~1% drift as tolerable for game context (45-46 seconds actual vs 45 displayed)
- Server enforces timeout at exact tick count, not wall clock time
- Don't use Date.now() comparisons; use tick counter instead
- If precision critical, broadcast server timestamp with each tick (out of scope for this phase)

**Warning signs:**
- Timeouts firing earlier/later than displayed time suggests
- Inconsistent timeout durations across different turns
- Players reporting timer feels "off"

### Pitfall 3: Auto-Play Without Source Validation

**What goes wrong:** Auto-play tries to play from hand when player should be playing from face-up or face-down

**Why it happens:** Not using GameEngine.determinePlaySource() before selecting cards

**How to avoid:**
- Always call determinePlaySource(player, drawPileEmpty) first
- Match play source to correct action: hand → playCards, face-up → playFromFaceUp, face-down → playFaceDownBlind
- Test timeout during all three play phases (hand, face-up, face-down)

**Warning signs:**
- "Invalid action" errors on auto-play timeout
- Auto-play picking up pile when valid face-up cards exist
- Face-down cards not being auto-played correctly

### Pitfall 4: Multi-Card Play on Auto-Play

**What goes wrong:** Auto-play attempts to play multiple cards of the same rank, which may not be strategically appropriate

**Why it happens:** Trying to be "smart" by playing all valid cards of matching rank

**How to avoid:**
- User decision: auto-play picks ONE random valid card (CONTEXT.md: "random valid card rather than strategically optimal")
- Do NOT group cards by rank and play multiples
- Keep auto-play simple: filter valid cards, pick one random index, play that single card

**Warning signs:**
- Auto-play sometimes plays 2-3 cards at once
- Strategic advantage from auto-play (not desired behavior)
- Complex auto-play logic with rank grouping

### Pitfall 5: No Delay Before Timer Starts

**What goes wrong:** Timer starts counting down immediately on turn change, giving players no time to react

**Why it happens:** Starting setInterval immediately without initial delay

**How to avoid:**
- Wrap setInterval start in a setTimeout with 1-2 second delay
- User has discretion on exact delay (1000-2000ms range)
- Send initial tick broadcast after delay, before starting interval

**Warning signs:**
- Players feel rushed on turn transitions
- Timeout happens at ~43 seconds instead of 45
- First tick shows 44 seconds instead of 45

## Code Examples

Verified patterns from official sources and existing codebase:

### Timer Integration in Room Class

```typescript
// Source: Adapted from Room.ts swap timer (lines 229-241)

// Add to Room class properties
private turnTimer: ReturnType<typeof setInterval> | null = null;
private turnTimeRemaining: number = 45;
private readonly TURN_DURATION = 45;
private readonly TURN_START_DELAY = 1500; // 1.5 seconds
private onTurnTimerTick?: (timeRemaining: number, currentPlayerIndex: number) => void;
private onTurnTimeout?: (playerId: string, playerIndex: number) => void;

// Callback setter (called from handlers.ts)
setTurnTimerCallbacks(callbacks: {
  onTick: (timeRemaining: number, currentPlayerIndex: number) => void;
  onTimeout: (playerId: string, playerIndex: number) => void;
}): void {
  this.onTurnTimerTick = callbacks.onTick;
  this.onTurnTimeout = callbacks.onTimeout;
}

// Start timer for a player's turn
startTurnTimer(playerIndex: number): void {
  this.clearTurnTimer(); // Clear any existing timer
  this.turnTimeRemaining = this.TURN_DURATION;

  // Brief delay before countdown starts (gives player time to see it's their turn)
  setTimeout(() => {
    // Send initial tick
    this.onTurnTimerTick?.(this.turnTimeRemaining, playerIndex);

    // Start countdown
    this.turnTimer = setInterval(() => {
      this.turnTimeRemaining--;
      this.onTurnTimerTick?.(this.turnTimeRemaining, playerIndex);

      if (this.turnTimeRemaining <= 0) {
        this.handleTurnTimeout();
      }
    }, 1000);
  }, this.TURN_START_DELAY);
}

// Clear running timer
clearTurnTimer(): void {
  if (this.turnTimer) {
    clearInterval(this.turnTimer);
    this.turnTimer = null;
  }
}

// Handle timeout event
private handleTurnTimeout(): void {
  this.clearTurnTimer();

  if (!this.gameState || this.gameState.phase !== 'playing') return;

  const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
  if (!currentPlayer) return;

  // Notify via callback (handlers.ts will execute auto-play)
  this.onTurnTimeout?.(currentPlayer.playerId, this.gameState.currentPlayerIndex);
}
```

### Auto-Play Logic in GameEngine

```typescript
// Source: New method, follows patterns from playCards (lines 251-399)

/**
 * Automatically plays a random valid card for a player on timeout.
 * If no valid cards exist, picks up the pile.
 *
 * @param state - Current game state
 * @param playerId - ID of the player who timed out
 * @returns OperationResult with updated GameState
 */
static autoPlayOnTimeout(
  state: GameState,
  playerId: string
): OperationResult<GameState> {
  // Validate phase
  if (state.phase !== 'playing') {
    return {
      success: false,
      error: 'Can only auto-play during playing phase',
      code: 'INVALID_ACTION',
    };
  }

  // Find player
  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    return {
      success: false,
      error: 'Player not found',
      code: 'PLAYER_NOT_FOUND',
    };
  }

  const player = state.players[playerIndex];
  const playSource = this.determinePlaySource(player, state.drawPile.length === 0);

  if (playSource === 'hand') {
    // Find all valid cards in hand
    const validIndices: number[] = [];
    for (let i = 0; i < player.hand.length; i++) {
      if (canPlayOnPile(player.hand[i], state.discardPile)) {
        validIndices.push(i);
      }
    }

    if (validIndices.length > 0) {
      // Pick random valid card
      const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      return this.playCards(state, playerId, [randomIndex]);
    } else {
      // No valid cards - must pickup pile
      return this.pickupPile(state, playerId);
    }
  } else if (playSource === 'face-up') {
    // Find all valid face-up cards
    const validIndices: number[] = [];
    for (let i = 0; i < player.faceUp.length; i++) {
      if (canPlayOnPile(player.faceUp[i], state.discardPile)) {
        validIndices.push(i);
      }
    }

    if (validIndices.length > 0) {
      // Pick random valid face-up card
      const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      return this.playFromFaceUp(state, playerId, [randomIndex]);
    } else {
      // No valid face-up cards - must pickup pile
      return this.pickupPile(state, playerId);
    }
  } else if (playSource === 'face-down') {
    // Random blind play (consistent with Phase 7 blind mechanics)
    const randomIndex = Math.floor(Math.random() * player.faceDown.length);
    return this.playFaceDownBlind(state, playerId, randomIndex);
  }

  // Player eliminated (no cards) - should not happen during their turn
  return {
    success: false,
    error: 'Player has no cards to play',
    code: 'INVALID_ACTION',
  };
}
```

### WebSocket Message Schemas

```typescript
// Source: Add to packages/shared/src/schemas/messages.ts

// Server-to-client: Turn timer tick
export const turnTimerTickSchema = z.object({
  type: z.literal('turn-timer-tick'),
  timeRemaining: z.number().int().min(0).max(45),
  currentPlayerIndex: z.number(),
});

// Server-to-client: Turn timeout occurred (optional - for future auto-play indication)
export const turnTimeoutSchema = z.object({
  type: z.literal('turn-timeout'),
  playerId: z.string(),
  currentPlayerIndex: z.number(),
});

// Add to serverMessageSchema discriminated union
export const serverMessageSchema = z.discriminatedUnion('type', [
  // ... existing schemas
  turnTimerTickSchema,
  turnTimeoutSchema, // optional
  // ... rest
]);
```

### Vue Component: Circular Timer Display

```vue
<!-- Source: New component following SwapPhase.vue patterns -->
<template>
  <div class="turn-timer">
    <svg width="80" height="80" viewBox="0 0 80 80">
      <!-- Background circle -->
      <circle
        cx="40"
        cy="40"
        r="36"
        stroke="#e5e7eb"
        stroke-width="6"
        fill="none"
      />
      <!-- Progress circle -->
      <circle
        cx="40"
        cy="40"
        r="36"
        stroke="#3b82f6"
        stroke-width="6"
        fill="none"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeOffset"
        stroke-linecap="round"
        transform="rotate(-90 40 40)"
        class="progress-circle"
      />
    </svg>
    <div class="timer-text">{{ timeRemaining }}s</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  timeRemaining: number;
  totalTime: number;
}>();

const radius = 36;
const circumference = 2 * Math.PI * radius; // ~226.19

// Calculate how much of the circle to show
const strokeOffset = computed(() => {
  const progress = props.timeRemaining / props.totalTime;
  return circumference * (1 - progress);
});
</script>

<style scoped>
.turn-timer {
  position: relative;
  display: inline-block;
  width: 80px;
  height: 80px;
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
}

.progress-circle {
  transition: stroke-dashoffset 1s linear;
}
</style>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side countdown with server validation | Server-side countdown with client display | ~2020 | Eliminates clock drift, ensures consistent timeout across all clients |
| Canvas-based circular timers | SVG stroke-dashoffset with CSS | ~2021 | Simpler code, hardware accelerated, resolution independent |
| Crypto.randomInt for all randomness | Math.random for game logic, crypto for auth | Ongoing | Better performance for non-security contexts |
| Manual time tracking with Date.now() | Tick counter with setInterval | - | Simpler logic, avoids system clock changes affecting timers |

**Deprecated/outdated:**
- **Client-managed timers:** All modern multiplayer games use server-authoritative timing to prevent cheating and desync
- **requestAnimationFrame for countdown:** RAF is for visual rendering, not for time-based logic; use setInterval for countdowns
- **Vue 2 circular progress libraries:** Most haven't been updated; Vue 3 with composition API + SVG is the current standard

## Open Questions

Things that couldn't be fully resolved:

1. **Exact start delay duration**
   - What we know: User specifies 1-2 second delay before timer starts (Claude's discretion)
   - What's unclear: Whether 1000ms, 1500ms, or 2000ms feels most natural in practice
   - Recommendation: Start with 1500ms (1.5s), adjust based on playtesting feedback

2. **Auto-play event visibility**
   - What we know: User decided no visual distinction between manual play and auto-play for now (deferred to future phase)
   - What's unclear: Whether game event stream should include metadata about auto-play for logging/debugging
   - Recommendation: Add internal flag to game events (`wasAutoPlay: boolean`) but don't expose in UI yet; useful for future features and debugging

3. **Timer behavior during burns**
   - What we know: Burn gives same player another turn immediately
   - What's unclear: Should timer restart immediately, or should there be a brief pause to let player see the burn animation?
   - Recommendation: Restart timer immediately with standard 1.5s delay; burn animation happens client-side during delay period

4. **Timer during pile pickup timeout**
   - What we know: If no valid cards, player auto-picks up pile and turn advances
   - What's unclear: Should next player's timer start immediately, or wait for pile pickup animation?
   - Recommendation: Start next player's timer immediately (with standard 1.5s delay); animation doesn't block game logic

## Sources

### Primary (HIGH confidence)

- Existing codebase: Room.ts swap timer implementation (lines 229-241) - proven callback-based timer pattern
- Existing codebase: GameEngine.playCards (lines 251-399) - card validation and play logic
- Existing codebase: CardRules.canPlayOnPile (lines 59-83) - card playability validation
- Existing codebase: GameEngine.determinePlaySource (lines 491-513) - play phase detection
- [MDN: setInterval](https://developer.mozilla.org/en-US/docs/Web/API/setInterval) - Standard JavaScript timer API
- [MDN: Math.random](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random) - Standard random number generation

### Secondary (MEDIUM confidence)

- [CSS-Tricks: How to Create an Animated Countdown Timer With HTML, CSS and JavaScript](https://css-tricks.com/how-to-create-an-animated-countdown-timer-with-html-css-and-javascript/) - SVG circular countdown pattern
- [Medium: Syncing Countdown Timers Across Multiple Clients](https://medium.com/@flowersayo/syncing-countdown-timers-across-multiple-clients-a-subtle-but-critical-challenge-384ba5fbef9a) - Server-authoritative timer synchronization patterns
- [SitePoint: Creating Accurate Timers in JavaScript](https://www.sitepoint.com/creating-accurate-timers-in-javascript/) - setInterval accuracy considerations
- [DEV: Why Date.now() Depends on the User's Clock](https://dev.to/brinobruno/javascript-countdown-gotcha-why-datenow-depends-on-the-users-clock-2gl9) - Why not to use Date.now() for countdowns

### Tertiary (LOW confidence)

- [GitHub: vue3-circle-progress](https://github.com/delowardev/vue3-circle-progress) - Example Vue 3 circular progress library (not recommended; use native SVG)
- [NPM: timesync](https://www.npmjs.com/package/timesync) - Time synchronization library (overkill for 1-second tick game timer)
- [Medium: UE5 Multiplayer Turn-Based Timer UI](https://medium.com/@bellefeuilledillon/ue5-multiplayer-turn-based-attempt-timer-ui-6670f4488392) - Turn timer UI patterns in Unreal Engine

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using proven existing patterns from swap timer, no new dependencies
- Architecture: HIGH - Direct adaptation of working swap timer code, well-understood WebSocket broadcast pattern
- Pitfalls: MEDIUM - Some pitfalls are from codebase experience, others from web search on timer accuracy

**Research date:** 2026-02-08
**Valid until:** 30 days (stable JavaScript/WebSocket patterns, unlikely to change)
