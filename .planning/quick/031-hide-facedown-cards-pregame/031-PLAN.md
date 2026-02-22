---
phase: quick-031
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/SwapPhase.vue
autonomous: false
must_haves:
  truths:
    - "Face-down cards are NOT visible during the swap/pregame phase"
    - "Face-up cards and hand cards remain fully visible and interactive during swap phase"
    - "Face-down cards still appear normally during the playing phase (no change to PlayingPhase/PlayerCards)"
  artifacts:
    - path: "packages/client/src/components/SwapPhase.vue"
      provides: "Swap phase UI without face-down card display"
  key_links: []
---

<objective>
Hide face-down cards during the pregame/swap phase to save vertical screen space.

Purpose: During the swap phase, face-down cards (the blue "?" cards) are non-interactive and irrelevant -- players are only choosing between hand cards and face-up cards. Removing them frees up vertical space, especially on mobile, making the actual interactive cards more prominent.

Output: Updated SwapPhase.vue with face-down card section removed.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/components/SwapPhase.vue
@packages/client/src/components/PlayerCards.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove face-down card display from SwapPhase</name>
  <files>packages/client/src/components/SwapPhase.vue</files>
  <action>
Remove the entire face-down cards section from SwapPhase.vue. This is lines 83-95 in the current file -- the block containing:
- The "Face Down" label (`<div class="text-center mb-2">` with "Face Down" text)
- The `v-for` loop rendering blue "?" cards based on `gameView?.faceDownCount`

Delete these lines entirely. Do NOT touch the face-up cards section or the hand cards section above/below it.

Do NOT modify PlayerCards.vue or PlayingPhase.vue -- face-down cards must still render during the playing phase.

Run `make lint` to confirm no lint errors.
  </action>
  <verify>
`make lint` passes. Visually inspect SwapPhase.vue to confirm: face-up cards section exists, hand cards section exists, no face-down cards section exists.
  </verify>
  <done>SwapPhase.vue no longer renders any face-down cards. The swap phase shows only "Face Up" cards and "Your Hand" cards.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Removed face-down cards from the swap/pregame phase UI</what-built>
  <how-to-verify>
Run `make screenshots` to capture the swap phase layout. Show the screenshots to confirm:
1. Swap phase: NO blue "?" face-down cards visible -- only "Face Up" and "Your Hand" sections
2. More vertical space available for the interactive cards
3. Playing phase (if captured): face-down cards still appear normally in the stacked table layout
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `make lint` passes
- SwapPhase.vue contains no "Face Down" label or face-down card rendering
- PlayerCards.vue unchanged (still has face-down rendering for playing phase)
</verification>

<success_criteria>
- Face-down cards hidden during swap phase
- Face-down cards still visible during playing phase
- No lint errors
- Screenshots approved by user
</success_criteria>

<output>
After completion, create `.planning/quick/031-hide-facedown-cards-pregame/031-SUMMARY.md`
</output>
