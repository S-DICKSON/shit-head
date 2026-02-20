---
phase: quick-023
plan: 01
subsystem: ui
tags: [vue, discord, avatar, conditional-rendering]

requires: []
provides:
  - Correct avatar conditional: Discord avatar only shown for Discord users (discordUserId truthy)
  - Web players (Guest XXX) show name only with no avatar icon
affects: [future Discord UI work, OpponentCards, DiscordLobby]

tech-stack:
  added: []
  patterns:
    - "Avatar display gates on discordUserId (not avatarHash) — discordUserId is null for web, string for Discord"

key-files:
  created: []
  modified:
    - packages/client/src/components/OpponentCards.vue
    - packages/client/src/components/DiscordLobby.vue

key-decisions:
  - "Avatar img uses v-if='discordUserId' (truthiness) not avatarHash check — null avatarHash is valid for Discord users without custom avatar"
  - "DiscordLobby previously had no v-if on avatar at all — unconditional render caused all web players to show Discord default avatar"

patterns-established:
  - "Avatar display: gate on discordUserId (player is Discord user), not avatarHash (may be null for Discord users with default avatar)"

duration: 3min
completed: 2026-02-20
---

# Quick Task 023: Fix Discord Avatar Showing in Web Mode Summary

**Avatar img gated on discordUserId truthy check in OpponentCards.vue and DiscordLobby.vue, preventing web players from displaying Discord default avatars**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-20T18:24:00Z
- **Completed:** 2026-02-20T18:27:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Fixed `OpponentCards.vue`: changed `v-if="opponent.avatarHash !== undefined"` to `v-if="opponent.discordUserId"` — the previous condition passed for `null`, showing a Discord default avatar for all web players
- Fixed `DiscordLobby.vue`: added `v-if="player.discordUserId"` to the avatar `<img>` — it was previously unconditional, always rendering an avatar for every player regardless of platform
- Web players (Guest XXX) now show name only with no avatar icon; Discord players (custom or default avatar) unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix avatar conditional in OpponentCards.vue and DiscordLobby.vue** - `af839c3` (fix)

## Files Created/Modified

- `packages/client/src/components/OpponentCards.vue` - Changed v-if from `avatarHash !== undefined` to `discordUserId`
- `packages/client/src/components/DiscordLobby.vue` - Added `v-if="player.discordUserId"` to avatar img (was unconditional)

## Decisions Made

- Avatar display gates on `discordUserId` (truthy string for Discord users, null for web players), NOT on `avatarHash`. This is correct because Discord users without a custom avatar have `avatarHash: null` but still need to show a default Discord avatar — the `getAvatarUrl` function handles this correctly for null hashes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Fix is complete and minimal — two conditional changes, no logic changes
- `getAvatarUrl` left untouched (handles null avatarHash correctly for Discord users)
- Lint and type-check both pass

## Self-Check: PASSED

---
*Phase: quick-023*
*Completed: 2026-02-20*
