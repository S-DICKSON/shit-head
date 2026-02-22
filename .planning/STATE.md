# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** Phase 25 — Bot Player

## Current Position

Phase: 25 of 25 (25-bot-player)
Plan: 2 of N complete
Status: In progress
Last activity: 2026-02-22 - Completed 25-02-PLAN.md (BotPlayer TDD: 21 tests, refactored implementation)

Progress: [##########] v1.0 (15 phases) + v2.0 (8 phases) + Phase 24 (4 plans) + Phase 25 (2/N plans)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 51
- Average duration: 2.3 minutes
- Total execution time: 2.05 hours
- Quick tasks completed: 21

**v2.0 Velocity:**
- Total plans completed: 26
- Average duration: 2.6 minutes
- Total execution time: 0.58 hours
- Quick tasks completed: 10

**v3.0 Velocity:**
- Plans completed: 4
- Duration: ~3 minutes each
- Total: ~12 minutes

**Phase 25 Velocity:**
- Plans completed: 2
- Duration: ~5.5 minutes each
- Total: ~11 minutes

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**Phase 24 Plan 01 decisions:**
- E2E tests live in packages/e2e as standalone Bun workspace (not merged with client/server tests)
- @types/node required in packages/e2e for process.env TypeScript support
- LandingPage.waitForConnected() fills temp nickname to observe canCreate button state
- POM locator strategy: getByRole > getByLabel > getByPlaceholder > getByText > data-testid
- data-testid="room-code" added to RoomCode.vue for stable E2E anchor

**Phase 24 Plan 02 decisions:**
- WebKit installed locally for mobile-375/mobile-390 viewport projects (iPhone SE/14 use WebKit by default)
- Hash-based routing detected via `page.waitForURL(/\/#\/room\//)` pattern
- Room code validated as `/^[A-Z0-9]{6}$/` from `[data-testid="room-code"]`
- Lobby tests: each test creates fresh room, server cleans up on WS close

**Phase 24 Plan 03 decisions:**
- WS mock sequencing: send room-created, waitForURL(lobby) + 100ms, THEN send game-dealt
- WS-mocked tests skip on WebKit (routeWebSocket is Chromium-only)
- CSS class locators (button.bg-white.text-black.rounded) for card counting due to sibling-div structure
- CI installs chromium-only to keep pipeline fast; WebKit mobile projects skip WS-mocked tests
- Playwright report artifact uses if: ${{ !cancelled() }} (not always())

**Phase 24 Plan 04 decisions (gap closure):**
- Switch mobile-375/mobile-390 from iPhone SE/14 WebKit presets to Chromium with `{ viewport, hasTouch: true, isMobile: true }`
- Remove unused `devices` import from @playwright/test
- Remove all test.skip(browserName !== 'chromium') guards — all projects now Chromium, 150/150 tests pass with 0 skips

**Phase 25 Plan 01 decisions:**
- `botPlayerIds` Set tracks bot identity (not stored on player objects); keeps player map structure unchanged
- `isBot: || undefined` in getState() so non-bot players omit the field (cleaner payloads)
- Bots excluded from markPlayAgain connected-player count (bots never call markPlayAgain)
- BotPlayer.ts implemented in plan 01 to fix pre-committed test file (not deferred to plan 02)
- `nanoid(8)` for bot IDs — unique 8-char suffix on `bot_` prefix
- botNameCounter resets on resetToLobby — fresh lobby restarts Bot 1, Bot 2 naming

**Phase 25 Plan 02 decisions (TDD):**
- Test file at `src/game/__tests__/` (existing vitest convention: `src/**/*.test.ts`)
- BotPlayer.ts already implemented in Plan 01; TDD confirmed correctness and drove refactor
- Extracted `selectLowestValidGroup` helper to eliminate duplicated find-lowest logic
- First-turn scan uses `RANK_ORDER.slice(1)` iteration (clearer than getRankValue scan)

### Pending Todos

1 pending — `/gsd:check-todos` to review
- Add debug gamestate dev tooling (tooling)

### Roadmap Evolution

- Phase 24 added: Playwright Responsive E2E Testing (complete)
- Phase 25 added: Bot Player (in progress)

### Blockers/Concerns

None — all known blockers resolved.

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 25-02-PLAN.md (BotPlayer TDD: 21 tests verified, refactored selectLowestValidGroup)
Resume file: None
Next: Execute 25-03-PLAN.md (bot turn-taking loop, Room integration, handlers.ts wiring)
