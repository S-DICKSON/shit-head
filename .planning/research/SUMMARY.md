# Project Research Summary

**Project:** Shithead Online
**Domain:** Browser-based multiplayer card game
**Researched:** 2026-02-07
**Confidence:** MEDIUM

## Executive Summary

Shithead Online is a real-time multiplayer browser card game requiring server-authoritative architecture with WebSocket communication. Based on research, the product should be built with a modern JavaScript stack (React + TypeScript frontend, Node.js + Socket.IO backend) following established patterns from successful online card games like UNO Online and Cards Against Humanity Online. The core technical challenge is managing complex game state synchronization across 2-4 players with proper handling of disconnects and reconnections.

The recommended approach prioritizes simplicity: no database (ephemeral in-memory game rooms), no authentication (nickname-based join), and mobile-first responsive design. The server must be the single source of truth for all game state, with clients acting as pure view layers that optimistically update for responsiveness but always defer to server authority. This prevents cheating and ensures consistency across all players.

Key risks center on Shithead-specific rules complexity (invisible 8s, burn detection, face-down card endgame transitions) and multiplayer infrastructure challenges (reconnection handling, race conditions in turn timing, hidden information leakage). These risks are well-understood and can be mitigated through comprehensive testing, server-side validation, and careful protocol design from the start.

## Key Findings

### Recommended Stack

Modern JavaScript stack optimized for real-time multiplayer with minimal complexity. The research strongly recommends avoiding databases, authentication systems, and complex deployment patterns in favor of ephemeral in-memory game rooms and simple hosting.

**Core technologies:**
- **React 18 + TypeScript + Vite**: Industry standard UI framework with type safety for complex game state management, Vite for fast development
- **Node.js 20 LTS + Express + Socket.IO**: Full-stack JavaScript enabling type sharing, Socket.IO handles WebSocket rooms and reconnection automatically
- **Zustand**: Lightweight state management avoiding Redux complexity, perfect for client-side game state rendering
- **Tailwind CSS + Framer Motion**: Rapid responsive design and smooth card animations critical for mobile-first gameplay
- **Railway/Render**: WebSocket-compatible hosting with free tier and auto-deployment
- **Vitest**: Modern testing replacing Jest for Vite-based projects

**Critical stack decisions:**
- NO database (games are ephemeral, stored in memory)
- NO authentication (nickname-based join)
- NO server-side rendering (no SEO needs)
- Socket.IO over raw WebSocket (handles reconnection/rooms/fallbacks automatically)

**Confidence notes:** Frontend stack is HIGH confidence (established patterns), deployment options are LOW confidence (hosting landscape changes rapidly, needs 2026 verification), animation library versions need verification.

### Expected Features

Research identifies clear feature tiers based on successful casual multiplayer card games.

**Must have (table stakes):**
- Room creation with shareable 6-character codes
- Join via code with nickname (no account required)
- Player lobby with ready status and host controls
- Real-time game state synchronization via WebSocket
- Clear turn indicators and timers (30-45 seconds)
- Card hand display with sorting and touch-friendly selection
- Play/draw card actions with Shithead-specific mechanics (burn, face-up/face-down progression)
- Basic emotes for communication (4-6 reactions)
- Reconnection handling with grace period
- Mobile responsive layout with touch interactions
- Game over state with rankings
- In-game rules reference

**Should have (competitive differentiators):**
- Sound effects (low effort, high perceived quality)
- Smooth card animations (dealing, playing, burning)
- Spectator mode (5th friend can watch 4-player game)
- "Play Again" quick rematch with same players
- Reaction animations for big plays (burn effects)

**Defer (v2+):**
- Statistics/win tracking (requires persistence)
- Practice mode vs AI bots (high complexity)
- Multiple game variants (master standard rules first)
- Public room matchmaking (needs player base)
- Custom rule toggles (adds complexity)
- Friend lists (requires account system)

**Anti-features (explicitly avoid):**
- Required account creation (kills casual adoption)
- In-game purchases for gameplay (pay-to-win)
- Unmoderated text chat (toxicity risk)
- Heavy 3D graphics (slow load times)
- Desktop-only design (excludes mobile majority)

