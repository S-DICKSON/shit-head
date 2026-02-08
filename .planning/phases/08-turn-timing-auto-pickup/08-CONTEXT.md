# Phase 8: Turn Timing & Auto-Pickup - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-enforced turn timer with automatic card play on timeout. Each turn has a fixed 45-second timer. On timeout, the server auto-plays a random valid card (or picks up the pile if no valid play exists). No host configuration — timer is fixed for all rooms.

</domain>

<decisions>
## Implementation Decisions

### Timer duration & rules
- Fixed 45-second turn timer for all situations (hand, face-up, face-down)
- Same duration regardless of play phase — no special extensions
- No host configuration — 45s is the universal default
- Timer is server-authoritative (clients display, server enforces)

### Timeout auto-play behavior
- On timeout: server selects a random valid card from the player's playable cards and plays it
- If no valid card exists: player picks up the discard pile (auto-pickup)
- For face-down phase: pick a random face-down card blindly (consistent with Phase 7 blind play rules — check validity after flip, pickup pile if invalid)
- Auto-play triggers immediately when timer hits zero — no grace period
- After auto-play, normal game rules apply (burn gives extra turn, turn advances normally)
- No special penalty for timing out — game continues as if they played normally
- No AFK detection in this phase

### Timer visibility & feedback
- Circular progress ring that depletes as time runs out
- All players see the current player's countdown (shared tension)
- No color change or urgency cues — keep it simple for now
- No visual distinction between manual play and auto-play

### Claude's Discretion
- Brief delay before timer starts (1-2s after turn change) — Claude picks what feels natural
- Exact circular progress ring design and positioning
- How auto-play is communicated in the game event stream
- Timer synchronization approach between server and clients

</decisions>

<specifics>
## Specific Ideas

- Auto-play picks a random valid card rather than strategically optimal — this is a penalty for not paying attention, not an AI assistant
- Face-down auto-play follows existing Phase 7 blind mechanics exactly (random card, check after flip)
- Timer should feel like a natural part of the game flow, not punitive

</specifics>

<deferred>
## Deferred Ideas

- 3-second warning before timeout (visual urgency cue) — future version
- Color change on timer (green/yellow/red) — future version
- "Auto-played" label visible to other players — future version
- AFK detection (kick after N consecutive timeouts) — future version
- Host-configurable timer duration (30s/45s/60s presets) — future version

</deferred>

---

*Phase: 08-turn-timing-auto-pickup*
*Context gathered: 2026-02-08*
