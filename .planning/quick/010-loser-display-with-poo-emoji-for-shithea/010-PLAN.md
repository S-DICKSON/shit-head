---
phase: quick-010
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/composables/useGameSocket.ts
  - packages/client/src/components/Game.vue
autonomous: true

must_haves:
  truths:
    - "When game ends, loser's name displays with poo emoji"
    - "Message shows 'Loser! {Player Name} 💩' format"
    - "Display is prominent on finished phase screen"
  artifacts:
    - path: "packages/client/src/composables/useGameSocket.ts"
      provides: "Reactive state for shithead info"
      exports: ["shitheadNickname"]
    - path: "packages/client/src/components/Game.vue"
      provides: "Finished phase UI with loser display"
      contains: "💩"
  key_links:
    - from: "packages/client/src/composables/useGameSocket.ts"
      to: "game-over message"
      via: "message handler storing shitheadNickname"
      pattern: "shitheadNickname.*ref"
    - from: "packages/client/src/components/Game.vue"
      to: "shitheadNickname state"
      via: "useGameSocket composable"
      pattern: "shitheadNickname"
---

<objective>
Display the loser (shithead) prominently with poo emoji when game ends.

Purpose: Add satisfying game-over feedback showing who lost the Shithead game
Output: Updated finished phase UI showing "Loser! {Player Name} 💩"
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/stephendickson/Personal/shit-head/packages/client/src/composables/useGameSocket.ts
@/Users/stephendickson/Personal/shit-head/packages/client/src/components/Game.vue
@/Users/stephendickson/Personal/shit-head/packages/shared/src/schemas/messages.ts
</context>

<tasks>

<task type="auto">
  <name>Add shitheadNickname reactive state</name>
  <files>packages/client/src/composables/useGameSocket.ts</files>
  <action>
Add reactive state to store the shithead nickname from game-over message:

1. After line 68 (with other game state refs), add:
   ```typescript
   const shitheadNickname = ref<string | null>(null);
   ```

2. In the 'game-over' message handler (line 278-285), store the shithead info:
   ```typescript
   case 'game-over':
     shitheadNickname.value = message.shitheadNickname;
     if (gameView.value) {
       gameView.value = {
         ...gameView.value,
         phase: 'finished',
       };
     }
     break;
   ```

3. Export shitheadNickname in the return statement (after line 362):
   Add `shitheadNickname,` to the returned object
  </action>
  <verify>
Run type-check to ensure no TypeScript errors:
```bash
cd /Users/stephendickson/Personal/shit-head && make type-check-client
```
  </verify>
  <done>shitheadNickname is reactive state, populated on game-over, and exported from useGameSocket</done>
</task>

<task type="auto">
  <name>Update finished phase UI with loser display</name>
  <files>packages/client/src/components/Game.vue</files>
  <action>
Update the finished phase display to show the loser with poo emoji:

1. Import shitheadNickname from useGameSocket (line 9):
   ```typescript
   const { gameView, shitheadNickname } = useGameSocket();
   ```

2. Replace the finished phase div (lines 30-37) with:
   ```vue
   <!-- Finished Phase -->
   <div
     v-else-if="gameView.phase === 'finished'"
     class="min-h-screen flex items-center justify-center bg-green-900 text-white"
   >
     <div class="text-center">
       <div class="text-4xl font-bold mb-4">
         Game Over
       </div>
       <div v-if="shitheadNickname" class="text-3xl font-bold text-yellow-400">
         Loser! {{ shitheadNickname }} 💩
       </div>
     </div>
   </div>
   ```
  </action>
  <verify>
Run type-check and lint:
```bash
cd /Users/stephendickson/Personal/shit-head && make type-check-client && make lint
```
  </verify>
  <done>Finished phase displays "Loser! {Player Name} 💩" prominently in yellow text</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Loser display with poo emoji on game-over screen</what-built>
  <how-to-verify>
1. Start dev server: `cd /Users/stephendickson/Personal/shit-head && make dev`
2. Open two browser windows (localhost:5173)
3. Create room in first window, join in second
4. Start game and play through until one player runs out of cards
5. Verify game-over screen shows "Loser! {Shithead Name} 💩" in large yellow text
6. Check that both winner and loser see the same display
  </how-to-verify>
  <resume-signal>Type "approved" to confirm loser display works, or describe any issues</resume-signal>
</task>

</tasks>

<verification>
- Type checks pass for client package
- Lint passes (make lint)
- shitheadNickname is populated on game-over message
- Game.vue displays "Loser! {Player Name} 💩" on finished phase
- Poo emoji renders correctly in browser
</verification>

<success_criteria>
- [ ] shitheadNickname reactive state added to useGameSocket
- [ ] game-over handler stores shitheadNickname from message
- [ ] Game.vue imports and uses shitheadNickname
- [ ] Finished phase shows prominent loser display with poo emoji
- [ ] Type checks and lint pass
- [ ] Visual verification confirms loser display works
</success_criteria>

<output>
After completion, create `.planning/quick/010-loser-display-with-poo-emoji-for-shithea/010-SUMMARY.md`
</output>
