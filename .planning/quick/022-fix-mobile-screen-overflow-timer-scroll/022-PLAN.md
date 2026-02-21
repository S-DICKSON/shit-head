---
phase: quick
plan: 022
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/PlayingPhase.vue
  - packages/client/src/components/Game.vue
autonomous: true

must_haves:
  truths:
    - "PlayingPhase fits within the viewport on iPhone 15 Pro without scrolling"
    - "Safe area insets are respected — no content hidden behind notch or home bar"
    - "Fixed overlays (TurnTimer, MuteButton, Leave, Spectator count) remain correctly positioned"
  artifacts:
    - path: "packages/client/src/components/PlayingPhase.vue"
      provides: "Viewport-fitting game layout"
      contains: "100dvh"
    - path: "packages/client/src/components/Game.vue"
      provides: "Viewport-fitting spectator layout"
      contains: "100dvh"
  key_links:
    - from: "packages/client/src/App.vue"
      to: "packages/client/src/components/PlayingPhase.vue"
      via: "Safe area CSS variables consumed in height calc"
      pattern: "--safe-top.*--safe-bottom"
---

<objective>
Fix the PlayingPhase game view overflowing the viewport on mobile (iPhone 15 Pro), which forces users to scroll to see the full game.

Purpose: The game must fit entirely within the visible viewport on mobile devices. Scrolling during gameplay is disruptive and breaks the fixed-position overlay elements (timer, mute button).

Output: PlayingPhase and Game spectator view containers correctly sized to fit within the safe-area-padded viewport.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/App.vue
@packages/client/src/style.css
@packages/client/src/components/PlayingPhase.vue
@packages/client/src/components/Game.vue
@packages/client/src/components/TurnTimer.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix viewport height calculations for game containers</name>
  <files>
    packages/client/src/components/PlayingPhase.vue
    packages/client/src/components/Game.vue
  </files>
  <action>
**Root cause:** PlayingPhase.vue line 69 uses `h-screen` (which is `100vh`). On iOS, `100vh` can exceed the dynamic visible viewport. More importantly, App.vue already applies safe-area padding (top/bottom/left/right) via CSS variables. The PlayingPhase container at `100vh` extends beyond the available space inside that padded wrapper, causing overflow and scroll.

**Fix PlayingPhase.vue (line 69):**
Change the outer container div from:
```
class="flex flex-col h-screen bg-green-900 text-white overflow-hidden"
```
to:
```
class="flex flex-col bg-green-900 text-white overflow-hidden"
style="height: calc(100dvh - var(--safe-top) - var(--safe-bottom));"
```

This makes the container height exactly match the space available inside App.vue's safe-area padding. Using `100dvh` (dynamic viewport height) instead of `100vh` also handles iOS Safari's dynamic toolbar correctly.

**Fix Game.vue spectator view (line 64):**
Apply the same change to the spectator container div. Change from:
```
class="flex flex-col h-screen bg-green-900 text-white overflow-hidden"
```
to:
```
class="flex flex-col bg-green-900 text-white overflow-hidden"
style="height: calc(100dvh - var(--safe-top) - var(--safe-bottom));"
```

**Do NOT change:**
- TurnTimer.vue — its `position: fixed` is independent of the layout flow and already handles safe areas
- MuteButton.vue — same, fixed position overlay unaffected
- App.vue — the safe-area padding wrapper is correct as-is
- SwapPhase.vue — uses `min-h-screen` which allows scrolling (appropriate for swap phase which may have more content)
- Game.vue finished/fallback views — use `min-h-screen` for centering, no overflow issue

**Why `calc(100dvh - var(--safe-top) - var(--safe-bottom))` and not `h-full`:**
Using `h-full` would require setting explicit heights on every ancestor in the chain (Game.vue wrapper div at line 83 has no height, RouterView has no height). The calc approach is self-contained and doesn't require restructuring the component tree.
  </action>
  <verify>
1. `make lint` passes with no errors
2. `make type-check` passes
3. Visually verify in browser dev tools mobile emulation (iPhone 15 Pro / 393x852):
   - PlayingPhase container height should be less than 852px (accounting for safe areas)
   - No vertical scrollbar should appear
   - All game elements (opponents, center area, player cards, action buttons) visible without scrolling
  </verify>
  <done>
PlayingPhase and Game spectator containers use `calc(100dvh - var(--safe-top) - var(--safe-bottom))` for height. The game view fits within the viewport on mobile without scrolling. Fixed overlays (TurnTimer, MuteButton) remain correctly positioned.
  </done>
</task>

</tasks>

<verification>
- `make lint` passes
- `make type-check` passes
- In Chrome DevTools with iPhone 15 Pro emulation, the PlayingPhase view fits entirely within the viewport
- No scrollbar appears on the game view
- TurnTimer displays in bottom-right corner
- MuteButton displays in top-right area
- Leave button displays in top-left area
- Player cards and action buttons are visible at the bottom
</verification>

<success_criteria>
- Game view fits within the mobile viewport without requiring scroll
- Safe area insets are properly respected (no content behind notch/home bar)
- All fixed-position overlays (timer, mute, leave, spectator count) remain functional
- Lint and type-check pass
</success_criteria>

<output>
After completion, create `.planning/quick/022-fix-mobile-screen-overflow-timer-scroll/022-SUMMARY.md`
</output>
