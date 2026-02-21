# Phase 20: Sound & Settings - Research

**Researched:** 2026-02-18
**Domain:** Web Audio API, localStorage persistence, WebSocket message protocol extension, Vue 3 composables
**Confidence:** HIGH

## Summary

This phase adds two features: a sound mute toggle (client-only, localStorage-persisted) and a host-configurable round time (30s/45s/60s, set in lobby before game start). The codebase already has a sound system (`useSoundEffects.ts`) that plays a beep via Web Audio API, but has no mute capability. The turn timer is hardcoded to 45 seconds on both server (`TURN_DURATION = 45` in `Room.ts`) and client (`TurnTimer` receives `:total-time="45"` hardcoded in `PlayingPhase.vue`).

For the mute toggle: this is purely client-side. Read/write a `shithead-muted` key from localStorage. Add a `isMuted` ref to `useSoundEffects.ts` (already module-level), wrap `playBeep()` to check the flag. Expose a toggle function. Add a speaker icon button to the game UI (fixed position, accessible in both lobby and game views).

For configurable round time: this requires changes at three layers. (1) A new `set-round-time` client-to-server WebSocket message that only the host can send during the lobby phase. (2) Server-side: `Room.ts` exposes a `setRoundTime()` method that updates `TURN_DURATION` from the hardcoded 45 to the chosen value, and `RoomState` needs a `roundTime` field so all clients know the configured value. (3) Client-side: `Lobby.vue` host section shows a round time selector (30/45/60), `TurnTimer` receives the configured value instead of the hardcoded 45, and `useGameSocket.ts` tracks the configured `roundTime` from room state.

**Primary recommendation:** Keep sound mute entirely client-side in a new `useSoundSettings.ts` composable. Extend `RoomState` (shared types) with `roundTime: 30 | 45 | 60`, add a `set-round-time` client message, handle it in `handlers.ts`, and expose `setRoundTime()` on `Room`.

## Standard Stack

No new library dependencies required. All needed tools are already present:

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | Browser native | Sound generation | Already used in `useSoundEffects.ts` — oscillator + gain node pattern |
| localStorage | Browser native | Mute persistence | Already used in `useGameSocket.ts` for `shithead-player-id` and `shithead-room-code` |
| Vue 3 composables | vue ^3.5.0 | Reactive state | Project-wide pattern for all client state |
| Zod | Already in shared | Schema validation | All WebSocket messages validated with Zod schemas |

### No New Dependencies Needed

The entire feature set can be built with what is already installed. The sound system uses the native Web Audio API (no Howler.js or Tone.js needed). Settings persistence uses native localStorage.

**Installation:** No new packages to install.

## Architecture Patterns

### Recommended Project Structure Changes

```
packages/
├── shared/src/
│   ├── types/
│   │   └── room.ts              # Add roundTime: 30 | 45 | 60 to RoomState
│   └── schemas/
│       └── messages.ts          # Add setRoundTimeSchema, extend roomStateSchema
│
├── server/src/
│   └── rooms/
│       └── Room.ts              # Add setRoundTime(), use this.TURN_DURATION dynamically
│
└── client/src/
    ├── composables/
    │   ├── useSoundEffects.ts   # Add isMuted ref, toggleMute(), persist to localStorage
    │   └── useSoundSettings.ts  # [Optional] Wrapper that co-locates mute state
    └── components/
        ├── Lobby.vue            # Host: round time selector (30/45/60 dropdown or buttons)
        ├── DiscordLobby.vue     # Host: same round time selector
        ├── PlayingPhase.vue     # Pass roundTime from roomState instead of hardcoded 45
        └── MuteButton.vue       # NEW: Speaker icon toggle, fixed position overlay
```

### Pattern 1: Mute State in useSoundEffects (Module-Level Singleton)

**What:** Extend the existing `useSoundEffects.ts` composable to hold mute state at module level (same pattern as `audioContext`). Load from localStorage on first access.

**When to use:** The composable is already used throughout the app. Adding mute at module level means all instances share state automatically — no need for a separate composable or Pinia store.

