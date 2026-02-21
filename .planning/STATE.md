# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** v3.0 Quality & Testing

## Current Position

Phase: 24 of 24 (24-playwright-responsive-e2e-testing)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-02-21 - Completed 24-02-PLAN.md (home + lobby E2E tests)

Progress: [##########] v1.0 (15 phases) + v2.0 (8 phases) = 23 phases shipped + Phase 24 in progress (2/3 plans done)
Next: Execute Plan 03 (responsive layout tests — game screen, swap phase, opponent cards)

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

**v3.0 Velocity (so far):**
- Plans completed: 2
- Duration: ~3 minutes each

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

### Pending Todos

1 pending — `/gsd:check-todos` to review
- Add debug gamestate dev tooling (tooling)

### Roadmap Evolution

- Phase 24 added: Playwright Responsive E2E Testing

### Blockers/Concerns

- CI will need `bunx playwright install chromium` AND `bunx playwright install webkit` for full viewport coverage (mobile projects use WebKit)

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 24-02-PLAN.md (home + lobby E2E tests, 72 tests passing)
Resume file: None
Next: Execute 24-03-PLAN.md (responsive layout tests — game, swap phase, opponent cards)
