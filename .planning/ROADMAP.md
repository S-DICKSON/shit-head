# Roadmap: Shithead Online

## Overview

This roadmap delivers a browser-based multiplayer Shithead card game from zero to production deployment. The journey starts with foundational infrastructure (project setup, WebSocket communication, room management), builds the core game engine (deck dealing, turn system, special cards, endgame), adds production-critical features (timing, reconnection), implements the client UI, and finishes with deployment. Each phase delivers a coherent, testable capability following the natural dependencies of multiplayer game architecture.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Project Setup & Foundation** - Development environment, build system, deployment scaffold
- [x] **Phase 2: WebSocket Infrastructure & Room Management** - Real-time communication layer and lobby system
- [x] **Phase 3: Deck & Dealing System** - Card deck initialization and dealing logic
- [x] **Phase 4: Pre-Game Swap Phase** - 30-second simultaneous card swap before game start
- [x] **Phase 5: Core Game Engine & Rules** - Turn system, play validation, draw/pickup mechanics
- [x] **Phase 6: Special Cards & Burn Mechanics** - 2s, 7s, 8s, 10s, and burn detection
- [x] **Phase 7: Endgame & Win Conditions** - Hand to face-up to face-down progression and winner detection
- [ ] **Phase 8: Turn Timing & Auto-Pickup** - Turn timer with timeout handling
- [ ] **Phase 9: Connection Management & Reconnection** - Disconnect detection and reconnection flow
- [ ] **Phase 10: Client UI & Card Interactions** - React UI with card hand display and play actions
- [ ] **Phase 11: Game Feedback & Turn Indicators** - Turn state display and visual cues
- [ ] **Phase 12: Deployment & Production Polish** - Production build, hosting, and monitoring
- [ ] **Phase 13: ESLint Setup & Fixes** - Install ESLint for server and client, add to Makefile, fix issues

## Phase Details

### Phase 1: Project Setup & Foundation
**Goal**: Development environment is ready and deployment pipeline is scaffolded
**Depends on**: Nothing (first phase)
**Requirements**: None (foundational infrastructure)
**Success Criteria** (what must be TRUE):
  1. Developer can run local development server with hot reload
  2. Project has working build system producing optimized production bundle
  3. Basic CI/CD pipeline runs on push to main branch
  4. Deployment target is configured (Railway/Render/similar)
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffold with root config, shared package, and Bun server
- [x] 01-02-PLAN.md — Vue 3 client with Vite, Tailwind CSS, and Vitest
- [x] 01-03-PLAN.md — Docker containerization and Makefile developer interface
- [x] 01-04-PLAN.md — GitHub Actions CI/CD and OpenTofu infrastructure-as-code

### Phase 2: WebSocket Infrastructure & Room Management
**Goal**: Players can create and join rooms via share codes with real-time communication
**Depends on**: Phase 1
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04, MULT-01, MULT-02
**Success Criteria** (what must be TRUE):
  1. Player can create a room and receive a shareable 6-character code
  2. Player can join a room by entering a code and choosing a nickname
  3. Room displays all joined players (2-4) in real-time
  4. Server maintains authoritative room state with player-specific views
  5. Room creator can start the game when ready
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Shared message protocol, room types, and Zod validation schemas
- [x] 02-02-PLAN.md — Server room management engine (TDD: RoomManager + Room)
- [x] 02-03-PLAN.md — Client WebSocket composable, Vue Router, and Landing page
- [x] 02-04-PLAN.md — Server WebSocket handlers and index.ts integration
- [x] 02-05-PLAN.md — Client Lobby page, RoomCode component, and integration verification

### Phase 3: Deck & Dealing System
**Goal**: Cards are properly initialized and dealt to all players when game starts
**Depends on**: Phase 2
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04
**Success Criteria** (what must be TRUE):
  1. Game uses standard 52-card deck plus 2 Jokers (54 total)
  2. Each player receives 3 face-down, 3 face-up, and 3 hand cards
  3. Remaining cards form a visible draw pile
  4. Dealer role rotates clockwise after each hand
  5. Players see their own cards but opponents' cards are hidden
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Card types, game state types, and dealing message schemas
- [x] 03-02-PLAN.md — Deck shuffling and dealing engine (TDD)
- [x] 03-03-PLAN.md — Wire dealing into Room and WebSocket game start flow