**Example:**
```typescript
// Source: existing useSoundEffects.ts pattern (extended)
let audioContext: AudioContext | null = null;
let isMuted: boolean = localStorage.getItem('shithead-muted') === 'true';

export function useSoundEffects() {
  const muteState = ref(isMuted);

  function toggleMute(): void {
    isMuted = !isMuted;
    muteState.value = isMuted;
    localStorage.setItem('shithead-muted', String(isMuted));
  }

  function playBeep(): void {
    if (isMuted) return; // Early exit when muted
    try {
      // ... existing code unchanged
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  function playTurnNotification(): void {
    playBeep();
  }

  return {
    muteState,     // reactive ref for UI binding
    toggleMute,
    playTurnNotification,
  };
}
```

**Key:** `isMuted` is a module-level boolean (fast, no reactivity overhead). `muteState` is a `ref` created per composable call but initialized from the module-level value — ensure `muteState` stays in sync with `isMuted` on toggle.

### Pattern 2: Round Time via RoomState (Server-Authoritative)

**What:** The round time is stored in `RoomState` so all clients receive it via existing `room-created`, `room-joined`, `room-updated`, and `return-to-lobby` messages. No separate subscription needed.

**When to use:** Any room configuration that applies to all players must be server-authoritative. Never store round time only client-side.

**Shared type change (room.ts):**
```typescript
export type RoundTime = 30 | 45 | 60;

export type RoomState = {
  code: string;
  players: LobbyPlayer[];
  status: RoomStatus;
  hostId: string;
  maxPlayers: 4;
  minPlayers: 2;
  spectatorCount: number;
  shitheadPlayerId: string | null;
  roundTime: RoundTime;  // NEW: default 45
};
```

**Schema change (messages.ts):**
```typescript
const roundTimeSchema = z.union([z.literal(30), z.literal(45), z.literal(60)]);

const roomStateSchema: z.ZodType<RoomState> = z.object({
  // ... existing fields ...
  roundTime: roundTimeSchema,
});

export const setRoundTimeSchema = z.object({
  type: z.literal('set-round-time'),
  roundTime: roundTimeSchema,
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  // ... existing schemas ...
  setRoundTimeSchema,
]);
```

**Server Room.ts change:**
```typescript
private roundTime: RoundTime = 45;

setRoundTime(time: RoundTime): OperationResult {
  if (this.status !== 'waiting') {
    return { success: false, error: 'Cannot change round time after game starts', code: 'INVALID_ACTION' };
  }
  this.roundTime = time;
  return { success: true };
}

getState(): RoomState {
  return {
    // ... existing fields ...
    roundTime: this.roundTime,
  };
}

startTurnTimer(playerIndex: number): void {
  this.clearTurnTimer();
  this.turnTimeRemaining = this.roundTime; // Use configured value, not hardcoded TURN_DURATION
  // ... rest unchanged
}
```

### Pattern 3: MuteButton Component (Fixed Overlay)

**What:** A small fixed-position button (speaker icon) visible in game view. Uses emoji/SVG for icon. Toggle between `🔊` (unmuted) and `🔇` (muted).

**Placement:** Fixed to top-right of game screen (similar to Leave button pattern on top-left). Must not conflict with existing `spectatorCount` display.

**Example:**
```vue
<!-- MuteButton.vue -->
<script setup lang="ts">
import { useSoundEffects } from '../composables/useSoundEffects';
const { muteState, toggleMute } = useSoundEffects();
</script>

<template>
  <button
    class="fixed top-2 right-12 z-40 px-2 py-1 text-lg bg-gray-800/70 hover:bg-gray-800/90 rounded-full backdrop-blur-sm transition-all"
    :title="muteState ? 'Unmute sounds' : 'Mute sounds'"
    :aria-label="muteState ? 'Unmute sounds' : 'Mute sounds'"
    @click="toggleMute"
  >
    {{ muteState ? '🔇' : '🔊' }}
  </button>
</template>
```

**Note:** Positioning must account for existing elements. In `PlayingPhase.vue`, the spectator count occupies `top-2 right-2`. Place mute button at `right-12` or `right-10` to avoid overlap.

### Pattern 4: Lobby Round Time Selector (Host Only)

**What:** In `Lobby.vue` and `DiscordLobby.vue`, the host section (currently just "Start Game" button) gains a round time picker. Non-hosts see the current round time as read-only text.

**Example (host section in Lobby.vue):**
```vue
<!-- Host Controls section addition -->
<div v-if="isHost" class="mt-4 mb-2">
  <label class="block text-sm font-medium text-gray-700 mb-1">Round Time</label>
  <div class="flex gap-2">
    <button
      v-for="time in [30, 45, 60]"
      :key="time"
      :class="[
        'px-3 py-1 rounded text-sm font-medium border transition-all',
        roomState?.roundTime === time
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      ]"
      @click="setRoundTime(time)"
    >
      {{ time }}s
    </button>
  </div>
</div>
```

