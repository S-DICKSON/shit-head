---
phase: quick
plan: "015"
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/Game.vue
  - packages/client/src/components/PlayingPhase.vue
  - packages/client/src/components/SwapPhase.vue
autonomous: true

must_haves:
  truths:
    - "Player can leave a stuck game and return to the home screen at any time"
    - "Leaving requires confirmation so accidental taps don't interrupt gameplay"
    - "The button is visible but unobtrusive during all active game phases"
  artifacts:
    - path: "packages/client/src/components/Game.vue"
      provides: "Leave game confirmation modal and handler"
    - path: "packages/client/src/components/PlayingPhase.vue"
      provides: "Leave button in playing phase UI"
    - path: "packages/client/src/components/SwapPhase.vue"
      provides: "Leave button in swap phase UI"
  key_links:
    - from: "PlayingPhase.vue / SwapPhase.vue"
      to: "Game.vue"
      via: "emit('leave') event"
      pattern: "emit.*leave"
---

<objective>
Add a "Leave Game" button accessible during active gameplay (swap phase, playing phase) that allows players to escape when the game gets stuck in a strange state.

Purpose: Sometimes the game gets into an unrecoverable state where the game thinks it's still playing. Players need an escape hatch to return home without refreshing.

Output: A small leave button in the top corner during gameplay with a confirmation dialog to prevent accidental taps.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/components/Game.vue
@packages/client/src/components/PlayingPhase.vue
@packages/client/src/components/SwapPhase.vue
@packages/client/src/composables/useGameSocket.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add leave game button and confirmation modal to Game.vue, PlayingPhase.vue, and SwapPhase.vue</name>
  <files>
    packages/client/src/components/Game.vue
    packages/client/src/components/PlayingPhase.vue
    packages/client/src/components/SwapPhase.vue
  </files>
  <action>
**Game.vue changes:**

1. Add a `showLeaveConfirm` ref (boolean, default false).
2. Add a `requestLeave` function that sets `showLeaveConfirm = true`.
3. Add a `cancelLeave` function that sets `showLeaveConfirm = false`.
4. The existing `handleLeave` function already handles the actual leave (sends `leave-room`, clears localStorage, navigates to `/`). Wire `confirmLeave` to call `handleLeave` and set `showLeaveConfirm = false`.
5. In the template, render a fixed-position confirmation modal overlay when `showLeaveConfirm` is true. The modal should:
   - Use `fixed inset-0 bg-black/60 flex items-center justify-center z-50` overlay
   - Show a centered card with: "Leave this game?" text, "You'll lose your place in this game." subtext
   - Two buttons: "Leave" (red, calls confirmLeave) and "Stay" (green/neutral, calls cancelLeave)
   - Style: `bg-gray-800 rounded-xl p-6 mx-4 max-w-sm w-full text-center`
6. For the swap and playing phases, pass `requestLeave` down via a `@leave` emit pattern. Add `@leave="requestLeave"` to both `<SwapPhase>` and `<PlayingPhase>` components in the template.

**PlayingPhase.vue changes:**

1. Add `defineEmits<{ leave: [] }>()` at the top of the script.
2. Add a small leave button in the top-left corner of the playing phase. Position it as a fixed button: `fixed top-2 left-2 z-40`.
3. Style: Small pill button with `px-3 py-1 text-xs font-medium bg-gray-800/70 hover:bg-gray-800/90 text-gray-300 hover:text-white rounded-full backdrop-blur-sm transition-all`. Text: "Leave".
4. On click, emit `leave` event.

**SwapPhase.vue changes:**

1. Add `defineEmits<{ leave: [] }>()` at the top of the script (or add to existing emits if any).
2. Add the same small leave button in the top-left corner: `fixed top-2 left-2 z-40`.
3. Same style as PlayingPhase: `px-3 py-1 text-xs font-medium bg-gray-800/70 hover:bg-gray-800/90 text-gray-300 hover:text-white rounded-full backdrop-blur-sm transition-all`. Text: "Leave".
4. On click, emit `leave` event.

The button should be subtle (semi-transparent dark pill) so it doesn't distract during normal gameplay, but always accessible for the stuck-state escape hatch.
  </action>
  <verify>
    Run `make type-check` to confirm no TypeScript errors.
    Run `make lint` to confirm no lint errors.
    Visually confirm: the leave button is visible in both swap and playing phases, clicking it shows confirmation modal, "Stay" dismisses modal, "Leave" navigates to home.
  </verify>
  <done>
    A "Leave" button appears in the top-left corner during swap and playing phases. Tapping it shows a confirmation dialog. Confirming leaves the game and returns to the landing page. Cancelling dismisses the dialog with no side effects.
  </done>
</task>

</tasks>

<verification>
- `make type-check` passes
- `make lint` passes
- Leave button visible during swap phase
- Leave button visible during playing phase
- Clicking leave shows confirmation modal
- Confirming leave navigates to landing page `/`
- Cancelling leave dismisses modal, game continues uninterrupted
</verification>

<success_criteria>
Players can escape a stuck game by tapping "Leave" and confirming, returning them to the home screen. The button is unobtrusive during normal gameplay but always accessible.
</success_criteria>

<output>
After completion, create `.planning/quick/015-need-a-return-to-lobby-button-as-sometim/015-SUMMARY.md`
</output>
