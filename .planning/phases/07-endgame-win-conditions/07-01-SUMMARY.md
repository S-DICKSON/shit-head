---
phase: 07-endgame-win-conditions
plan: 01
subsystem: protocol
tags: [websocket, zod, typescript, schemas, messages]

# Dependency graph
requires:
  - phase: 06-special-cards-burn-mechanics
    provides: Complete gameplay message schemas through burn detection
provides:
  - Endgame message schemas (play-face-down, face-down-result, player-eliminated, game-over)
  - PlaySource type for card progression logic
  - GAME_OVER error code
affects: [07-02, 07-03, 08-01]

# Tech tracking
tech-stack:
  added: []
  patterns: [Discriminated union extension pattern for protocol versioning]

key-files:
  created: []
  modified:
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/shared/src/types/game.ts

key-decisions:
  - "PlaySource type represents card progression: hand → face-up → face-down"
  - "face-down-result carries revealed card for all players (transparency after flip)"
  - "game-over identifies shithead by both ID and nickname for display"

patterns-established:
  - "Message schemas extended via discriminated union pattern"
  - "z.infer pattern for type-schema synchronization"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 07 Plan 01: Endgame Message Schemas Summary

**Endgame protocol schemas with PlaySource type for hand→face-up→face-down card progression**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-08T11:56:53Z
- **Completed:** 2026-02-08T11:59:09Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added PlaySource type ('hand' | 'face-up' | 'face-down') to game.ts for Phase 7 card progression logic
- Extended client-to-server protocol with play-face-down schema (faceDownIndex validation)
- Extended server-to-client protocol with face-down-result, player-eliminated, and game-over schemas
- Added GAME_OVER error code for attempts to play after game completion

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PlaySource type and endgame message schemas** - `74834de` (feat)

**Plan metadata:** (next commit)

## Files Created/Modified
- `packages/shared/src/types/game.ts` - Added PlaySource type for card progression
- `packages/shared/src/schemas/messages.ts` - Added playFaceDownSchema, faceDownResultSchema, playerEliminatedSchema, gameOverSchema, GAME_OVER error code
- `packages/shared/src/types/messages.ts` - Added inferred types for all new schemas

## Decisions Made

**1. PlaySource type represents card progression**
- Type: 'hand' | 'face-up' | 'face-down'
- Rationale: Server determines where player must play from based on game state (hand empties first, then face-up, finally face-down)

**2. face-down-result reveals card to all players**
- Schema includes revealed card for transparency
- Rationale: All players must see what was flipped for game fairness (blind plays are only blind to the player making them)

**3. game-over includes both ID and nickname**
- Schema: `{ shitheadId, shitheadNickname }`
- Rationale: ID for game logic, nickname for display to users

**4. GAME_OVER error code added**
- Purpose: Reject gameplay actions after game completion
- Rationale: Prevents edge cases where stale client sends actions after game ends

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - schema extensions followed established patterns from Phase 2-6.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 7 implementation:**
- All endgame message schemas defined
- PlaySource type available for server logic
- Client and server can now implement face-down plays and elimination handling

**No blockers.**

## Self-Check: PASSED

All commits verified and all modified files exist.

---
*Phase: 07-endgame-win-conditions*
*Completed: 2026-02-08*