**Send function:**
```typescript
const setRoundTime = (time: 30 | 45 | 60) => {
  send({ type: 'set-round-time', roundTime: time });
};
```

Server broadcasts `room-updated` after successful `set-round-time`. All clients receive the new `roundTime` via existing `room-updated` handler in `useGameSocket.ts`.

### Pattern 5: Turn Timer Integration

**What:** `PlayingPhase.vue` currently hardcodes `:total-time="45"` in `<TurnTimer>`. Change to use `roomState.value?.roundTime ?? 45`.

**What:** `useGameSocket.ts` also initializes `turnTimeRemaining` with `ref<number>(45)`. Change to `ref<number>(45)` initially (safe default), and update on `return-to-lobby` to use `message.room.roundTime`.

**Current code in PlayingPhase.vue:**
```vue
<TurnTimer
  :time-remaining="turnTimeRemaining"
  :total-time="45"  <!-- CHANGE THIS -->
/>
```

**Fixed:**
```vue
<TurnTimer
  :time-remaining="turnTimeRemaining"
  :total-time="roomState?.roundTime ?? 45"
/>
```

**Note:** `roomState` is already available in `PlayingPhase.vue` via `useGameSocket()`.

### Anti-Patterns to Avoid

- **Don't store round time only in client state:** If not in `RoomState`, players who join mid-lobby won't see the configured value. Always go through server.
- **Don't add `setRoundTime` to the `RoomAdapter` interface:** The adapter interface is for room creation/joining (platform-specific). Round time setting is game configuration — send directly via `useGameSocket().send()`.
- **Don't use Howler.js or Tone.js for this:** The existing beep pattern is sufficient. Adding a library for one programmatic tone is unnecessary.
- **Don't initialize `isMuted` inside the composable function:** It would reset on every call. Keep it module-level like `audioContext`.
- **Don't put the mute button in `App.vue`:** The mute button only makes sense during game play. Put it in `PlayingPhase.vue` and optionally `SwapPhase.vue`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive persistence | Custom store/Pinia | `ref` + `localStorage` direct reads/writes | Already established pattern in this codebase (`useGameSocket` does this for player ID and room code) |
| Sound library | Custom audio engine | Web Audio API (already used) | Oscillator+gain pattern already implemented and tested |
| Icon for mute | SVG icon library | Unicode emoji (🔊/🔇) or inline SVG | Consistent with existing emoji usage in this codebase (👑, 💩, 👁️) |
| Room settings state sync | Custom pub/sub | Extend `RoomState` type | The existing WebSocket message flow already distributes `RoomState` on every room change |

**Key insight:** This codebase uses zero UI component libraries. All UI is bespoke Tailwind. Follow the same pattern — no new UI dependencies.

## Common Pitfalls

### Pitfall 1: Hardcoded Turn Timer on Both Server and Client

**What goes wrong:** The server hardcodes `TURN_DURATION = 45` as a constant, and the client hardcodes `:total-time="45"` in `PlayingPhase.vue`. If only one side is updated, the timer display will be wrong.

**Why it happens:** Two separate representations of the same value.

**How to avoid:** Update server `Room.ts` to use `this.roundTime` (instance variable) instead of `this.TURN_DURATION` (constant). Update `PlayingPhase.vue` to read `roomState?.roundTime`. Both must change.

**Warning signs:** Timer bar finishes before/after the numbers reach zero.

### Pitfall 2: turnTimerTickSchema Max Validation Mismatch

**What goes wrong:** `turnTimerTickSchema` has `.max(45)` hardcoded on the `timeRemaining` field. If round time is set to 60s, the server sends `timeRemaining: 60` which fails Zod validation on the client.

**Why it happens:** The schema was written for the fixed 45s timer.

**How to avoid:** Change the schema to `.max(60)` (the maximum configurable value). The schema validates that the value is a non-negative integer within possible bounds — 60 is the new maximum.

**Location:** `packages/shared/src/schemas/messages.ts` line ~263:
```typescript
export const turnTimerTickSchema = z.object({
  type: z.literal('turn-timer-tick'),
  timeRemaining: z.number().int().min(0).max(60), // was .max(45)
  currentPlayerIndex: z.number().int().min(0),
});
```