### Architecture Approach

Server-authoritative state machine pattern where the server owns all game logic and clients are pure rendering layers. Game rooms are isolated instances with dedicated state machines handling turn progression and rule validation.

**Major components:**

1. **WebSocket Manager (Server)** — Handles connections, authentication, message routing, heartbeat monitoring. Thin layer with no game logic.

2. **Lobby Manager (Server)** — Pre-game room creation, player join/leave, room code generation. Hands off to Game Room Manager when game starts.

3. **Game Room Manager (Server)** — Manages active game instances, routes player actions to correct game, handles disconnect/reconnect with 60-second grace period.

4. **Game Instance (Server)** — State machine owning complete game state, enforcing rules via Rules Engine, managing turns via Turn Manager. Emits state changes to room.

5. **Rules Engine (Server)** — Validates card plays against Shithead rules, handles special cards (2s, 8s, 10s), checks burn conditions (4-of-a-kind with invisible 8s), determines win conditions.

6. **State Manager (Client)** — Stores authoritative state from server, queues optimistic updates for responsiveness, reconciles on server response, rolls back on error.

7. **Network Client (Client)** — Manages WebSocket connection, sends player actions, receives state updates, handles reconnection with session tokens.

**Key architectural patterns:**
- Server is single source of truth (clients never mutate game state)
- Message-based protocol (typed actions from client, events from server)
- Optimistic updates (client shows immediate feedback, server reconciles)
- Hidden information filtering (server sends player-specific views, no opponent cards)
- Turn timer enforcement server-side (prevents timing manipulation)

**Data flow:** User action → Optimistic update → Send to server → Server validates → Server applies → Server broadcasts → All clients reconcile → Render

### Critical Pitfalls

1. **Client-Authoritative Game State** — Never trust client validation. Server must validate ALL moves, check turn order, verify card legality. Clients can be modified to cheat. Prevention: Server is source of truth, clients are view layer only. Client validation is UX optimization, server validation is security. Address in Phase 1 (foundational, hard to retrofit).

2. **Invisible 8 Burn Logic** — Shithead's defining complexity: 8s are "invisible" for burn counting and pile-top determination. Example: `[2,2,2,8,2]` must burn (4 of rank 2), and if pile ends with `[7,8,8]`, next player must beat 7 (not 8). Prevention: Filter invisibles for burn counting, separate "pile top for beating" logic, comprehensive test cases for all 8-combination scenarios. Address in Phase 2 (core rules engine).

3. **WebSocket Reconnection State Loss** — Browser tab backgrounding, network switches, server restarts all cause disconnects. Prevention: Session tokens separate from WebSocket, reconnect handshake with game ID, player slot reservation for 2-5 minutes, game state persistence (Redis for production). Address in Phase 4 (must work before multiplayer testing).

4. **Leaking Hidden Information** — Face-down cards and opponent hands must never be sent in network traffic. Prevention: Server sends player-specific views with redacted cards `{rank: null, faceDown: true}`, reveal only when played. Detection: Network inspector should never show hidden card values. Address in Phase 1 (protocol design, very hard to fix later).

5. **Endgame State Transition Bugs** — Complex state machine: hand → face-up → face-down → finished. Edge cases: empty hand mid-turn, last face-up burns (skip to face-down), last two players finish (game ends immediately), pickup from face-down phase (return to hand phase). Prevention: Explicit state transition function, check after every action, comprehensive unit tests. Address in Phase 2 (core state machine).

**Additional moderate pitfalls:**
- Race conditions in turn timing (action sequence numbers, server locking, grace period)
- Animation blocking state updates (animation queue, optimistic animations)
- Mobile touch target sizing (44px minimum, fan-out on touch)
- Insufficient logging for bug reports (server-side event log, replay system)
- No rate limiting on actions (10/second max, disconnect spammers)

## Implications for Roadmap

Based on research, suggested phase structure follows architectural dependencies and risk mitigation:

### Phase 1: WebSocket Foundation & Lobby System
**Rationale:** Communication layer is foundational. Everything depends on reliable WebSocket infrastructure. Lobby system has no complex game logic and can validate room management patterns before building game rules.

