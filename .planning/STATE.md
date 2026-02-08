# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** Phase 7 (Endgame & Win Conditions) — In progress

## Current Position

Phase: 7 of 12 (Endgame & Win Conditions) — IN PROGRESS
Plan: 1 of 3 complete
Status: In progress
Last activity: 2026-02-08 — Completed 07-01-PLAN.md

Progress: [█████░░░░░] ~49% (24 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 24
- Average duration: 2.2 minutes
- Total execution time: 1.04 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | 706s | 177s |
| 02 | 4 | 705s | 176s |
| 03 | 3 | 503s | 168s |
| 04 | 6 | 866s | 144s |
| 05 | 4 | 668s | 167s |
| 06 | 2 | 356s | 178s |
| 07 | 1 | 196s | 196s |

**Recent Trend:**
- Last 5 plans: 04-06 (150s), 06-01 (116s), 06-02 (240s), 07-01 (196s)
- Trend: Schema-only plans fast (~3min), TDD/integration slower (~4min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Room codes over matchmaking — Friend-focused game, keep it simple
- No accounts — Zero friction to start playing
- Web app over native — Cross-platform from day one, accessible via link
- 30-second swap timer — Keeps pre-game phase moving, consistent for all players
- Timed turns (30-60s) — Prevents stalling in online play

**From 01-01:**
- Use Bun as runtime and package manager (native TypeScript, fast, built-in WebSocket)
- Monorepo structure with workspace protocol for internal dependencies
- No build step for shared package (Bun resolves TypeScript natively)
- Server runs on configurable PORT (default 3000)

**From 01-02:**
- Tailwind CSS v4 with Vite plugin (no PostCSS, simpler config)
- Vitest for all testing (consistency across client and server)
- Vite proxy for /api and /ws to server on localhost:3000
- Host 0.0.0.0 for Docker compatibility

**From 01-03:**
- Multi-stage Dockerfiles with separate dev and production targets
- oven/bun:1 as base image for both services
- nginx:alpine for client production (static file serving)
- Makefile as primary developer interface
- Anonymous volumes for node_modules in Docker Compose
- Build context is project root (access to all packages)

**From 01-04:**
- GitHub Actions for CI/CD (oven-sh/setup-bun, JorgeLNJunior/render-deploy)
- CI runs type-check, lint, test, build on every PR
- Deploy triggers automatically on merge to main
- OpenTofu for infrastructure-as-code (render-oss/render provider)
- Both client and server as render_web_service with Docker runtime
- Secrets via GitHub Actions secrets (never committed)

**From 02-01:**
- Schemas as single source of truth - types inferred via z.infer
- Discriminated unions with 'type' field for message protocol
- Room code length fixed at 6 characters
- Nickname length constrained to 1-20 characters with trim
- Max 4 players, min 2 players per room

**From 02-02:**
- Custom nanoid alphabet excludes confusable characters (0/O, 1/I/L, 5/S) for user-friendly room codes
- Host leaving destroys entire room (no host transfer) - keeps lobby management simple
- OperationResult discriminated union for error handling with typed error codes
- Player-to-room index Map for O(1) lookup performance
- TDD methodology: RED (failing tests) → GREEN (implementation) → REFACTOR (optional)

**From 02-03:**
- Singleton pattern for WebSocket composable to ensure all components share one connection
- WebSocket URL determined dynamically from window.location (works in dev and production)
- Auto-reconnect with 5 retries and 1s delay between attempts
- Heartbeat every 30s with 5s pong timeout to detect stale connections
- Room code input auto-uppercase and sanitized to alphanumeric only
- Hash history for router (GitHub Pages compatibility)

**From 02-04:**
- Singleton RoomManager pattern - single instance shared across all WebSocket connections
- Conditional OperationResult type - void results don't require data property
- Heartbeat ping/pong handled before JSON parsing for efficiency
- Origin validation deferred to production with TODO comment
- Pub/sub pattern: ws.publish for room broadcasts (excludes sender), ws.send for direct messages
- Game start countdown: 3-second setTimeout before status change to 'playing'

**From 03-01:**
- Card discriminated union by 'kind' field (standard vs joker) for type safety
- Jokers identified by numeric id (1 or 2) not by suit pattern
- PlayerGameView hides face-down cards from player themselves (count only)
- Opponent view shows only counts for hand and face-down cards
- Schema-first pattern extended to game messages (card schemas, gameDealtSchema)

**From 03-02:**
- Sequential dealing approach: face-down for all players, then face-up, then hand
- Fisher-Yates shuffle with array copy to prevent mutation
- Static class methods for GameEngine (stateless utilities, no instance state)
- TDD cycle produces atomic commits per phase (test → feat → refactor if needed)

**From 03-03:**
- Player WebSocket registry for per-player messaging (Map<playerId, WebSocket>) - enables different messages per player
- game-started replaced by game-dealt - per-player views instead of generic message
- Room.startGame() triggers dealing automatically (no separate deal step)
- Room manages GameState lifecycle: null in lobby, populated on game start

**From 04-01:**
- Swap timer schema validates 30-second maximum (consistent with project decision)
- Ready-up message is simple flag with no payload
- Swap-cards-updated includes full opponent views for immediate UI refresh
- Transitioning phase added between swapping and playing for clear state boundary
- INVALID_ACTION and PLAYER_NOT_FOUND error codes added for swap-phase errors

**From 04-02:**
- Define OperationResult locally in GameEngine.ts to avoid coupling to Room module
- Use destructuring assignment for swap instead of temp variable
- Validate indices against actual array lengths (not hardcoded 0-2) for future flexibility
- TDD cycle produces atomic commits per phase (test → feat → refactor)

**From 04-03:**
- Callback pattern for Room-to-handler broadcasting (onTick, onReady, onComplete)
- Swap after ready-up auto-un-readies player to prevent confusion
- Validate game exists in Room.swapCards() before delegating to GameEngine
- Set callbacks before startGame() to ensure timer broadcasts work immediately
- Per-player views sent to all players after any swap (authoritative server state)

**From 04-04:**
- Debounce swap messages at 150ms with 500ms maxWait to batch rapid taps
- Tap-tap pattern: select hand card, then face-up card (or vice versa) to trigger swap
- Auto-deselect on second tap of same card for easy selection correction
- No swaps allowed during transition phase (cards locked after swap-phase-complete)
- Simple numeric timer display with no urgency effects (per user decision)

**From 04-05:**
- Game wrapper component pattern for phase-based rendering (conditionally render phase-specific components)
- Route guard pattern: onMounted check for required state, redirect to landing if missing
- Game.vue renders SwapPhase for both 'swapping' and 'transitioning' phases

**From 04-06:**
- Lobby.vue navigates on game-dealt (not game-started) to align with Phase 3 server changes
- Dead schemas removed to prevent confusion (game-started never sent by server)

**From 05-01:**
- Gameplay message schemas extend discriminated union pattern from earlier phases
- playCardsSchema validates cardIndices as non-empty array of non-negative integers
- card-played message carries optional hand/opponents for per-player state updates
- pile-pickup message structure mirrors card-played for consistency
- NOT_YOUR_TURN error code added for turn validation

**From 05-02:**
- RANK_ORDER includes all 13 ranks (2 through A) in ascending order for Phase 5 basic comparison
- Special behavior for 2, 8, 10 deferred to Phase 6 (currently treated as normal ranks in natural positions)
- First player scan starts from rank 3 upward (2s excluded from first-player detection per game rules)
- getRankValue maps 2=-1 (lowest), 3=0, 4=1, ..., A=11, Joker=999 (highest)
- canPlayOn validates plays via simple numeric comparison (playedCard >= topCard)

**From 05-03:**
- playCards validates all cards have same rank for multi-card plays (no mixed-rank plays allowed)
- Auto-draw happens atomically after play within same state mutation (not separate operation)
- Turn advances via modular arithmetic for wrap-around: (currentPlayerIndex + 1) % players.length
- Card removal uses descending-sorted indices to avoid index shifting during splice
- Empty discard pile accepts any card (no validation required)

**From 05-04:**
- Room methods cast GameEngine error codes (string) to ErrorCode type for compatibility
- onPlayPhaseStart callback notifies all players when playing phase begins with first player
- Gameplay actions follow delegation pattern: handlers → Room → GameEngine → state update → broadcast
- All players receive per-player views after any gameplay action (card-played, pile-pickup)
- Turn changes are broadcast via turn-changed message with currentPlayerIndex

**From 06-01:**
- isSpecialCard returns true only for ranks 2, 8, 10 (7 is NOT a special card, follows normal ordering)
- getEffectiveTopCard returns null for empty pile or all-8s pile (any card playable)
- canPlayOnPile implements precedence: empty pile → special cards → effective top null → 7-constraint → normal ordering
- detectBurn treats 8s as invisible when counting four-of-a-kind for non-8 ranks, but 8s count themselves
- Pure stateless functions for game rules with no side effects (composable, testable)

**From 06-02:**
- GameEngine.playCards uses canPlayOnPile instead of canPlayOn for card validation (supports all special card rules)
- Burn detection happens AFTER all cards are added to pile (handles multi-card plays correctly)
- On burn (10 or four-of-a-kind): pile clears to empty array, currentPlayerIndex stays same (player goes again)
- On no burn: turn advances normally via (currentPlayerIndex + 1) % players.length
- Player cannot win on a 10 because they get another turn after burn (will be enforced in Phase 8)

**From 07-01:**
- PlaySource type represents card progression: 'hand' → 'face-up' → 'face-down'
- face-down-result reveals flipped card to all players (transparency after blind play)
- game-over message identifies shithead with both ID and nickname
- GAME_OVER error code added for attempts to play after game completion

### Pending Todos

2 pending — `/gsd:check-todos` to review
- Configure ESLint for all packages (tooling)
- Add debug gamestate dev tooling (tooling)

### Blockers/Concerns

**User action required:** Render account setup and credentials (see 01-USER-SETUP.md)
- Deploy workflow will fail until GitHub secrets are configured
- OpenTofu requires API key to provision infrastructure
- Not a blocker for development, only for deployment

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 07-01-PLAN.md
Resume file: None

---
*State initialized: 2026-02-07*
*Last updated: 2026-02-08 after 07-01 execution*
