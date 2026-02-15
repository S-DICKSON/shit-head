---
phase: quick-012
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/composables/useCardGrouping.test.ts
  - packages/client/src/composables/useDoubleTap.test.ts
  - packages/client/src/composables/useSoundEffects.test.ts
autonomous: true

must_haves:
  truths:
    - "useCardGrouping correctly groups cards by rank and tracks selections"
    - "useDoubleTap detects double-taps within 300ms threshold"
    - "useSoundEffects creates Web Audio API beep without errors"
  artifacts:
    - path: "packages/client/src/composables/useCardGrouping.test.ts"
      provides: "Tests for card grouping logic with quantity selectors"
      min_lines: 80
    - path: "packages/client/src/composables/useDoubleTap.test.ts"
      provides: "Tests for double-tap gesture detection"
      min_lines: 40
    - path: "packages/client/src/composables/useSoundEffects.test.ts"
      provides: "Tests for Web Audio API sound effects"
      min_lines: 30
  key_links:
    - from: "test files"
      to: "composable source files"
      via: "import statements"
      pattern: "import.*from.*composables"
---

<objective>
Add comprehensive unit tests for three client composables: useCardGrouping, useDoubleTap, and useSoundEffects.

Purpose: Increase test coverage for pure logic composables (no DOM dependency, avoiding vue-test-utils/Bun WeakMap issues). These composables handle core mobile UX features: card grouping for hand display, double-tap gesture detection, and turn notification sounds.

Output: Three test files with full coverage of composable logic, passing via `make test-client`.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/stephendickson/Personal/shit-head/packages/client/vitest.config.ts
@/Users/stephendickson/Personal/shit-head/packages/client/src/composables/useCardGrouping.ts
@/Users/stephendickson/Personal/shit-head/packages/client/src/composables/useDoubleTap.ts
@/Users/stephendickson/Personal/shit-head/packages/client/src/composables/useSoundEffects.ts
@/Users/stephendickson/Personal/shit-head/packages/client/src/test/setup.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add useCardGrouping.test.ts with comprehensive coverage</name>
  <files>packages/client/src/composables/useCardGrouping.test.ts</files>
  <action>
Create test file for useCardGrouping composable covering:

1. **Grouping logic:**
   - Groups cards by rank (standard cards group by rank, jokers group as 'JKR')
   - Maintains order of first occurrence
   - Handles empty hand
   - Correctly tracks count and indices for each group

2. **Selection tracking:**
   - `incrementSelection()` increases count up to group max
   - `decrementSelection()` decreases count down to 0
   - `getSelectedCount()` returns current selection for rank
   - Cannot increment beyond group count
   - Cannot decrement below 0

3. **Selected indices computation:**
   - `selectedIndices` computed returns correct array of card indices based on selections
   - Takes first N cards from each rank group
   - `hasGroupSelection` returns true when selections exist, false when empty

4. **Clear selections:**
   - `clearGroupSelection()` resets all selections to empty

Test structure:
- Import useCardGrouping and Card type from @shit-head/shared
- Use Vitest describe/it/expect syntax
- Create sample Card[] arrays (standard cards with rank/suit, jokers with kind='joker')
- Wrap composable in reactive ref for hand
- Test both computed properties and methods
  </action>
  <verify>
Run `make test-client` — useCardGrouping.test.ts passes all assertions.
  </verify>
  <done>
useCardGrouping.test.ts exists with 8+ test cases covering grouping, selection tracking, selected indices, and clear functionality. All tests pass.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add useDoubleTap.test.ts with timing and reset tests</name>
  <files>packages/client/src/composables/useDoubleTap.test.ts</files>
  <action>
Create test file for useDoubleTap composable covering:

1. **Double-tap detection:**
   - Two taps within 300ms threshold triggers callback
   - Single tap sets `isWaitingForSecondTap` to true
   - Callback executed on successful double-tap
   - `isWaitingForSecondTap` resets after successful double-tap

2. **Threshold timeout:**
   - Taps beyond 300ms threshold do NOT trigger callback
   - Auto-reset after threshold expires (use vi.useFakeTimers + vi.advanceTimersByTime)
   - `isWaitingForSecondTap` becomes false after timeout

3. **Manual reset:**
   - `reset()` clears state and stops waiting
   - Works mid-wait (before second tap)

4. **Custom threshold:**
   - Accepts custom threshold parameter (test with 500ms)

Test structure:
- Import useDoubleTap
- Use Vitest describe/it/expect/vi syntax
- Mock callback with `vi.fn()` to track calls
- Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` for timeout tests
- Remember `vi.restoreAllMocks()` in afterEach
  </action>
  <verify>
Run `make test-client` — useDoubleTap.test.ts passes all assertions including timer-based tests.
  </verify>
  <done>
useDoubleTap.test.ts exists with 6+ test cases covering double-tap detection, threshold timing, auto-reset, manual reset, and custom threshold. All tests pass.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add useSoundEffects.test.ts with Web Audio API mocking</name>
  <files>packages/client/src/composables/useSoundEffects.test.ts</files>
  <action>
Create test file for useSoundEffects composable covering:

1. **AudioContext creation:**
   - Mock global AudioContext constructor
   - Verify AudioContext is created on first playTurnNotification() call
   - Verify AudioContext is reused (not recreated) on subsequent calls

2. **Oscillator setup:**
   - Mock oscillator.type, oscillator.frequency.value
   - Verify sine wave type, 880 Hz frequency

3. **Gain (volume) setup:**
   - Mock gainNode.gain.value
   - Verify volume set to 0.15

4. **Audio graph connections:**
   - Verify oscillator.connect(gainNode)
   - Verify gainNode.connect(destination)

5. **Timing:**
   - Verify oscillator.start(now) and oscillator.stop(now + 0.15) called

6. **Error handling:**
   - Throws error on AudioContext creation → should catch and log warning (not crash)

Test structure:
- Import useSoundEffects
- Mock global AudioContext with vi.fn() returning mock with createOscillator, createGain, destination, currentTime
- Mock oscillator object with connect, start, stop, type, frequency
- Mock gainNode with connect, gain
- Use Vitest describe/it/expect/vi syntax
- Verify method calls with toHaveBeenCalledWith
  </action>
  <verify>
Run `make test-client` — useSoundEffects.test.ts passes all assertions including Web Audio API mock verification.
  </verify>
  <done>
useSoundEffects.test.ts exists with 5+ test cases covering AudioContext creation, oscillator setup, gain setup, connections, timing, and error handling. All tests pass.
  </done>
</task>

</tasks>

<verification>
1. All three test files exist in packages/client/src/composables/
2. Run `make test-client` — all new tests pass (pre-existing App.test.ts failures are expected)
3. Run `make lint` — no linting errors in new test files
4. Tests use Vitest syntax (describe, it, expect, vi)
5. Tests import composables directly (no vue-test-utils dependency)
</verification>

<success_criteria>
- [x] useCardGrouping.test.ts exists with 8+ test cases, all passing
- [x] useDoubleTap.test.ts exists with 6+ test cases, all passing
- [x] useSoundEffects.test.ts exists with 5+ test cases, all passing
- [x] `make test-client` passes (ignoring pre-existing App.test.ts failures)
- [x] `make lint` passes with no errors in new test files
- [x] Tests avoid vue-test-utils (pure logic unit tests)
</success_criteria>

<output>
After completion, create `.planning/quick/012-add-client-vitest-coverage-composables/012-SUMMARY.md`
</output>