### Pitfall 3: Module-Level isMuted vs Reactive ref Synchronization

**What goes wrong:** `isMuted` (module-level) and `muteState` (per-instance `ref`) get out of sync. Multiple components call `useSoundEffects()`, each getting their own `ref`, but all sharing the module-level `isMuted`.

**Why it happens:** The composable is called multiple times (e.g., `MuteButton.vue` and wherever `playTurnNotification` is called).

**How to avoid:** Make `muteState` a module-level `ref` (not per-instance). This mirrors how `audioContext` is module-level. Change:
```typescript
// Module-level (outside function)
const muteState = ref<boolean>(localStorage.getItem('shithead-muted') === 'true');

export function useSoundEffects() {
  function toggleMute(): void {
    muteState.value = !muteState.value;
    localStorage.setItem('shithead-muted', String(muteState.value));
  }
  // ...
  return { muteState, toggleMute, playTurnNotification };
}
```

This is consistent with the singleton pattern used by `useGameSocket`.

### Pitfall 4: RoomState roundTime Missing in Return-to-Lobby Reset

**What goes wrong:** In `useGameSocket.ts`, the `return-to-lobby` handler resets state. If `roundTime` is stored in `roomState`, it naturally resets when `roomState.value = message.room` is set. But if round time is tracked separately, it gets lost.

**Why it happens:** The reset logic explicitly clears fields.

**How to avoid:** Keep `roundTime` inside `RoomState` (not as a separate reactive ref). The existing `roomState.value = message.room` assignment in the `return-to-lobby` case will include the new `roundTime`. This is the correct approach.

### Pitfall 5: Host-Only Enforcement Missing on Server

**What goes wrong:** A non-host player sends `set-round-time` and the server accepts it, changing round time for everyone.

**Why it happens:** Forgetting to validate `playerId === room.hostId` before accepting the message.

**How to avoid:** In the `set-round-time` handler in `handlers.ts`, validate the sender is the host. Check `room.getState().hostId === ws.data.playerId` or add a `isHost(playerId)` method to `Room`.

**Server handler pattern:**
```typescript
case 'set-round-time': {
  const room = manager.getRoom(ws.data.roomCode!);
  if (!room) { /* error */ return; }

  const roomState = room.getState();
  if (roomState.hostId !== ws.data.playerId) {
    sendMessage(ws, { type: 'error', message: 'Only the host can change round time', code: 'NOT_HOST' });
    return;
  }

  const result = room.setRoundTime(message.roundTime);
  if (!result.success) { /* error */ return; }

  // Broadcast updated room state to all players
  const updatedState = room.getState();
  // Send to sender
  sendMessage(ws, { type: 'room-updated', room: updatedState });
  // Broadcast to others
  publishToRoom(ws, ws.data.roomCode!, { type: 'room-updated', room: updatedState });
  break;
}
```

### Pitfall 6: AudioContext Autoplay Policy (Browser Restriction)

**What goes wrong:** Browsers block `AudioContext` creation until the user has interacted with the page. The `useSoundEffects.ts` handles this via try/catch, but there's a subtlety: `AudioContext` may need to be resumed after it enters `suspended` state.

**Why it happens:** Browser autoplay policies (Chrome, Safari) suspend audio contexts that are created before user interaction.

**How to avoid:** The existing pattern (lazy `AudioContext` creation inside `playBeep()`) is correct — the first beep is always triggered by a game event after the user has interacted. The try/catch prevents crashes. No additional handling needed for this phase's scope (mute toggle is user interaction itself and won't trigger audio).

### Pitfall 7: Discord Lobby Missing Round Time Selector

**What goes wrong:** Round time selector is added to `Lobby.vue` but forgotten in `DiscordLobby.vue`. Discord Activity players can't configure round time.

**Why it happens:** Two lobby components exist (web and Discord variants).

**How to avoid:** Add the round time selector to both `Lobby.vue` AND `DiscordLobby.vue`. Both display the host's Start Game button. Both must show the round time picker for the host.

## Code Examples

Verified patterns from official sources and codebase analysis:

### localStorage Pattern (from existing codebase)
```typescript
// Source: packages/client/src/composables/useGameSocket.ts (established pattern)
// Reading
const stored = localStorage.getItem('shithead-muted');
const isMuted = stored === 'true';

// Writing
localStorage.setItem('shithead-muted', String(isMuted));
```

