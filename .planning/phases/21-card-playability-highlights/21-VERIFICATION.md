---
phase: 21
verified: 2026-02-18T20:42:03Z
status: passed
score: 7/7 must-haves verified
---

# Phase 21: Card Playability Highlights Verification Report

**Phase Goal:** Show visual indicators for which cards are valid to play
**Verified:** 2026-02-18T20:42:03Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Must-Have Verification

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Cards in hand show green glow when playable on current pile during player's turn | VERIFIED | `PlayerCards.vue` line 144-145: `playableHandIndices.size > 0 && playableHandIndices.has(i) ? 'border-green-400 shadow-md shadow-green-400/40'` |
| 2 | Cards in hand show gray/dimmed state when not playable during player's turn | VERIFIED | `PlayerCards.vue` line 146-147: `playableHandIndices.size > 0 ? 'border-gray-400 opacity-50' : 'border-gray-300'` |
| 3 | No playability highlights appear when it is not the player's turn | VERIFIED | `usePlayingPhase.ts` line 80: `if (!gameView.value \|\| !isMyTurn.value) return new Set()` — empty Set causes size guard to produce `border-gray-300` for all cards |
| 4 | Highlights correctly reflect Shithead special rules (2s always playable, 8s transparent, 7-constraint, 10s always playable, jokers always playable) | VERIFIED | `cardRules.ts` lines 73-80 handle 2/8/10 always-playable and joker always-playable; lines 83-94 handle 8-transparency via `getEffectiveTopCard` and 7-constraint; logic is byte-for-byte match with server `CardRules.ts` |
| 5 | First-turn cards use forcedCardIndices instead of canPlayOnPile | VERIFIED | `usePlayingPhase.ts` line 82: `if (isFirstTurn.value) return forcedCardIndices.value` — short-circuits before canPlayOnPile is ever called |
| 6 | Face-up cards show playability highlights only when activeSource is face-up | VERIFIED | `usePlayingPhase.ts` line 95: `if (!gameView.value \|\| !isMyTurn.value \|\| activeSource.value !== 'face-up') return new Set()` — empty Set means face-up card CSS falls through to `border-gray-300` |
| 7 | Mobile grouped view shows playability ring on playable card groups | VERIFIED | `PlayerCards.vue` lines 80-84: `isGroupPlayable(group.indices) ? 'bg-gray-800/50 ring-1 ring-green-400 shadow-sm shadow-green-400/30'`; `isGroupPlayable` (lines 269-272) uses index-based check `props.playableHandIndices.has(i)` |

**Score:** 7/7 truths verified

## Artifacts Verified

| Artifact | Lines | Exports | Substantive | Wired | Status |
|----------|-------|---------|-------------|-------|--------|
| `packages/client/src/game/cardRules.ts` | 95 | `canPlayOnPile`, `getEffectiveTopCard`, `getRankValue`, `RANK_ORDER` | Yes — full implementations, no stubs | Imported by `usePlayingPhase.ts` line 4 | VERIFIED |
| `packages/client/src/composables/usePlayingPhase.ts` | 242 | `playableHandIndices`, `playableFaceUpIndices` (+ full return object) | Yes — both computeds fully implemented lines 79-103 | Consumed by `PlayingPhase.vue` line 27-28 | VERIFIED |
| `packages/client/src/components/PlayingPhase.vue` | 168 | Default Vue component | Yes — destructures both indices, passes as props | Passes `:playable-hand-indices` and `:playable-face-up-indices` to `<PlayerCards>` lines 132-133 | VERIFIED |
| `packages/client/src/components/PlayerCards.vue` | 313 | Default Vue component | Yes — accepts both props (lines 211-212), full CSS class bindings, `isGroupPlayable` helper lines 269-272 | Consumed by `PlayingPhase.vue` | VERIFIED |

### Artifact Depth Check: cardRules.ts vs Server Logic

Client `canPlayOnPile` in `cardRules.ts` matches server `CardRules.ts` exactly in logic:
- Empty pile check: identical
- 2/8/10 always-playable: identical
- Joker always-playable: client version adds explicit early return (server relied on 999 rank value — functionally equivalent, client version is clearer)
- 8-transparency via `getEffectiveTopCard`: `getEffectiveTopCard` is byte-for-byte identical between client and server
- 7-constraint (`<= 7`): identical
- Normal ordering (`>=`): identical

`getRankValue` in `cardRules.ts` matches server `CardComparison.ts` exactly:
- Same `RANK_ORDER` array
- Same `RANK_MAP` construction (index - 1 offset)
- Same joker=999 return
- Same error throw on unknown rank

