# Phase 4: Pre-Game Swap Phase - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Players enter a 30-second simultaneous swap phase after dealing. Players can swap any hand card with any face-up card. Timer counts down, all players swap at the same time, and the game begins when the timer expires or all players ready up. This phase does NOT include gameplay, turn logic, or game log features.

</domain>

<decisions>
## Implementation Decisions

### Swap mechanics
- Tap-tap swap: player taps a hand card, then taps a face-up card — they swap instantly
- Unlimited swaps within the 30-second window, no cap on number of swaps
- Swapping back and forth freely serves as the undo mechanism (no explicit undo button)
- Each swap syncs to server immediately with a debounce to prevent spam
- Server is authoritative — swap validated and applied server-side

### Timer behavior
- Fixed 30-second duration, not configurable (host settings deferred to future version)
- Simple numeric countdown display (e.g., "27s")
- No urgency effects (no color change, no flashing in last seconds)
- When timer hits zero: brief 2-3 second "Let's play!" transition message before first turn begins

### Opponent visibility
- No swap activity indicators — you can't see when opponents are swapping (game log deferred)
- Opponents' face-up cards are visible throughout the swap phase (public information)
- Face-up cards update in real-time as opponents swap (natural result of server sync + broadcast)

### Ready state
- "Ready" button available — player can signal they're done swapping
- All players readying up skips remaining timer, game starts immediately
- Ready status is visible to all players (e.g., checkmark next to player name)

### Claude's Discretion
- Whether swapping after readying auto-un-readies the player or locks them out
- Debounce duration for swap messages
- Exact "Let's play!" transition design and timing
- How to display the ready button (placement, styling)

</decisions>

<specifics>
## Specific Ideas

- "Let's play!" transition message before game starts — in the future this could show who the current shithead is with a poo emoji next to their name
- Host-configurable swap timer duration is a future version feature, not this phase

</specifics>

<deferred>
## Deferred Ideas

- Game log feature — swaps should be visible in a game log showing what cards were swapped (face-up cards are public info). Deferred to a future version.
- Shithead indicator at game start — show who the current shithead is with a poo emoji during the "Let's play!" transition. Future version.
- Host-configurable swap timer duration — allow host to set 15s/30s/60s in lobby. Future version.

</deferred>

---

*Phase: 04-pre-game-swap-phase*
*Context gathered: 2026-02-07*
