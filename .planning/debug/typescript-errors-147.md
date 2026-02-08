---
status: resolved
trigger: "Debug Session: 147 TypeScript errors across 11 files"
created: 2026-02-08T11:33:00Z
updated: 2026-02-08T11:40:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Stale build artifacts in shared package dist folder
test: Rebuilt shared package and verified error reduction
expecting: Root cause confirmed
next_action: Document final findings and remaining errors

## Symptoms

expected: TypeScript type-checking should pass with zero errors
actual: 147 TypeScript errors across 11 files in packages/server
errors:
- 1 error in packages/server/src/__tests__/card-comparison.test.ts
- 3 errors in packages/server/src/__tests__/card-rules.test.ts
- 3 errors in packages/server/src/__tests__/deck.test.ts
- 64 errors in packages/server/src/__tests__/game-engine.test.ts
- 1 error in packages/server/src/__tests__/rooms.test.ts
- 2 errors in packages/server/src/game/CardComparison.ts
- 1 error in packages/server/src/game/CardRules.ts
- 1 error in packages/server/src/game/Deck.ts
- 33 errors in packages/server/src/game/GameEngine.ts
- 17 errors in packages/server/src/rooms/Room.ts
- 21 errors in packages/server/src/websocket/handlers.ts
reproduction: Run `make type-check` or `make type-check-server`
started: Unknown, but all 279 runtime tests PASS

## Eliminated

## Evidence

- timestamp: 2026-02-08T11:33:00Z
  checked: packages/shared/package.json and tsconfig.json
  found: Package points to src/index.ts directly, tsconfig has composite:true with outDir:dist
  implication: TypeScript composite projects require built artifacts in dist folder

- timestamp: 2026-02-08T11:34:00Z
  checked: packages/shared/dist/ folder timestamps
  found: dist/index.d.ts built Feb 7 17:31, src/index.ts modified Feb 7 20:47
  implication: Build artifacts are 3+ hours stale, missing card and game type exports

- timestamp: 2026-02-08T11:34:30Z
  checked: dist/index.d.ts content
  found: Only exports messages and room types, missing card and game exports
  implication: Source was updated to add Phase 3 types but dist was never rebuilt

- timestamp: 2026-02-08T11:35:00Z
  checked: Ran `tsc --build packages/shared/tsconfig.json`
  found: Created dist/types/card.d.ts and dist/types/game.d.ts, updated dist/index.d.ts
  implication: Build process works correctly when run

- timestamp: 2026-02-08T11:35:30Z
  checked: Ran `make type-check-server` after rebuild
  found: Errors reduced from 147 to 65 (82 errors eliminated)
  implication: Stale build artifacts were the PRIMARY root cause

- timestamp: 2026-02-08T11:36:00Z
  checked: Remaining 65 errors breakdown
  found:
    - 57 TS18048 errors (possibly undefined)
    - 4 TS2339 errors (property does not exist on union type)
    - 2 TS2322 errors (type mismatch)
    - 1 TS2345 error (argument type mismatch)
    - 1 TS2719 error (circular reference)
  implication: These are legitimate type safety issues in the code, not build/config issues

## Resolution

root_cause: |
  PRIMARY ROOT CAUSE: Stale TypeScript build artifacts in packages/shared/dist/

  The shared package uses TypeScript composite project references (composite: true in tsconfig.json).
  When using composite projects, TypeScript relies on .d.ts files in the dist/ folder for type checking
  across project boundaries, even when package.json points to src/index.ts.

  Timeline:
  - Feb 7 17:31: shared package built (dist/ folder created with room and message types)
  - Feb 7 20:47: src/index.ts updated to add Phase 3 exports (card and game types)
  - Build never re-run after source changes
  - Result: dist/index.d.ts missing card and game type exports

  This caused 82 "Module has no exported member" errors because TypeScript couldn't find the types
  that were exported in source but not in the built .d.ts files.

  SECONDARY ISSUES (65 remaining errors):
  After rebuilding shared package, 65 legitimate type safety errors remain:

  1. TS18048 (57 errors): Accessing .data property without checking if result.success is true
     - Pattern: `result.data` where result is OperationResult<T> (could be success or failure)
     - Location: Mainly in game-engine.test.ts

  2. TS2339 (4 errors): Accessing .rank property on Card union without type narrowing
     - Pattern: `card.rank` where card could be joker (which has no rank property)
     - Location: game-engine.test.ts

  3. TS2322 (2 errors): Type mismatch in OperationResult assignments
     - Pattern: Returning OperationResult<GameState> where OperationResult<void> expected
     - Location: Room.ts

  4. TS2345 (1 error): Missing required callback parameter
     - Pattern: Missing onPlayPhaseStart callback in swap phase configuration
     - Location: rooms.test.ts

  5. TS2719 (1 error): Circular type reference with OperationResult
     - Pattern: Two different OperationResult types being compared
     - Location: Room.ts

fix: |
  Run: tsc --build packages/shared/tsconfig.json
  OR: make build (if it includes building shared package)

  This rebuilds the shared package dist/ folder with current type definitions.

  FUTURE PREVENTION:
  - Add pre-commit hook or CI check to ensure dist/ is up to date
  - OR: Configure package.json to always build shared before running type-check
  - OR: Add "prepare" script to shared package.json: "tsc --build"

verification: |
  After running `tsc --build packages/shared/tsconfig.json`:
  - Verified dist/types/card.d.ts created (832 bytes)
  - Verified dist/types/game.d.ts created (1661 bytes)
  - Verified dist/index.d.ts updated with card and game exports
  - Verified error count reduced from 147 to 65 (82 errors eliminated)
  - All 82 eliminated errors were "Module has no exported member" errors
  - Remaining 65 errors are legitimate type safety issues in server code

files_changed:
  - packages/shared/dist/index.d.ts (regenerated)
  - packages/shared/dist/types/card.d.ts (created)
  - packages/shared/dist/types/card.js (created)
  - packages/shared/dist/types/game.d.ts (created)
  - packages/shared/dist/types/game.js (created)
  - packages/shared/dist/types/messages.d.ts (updated)
  - packages/shared/tsconfig.tsbuildinfo (updated)