### Module-Level Singleton ref (recommended for mute state)
```typescript
// Source: existing useSoundEffects.ts pattern (extended)
// Module-level: shared across all component instances
let audioContext: AudioContext | null = null;
const muteState = ref<boolean>(localStorage.getItem('shithead-muted') === 'true');

export function useSoundEffects() {
  function toggleMute(): void {
    muteState.value = !muteState.value;
    localStorage.setItem('shithead-muted', String(muteState.value));
  }

  function playBeep(): void {
    if (muteState.value) return; // Muted: skip
    try {
      if (!audioContext) {
        audioContext = new AudioContext();
      }
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.15;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const now = audioContext.currentTime;
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  return { muteState, toggleMute, playTurnNotification: playBeep };
}
```

### Zod Schema Extension (set-round-time)
```typescript
// Source: packages/shared/src/schemas/messages.ts (new schema)
const roundTimeSchema = z.union([z.literal(30), z.literal(45), z.literal(60)]);

export const setRoundTimeSchema = z.object({
  type: z.literal('set-round-time'),
  roundTime: roundTimeSchema,
});

// Add to clientMessageSchema discriminated union:
export const clientMessageSchema = z.discriminatedUnion('type', [
  // ... existing ...
  setRoundTimeSchema,
]);

// roomStateSchema addition:
const roomStateSchema: z.ZodType<RoomState> = z.object({
  // ... existing fields ...
  roundTime: roundTimeSchema,
});
```

### TypeScript Type Extension (room.ts)
```typescript
// Source: packages/shared/src/types/room.ts (extended)
export type RoundTime = 30 | 45 | 60;

export type RoomState = {
  code: string;
  players: LobbyPlayer[];
  status: RoomStatus;
  hostId: string;
  maxPlayers: 4;
  minPlayers: 2;
  spectatorCount: number;
  shitheadPlayerId: string | null;
  roundTime: RoundTime;  // NEW
};
```

### Room.ts setRoundTime Method
```typescript
// Source: packages/server/src/rooms/Room.ts (new method)
private roundTime: RoundTime = 45;

setRoundTime(time: RoundTime): OperationResult {
  if (this.status !== 'waiting') {
    return {
      success: false,
      error: 'Cannot change round time after game starts',
      code: 'INVALID_ACTION',
    };
  }
  this.roundTime = time;
  return { success: true };
}

// In getState():
getState(): RoomState {
  return {
    // ... existing fields ...
    roundTime: this.roundTime,
  };
}

// In startTurnTimer() — replace this.TURN_DURATION with this.roundTime:
startTurnTimer(playerIndex: number): void {
  this.clearTurnTimer();
  this.turnTimeRemaining = this.roundTime; // Was: this.TURN_DURATION
  // ... rest unchanged
}
```

### TurnTimer Integration (PlayingPhase.vue)
```vue
<!-- Source: packages/client/src/components/PlayingPhase.vue -->
<!-- Replace hardcoded :total-time="45" -->
<TurnTimer
  :time-remaining="turnTimeRemaining"
  :total-time="roomState?.roundTime ?? 45"
/>
```

