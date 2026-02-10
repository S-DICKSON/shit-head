---
phase: quick-002
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/composables/useGameSocket.ts
  - packages/client/src/components/PlayingPhase.vue
  - packages/client/src/components/DiscardPile.vue
autonomous: true

must_haves:
  truths:
    - "When a 10 is played or 4-of-a-kind burns the pile, a brief fire animation plays on the discard pile area before it clears"
    - "The fire animation lasts approximately 1.5 seconds and then fades out"
    - "The discard pile shows empty after the animation completes"
    - "Normal card plays (non-burn) do not trigger any fire animation"
  artifacts:
    - path: "packages/client/src/composables/useGameSocket.ts"
      provides: "Burn detection logic exposing reactive burnTriggered ref"
      contains: "burnTriggered"
    - path: "packages/client/src/components/PlayingPhase.vue"
      provides: "Wiring of burnTriggered to DiscardPile burnAnimation prop"
      contains: "burnAnimation"
    - path: "packages/client/src/components/DiscardPile.vue"
      provides: "CSS fire burst animation overlay triggered by burnAnimation prop"
      contains: "@keyframes"
  key_links:
    - from: "packages/client/src/composables/useGameSocket.ts"
      to: "packages/client/src/components/PlayingPhase.vue"
      via: "burnTriggered ref exposed from useGameSocket"
      pattern: "burnTriggered"
    - from: "packages/client/src/components/PlayingPhase.vue"
      to: "packages/client/src/components/DiscardPile.vue"
      via: ":burn-animation prop binding"
      pattern: "burn-animation"
---

<objective>
Add a fire burst animation to the discard pile when a burn occurs (10 played or 4-of-a-kind).

Purpose: Burns are a dramatic moment in Shithead -- the entire discard pile is destroyed. Currently the pile just silently empties with no visual feedback, which is anticlimactic. A brief fire animation gives satisfying visual confirmation that a burn happened.

Output: Burn detection in useGameSocket.ts, prop wiring in PlayingPhase.vue, and CSS fire animation in DiscardPile.vue.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/composables/useGameSocket.ts
@packages/client/src/composables/usePlayingPhase.ts
@packages/client/src/components/PlayingPhase.vue
@packages/client/src/components/DiscardPile.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add burn detection and wire the burnAnimation prop</name>
  <files>
    packages/client/src/composables/useGameSocket.ts
    packages/client/src/components/PlayingPhase.vue
  </files>
  <action>
**In useGameSocket.ts:**

Add burn detection logic inside `createGameSocket()`:

1. Add a reactive ref `burnTriggered = ref(false)` alongside other state refs (near line 56).

2. In the `case 'card-played':` handler (line 214), BEFORE updating `gameView.value`, detect a burn:
   - A burn occurred when the incoming `message.discardPile` is an empty array (`message.discardPile.length === 0`) AND the current `gameView.value.discardPile.length > 0` (pile was non-empty before).
   - If burn detected, set `burnTriggered.value = true`.
   - Use `setTimeout(() => { burnTriggered.value = false; }, 1500)` to auto-reset after the animation duration.
   - Then proceed with the existing gameView update as normal.

3. Expose `burnTriggered` in the return object of `createGameSocket()` (line 343 area), adding it alongside the other state properties.

**In PlayingPhase.vue:**

1. Destructure `burnTriggered` from `usePlayingPhase()` -- but wait, `burnTriggered` is on `useGameSocket`, not `usePlayingPhase`. The component already imports `useGameSocket` on line 29 (`const { send } = useGameSocket()`). Update this destructuring to also extract `burnTriggered`:
   ```
   const { send, burnTriggered } = useGameSocket();
   ```

2. Update the `<DiscardPile>` template (line 79) to pass the burn animation prop:
   ```
   <DiscardPile :cards="gameView?.discardPile ?? []" :burn-animation="burnTriggered" />
   ```

**Important:** The burn detection must happen BEFORE `gameView.value` is updated with the empty pile, so we can compare old vs new state. The existing code on line 215 checks `if (gameView.value)` before updating -- add the burn check inside that guard, before the spread assignment.