### Phase 4: Pre-Game Swap Phase
**Goal**: Players can swap cards between hand and face-up during timed pre-game phase
**Depends on**: Phase 3
**Requirements**: SWAP-01, SWAP-02, SWAP-03
**Success Criteria** (what must be TRUE):
  1. After dealing, players enter a 30-second swap phase
  2. Players can swap any hand card with any face-up card
  3. All players swap simultaneously in real-time
  4. Game automatically starts when timer expires
  5. Timer countdown is visible to all players
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — Swap-phase message schemas and types (shared package)
- [x] 04-02-PLAN.md — GameEngine.swapCards() server-side validation (TDD)
- [x] 04-03-PLAN.md — Room swap/ready/timer integration and WebSocket handlers
- [x] 04-04-PLAN.md — Client swap phase composable and UI component
- [x] 04-05-PLAN.md — Wire SwapPhase into app (gap closure: Game.vue + routing)
- [x] 04-06-PLAN.md — Fix lobby-to-swap navigation (gap closure: game-dealt listener)

### Phase 5: Core Game Engine & Rules
**Goal**: Players can take turns playing cards following basic Shithead rules
**Depends on**: Phase 4
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, PLAY-07, SPEC-05
**Success Criteria** (what must be TRUE):
  1. Turns proceed clockwise starting from player with lowest card (3 upward)
  2. Player can only play card equal to or higher than top of discard pile
  3. Player can play multiple cards of same value in one turn
  4. Player automatically draws back up to 3 cards after playing (until draw pile empty)
  5. Player picks up entire discard pile when unable to play valid card
  6. Card value ordering is enforced: 3 < 4 < 5 < 6 < 7 < 9 < J < Q < K < A < Joker
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — Gameplay message schemas and types (play-cards, pickup-pile, card-played, pile-pickup, turn-changed)
- [x] 05-02-PLAN.md — Card rank comparison utilities and determineFirstPlayer (TDD)
- [x] 05-03-PLAN.md — GameEngine.playCards() and pickupPile() with validation and auto-draw (TDD)
- [x] 05-04-PLAN.md — Room gameplay methods and WebSocket handler integration

### Phase 6: Special Cards & Burn Mechanics
**Goal**: Special cards (2, 7, 8, 10) and burn detection work correctly
**Depends on**: Phase 5
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, BURN-01, BURN-02, BURN-03
**Success Criteria** (what must be TRUE):
  1. Playing a 2 resets the pile and can be played on anything
  2. Playing a 7 forces next player to play 7 or lower
  3. Playing an 8 makes it invisible (next player plays on card beneath)
  4. Playing a 10 burns the pile and player goes again
  5. Four-of-a-kind on pile burns it (8s invisible for non-8 counting)
  6. After burn, player can play any card on empty pile
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Special card validation and burn detection pure functions (TDD)
- [x] 06-02-PLAN.md — Integrate special cards and burn mechanics into GameEngine.playCards() (TDD)

### Phase 7: Endgame & Win Conditions
**Goal**: Players progress through hand, face-up, and face-down cards to win
**Depends on**: Phase 6
**Requirements**: END-01, END-02, END-03, END-04, END-05
**Success Criteria** (what must be TRUE):
  1. When hand is empty and draw pile is empty, player plays face-up cards
  2. When face-up cards are gone, player plays face-down cards blindly
  3. If blind face-down card is unplayable, player picks up pile (returns to hand phase)
  4. Player who empties all cards drops out of the game
  5. Last player with cards is declared the shithead and deals next hand
**Plans**: 5 plans

Plans:
- [x] 07-01-PLAN.md — Endgame message schemas and PlaySource type (shared package)
- [x] 07-02-PLAN.md — Endgame utilities and playFromFaceUp (TDD)
- [x] 07-03-PLAN.md — Blind face-down play mechanic (TDD)
- [x] 07-04-PLAN.md — Wire endgame into Room and WebSocket handlers
- [x] 07-05-PLAN.md — Fix TypeScript type errors: OperationResult alignment and test narrowing (gap closure)

### Phase 8: Turn Timing & Auto-Pickup
**Goal**: Turns have time limits with automatic pile pickup on timeout
**Depends on**: Phase 7
**Requirements**: MULT-03
**Success Criteria** (what must be TRUE):
  1. Each turn has a 30-60 second timer enforced server-side
  2. Timer countdown is visible to all players
  3. On timeout, player automatically picks up the discard pile
  4. Turn advances to next player after auto-pickup
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Turn timer tick schema and GameEngine.autoPlayOnTimeout (TDD)
- [ ] 08-02-PLAN.md — Room turn timer lifecycle and WebSocket handler integration
- [ ] 08-03-PLAN.md — Client TurnTimer component and gameView state updates

