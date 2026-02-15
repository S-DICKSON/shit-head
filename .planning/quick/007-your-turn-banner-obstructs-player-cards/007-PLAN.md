---
phase: quick
plan: 007
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/TurnBanner.vue
  - packages/client/src/components/PlayingPhase.vue
autonomous: true

must_haves:
  truths:
    - "Your Turn banner is visible when it is the player's turn"
    - "Your Turn banner does not overlap or obstruct the player's hand, face-up, or face-down cards"
    - "Your Turn banner does not block tap/click interaction with any cards"
    - "Banner still animates in/out smoothly"
  artifacts:
    - path: "packages/client/src/components/TurnBanner.vue"
      provides: "Non-obstructing turn indicator"
    - path: "packages/client/src/components/PlayingPhase.vue"
      provides: "Layout with turn banner in document flow"
  key_links:
    - from: "PlayingPhase.vue"
      to: "TurnBanner.vue"
      via: ":visible prop"
      pattern: "<TurnBanner.*:visible"
---

<objective>
Reposition the "Your Turn" banner so it no longer obstructs the player's card area.

Purpose: The current TurnBanner uses `fixed top-24 z-50` which overlays the game area and blocks visibility/interaction with the player's cards, especially on mobile.

Output: A TurnBanner that is positioned inline within the center game area (between opponents and player cards) rather than as a fixed overlay, preserving its visual impact and animations without blocking any interactive elements.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/components/TurnBanner.vue
@packages/client/src/components/PlayingPhase.vue
@packages/client/src/components/PlayerCards.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reposition TurnBanner from fixed overlay to inline element within the game layout</name>
  <files>
    packages/client/src/components/TurnBanner.vue
    packages/client/src/components/PlayingPhase.vue
  </files>
  <action>
**TurnBanner.vue changes:**

1. Remove the `fixed top-24 left-1/2 -translate-x-1/2 z-50` positioning classes from the banner div. The banner should NOT use fixed/absolute positioning.

2. Replace with classes that make it an inline-block centered element:
   - Use `mx-auto text-center` for centering
   - Keep the visual styling: `bg-yellow-400 text-black font-bold text-lg px-6 py-2 rounded-full shadow-lg`
   - Add `pointer-events-none` as a safety net so even during animations it cannot block interaction

3. Update the transition CSS to remove the `translateX(-50%)` from enter-from, leave-to, and enter-to transforms since the banner is no longer positioned with left-1/2 + -translate-x-1/2. Use simple scale transforms instead:
   - `.banner-enter-from, .banner-leave-to`: `opacity: 0; transform: scale(0.9);`
   - `.banner-enter-to`: `opacity: 1; transform: scale(1);`
   - Remove the `.banner-enter-to` rule entirely (default state handles it) OR set it explicitly

4. Wrap the inner content in a flex container so the banner pill is centered:
   - The outer div should be `flex justify-center` (a wrapper)
   - The inner span/div with the yellow pill styling should be inline

**PlayingPhase.vue changes:**

1. Move the `<TurnBanner :visible="isMyTurn" />` from its current location (line 74, between the top bar and center area) into the center game area `<div class="flex-1 flex items-center justify-center ...">` section.

2. Restructure the center game area to be a flex-col so the banner sits above the draw/discard piles:
   - Change `<div class="flex-1 flex items-center justify-center gap-6 sm:gap-8 px-4">` to `<div class="flex-1 flex flex-col items-center justify-center px-4">`
   - Inside, place the TurnBanner first (it will take zero height when hidden due to v-if + Transition)
   - Then place the draw/discard piles in a flex row: `<div class="flex items-center justify-center gap-6 sm:gap-8">`
   - Add a small margin `mb-2` between the banner and the piles row

This positions the "YOUR TURN" banner as part of the document flow within the center area, above the draw/discard piles and well clear of the player's card area at the bottom.
  </action>
  <verify>
    Run `make lint` from the project root to confirm no linting errors.
    Run `make type-check` to confirm no TypeScript errors.
    Visually confirm in the template that TurnBanner is inside the center flex area and has no fixed/absolute positioning.
  </verify>
  <done>
    - TurnBanner no longer uses fixed positioning or z-50
    - TurnBanner renders inline within the center game area, above the draw/discard piles
    - Banner animation still works (scale in/out with opacity)
    - Player cards area at the bottom of the screen is completely unobstructed
    - `make lint` and `make type-check` pass
  </done>
</task>

</tasks>

<verification>
- `make lint` passes with no errors
- `make type-check` passes with no errors
- TurnBanner.vue contains no `fixed`, `absolute`, or `z-50` classes
- PlayingPhase.vue shows TurnBanner inside the center game area div, not as a sibling overlay
- The banner is wrapped in document flow (no position hacks)
</verification>

<success_criteria>
- The "Your Turn" banner displays in the center of the game area above the draw/discard piles
- The banner does not overlap, obstruct, or block interaction with player's hand, face-up, or face-down cards
- The banner retains its yellow pill visual styling and enter/leave animations
- All linting and type checks pass
</success_criteria>

<output>
After completion, create `.planning/quick/007-your-turn-banner-obstructs-player-cards/007-SUMMARY.md`
</output>