**Delivers:**
- WebSocket connection handling with heartbeat
- Room creation with 6-character codes
- Join room via code with nickname
- Player lobby with ready status
- Host controls (start, kick)
- Basic message routing

**Addresses:**
- Table stakes: Room creation, join via code, player list (FEATURES.md)
- Architecture: WebSocket Manager, Lobby Manager (ARCHITECTURE.md)

**Avoids:**
- Client-authoritative state (establish server authority pattern from start)
- Hidden information leakage (design protocol to send player-specific views)

**Research needs:** STANDARD PATTERNS — Room codes and lobby systems are well-documented. Skip `/gsd:research-phase`.

---

### Phase 2: Core Game Engine & Rules
**Rationale:** Game logic is the highest complexity component. Build and test extensively before UI work. Rules engine must handle Shithead-specific edge cases (invisible 8s, burn detection, multi-phase endgame).

**Delivers:**
- Game Instance state machine
- Deck initialization and shuffling
- Card dealing (3 hand, 3 face-up, 3 face-down)
- Rules Engine with Shithead rules
- Turn Manager with rotation
- Burn detection with invisible 8 handling
- Endgame state transitions (hand → face-up → face-down → finished)
- Win condition detection

**Uses:**
- Node.js + TypeScript for game logic
- Pure functions for testability

**Implements:**
- Game Instance, Rules Engine, Turn Manager (ARCHITECTURE.md)

**Avoids:**
- Invisible 8 burn logic bugs (comprehensive test cases for all combinations)
- Endgame transition bugs (explicit state machine with unit tests)

**Research needs:** CUSTOM DOMAIN RESEARCH — Shithead rules have complex edge cases not documented in general card game patterns. May benefit from `/gsd:research-phase` on:
- Invisible 8 implementation patterns
- Blind face-down play mechanics
- Burn detection algorithms

---

### Phase 3: Turn System & Timing
**Rationale:** Depends on working rules engine. Turn timing has race condition risks that need careful implementation.

**Delivers:**
- Turn timer (30-45 seconds) with server enforcement
- Auto-pickup on timeout
- Action sequence numbers for race prevention
- Turn advancement with special cases (burn = repeat turn)
- Skip disconnected players

**Addresses:**
- Table stakes: Turn indicators, turn timer (FEATURES.md)

**Avoids:**
- Race conditions (action sequence numbers, server-side locking, 200-500ms grace period)
- Timing manipulation (server enforces timer, client only displays countdown)

**Research needs:** STANDARD PATTERNS — Turn-based timing is well-documented in multiplayer game architecture. Skip `/gsd:research-phase`.

---

### Phase 4: Connection Management & Reconnection
**Rationale:** Critical for production usability but can be built after core gameplay works. Requires game state to be stable before adding reconnection complexity.

**Delivers:**
- Session tokens (JWT or UUID) separate from WebSocket
- Reconnect handshake (client sends token + game ID)
- Player slot reservation (60-second grace period)
- Full state sync on reconnect
- Disconnect UI ("Reconnecting..." vs "Connection lost")
- Rate limiting (10 actions/second, disconnect spammers)

**Addresses:**
- Table stakes: Reconnection handling (FEATURES.md)
- Architecture: Network Client reconnect flow (ARCHITECTURE.md)

**Avoids:**
- Reconnection state loss (session tokens survive socket disconnect)
- Action spam DoS (rate limiting with backpressure)

**Research needs:** STANDARD PATTERNS — WebSocket reconnection with Socket.IO is well-documented. Skip `/gsd:research-phase`.

---

### Phase 5: Client UI & Responsive Design
**Rationale:** Depends on stable server API. Mobile-first design must be validated on real devices, not just browser devtools.

**Delivers:**
- React + TypeScript UI components
- Card hand display with sorting
- Play/draw/pickup card interactions
- Mobile responsive layout (portrait primary)
- Touch-friendly card selection (44px targets, fan-out gesture)
- Turn indicator highlighting
- Pile and deck visibility
- Game rules modal
- Emote system (4-6 reactions)