**Important:** Do NOT modify `usePlayingPhase.ts` -- it does not need to know about burns. The socket composable owns this state directly.
  </action>
  <verify>
Run `cd /Users/stephendickson/Personal/shit-head && make type-check` to verify TypeScript compiles across all packages.
Run `cd /Users/stephendickson/Personal/shit-head && make lint` to verify no lint errors.
  </verify>
  <done>
The `burnTriggered` ref is exposed from useGameSocket, set to true when a card-played message results in an empty discard pile (from a non-empty pile), auto-resets after 1.5s. PlayingPhase passes `:burn-animation="burnTriggered"` to DiscardPile. TypeScript compiles and lint passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement CSS fire burst animation in DiscardPile</name>
  <files>packages/client/src/components/DiscardPile.vue</files>
  <action>
Add a fire burst animation overlay to DiscardPile.vue that plays when the `burnAnimation` prop is true.

**Template changes:**

Add a burn animation overlay element inside the outer `<div class="relative w-16 h-24 sm:w-20 sm:h-30 overflow-visible">` container, AFTER the empty state and stacked cards sections (before the closing `</div>` of that container). This overlay should render when `burnAnimation` is true:

```html
<!-- Burn animation overlay -->
<div
  v-if="burnAnimation"
  class="burn-overlay"
  aria-hidden="true"
/>
```

**Scoped CSS -- add a `<style scoped>` section:**