### Phase 9: Connection Management & Reconnection
**Goal**: Players can reconnect after disconnect and games handle disconnects gracefully
**Depends on**: Phase 8
**Requirements**: MULT-04, MULT-05, MULT-06
**Success Criteria** (what must be TRUE):
  1. Players receive correct player-specific state (hidden opponent hands/face-down cards)
  2. Disconnected player has brief grace period to reconnect
  3. Player can rejoin game after disconnect with full state restoration
  4. After grace period expires, disconnected player is removed from game
  5. Game continues with remaining players if 2+ remain
**Plans**: TBD

Plans:
- [ ] (Plans will be created during /gsd:plan-phase 9)

### Phase 10: Client UI & Card Interactions
**Goal**: Players have a responsive UI to view and play cards on mobile and desktop
**Depends on**: Phase 9
**Requirements**: UI-01, UI-02, UI-05
**Success Criteria** (what must be TRUE):
  1. UI works on mobile and desktop browsers with responsive layout
  2. Players can see their hand, face-up cards, face-down cards clearly
  3. Players can select and play cards with touch or click
  4. Cards animate smoothly when dealt, played, or burned
  5. Discard pile and draw pile are clearly visible
**Plans**: TBD

Plans:
- [ ] (Plans will be created during /gsd:plan-phase 10)

### Phase 11: Game Feedback & Turn Indicators
**Goal**: Players know whose turn it is and how much time remains
**Depends on**: Phase 10
**Requirements**: UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Current player is clearly highlighted with visual indicator
  2. Turn timer countdown is prominently displayed
  3. Players can distinguish whose turn it is at a glance
  4. Turn transitions are clear and immediate
**Plans**: TBD

Plans:
- [ ] (Plans will be created during /gsd:plan-phase 11)

### Phase 12: Deployment & Production Polish
**Goal**: Game is deployed to production and ready for real players
**Depends on**: Phase 11
**Requirements**: None (deployment infrastructure)
**Success Criteria** (what must be TRUE):
  1. Production build is deployed to public URL
  2. WebSocket connections work in production environment
  3. Rooms persist as long as game is active
  4. Basic monitoring shows active games and connected players
  5. Abandoned rooms are cleaned up after 24 hours
**Plans**: TBD

Plans:
- [ ] (Plans will be created during /gsd:plan-phase 12)

### Phase 13: ESLint Setup & Fixes
**Goal**: ESLint is configured for all packages with consistent rules and all issues are resolved
**Depends on**: Phase 12
**Requirements**: None (developer tooling)
**Success Criteria** (what must be TRUE):
  1. ESLint is installed and configured for server, client, and shared packages
  2. TypeScript-aware ESLint rules are enabled across the monorepo
  3. Makefile has `lint` and `lint-fix` targets
  4. CI pipeline runs linting on every PR
  5. All existing code passes ESLint with zero errors
**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md — Install ESLint 9 flat config with typescript-eslint v8 per-package configs, fix all errors, update Makefile and CI

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Setup & Foundation | 4/4 | Complete | 2026-02-07 |
| 2. WebSocket Infrastructure & Room Management | 5/5 | Complete | 2026-02-07 |
| 3. Deck & Dealing System | 3/3 | Complete | 2026-02-07 |
| 4. Pre-Game Swap Phase | 6/6 | Complete | 2026-02-07 |
| 5. Core Game Engine & Rules | 4/4 | Complete | 2026-02-07 |
| 6. Special Cards & Burn Mechanics | 2/2 | Complete | 2026-02-08 |
| 7. Endgame & Win Conditions | 5/5 | Complete | 2026-02-08 |
| 8. Turn Timing & Auto-Pickup | 0/3 | Not started | - |
| 9. Connection Management & Reconnection | 0/TBD | Not started | - |
| 10. Client UI & Card Interactions | 0/TBD | Not started | - |
| 11. Game Feedback & Turn Indicators | 0/TBD | Not started | - |
| 12. Deployment & Production Polish | 0/TBD | Not started | - |
| 13. ESLint Setup & Fixes | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-07*
*Last updated: 2026-02-08 after Phase 13 planning*
