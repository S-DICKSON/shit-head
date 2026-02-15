---
type: quick
number: 004
autonomous: true
files_modified:
  - packages/server/src/game/GameEngine.ts
---

<objective>
Fix bug where eliminated players (all cards removed) are forced to pick up the pile in 3+ player games.

Purpose: Ensure eliminated players are completely skipped during turn rotation, including when a pile pickup is required.

Output: GameEngine.pickupPile uses nextActivePlayerIndex for turn advancement, preventing eliminated players from being forced to take actions.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/stephendickson/Personal/shit-head/.planning/PROJECT.md
@/Users/stephendickson/Personal/shit-head/.planning/STATE.md
@/Users/stephendickson/Personal/shit-head/packages/server/src/game/GameEngine.ts
</context>

<root_cause>
The `pickupPile` method in GameEngine.ts uses simple modular arithmetic for turn advancement:
```typescript
const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
```

This does NOT skip eliminated players. When a player picks up the pile and turns advance, the next player might have zero cards (eliminated). In contrast, all other turn advancement paths use `nextActivePlayerIndex` which properly skips eliminated players.

From STATE.md Phase 7 decisions:
- "Eliminated players stay in array with zero cards (maintains indices, no removal)"
- "nextActivePlayerIndex has loop limit equal to playerCount (prevents infinite loops)"
- "Turn advancement via nextActivePlayerIndex replaces simple modular arithmetic in endgame"

The pickupPile method missed this conversion.
</root_cause>

<tasks>

<task type="auto">
  <name>Fix pickupPile turn advancement</name>
  <files>packages/server/src/game/GameEngine.ts</files>
  <action>
Replace line 470 in GameEngine.pickupPile method:

**Before:**
```typescript
const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
```

**After:**
```typescript
const nextPlayerIndex = this.nextActivePlayerIndex(state, state.currentPlayerIndex);
```

This ensures pickupPile skips eliminated players when advancing turns, consistent with playFromFaceUp (lines 730, 733) and playFaceDownBlind (lines 870, 879, 921).

Do NOT change any other logic. The fix is isolated to turn advancement only.
  </action>
  <verify>
Run tests to ensure pickupPile still passes all existing cases:
```bash
make test-server
```

Run full type checking to ensure no regressions:
```bash
make type-check
```

Run linter to ensure code style compliance:
```bash
make lint
```
  </verify>
  <done>
- pickupPile uses nextActivePlayerIndex for turn advancement
- All server tests pass (no regressions)
- Type checking passes
- Linter passes (per Memory.md phase requirement)
- Eliminated players are skipped when pile is picked up in 3+ player games
  </done>
</task>

</tasks>

<verification>
**Regression check:**
- All existing GameEngine.pickupPile tests still pass
- No type errors introduced
- Linter passes

**Behavioral validation:**
The fix ensures that when a non-eliminated player picks up the pile, turn advances to the next non-eliminated player. If Player 2 picks up the pile and Player 3 is eliminated (zero cards), turn correctly advances to Player 4 (or wraps around to Player 1), not to Player 3.

**Edge cases covered by nextActivePlayerIndex:**
- All players eliminated except current (returns current as fallback)
- Loop limit prevents infinite loops
- Wrap-around handling for player array
</verification>

<success_criteria>
- [ ] GameEngine.pickupPile uses nextActivePlayerIndex at line 470
- [ ] `make test-server` passes with zero failures
- [ ] `make type-check` passes
- [ ] `make lint` passes
- [ ] Turn advancement in pickupPile matches pattern in playFromFaceUp and playFaceDownBlind
</success_criteria>

<output>
After completion, create `.planning/quick/004-fix-eliminated-player-forced-to-pick-up-/004-SUMMARY.md`
</output>