**Uses:**
- React 18, Tailwind CSS for rapid responsive design
- Zustand for client state management
- Framer Motion for animations (deferred to Phase 6)

**Implements:**
- UI Layer, State Manager (ARCHITECTURE.md)

**Avoids:**
- Mobile touch target issues (44px minimum, test on real devices)
- Confusing error messages (specific error codes from server)
- No loading feedback (show "Playing..." spinner)

**Research needs:** STANDARD PATTERNS — React card game UIs have established patterns. Skip `/gsd:research-phase`.

---

### Phase 6: Animations & Polish
**Rationale:** Build after core gameplay is solid. Animations are complex (timing, queueing) and should not block core functionality.

**Delivers:**
- Card dealing animations
- Card play animations (hand → pile)
- Burn animations (cards fly off screen)
- Sound effects (shuffle, play, burn, win)
- Reaction animations for big plays
- Animation queue (prevent blocking state updates)
- Skip animations option

**Uses:**
- Framer Motion for declarative animations
- CSS transforms for GPU acceleration

**Avoids:**
- Animation blocking state updates (queue updates during animation)
- Mobile performance issues (GPU-accelerated transforms only)

**Research needs:** STANDARD PATTERNS — Card animation patterns are well-documented. Skip `/gsd:research-phase`.

---

### Phase 7: Testing & Bug Reporting
**Rationale:** Throughout development but formalized after core features complete. Replay system invaluable for debugging complex rule interactions.

**Delivers:**
- Vitest unit tests for Rules Engine
- Integration tests for game flow
- Server-side action logging
- Replay system (store action sequence, reproduce games)
- Client error reporting (send exceptions with game context)
- Edge case test scenarios (all burn combinations, endgame transitions)

**Uses:**
- Vitest for unit/integration testing
- In-memory action log (last 50 actions circular buffer)

