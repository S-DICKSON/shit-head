---
phase: 18-discord-authentication
plan: 01
subsystem: auth
tags: [discord, oauth2, token-exchange, bun, env-config]

# Dependency graph
requires:
  - phase: 16-discord-proxy
    provides: /.proxy/ routing that forwards /api/token to server
provides:
  - POST /api/token endpoint for Discord OAuth2 code-for-token exchange
  - Server-side client secret protection (secret never sent to browser)
  - Documented environment variables for Discord credentials
affects:
  - 18-discord-authentication (plans 02+: DiscordAuthAdapter client implementation)
  - 19+ (any phase that uses Discord identity)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discord token exchange: POST application/x-www-form-urlencoded to https://discord.com/api/oauth2/token (NOT JSON)"
    - "Server-side secret protection: client secret read from process.env, never returned in response"
    - ".env.example pattern: commit example files, gitignore actual .env files"

key-files:
  created:
    - packages/server/.env.example
    - packages/client/.env.example
  modified:
    - packages/server/src/index.ts

key-decisions:
  - "Use application/x-www-form-urlencoded with URLSearchParams for Discord token endpoint (JSON is rejected)"
  - "Forward Discord error status code directly rather than mapping to a generic 500"
  - "No new dependencies — Bun's native fetch() sufficient for token exchange"

patterns-established:
  - "Token exchange pattern: validate code -> check env vars -> call Discord API -> extract access_token -> return to client"
  - "Error handling hierarchy: missing input (400) -> missing config (500) -> upstream error (forwarded status) -> unexpected (500)"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 18 Plan 01: Discord Token Exchange Endpoint Summary

**Server-side Discord OAuth2 token exchange via POST /api/token using Bun native fetch with application/x-www-form-urlencoded, keeping client secret off the browser**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T22:50:18Z
- **Completed:** 2026-02-17T22:53:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- POST /api/token endpoint added to Bun server with full error handling (400/500/forwarded Discord errors)
- Client secret protected server-side — only authorization code crosses the network from browser
- .env.example files created for both server and client documenting all required Discord credentials

## Task Commits

Each task was committed atomically:

1. **Task 1: Add /api/token POST endpoint to Bun server** - `d6b2fa6` (feat)
2. **Task 2: Create .env.example files for Discord credentials** - `061d881` (chore)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `packages/server/src/index.ts` - Added /api/token route between /health and /game-ws
- `packages/server/.env.example` - Documents PORT, NODE_ENV, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, ALLOWED_ORIGINS
- `packages/client/.env.example` - Documents VITE_DISCORD_CLIENT_ID (Vite prefix required for client exposure)

## Decisions Made
- Used `application/x-www-form-urlencoded` with `URLSearchParams` for Discord API call — Discord rejects JSON bodies (documented pitfall in research)
- Forward Discord's error status code directly rather than normalizing to 500 — gives client meaningful error info
- No new npm dependencies added — Bun's built-in `fetch()` handles the single POST

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** See [18-01-USER-SETUP.md](./18-01-USER-SETUP.md) for:
- Discord Developer Portal application setup
- Environment variables to add (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, VITE_DISCORD_CLIENT_ID)
- Redirect URI configuration (required: `https://127.0.0.1`)
- Verification commands

## Next Phase Readiness
- /api/token endpoint is live and ready to receive code exchanges from DiscordAuthAdapter
- Next: Plan 02 will implement DiscordAuthAdapter on client using @discord/embedded-app-sdk
- No blockers — type-check and lint both pass cleanly

## Self-Check: PASSED

---
*Phase: 18-discord-authentication*
*Completed: 2026-02-17*
