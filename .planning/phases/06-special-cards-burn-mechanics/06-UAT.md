---
status: complete
phase: 06-special-cards-burn-mechanics
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md
started: 2026-02-08T11:00:00Z
updated: 2026-02-08T11:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Playing a 2 resets the pile
expected: Playing a 2 on any pile is valid and resets it. Run `make test-server` — tests pass including 2-reset scenarios.
result: issue → fixed
reported: "5 test suites fail to load — TypeError: undefined is not an object (evaluating 'z.object') in shared/src/schemas/messages.ts:7. Zod v4 does not export named 'z' from 'zod'. card-rules.test.ts and card-comparison.test.ts pass (71 tests)."
severity: blocker
fix: "Changed `import { z } from 'zod'` to `import * as z from 'zod'` in shared/schemas/messages.ts and shared/types/messages.ts. Also removed deprecated done() callback in rooms.test.ts. All 223 tests now pass. Commit: 4a5193e"

### 2. Playing a 7 constrains the next player
expected: After a 7 is played, the next player must play 7 or lower. Higher cards are rejected. Verified by test suite.
result: pass

### 3. Playing an 8 is invisible
expected: An 8 can be played on anything. Next player plays against the card beneath the 8 (not the 8 itself). A pile of all 8s accepts any card.
result: pass

### 4. Playing a 10 burns the pile
expected: Playing a 10 clears the discard pile. The same player gets another turn on the now-empty pile.
result: pass

### 5. Four-of-a-kind burn detection
expected: When four cards of the same rank are on top of the pile (counting through invisible 8s), the pile burns. Same player goes again.
result: pass

### 6. Turn advances normally on non-burn plays
expected: After a normal (non-burn) play, turn advances to next player via modular arithmetic. After a burn, current player stays.
result: pass

### 7. All tests pass with no regressions
expected: Running `make test-server` passes all tests (card-rules: 59 tests, game-engine: 94+ tests). No regressions from Phase 5.
result: pass

## Summary

total: 7
passed: 7
issues: 0 (1 found, 1 fixed inline)
pending: 0
skipped: 0

## Gaps

[all resolved — Zod import fix committed as 4a5193e]