Create a fire burst effect using pure CSS pseudo-elements and keyframes. The animation should:
- Cover the discard pile area and slightly overflow it (position absolute, extending beyond the card boundaries)
- Use layered radial gradients in orange (#ff6600), red (#cc3300), and yellow (#ffcc00)
- Apply `mix-blend-mode: screen` for additive color blending that looks natural on the dark green background
- Use `filter: blur(8px) contrast(1.5)` for a fluid, organic fire look
- Animate with `@keyframes burn-burst` over 1.5s:
  - 0%: `opacity: 0; transform: scaleY(0.3) scaleX(0.8);` (fire starts small)
  - 15%: `opacity: 1; transform: scaleY(1.2) scaleX(1.1);` (rapidly expands)
  - 40%: `opacity: 0.9; transform: scaleY(1.0) scaleX(1.0);` (full blaze)
  - 70%: `opacity: 0.5; transform: scaleY(0.8) scaleX(0.9);` (dying down)
  - 100%: `opacity: 0; transform: scaleY(0.2) scaleX(0.5);` (fades out)
- Use `animation: burn-burst 1.5s ease-out forwards` so it plays once and stays at final state
- Add a `::before` pseudo-element with a second, slightly offset fire layer using different gradient positioning and a slightly faster animation (`burn-flicker`, 0.8s, 2 iterations) for visual depth
- The `::before` uses `@keyframes burn-flicker`:
  - 0%: `opacity: 0.8; transform: translateY(0) scaleX(1);`
  - 50%: `opacity: 1; transform: translateY(-8px) scaleX(1.2);`
  - 100%: `opacity: 0; transform: translateY(-16px) scaleX(0.6);`
- Add stacked `box-shadow` on the overlay for ember/particle glow effects:
  `box-shadow: 0 0 15px 5px rgba(255, 102, 0, 0.6), 0 0 30px 10px rgba(204, 51, 0, 0.4), 0 0 45px 15px rgba(255, 204, 0, 0.2);`

**CSS for `.burn-overlay`:**
```css
.burn-overlay {
  position: absolute;
  top: -20%;
  left: -30%;
  width: 160%;
  height: 140%;
  z-index: 50;
  pointer-events: none;
  border-radius: 50% 50% 30% 30%;
  background: radial-gradient(ellipse at 50% 80%, #ff6600 0%, #cc3300 40%, transparent 70%),
              radial-gradient(ellipse at 30% 60%, #ffcc00 0%, transparent 50%),
              radial-gradient(ellipse at 70% 70%, #ff4400 0%, transparent 50%);
  mix-blend-mode: screen;
  filter: blur(6px) contrast(1.5);
  animation: burn-burst 1.5s ease-out forwards;
  box-shadow: 0 0 15px 5px rgba(255, 102, 0, 0.6),
              0 0 30px 10px rgba(204, 51, 0, 0.4),
              0 0 45px 15px rgba(255, 204, 0, 0.2);
}

.burn-overlay::before {
  content: '';
  position: absolute;
  top: 10%;
  left: 15%;
  width: 70%;
  height: 80%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 90%, #ffcc00 0%, #ff6600 30%, transparent 60%);
  mix-blend-mode: screen;
  filter: blur(4px);
  animation: burn-flicker 0.8s ease-in-out 2;
}
```

**Key considerations:**
- Use `pointer-events: none` so the overlay does not intercept clicks.
- Use `aria-hidden="true"` since this is purely decorative.
- The `v-if="burnAnimation"` ensures Vue mounts/unmounts the element, which restarts the CSS animation each time.
- The z-index (50) must be higher than the card z-indices (which are 0-5 based on visible card count) so the fire renders on top.
- Do NOT remove or change any existing template structure, computed properties, or functions. Only ADD the overlay element and the scoped styles.
  </action>
  <verify>
Run `cd /Users/stephendickson/Personal/shit-head && make type-check` to verify TypeScript compiles.
Run `cd /Users/stephendickson/Personal/shit-head && make lint` to verify no lint errors.
Run `cd /Users/stephendickson/Personal/shit-head && make build` to verify the full build succeeds.
  </verify>
  <done>
DiscardPile.vue has a fire burst CSS animation overlay that renders when `burnAnimation` is true. The animation plays a 1.5s fire burst with radial gradients, blur/contrast filters, and box-shadow glow, then fades out. The animation restarts correctly on each burn. All builds and lint pass.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of burn animation</name>
  <what-built>Fire burst animation on the discard pile when a burn occurs (10 played or 4-of-a-kind clears the pile). The animation is a ~1.5s fire effect with radial gradients, glow, and fade-out.</what-built>
  <how-to-verify>
    1. Run `make dev` to start the local development server
    2. Open the game in browser and start a 2-player game (use two browser tabs)
    3. Play cards until you can play a 10 -- when the 10 is played, a fire burst animation should appear over the discard pile area
    4. Verify the animation lasts about 1.5 seconds, shows orange/red/yellow fire colors, and fades out
    5. After the animation, the discard pile should show the empty "Pile" placeholder
    6. Test 4-of-a-kind burn: play four cards of the same rank consecutively -- the same fire animation should trigger
    7. Verify normal card plays (non-10, non-4-of-a-kind) do NOT trigger the animation
    8. Check on mobile viewport (~375px width) -- animation should not overflow the screen or cause layout issues
    9. Evaluate whether the fire effect looks good on the dark green background (mix-blend-mode: screen should make it glow nicely)
  </how-to-verify>
  <resume-signal>Type "approved" or describe any visual issues (color, size, duration, timing) to adjust</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compiles: `make type-check`
- Client builds: `make build`
- No lint errors: `make lint`
- Visual: Fire animation plays on burn, does not play on normal card plays
- Timing: Animation lasts ~1.5s, auto-resets so subsequent burns re-trigger
</verification>

<success_criteria>
- Playing a 10 triggers a fire burst animation on the discard pile
- 4-of-a-kind burn triggers the same fire animation
- The animation is visually compelling (fire colors, glow, smooth fade)
- Animation lasts ~1.5 seconds and fades out cleanly
- Non-burn card plays do not trigger any animation
- The burnTriggered state auto-resets, allowing repeated burns to animate
- No layout overflow or visual issues on mobile viewports
- All type checks, lint, and builds pass
</success_criteria>

<output>
After completion, create `.planning/quick/002-burn-animation-discard-pile/002-SUMMARY.md`
</output>
