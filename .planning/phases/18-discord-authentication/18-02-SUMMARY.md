---
phase: 18-discord-authentication
plan: 02
subsystem: auth
tags: [discord, oauth2, embedded-app-sdk, platform-adapters, websocket]

# Dependency graph
requires:
  - phase: 17-platform-abstraction
    provides: AuthAdapter, ConnectionAdapter, RoomAdapter interfaces; web adapter implementations
  - phase: 18-01
    provides: /api/token endpoint for OAuth2 code exchange
provides:
  - DiscordAuthAdapter with 4-step OAuth2 flow (ready -> authorize -> token exchange -> authenticate)
  - DiscordConnectionAdapter delegating to useGameSocket
  - DiscordRoomAdapter delegating to useGameSocket
  - @discord/embedded-app-sdk installed as client dependency
  - Discord user identity accessible via getCurrentUser() for Phase 19 UI
affects: [19-discord-activity-ui, 20-discord-game-sync]

# Tech tracking
tech-stack:
  added: ["@discord/embedded-app-sdk@2.4.0"]
  patterns:
    - "Discord Activity OAuth2: 4-step flow (ready -> authorize -> /.proxy/api/token -> authenticate)"
    - "Thin adapter pattern: Discord adapters mirror web adapters, delegating to useGameSocket"
    - "Memory-only token storage: access_token never written to localStorage"

key-files:
  created:
    - packages/client/src/platform/adapters/discord/DiscordAuthAdapter.ts
    - packages/client/src/platform/adapters/discord/DiscordConnectionAdapter.ts
    - packages/client/src/platform/adapters/discord/DiscordRoomAdapter.ts
  modified:
    - packages/client/package.json

key-decisions:
  - "prompt: 'none' (not 'consent') for seamless OAuth2 UX without consent dialog"
  - "Access token kept in memory only — never stored in localStorage for security"
  - "name from global_name || username fallback (display name preferred over username)"
  - "Connection/Room adapters identical to web counterparts — Discord proxy routing at URL level handles Discord-specific routing"
  - "getSdk() exposed as Discord-specific method for future event subscriptions (Phase 19)"

patterns-established:
  - "Discord-specific methods (getDiscordUser, getSdk) live on the concrete class, not the interface"
  - "Phase 19 auto-populates nickname using getCurrentUser().name from DiscordAuthAdapter"

# Metrics
duration: 5min
completed: 2026-02-17
---

# Phase 18 Plan 02: Discord Adapters Summary

**Discord Activity OAuth2 authentication adapter with 4-step SDK flow, plus thin WebSocket connection/room adapters, using @discord/embedded-app-sdk@2.4.0**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-17T22:57:11Z
- **Completed:** 2026-02-17T23:02:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed @discord/embedded-app-sdk@2.4.0 as client dependency
- DiscordAuthAdapter implementing the full 4-step Discord Activity OAuth2 flow (sdk.ready -> authorize -> /.proxy/api/token token exchange -> sdk.commands.authenticate)
- User identity normalized to `{id, name}` with `global_name || username` fallback, accessible via `getCurrentUser()` for Phase 19 auto-population of player nickname
- DiscordConnectionAdapter and DiscordRoomAdapter as thin wrappers around useGameSocket (identical pattern to web adapters — Discord proxy routing is handled at the URL resolution level)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Discord SDK and create DiscordAuthAdapter** - `ca31d98` (feat)
2. **Task 2: Create DiscordConnectionAdapter and DiscordRoomAdapter** - `e1f65f3` (feat)

**Plan metadata:** (see final docs commit below)

## Files Created/Modified

- `packages/client/src/platform/adapters/discord/DiscordAuthAdapter.ts` - Discord OAuth2 adapter: 4-step flow, getCurrentUser(), getSdk(), getDiscordUser()
- `packages/client/src/platform/adapters/discord/DiscordConnectionAdapter.ts` - Connection adapter delegating to useGameSocket singleton
- `packages/client/src/platform/adapters/discord/DiscordRoomAdapter.ts` - Room adapter delegating to useGameSocket singleton
- `packages/client/package.json` - Added @discord/embedded-app-sdk@2.4.0 dependency

## Decisions Made

- Used `prompt: 'none'` (not `'consent'`) for seamless OAuth2 UX — no consent dialog shown for the `identify` scope
- Access token kept in memory only — never written to localStorage (security: token has no long-term value, Discord sessions managed by SDK)
- User name uses `global_name || username` fallback — `global_name` is the display name users set, `username` is the handle. Phase 19 UI uses this as the pre-populated nickname
- Connection and Room adapters are identical to web counterparts because Discord's proxy routing for WebSocket is handled at the URL level (configured in Phase 16), not at the application layer
- `getSdk()` exposed as a Discord-specific method (outside the `AuthAdapter` interface) so Phase 19 can access SDK for `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE` event subscriptions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

External services require manual configuration before end-to-end testing.
See [18-01-USER-SETUP.md](./18-01-USER-SETUP.md) for Discord Developer Portal credentials setup.

## Next Phase Readiness

- All three Discord platform adapters implemented and type-checked
- DiscordAuthAdapter ready to be wired into platform factory (Phase 19)
- `getCurrentUser()` returns `{id, name}` for pre-populating Discord user's display name as game nickname in Phase 19 UI
- `getSdk()` available for Phase 19 participant event subscriptions
- No blockers — Phase 19 can begin immediately

## Self-Check: PASSED

---
*Phase: 18-discord-authentication*
*Completed: 2026-02-17*