### Test Pattern for Mute (mirrors existing useSoundEffects.test.ts)
```typescript
// Source: packages/client/src/composables/useSoundEffects.test.ts (extended)
describe('mute', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.removeItem('shithead-muted');
  });

  it('does not play beep when muted', () => {
    const { toggleMute, playTurnNotification } = useSoundEffects();
    toggleMute(); // mute
    playTurnNotification();
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });

  it('persists mute state to localStorage', () => {
    const { toggleMute } = useSoundEffects();
    toggleMute();
    expect(localStorage.getItem('shithead-muted')).toBe('true');
  });

  it('toggleMute restores unmuted state', () => {
    const { toggleMute, muteState } = useSoundEffects();
    toggleMute(); // mute
    toggleMute(); // unmute
    expect(muteState.value).toBe(false);
  });
});
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded `TURN_DURATION = 45` | Instance variable `roundTime: RoundTime = 45` | Host can configure per-game |
| `private readonly TURN_DURATION = 45` | `private roundTime: RoundTime = 45` | Remove `readonly` to allow mutation |
| `:total-time="45"` hardcoded in template | `:total-time="roomState?.roundTime ?? 45"` | Dynamic, server-authoritative |
| No mute | `muteState` ref + `toggleMute()` | localStorage-persisted preference |

**Key observation on current code:** `turnTimerTickSchema` has `.max(45)` — this MUST change to `.max(60)` when 60s round time is added, otherwise the Zod validation will reject valid 60s timer ticks.

## Open Questions

1. **Where exactly to show the mute button during game play?**
   - What we know: `PlayingPhase.vue` has `Leave` button (top-left, `fixed top-2 left-2`) and `spectatorCount` display (top-right, `fixed top-2 right-2`). `TurnTimer` is bottom-right.
   - What's unclear: The spectator count display uses `right-2`. Adding mute button at `right-2` would collide. Need to offset to `right-10` or `right-12` when spectator count is showing.
   - Recommendation: Place mute at `right-12 top-2` (roughly to the left of spectator count position). Or show only spectator count when spectating, show mute button always. Since `spectatorCount > 0` conditionality on spectator count display, the collision may only occur during active play — place mute at `right-12` unconditionally.

2. **Should mute button appear in the lobby?**
   - What we know: The requirements say "sound mute toggle" with no specific screen. The only current sound is `playTurnNotification` (fired during game play).
   - What's unclear: If future sounds are added (turn notification pings in lobby), mute in lobby would matter.
   - Recommendation: Add mute button to `PlayingPhase.vue` and `SwapPhase.vue` only (game screens). The lobby has no sounds currently. This keeps scope minimal.

3. **What happens to TURN_DURATION constant in Room.ts?**
   - What we know: `private readonly TURN_DURATION = 45` is defined. The `turnTimeRemaining` initial value also comes from `TURN_DURATION` (via `this.TURN_DURATION` reference in `startTurnTimer`).
   - What's unclear: Should `TURN_DURATION` be kept as a fallback constant or removed?
   - Recommendation: Remove `TURN_DURATION` constant entirely. Replace all `this.TURN_DURATION` references with `this.roundTime`. Initialize `private roundTime: RoundTime = 45` at declaration. This is cleaner than maintaining both.

4. **Should `turnTimeRemaining` in useGameSocket.ts initialize to the room's roundTime?**
   - What we know: `useGameSocket.ts` has `const turnTimeRemaining = ref<number>(45)`. On `return-to-lobby`, it resets to 45.
   - What's unclear: If the host configured 60s but the client initializes to 45, there will be a flash of wrong value until the first timer tick arrives.
   - Recommendation: The `turnTimeRemaining` ref shows elapsed seconds from timer ticks (not an initialization display). The `TurnTimer` uses it alongside `total-time` to compute the progress bar arc. Since the first tick is delayed by `TURN_START_DELAY` (1.5s), the initial value of 45 becomes the display value briefly. Change initialization to `roomState.value?.roundTime ?? 45` or just reset it in the `return-to-lobby` handler: `turnTimeRemaining.value = message.room.roundTime`. Both are fine; the latter is safer.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `packages/client/src/composables/useSoundEffects.ts` — confirmed no mute support, module-level AudioContext singleton
- Codebase analysis: `packages/server/src/rooms/Room.ts` — confirmed `TURN_DURATION = 45` hardcoded constant, `startTurnTimer()` implementation
- Codebase analysis: `packages/shared/src/schemas/messages.ts` — confirmed `turnTimerTickSchema` has `.max(45)`, all message schemas use Zod discriminated unions
- Codebase analysis: `packages/shared/src/types/room.ts` — confirmed `RoomState` type, missing `roundTime` field
- Codebase analysis: `packages/client/src/components/PlayingPhase.vue` — confirmed `:total-time="45"` hardcoded
- Codebase analysis: `packages/client/src/composables/useGameSocket.ts` — confirmed `turnTimeRemaining = ref<number>(45)`, localStorage patterns for key storage
- Codebase analysis: `packages/client/src/components/Lobby.vue` — confirmed host-only controls section structure
- Codebase analysis: `packages/client/src/components/DiscordLobby.vue` — confirmed second lobby variant needs same changes

### Secondary (MEDIUM confidence)
- Web Audio API autoplay policy (browser standards) — The existing try/catch pattern in `useSoundEffects.ts` is the established workaround; no additional handling needed for mute toggle feature

### Tertiary (LOW confidence)
- None — all findings verified from codebase directly.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all from existing codebase
- Architecture: HIGH — patterns derived directly from reading codebase files
- Pitfalls: HIGH — identified from exact line numbers in existing code (e.g., `.max(45)` in schema)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable patterns, no external dependencies to go stale)
