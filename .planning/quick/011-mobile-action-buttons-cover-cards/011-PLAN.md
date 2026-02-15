---
phase: quick
plan: 011
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/PlayerCards.vue
  - packages/client/src/components/PlayingPhase.vue
autonomous: true

must_haves:
  truths:
    - "Action buttons (Play Card, Pick Up Pile) never overlap or obscure player hand cards on mobile"
    - "All cards in a large hand remain visible and scrollable on mobile without buttons blocking them"
    - "Action buttons remain visible and accessible at all times without needing to scroll"
  artifacts:
    - path: "packages/client/src/components/PlayerCards.vue"
      provides: "Card display without sticky action buttons overlaying cards"
    - path: "packages/client/src/components/PlayingPhase.vue"
      provides: "Layout that separates scrollable card area from fixed action buttons"
  key_links:
    - from: "PlayingPhase.vue"
      to: "PlayerCards.vue"
      via: "Parent layout controls scroll boundary, child renders cards and buttons in separate flow regions"
---

<objective>
Fix mobile layout so action buttons (Play Card, Pick Up Pile) do not cover/obstruct the player's hand cards when the player has many cards.

Purpose: On mobile, when a player picks up many cards, the sticky action buttons overlay on top of the card list inside the scrollable container, blocking card visibility and selection.

Output: Restructured layout where cards scroll independently above the action buttons, and buttons are always visible below the cards without overlapping them.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/components/PlayerCards.vue
@packages/client/src/components/PlayingPhase.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restructure PlayerCards and PlayingPhase layout to separate cards from action buttons</name>
  <files>
    packages/client/src/components/PlayerCards.vue
    packages/client/src/components/PlayingPhase.vue
  </files>
  <action>
The root cause: PlayerCards.vue has action buttons with `sticky bottom-0` inside a `max-h-[45vh] overflow-y-auto` parent in PlayingPhase.vue. The sticky buttons overlay the cards within the same scroll container.

**In PlayingPhase.vue (lines 88-106):**

Replace the single scrollable wrapper div:
```html
<div class="flex-shrink-0 px-2 pb-3 max-h-[45vh] overflow-y-auto">
  <PlayerCards ... />
</div>
```

With a flex column layout that separates scrollable cards from fixed buttons:
```html
<div class="flex-shrink-0 flex flex-col max-h-[45vh]">
  <div class="overflow-y-auto px-2 min-h-0">
    <PlayerCards ... />
  </div>
</div>
```

The key change: `min-h-0` on the scrollable inner div allows flex shrinking so the card area scrolls, while the action buttons rendered by PlayerCards below the card list stay in normal document flow.

**In PlayerCards.vue (line 140):**

Change the action buttons container from:
```html
<div class="sticky bottom-0 bg-green-900/95 backdrop-blur-sm py-2 -mx-2 px-2">
```

To a non-sticky, flex-shrink-0 container that stays below the scroll area:
```html
<div class="flex-shrink-0 bg-green-900 py-2 -mx-2 px-2">
```

Remove `sticky bottom-0` and `backdrop-blur-sm` (no longer needed since buttons are not overlaying content). Remove the `/95` opacity from `bg-green-900` since transparency is unnecessary when buttons don't overlap cards.

**Additional layout fix in PlayingPhase.vue:**

The PlayerCards component root div (`<div class="flex flex-col">`) needs to participate in the flex layout so its children (cards + buttons) can be split between scrollable and non-scrollable regions. Update the wrapper structure to:

```html
<div class="flex-shrink-0 flex flex-col max-h-[45vh]">
  <div class="overflow-y-auto px-2 pb-1 min-h-0 flex-1">
    <!-- This div scrolls: contains table cards + hand cards -->
  </div>
  <!-- Action buttons: outside scroll, always visible -->
</div>
```

To achieve this split without a major refactor, the simplest approach is:
1. In PlayerCards.vue, wrap ONLY the card sections (table cards + hand cards, lines 3-137) in a div with `class="overflow-y-auto max-h-[35vh] sm:max-h-none"` and keep the action buttons div as a sibling OUTSIDE this scrollable wrapper.
2. In PlayingPhase.vue, REMOVE the `max-h-[45vh] overflow-y-auto` from the outer wrapper (line 89) since scroll control now lives inside PlayerCards.
3. Keep the outer wrapper as `flex-shrink-0 px-2 pb-3`.

This way:
- On mobile, only the cards (table + hand) scroll within a constrained height
- Action buttons sit below the scrollable area, never overlapping
- On desktop (sm+), `sm:max-h-none` removes the scroll constraint so cards display normally

Make sure the `pb-3` padding on the outer wrapper or the action buttons div provides enough bottom spacing so the buttons don't get cut off by the TurnTimer fixed overlay in the bottom-right corner.
  </action>
  <verify>
Run `make lint` to ensure no linting errors.
Run `make type-check` to verify TypeScript is happy.
Run `make build` to confirm the client builds successfully.
Visually inspect the layout logic: action buttons div must NOT be inside any element with `overflow-y-auto`.
  </verify>
  <done>
Action buttons (Play Card, Pick Up Pile) are rendered below the scrollable card area, never overlapping cards. Cards scroll independently within a constrained height on mobile. Buttons remain always visible and accessible. Desktop layout unchanged. `make lint`, `make type-check`, and `make build` all pass.
  </done>
</task>

</tasks>

<verification>
- `make lint` passes
- `make type-check` passes
- `make build` passes
- In PlayerCards.vue, the action buttons div does NOT have `sticky` or `fixed` positioning
- The action buttons div is NOT a child of any `overflow-y-auto` container
- On mobile viewport (< 640px), cards area has max-height constraint with `overflow-y-auto`
- On desktop viewport (>= 640px), cards display without scroll constraints
</verification>

<success_criteria>
- Action buttons never overlap or obscure player cards on mobile, even with 10+ cards in hand
- Cards remain scrollable and selectable on mobile
- Action buttons remain visible without scrolling
- Desktop layout is unaffected
- All make targets pass: lint, type-check, build
</success_criteria>

<output>
After completion, create `.planning/quick/011-mobile-action-buttons-cover-cards/011-SUMMARY.md`
</output>
