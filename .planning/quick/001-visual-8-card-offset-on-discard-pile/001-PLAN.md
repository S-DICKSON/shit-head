---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/components/DiscardPile.vue
autonomous: true

must_haves:
  truths:
    - "When an 8 is the top card of the discard pile, it appears offset to the top-right so the card underneath is clearly visible"
    - "When multiple consecutive 8s are on top of the pile, they stack on each other in the offset position"
    - "When a non-8 card is played on top of 8(s), the card returns to normal centered pile position"
    - "Non-8 cards still stack with the existing 3px offset effect"
  artifacts:
    - path: "packages/client/src/components/DiscardPile.vue"
      provides: "8-card offset visual logic in discard pile"
      contains: "getCardTransform"
  key_links:
    - from: "packages/client/src/components/DiscardPile.vue"
      to: "visibleCards computed"
      via: "trailing 8 detection and conditional transform"
      pattern: "trailing.*8|offset"
---

<objective>
Offset 8-cards to the top-right of the discard pile so the effective card underneath is visible.

Purpose: 8s are "invisible" cards in Shithead — they don't change the effective top card. Currently 8s render semi-transparent but still cover the card underneath. Offsetting them to the top-right lets players clearly see what the effective top card is, which is critical for deciding what to play next.

Output: Updated DiscardPile.vue with offset transform logic for trailing 8s.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/components/DiscardPile.vue
@packages/client/src/components/PlayingPhase.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add trailing-8 detection and offset transforms to DiscardPile</name>
  <files>packages/client/src/components/DiscardPile.vue</files>
  <action>
Modify the DiscardPile component to detect consecutive trailing 8s in the visible cards and apply an offset transform to them.

**Trailing 8 detection logic:**
Add a computed `trailingEightCount` that counts how many consecutive 8s are at the END of the full `cards` array (not just visibleCards). Walk backwards from the last card: if it's a standard card with rank '8', increment count, otherwise stop.

**Visible cards adjustment:**
Update `visibleCards` to show enough cards so the effective card underneath the 8s is visible. The logic:
- Count trailing 8s in the full pile
- Take the last `Math.min(3 + trailingEightCount, cards.length)` cards from the pile, BUT cap visible cards at a reasonable maximum (e.g., 6) to avoid overflow
- This ensures the non-8 card underneath the 8 stack is always shown

**Transform logic:**
Create a function `getCardTransform(card, indexInVisibleCards)` that returns the CSS transform:
- Determine how many of the visible cards from the END are trailing 8s (recompute from visibleCards since it's a subset)
- For non-8 cards (or 8s that are NOT part of the trailing group): use the existing stacking offset `translate(${i * 3}px, ${i * 3}px)` where `i` is their sequential position among non-trailing cards
- For trailing 8s: offset to the top-right relative to the last non-8 card's position. Use `translate(${baseX + 20 + (eightIndex * 4)}px, ${baseY - 10 + (eightIndex * 2)}px)` where:
  - `baseX` and `baseY` are the position of the last non-8 card in the stack
  - `eightIndex` is 0 for the first trailing 8, 1 for the second, etc.
  - 20px right offset makes the card clearly displaced
  - -10px vertical offset moves it slightly upward
  - 4px/2px incremental offsets stack multiple 8s visually

**Update isTransparentEight:**
Change `isTransparentEight` to apply to ALL trailing 8s in the visible cards, not just the very top card. Any card that is part of the trailing 8 group should get the semi-transparent purple dashed style.

**CSS transition:**
Add a `transition: transform 0.3s ease` to the card div style so that when a non-8 is played on top of stacked 8s, the visual shift back to normal position is smooth (the 8s will no longer be visible/trailing, so next render shows normal stacking).

**Important:** Do NOT change the component's props interface. This is purely internal rendering logic. The `cards` prop still receives the full discard pile array from the parent.

**Container size consideration:** The parent container is `w-16 h-24 sm:w-20 sm:h-30`. Since offset 8s will extend beyond this, add `overflow-visible` to the relative container div and ensure the parent wrapper allows overflow. You may need to widen the container slightly or use `overflow-visible` on the outer div to prevent clipping.
  </action>
  <verify>
Run `cd /Users/stephendickson/Personal/shit-head && make type-check-client` to verify TypeScript compiles.
Run `cd /Users/stephendickson/Personal/shit-head && make build-client` to verify the build succeeds.
Visually inspect the component logic: trailing 8s should get different transforms than non-8 cards.
  </verify>
  <done>
DiscardPile component renders trailing 8-cards offset to the top-right of the pile. Multiple consecutive 8s stack in the offset position. Non-8 cards on top of 8s render in normal centered position. The effective card underneath 8s is clearly visible. TypeScript compiles and client builds successfully.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual verification of 8-card offset behavior</name>
  <what-built>DiscardPile component now offsets trailing 8-cards to the top-right so the effective card underneath is visible. Multiple 8s stack in the offset position, and non-8 cards played on top return to normal alignment.</what-built>
  <how-to-verify>
    1. Run `make dev` to start the local development server
    2. Open the game in browser and start a game (or use dev tools to test)
    3. Play an 8 onto the discard pile - verify it appears offset to the top-right, and the card underneath is clearly visible
    4. Play another 8 on top of the first 8 - verify both 8s are stacked in the offset position
    5. Play a non-8 card on top - verify it returns to normal centered pile alignment, covering the 8s
    6. Verify the semi-transparent purple dashed border still appears on all trailing 8s
    7. Check on mobile viewport (resize browser to ~375px width) - verify the offset does not overflow or look broken
  </how-to-verify>
  <resume-signal>Type "approved" or describe any visual issues to fix</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compiles: `make type-check-client`
- Client builds: `make build-client`
- No lint errors: `make lint`
- Visual: Trailing 8s offset to top-right, non-8s in normal position
</verification>

<success_criteria>
- Playing an 8 on the discard pile shows it offset to the top-right
- The effective card underneath the 8(s) is clearly visible
- Multiple stacked 8s appear in the offset position together
- Playing a non-8 on top of 8s returns to normal pile alignment
- Transition between states is smooth (CSS transition)
- No visual overflow issues on mobile or desktop viewports
</success_criteria>

<output>
After completion, create `.planning/quick/001-visual-8-card-offset-on-discard-pile/001-SUMMARY.md`
</output>
