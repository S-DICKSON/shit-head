---
phase: 19-discord-room-management
plan: 05
subsystem: ui
tags: [vue, discord, safe-area, spectator, shithead-marker, avatar, mobile]

# Dependency graph
requires:
  - phase: 19-01
    provides: OpponentView.avatarHash, OpponentView.isShithead, RoomState.shitheadPlayerId, RoomState.spectatorCount types
  - phase: 19-02
    provides: Server autoReturnToLobby, spectator promotion logic, return-to-lobby message
  - phase: 19-04
    provides: isSpectator, spectatorGameView, spectatorCount state in useGameSocket; DiscordLobby.vue component
provides:
  - Shithead marker (poo emoji) in Lobby.vue and OpponentCards.vue
  - Discord avatars in OpponentCards.vue during gameplay
  - Auto-return flow in Game.vue (no play-again button)
  - Platform-aware return-to-lobby routing (Discord vs web)
  - Spectator view and banner in Game.vue
  - Spectator count indicator in PlayingPhase.vue
  - Safe area CSS with viewport-fit=cover for mobile Discord
affects:
  - Phase 20+ (Discord Activity): UI now handles spectator flow, safe area, platform-aware routing
  - Phase 23 (Frontend Testing): Game.vue no longer has play-again button; tests must not expect it

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Safe area CSS custom properties (env() with fallback 0px) defined once in :root, applied at App.vue root only
    - Platform-aware routing via inject(PlatformKey) in Game.vue
    - Discord CDN avatar URL construction with animated GIF support (a_ prefix)
    - Auto-return UX: finished phase shows "Returning to lobby..." animation, server triggers navigation

key-files:
  created: []
  modified:
    - packages/client/index.html
    - packages/client/src/style.css
    - packages/client/src/App.vue
    - packages/client/src/components/Lobby.vue
    - packages/client/src/components/Game.vue
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/components/OpponentCards.vue
    - packages/client/src/components/DiscordLobby.vue

key-decisions:
  - "Safe area applied only at App.vue root (100dvh + padding) — inner components use h-full/flex-1"
  - "Play-again button removed from Game.vue — server auto-returns after 5s via return-to-lobby message"
  - "Discord avatars in OpponentCards keyed on avatarHash !== undefined (not null check) — web players won't have field"
  - "DiscordLobby.vue unused vars (gameView, platform) fixed as Rule 1 auto-fix — pre-existing from plan 04"

patterns-established:
  - "getAvatarUrl helper: use BigInt(userId) % 5n for default avatar index (string userId safe with BigInt)"
  - "Avatar conditional: v-if=\"opponent.avatarHash !== undefined\" (not v-if=\"opponent.avatarHash\") — null is valid for web players"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 19 Plan 05: Web Client UI Updates Summary

**Shithead poo marker in lobby and gameplay, Discord avatars in OpponentCards, auto-return game-over screen, spectator banner and count, platform-aware routing, and mobile safe area CSS with viewport-fit=cover**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-18T20:18:45Z
- **Completed:** 2026-02-18T20:22:23Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Safe area CSS (viewport-fit=cover, env() custom properties, 100dvh root) prevents UI cutoff on iOS notch/home bar devices in Discord mobile Activity
- Shithead marker (poo emoji) renders next to previous loser in both Lobby.vue and OpponentCards.vue
- Discord avatars render next to opponent names during gameplay in OpponentCards.vue
- Game.vue finished phase replaced play-again button with "Returning to lobby..." auto-animation
- Game.vue routes to /discord-lobby for Discord players and /room/${code} for web on return-to-lobby
- Spectator banner in Game.vue and spectator count in PlayingPhase.vue visible to all relevant parties

## Task Commits

Each task was committed atomically:

1. **Task 1: Safe area CSS and viewport-fit=cover** - `2ef4503` (feat)
2. **Task 2: Update Lobby, Game, PlayingPhase, and OpponentCards** - `11088aa` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/client/index.html` - Added viewport-fit=cover to meta viewport tag
- `packages/client/src/style.css` - Added :root safe area CSS custom properties (--safe-top/right/bottom/left)
- `packages/client/src/App.vue` - Applied safe area padding at root level with 100dvh min-height
- `packages/client/src/components/Lobby.vue` - Shithead marker next to loser, spectator count near player heading
- `packages/client/src/components/Game.vue` - Removed play-again button, added spectator view, platform-aware routing
- `packages/client/src/components/PlayingPhase.vue` - Added spectator count indicator (fixed top-right overlay)
- `packages/client/src/components/OpponentCards.vue` - Discord avatar and shithead marker next to opponent names
- `packages/client/src/components/DiscordLobby.vue` - Fixed unused vars (auto-fix Rule 1)

## Decisions Made
- Safe area applied only at App.vue root (single point of truth): inner components use flex-1/h-full naturally without redundant padding
- Play-again button removed entirely — server-driven auto-return via return-to-lobby message after 5s is the UX model
- Discord avatar conditional uses `!== undefined` (not truthiness) because null is a valid value meaning "no avatar, use default Discord avatar"
- getAvatarUrl uses BigInt(userId) % 5n for default avatar index to safely handle large Discord snowflake IDs as strings

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused variable lint errors in DiscordLobby.vue**
- **Found during:** Task 2 verification (make lint)
- **Issue:** DiscordLobby.vue (created by plan 04) had `gameView` destructured but unused, and `platform` injected but unused — causing ESLint errors that blocked `make lint` for the whole client
- **Fix:** Removed `gameView` from useGameSocket destructuring, removed `platform = inject(PlatformKey)` and unused PlatformKey import. Ran `eslint --fix` to auto-correct HTML formatting warnings
- **Files modified:** packages/client/src/components/DiscordLobby.vue
- **Verification:** `make lint` passes with exit 0
- **Committed in:** 11088aa (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix to unblock lint gate. Pre-existing issue from parallel plan 04. Zero scope creep.

## Issues Encountered
- DiscordLobby.vue from parallel plan 04 had unused variable lint errors that blocked `make lint`. Applied Rule 1 auto-fix inline.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All web client UI components now support Phase 19 features
- Safe area CSS complete for Discord mobile
- Spectator UX complete (banner in Game.vue, count in PlayingPhase.vue)
- Shithead marker and Discord avatars complete
- Ready for Phase 19 plan 06 (integration/wiring plan if any) or Phase 20+

---
*Phase: 19-discord-room-management*
*Completed: 2026-02-18*

## Self-Check: PASSED
