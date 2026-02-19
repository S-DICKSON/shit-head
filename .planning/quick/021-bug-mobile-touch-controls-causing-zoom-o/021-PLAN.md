---
phase: quick
plan: 021
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/style.css
  - packages/client/index.html
autonomous: true

must_haves:
  truths:
    - "Double-tapping the Pick Up Pile button on mobile does NOT trigger browser zoom"
    - "Double-tapping anywhere in the game area on mobile does NOT trigger browser zoom"
    - "Normal touch interactions (single tap, scroll) continue to work"
  artifacts:
    - path: "packages/client/src/style.css"
      provides: "touch-action: manipulation on game container"
      contains: "touch-action"
    - path: "packages/client/index.html"
      provides: "viewport meta preventing double-tap zoom"
  key_links: []
---

<objective>
Fix mobile double-tap-to-zoom interfering with the game's "Pick Up Pile" double-tap gesture.

Purpose: When playing the game on mobile, double-tapping the "Pick Up Pile" button causes the browser to zoom in, breaking the game experience. The game uses a custom `useDoubleTap` composable for pile pickup, and the browser's native double-tap-to-zoom gesture fires simultaneously.

Output: Mobile browsers no longer zoom on double-tap anywhere in the app. All existing touch interactions (tap cards, scroll hand, buttons) continue working normally.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/style.css
@packages/client/index.html
@packages/client/src/components/PlayingPhase.vue
@packages/client/src/components/PlayerCards.vue
@packages/client/src/composables/useDoubleTap.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Disable double-tap-to-zoom across the app</name>
  <files>packages/client/src/style.css, packages/client/index.html</files>
  <action>
Two changes to prevent mobile browsers from interpreting double-taps as zoom gestures:

1. In `packages/client/src/style.css`, add `touch-action: manipulation` to the `#app` selector (create it if it doesn't exist). This CSS property tells the browser to only allow panning and pinch-zoom -- it disables double-tap-to-zoom entirely. Apply it at the `#app` level since this is a full-screen game app and double-tap-to-zoom is never desired on any screen (lobby, game, etc.).

```css
#app {
  touch-action: manipulation;
}
```

Add this after the existing `:root` block.

2. In `packages/client/index.html`, update the existing viewport meta tag to include `user-scalable=no` and `maximum-scale=1.0`. This provides a belt-and-suspenders approach for older mobile browsers that may not fully respect `touch-action: manipulation`. Change:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```
to:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

Do NOT add `touch-action: none` -- that would break scrolling in the PlayerCards hand area. `manipulation` is the correct value: it preserves scroll and pinch-zoom but disables double-tap-to-zoom.

Do NOT modify any Vue components or the useDoubleTap composable -- this is purely a CSS/HTML fix.
  </action>
  <verify>
Run `make type-check` and `make lint` to ensure no regressions.

Manually verify by grepping:
- `grep "touch-action" packages/client/src/style.css` shows `touch-action: manipulation`
- `grep "user-scalable" packages/client/index.html` shows `user-scalable=no`
  </verify>
  <done>
- `style.css` contains `#app { touch-action: manipulation; }` rule
- `index.html` viewport meta includes `maximum-scale=1.0, user-scalable=no`
- `make lint` passes
- Double-tap-to-zoom is disabled app-wide on mobile browsers
  </done>
</task>

</tasks>

<verification>
- `make lint` passes with no new errors
- `make type-check` passes
- `grep -n "touch-action" packages/client/src/style.css` returns the manipulation rule
- `grep -n "user-scalable" packages/client/index.html` returns the updated viewport meta
</verification>

<success_criteria>
- The CSS `touch-action: manipulation` is applied to `#app` in style.css
- The viewport meta tag includes `user-scalable=no` and `maximum-scale=1.0`
- All existing lint and type-check targets pass
- Mobile double-tap on "Pick Up Pile" button (and anywhere else in the game) no longer triggers browser zoom
</success_criteria>

<output>
After completion, create `.planning/quick/021-bug-mobile-touch-controls-causing-zoom-o/021-SUMMARY.md`
</output>
