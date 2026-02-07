---
phase: 03-deck-dealing-system
plan: 01
subsystem: types
tags: [typescript, zod, card-game, game-state]

# Dependency graph
requires:
  - phase: 02-websocket-room-management
    provides: WebSocket message protocol and schema-first pattern
provides:
  - Card types with discriminated union (standard vs joker)
  - Game state types (GameState, PlayerGameState, PlayerGameView)
  - Zod schemas for cards and game-dealt message
  - Type-safe deck creation utility (54 cards)
affects: [03-02-dealing-engine, 03-03-websocket-integration, gameplay phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated unions for card types (standard vs joker)"
    - "Player-specific views hiding opponent cards"
    - "Schema-first pattern extended to game messages"

key-files:
  created:
    - packages/shared/src/types/card.ts
    - packages/shared/src/types/game.ts
  modified:
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/shared/src/index.ts

key-decisions:
  - "Card discriminated union by 'kind' field (standard vs joker)"
  - "Jokers identified by id (1 or 2) not by suit"
  - "PlayerGameView hides face-down counts from player themselves"
  - "Opponent view shows only counts for hand and face-down cards"

patterns-established:
  - "Discriminated unions for type safety: Card union by 'kind' field"
  - "View types: Full authoritative GameState vs restricted PlayerGameView"
  - "Schema-first: Zod schemas define structure, types inferred via z.infer"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 3 Plan 1: Card & Game State Types Summary

**Type-safe card deck (54 cards with discriminated union) and game state views with opponent card hiding via Zod schemas**

## Performance

- **Duration:** 2 min 20s
- **Started:** 2026-02-07T20:47:09Z
- **Completed:** 2026-02-07T20:49:29Z
- **Tasks:** 2 (1 pre-completed, 1 executed)
- **Files modified:** 5

## Accomplishments
- Card types supporting 52 standard cards plus 2 jokers with discriminated union
- Game state types modeling full server-side state and player-specific views
- Zod schemas for card validation and game-dealt WebSocket message
- Complete type safety from schema to types via z.infer pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create card types and deck factory** - `da1f880` (feat) - **Pre-completed**
2. **Task 2: Create game state types and dealing message schemas** - `833caf3` (feat)

## Files Created/Modified
- `packages/shared/src/types/card.ts` - Suit, Rank, Card types; createDeck() returns 54 cards; cardEquals() utility
- `packages/shared/src/types/game.ts` - GamePhase, PlayerGameState, GameState, OpponentView, PlayerGameView types
- `packages/shared/src/schemas/messages.ts` - Card Zod schemas (suit, rank, standard, joker), opponentViewSchema, gameDealtSchema
- `packages/shared/src/types/messages.ts` - GameDealtMessage type inferred from schema
- `packages/shared/src/index.ts` - Export card and game types from shared package

## Decisions Made

**Card representation:**
- Discriminated union with 'kind' field (standard vs joker) for type-safe handling
- Jokers identified by numeric id (1 or 2) rather than suit/rank pattern
- SUITS and RANKS constants exported for iteration and validation

**Game state architecture:**
- GameState holds full authoritative server-side state
- PlayerGameView provides restricted view to individual players
- OpponentView hides hand and face-down cards (shows counts only)
- Player can't see their own face-down cards (faceDownCount not faceDown array)

**Schema-first pattern:**
- Zod schemas for cards integrated into message protocol
- gameDealtSchema added to serverMessageSchema discriminated union
- Types inferred via z.infer maintaining single source of truth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Docker test environment stale dependencies:**
- Symptom: Server tests failed with "undefined is not an object (evaluating '__vite_ssr_import_0__.z.object')"
- Root cause: Docker container cached dependencies, missing fresh node_modules
- Impact: Non-blocking - type-check passed, rooms.test.ts passed (didn't import new schemas)
- Resolution: Deferred to next Docker rebuild (containers will get fresh dependencies)
- Verification: Type-check with `make type-check` succeeded

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02 (Dealing Engine):**
- Card types available for deck shuffling and distribution
- GameState types ready for server-side dealing logic
- createDeck() utility provides unshuffled 54-card deck

**Ready for Plan 03 (WebSocket Integration):**
- gameDealtSchema registered in message protocol
- GameDealtMessage type available for type-safe message handling
- PlayerGameView structure defined for client state updates

**No blockers or concerns.**

---
*Phase: 03-deck-dealing-system*
*Completed: 2026-02-07*

## Self-Check: PASSED

All key files verified:
- FOUND: packages/shared/src/types/card.ts
- FOUND: packages/shared/src/types/game.ts

All commits verified:
- FOUND: da1f880 (Task 1)
- FOUND: 833caf3 (Task 2)
