---
phase: 05
plan: 01
subsystem: messaging
tags: [zod, typescript, websocket, game-engine]
requires: [04-04]
provides: [gameplay-message-protocol]
affects: [05-02, 05-03]
tech-stack:
  added: []
  patterns: [discriminated-union-schemas]
key-files:
  created: []
  modified:
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
decisions: []
metrics:
  duration: 131s
  completed: 2026-02-07
---

# Phase 05 Plan 01: Gameplay Message Schemas Summary

**One-liner:** Added Zod schemas and TypeScript types for card play, pile pickup, and turn management messages.

## What Was Built

Extended the existing WebSocket message protocol with 5 new message types to support Phase 5 gameplay loop:

**Client-to-server (2):**
- `play-cards`: Player submits card indices to play from their hand/face-up cards
- `pickup-pile`: Player requests to pick up the discard pile

**Server-to-client (3):**
- `card-played`: Broadcasts successful card play with updated game state
- `pile-pickup`: Notifies all players of pile pickup with updated views
- `turn-changed`: Simple turn notification with next player index

All schemas follow established patterns: discriminated unions by `type` field, Zod validation for runtime safety, TypeScript types inferred via `z.infer`.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 78b6cc9 | Added 5 gameplay schemas to messages.ts and updated discriminated unions |
| 2 | fa49620 | Added inferred TypeScript types and NOT_YOUR_TURN error code |

## Key Technical Details

**playCardsSchema validation:**
```typescript
cardIndices: z.array(z.number().int().min(0)).min(1)
```
- Non-empty array (min 1 card)
- Non-negative integers only
- Validates player is submitting valid array indices

**card-played carries full state update:**
- `cards`: The cards that were played
- `currentPlayerIndex`: Whose turn it is now
- `drawPileCount`, `discardPile`: Updated pile state
- `hand` (optional): Updated hand for the playing player only
- `opponents` (optional): Updated opponent views for all players

This follows the established pattern from swap-cards-updated where optional fields allow targeted updates per player.

**Error handling:**
- Added `NOT_YOUR_TURN` to error code enum for turn validation failures
- Consistent with existing error codes (INVALID_ACTION, PLAYER_NOT_FOUND, etc.)

## Integration Points

**Upstream dependencies:**
- Builds on card/game schemas from Phase 03 (cardSchema, opponentViewSchema)
- Extends message protocol established in Phase 02

**Downstream consumers:**
- Phase 05-02 will add GameEngine.playCards() and .pickupPile() methods
- Phase 05-03 will wire these schemas to WebSocket handlers
- Client components will use these types for gameplay UI actions

## Decisions Made

None - schema structure follows established patterns from earlier phases.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready:** Yes - schemas and types compile, importable via @shit-head/shared

**Blockers:** None

**Concerns:** None - straightforward schema additions

## Testing Notes

- TypeScript compilation verified after each task
- Schemas integrated into discriminated unions correctly
- Types accessible via barrel export in shared package index.ts
- No runtime tests needed (schema validation tested when handlers are wired)

## Self-Check: PASSED