## Key Links Verified

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `usePlayingPhase.ts` | `cardRules.ts` | `import { canPlayOnPile }` | WIRED | Line 4: `import { canPlayOnPile } from '../game/cardRules'`; called at lines 86, 98 |
| `PlayingPhase.vue` | `usePlayingPhase.ts` | Destructuring `playableHandIndices`, `playableFaceUpIndices` | WIRED | Lines 27-28 in destructuring block; both used at lines 132-133 |
| `PlayingPhase.vue` | `PlayerCards.vue` | Props `:playable-hand-indices` and `:playable-face-up-indices` | WIRED | Lines 132-133: `:playable-hand-indices="playableHandIndices"` and `:playable-face-up-indices="playableFaceUpIndices"` |
| `PlayerCards.vue` | CSS class bindings | `playableHandIndices.has(i)` in `:class` | WIRED | Lines 144-148 (hand), 40-44 (face-up), 80-84 (mobile grouped) all use index-based Set lookups |
| `PlayerCards.vue` | `isGroupPlayable` | `groupIndices.some(i => props.playableHandIndices.has(i))` | WIRED | Lines 269-272; called in mobile grouped view `:class` bindings at lines 80, 91 |

## Additional Behavioral Checks

**Face-down cards unchanged:** Confirmed. The face-down button CSS at `PlayerCards.vue` lines 23-31 uses static classes only (`border-blue-600`, `cursor-pointer hover:border-blue-400`). No playability class bindings applied.

**`forcedCardIndices` prop NOT passed:** `PlayerCards.vue` accepts `forcedCardIndices` as a prop (line 202 shows `defineProps`). Searching: `forcedCardIndices` is passed as `:forced-indices="forcedCardIndices"` in `PlayingPhase.vue` line 128. This prop is separate from `playableHandIndices` and is used for first-turn auto-selection UI only, not for highlight CSS.

**`playableHandIndices.size > 0` guard pattern confirmed:** When size is 0 (not my turn), the ternary chain falls to the final `'border-gray-300'` — identical to pre-feature behavior. Zero visual regression during opponent turns.

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| Client tests (`make test-client`) | 122/122 | PASS |
| Server tests (`make test-server`) | 340/340 | PASS |
| Total | 462/462 | PASS |
| Type check (`make type-check`) | shared + server + client (vue-tsc) | PASS |
| Lint (`make lint`) | shared + server + client | PASS |

**Note on unhandled errors in client test output:** 6 `Uncaught Exception` WebSocket connection error events appear in test output. These are pre-existing infrastructure noise from WebSocket cleanup during test teardown (Bun's `ws.WebSocket 'upgrade' event is not implemented`). All 122 test cases pass. This is a known pre-existing issue per project MEMORY.md.

## Anti-Patterns Found

None. Scanned all 4 modified files:
- No TODO/FIXME/placeholder comments
- No empty handler stubs
- No hardcoded mock data in render paths
- No `return null` or `return {}` in the new code paths

## Human Verification Required

The following items require a running game to verify visually. They cannot be confirmed by static analysis:

### 1. Green glow visible in light and dark mode

**Test:** Start a 2-player game. When it is your turn, observe your hand cards.
**Expected:** Playable cards show a green border and a subtle green shadow glow. Unplayable cards appear grayed out (reduced opacity, gray border).
**Why human:** CSS shadow rendering and color perception must be verified visually. The Tailwind classes `shadow-md shadow-green-400/40` and `opacity-50` are present in code but visual output depends on browser rendering.

### 2. Mobile grouped view ring highlights

**Test:** On a mobile-width screen (or DevTools narrow viewport), have more than 5 cards in hand on your turn. Observe the card group rows.
**Expected:** Playable card group rows show a green ring (`ring-1 ring-green-400`) around the group container. Unplayable groups are dimmed (`opacity-50`).
**Why human:** The `shouldShowGrouped` computed is `isMobile.value && props.hand.length > 5`, which requires a real window width < 640px to trigger. Cannot be verified statically.

### 3. No highlights during opponent's turn

**Test:** During an opponent's turn, observe your own hand cards.
**Expected:** All cards show default appearance (no green glow, no gray dim). The board looks identical to pre-feature v1.0 behavior during opponent turns.
**Why human:** Requires a running multiplayer session. The static analysis confirms `isMyTurn.value` guard returns empty Set, but the rendered result should be visually confirmed.

### 4. First-turn forced card highlighting

**Test:** Join a fresh game as the player who goes first. Observe hand highlighting before playing.
**Expected:** Only the lowest-ranked card(s) in hand show as highlighted (green glow). All other cards are dimmed. The forced cards should already be auto-selected (yellow ring).
**Why human:** First-turn state requires a live game session with `firstTurn: true` in gameView.

## Gaps Summary

No gaps. All 7 observable truths are verified by the codebase. All artifacts exist, are substantive (95-313 lines each, full implementations), and are wired correctly across the import chain from `cardRules.ts` through `usePlayingPhase.ts` through `PlayingPhase.vue` to `PlayerCards.vue`.

---

*Verified: 2026-02-18T20:42:03Z*
*Verifier: Claude (gsd-verifier)*