**Avoids:**
- Insufficient logging (can't debug reported issues)

**Research needs:** STANDARD PATTERNS — Testing multiplayer games has established patterns. Skip `/gsd:research-phase`.

---

### Phase 8: Deployment & Production
**Rationale:** Final phase. Deploy to Railway/Render with WebSocket support.

**Delivers:**
- Production build configuration
- Deployment scripts (auto-deploy from git)
- Health check endpoints
- Room cleanup cron (delete rooms > 24 hours old)
- Basic monitoring (active games, connected players)

**Uses:**
- Railway or Render for hosting
- (Optional) Redis for multi-server state if needed

**Avoids:**
- Complex deployment (single-service deployment, no Docker needed for MVP)

**Research needs:** LOW CONFIDENCE — Hosting landscape changes rapidly. May benefit from `/gsd:research-phase` on:
- Current WebSocket hosting options in 2026
- Free tier limitations for Railway/Render
- Alternative platforms (Fly.io, Cloudflare Durable Objects)

---

### Phase Ordering Rationale

**Dependency-based ordering:**
- Phase 1 before all (communication foundation)
- Phase 2 before Phase 3 (rules before turn timing)
- Phase 4 after Phase 2 (reconnection needs stable game state)
- Phase 5 after Phase 4 (UI needs stable server API)
- Phase 6 after Phase 5 (animations on top of working UI)

**Risk mitigation:**
- Phase 1 addresses protocol design pitfalls early (client authority, hidden info)
- Phase 2 tackles highest complexity first (Shithead rules, extensive testing needed)
- Phase 4 handles production-critical reconnection before polish work

**Testing validation:**
- Each phase has testable deliverables
- Phase 2 enables Rules Engine unit testing before UI exists
- Phase 7 formalizes testing infrastructure built incrementally

### Research Flags

**Phases likely needing `/gsd:research-phase`:**
- **Phase 2 (Game Rules):** Shithead-specific edge cases (invisible 8s, blind face-down plays) are niche. Research burn detection algorithms and state machine patterns for multi-phase card games.
- **Phase 8 (Deployment):** Hosting landscape changes rapidly. Research current WebSocket hosting options, free tier limits, and alternatives to Railway/Render in 2026.

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Room codes and lobby management are well-documented patterns from successful online card games.
- **Phase 3:** Turn-based timing has established patterns in multiplayer game architecture.
- **Phase 4:** Socket.IO reconnection patterns are well-documented.
- **Phase 5:** React card game UIs have many examples (UNO Online, Exploding Kittens).
- **Phase 6:** Card animation patterns are standard (Framer Motion documentation covers this).
- **Phase 7:** Testing patterns for multiplayer games are established.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Frontend stack (React/TypeScript) is HIGH confidence, but deployment options and library versions need 2026 verification. Vite, Zustand, Framer Motion popularity should be checked. |
| Features | HIGH | Feature tiers are based on established patterns from successful card games (UNO Online, CAH Online). Table stakes are universal, differentiators are proven. |
| Architecture | HIGH | Server-authoritative WebSocket architecture is industry standard for multiplayer games. Component boundaries and patterns are well-established. |
| Pitfalls | MEDIUM | General multiplayer pitfalls are well-known. Shithead-specific pitfalls (invisible 8s, endgame transitions) are based on rules analysis, need validation during implementation. |

**Overall confidence:** MEDIUM

Research provides strong foundation for roadmap creation. Stack recommendations need version verification for 2026. Architecture patterns are proven. Shithead-specific complexities (invisible 8s, burn logic, multi-phase endgame) are identified but will need careful testing during Phase 2.

### Gaps to Address

**Stack verification (before Phase 1):**
- Verify latest stable versions: Vite 5.x vs 6.x, Node.js 20 LTS vs 22 LTS, Framer Motion version
- Check if Zustand is still preferred over Jotai/Valtio in 2026
- Confirm Vitest is still default choice for Vite projects
- Research Railway/Render vs alternatives (Fly.io, Cloudflare Durable Objects) for WebSocket hosting

**Rules clarification (during Phase 2):**
- Invisible 8s: Confirm "memory" behavior — if pile is [7,8,8], next player beats 7 (not 8)
- Multiple same-rank plays: Can player play 2,2,2 at once or must play individually?
- Blind face-down plays: If invalid, does pile get picked up with the invalid card?
- Burn on final card: If player's last card creates burn, do they win immediately or does burn "count"?

**Mobile testing (during Phase 5):**
- Test on real iPhone and Android devices (not just browser devtools)
- Validate 44px touch targets work for 10-card hands
- Check portrait mode layout on various screen sizes (375px to 428px wide)
- Test touch interactions (tap, drag, swipe, pinch) for card selection

**Performance validation (during Phase 6):**
- Mobile animation performance (60fps on mid-range devices)
- WebSocket message size (full state broadcast acceptable for MVP?)
- Server capacity (how many games per Node.js instance?)

**Production readiness (during Phase 8):**
- Hosting platform WebSocket support and limits
- Room cleanup strategy (memory leaks from abandoned games?)
- Monitoring and error tracking setup

## Sources

### Primary (HIGH confidence)
- **STACK.md** — Technology recommendations based on 2024 web development trends (Node.js, React, Socket.IO, Tailwind). Versions need 2026 verification.
- **ARCHITECTURE.md** — Server-authoritative multiplayer patterns, well-established industry standards for real-time games.

### Secondary (MEDIUM confidence)
- **FEATURES.md** — Feature tiers based on observed patterns from UNO Online, Cards Against Humanity Online, Exploding Kittens, Jackbox games. No direct 2026 user research.
- **PITFALLS.md** — Common multiplayer game development pitfalls from training data (January 2025). Shithead-specific pitfalls derived from rules analysis.

### Tertiary (LOW confidence)
- **Deployment recommendations** — Hosting landscape changes rapidly. Railway/Render recommendations need 2026 validation.
- **Library versions** — Specific version numbers (Vite 5.x, Framer Motion 11.x) need verification against current npm registry.

### Verification recommended:
1. Check npm registry for latest stable versions before Phase 1
2. Play current online card games to validate UX patterns (2026 state)
3. Review Socket.IO documentation for any v5 breaking changes
4. Research WebSocket hosting options available in 2026
5. Validate Shithead rules with multiple sources (official rules, player forums)

---

*Research completed: 2026-02-07*
*Ready for roadmap: yes*
