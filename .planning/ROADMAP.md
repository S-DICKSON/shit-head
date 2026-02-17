# Roadmap: Shithead Online

## Milestones

- ✅ **v1.0 MVP** - Phases 1-15 (shipped 2026-02-15)
- 🚧 **v2.0 UI + Discord** - Phases 16-22 (in progress)

## Overview

v2.0 expands the working v1.0 multiplayer card game with Discord Activity integration and mobile UX improvements. The journey prioritizes risk mitigation (validate networking proxy early), establishes clean platform abstraction (prevent tech debt), integrates Discord OAuth2 and room management, then layers on UX polish (sound mute, playability highlights, mobile card categories). All features work in both standalone web and Discord Activity modes from a single codebase.

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-15) - SHIPPED 2026-02-15</summary>

Phases 1-15 delivered the complete multiplayer Shithead card game with all rules, special cards, WebSocket multiplayer, responsive UI, and production deployment. See MILESTONES.md for full v1.0 details.

</details>

### 🚧 v2.0 UI + Discord (In Progress)

**Milestone Goal:** Improve mobile UX with card category navigation and playability highlights, add host settings, and integrate as a Discord Activity for seamless play in voice channels.

**Phase Numbering:**
- Integer phases (16, 17, 18...): Planned milestone work
- Decimal phases (16.1, 16.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 16: Networking Foundation** - Validate Discord proxy with WebSocket connections
- [x] **Phase 17: Platform Abstraction** - Dual-mode architecture without tech debt
- [ ] **Phase 18: Discord Authentication** - OAuth2 flow with token exchange
- [ ] **Phase 19: Discord Room Management** - Instance ID auto-join and production deployment
- [ ] **Phase 20: Sound & Settings** - Mute toggle and host-configurable round time
- [ ] **Phase 21: Card Playability Highlights** - Visual indicators for valid plays
- [ ] **Phase 22: Mobile Card Categories** - Normal/power card navigation for large hands

## Phase Details

### Phase 16: Networking Foundation
**Goal**: Validate that WebSocket connections work through Discord's proxy before building features
**Depends on**: Nothing (first v2.0 phase)
**Requirements**: DISC-07, DISC-08, DISC-09
**Success Criteria** (what must be TRUE):
  1. Vite dev server proxies `/.proxy` requests to local backend during development
  2. WebSocket connection works through Discord proxy (tested with cloudflared tunnel)
  3. URL mapping rules documented with production deployment checklist
  4. Existing Bun WebSocket server accepts connections routed through discordsays.com proxy
**Plans**: 5 plans

Plans:
- [ ] 16-01-PLAN.md — Proxy configuration (Vite /.proxy routes, server origin validation, client URL resolution)
- [ ] 16-02-PLAN.md — Connection resilience (exponential backoff, reconnecting overlay, retry button)
- [ ] 16-03-PLAN.md — Discord dev workflow (make dev-discord, docker-compose, DISCORD-SETUP.md)
- [ ] 16-04-PLAN.md — Automated tests (URL resolution tests, origin validation tests, experimental CI tunnel)
- [ ] 16-05-PLAN.md — Final verification (automated checks + visual checkpoint)

### Phase 17: Platform Abstraction
**Goal**: Establish clean dual-mode architecture that prevents tech debt
**Depends on**: Phase 16
**Requirements**: DISC-01, DISC-02, DISC-03
**Success Criteria** (what must be TRUE):
  1. Platform detection distinguishes Discord Activity from standalone web at startup
  2. Adapter interfaces defined for Auth, Connection, and Room with web implementations
  3. Standalone web app works unchanged (existing v1.0 functionality validated)
  4. Game logic components remain platform-agnostic (no `if (isDiscord)` checks in game code)
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — Platform abstraction layer (detection, interfaces, injection keys, web adapters)
- [x] 17-02-PLAN.md — Wire adapters into app startup and validate standalone web unchanged

### Phase 18: Discord Authentication
**Goal**: Complete OAuth2 flow with Discord user identity
**Depends on**: Phase 17
**Requirements**: DISC-04, DISC-05, DISC-06
**Success Criteria** (what must be TRUE):
  1. Discord SDK initializes and completes OAuth2 flow in Activity iframe
  2. Server exchanges OAuth code for access token (client secret never exposed to client)
  3. Discord user identity (username, avatar) displayed as player info in Discord mode
  4. Cookies use `SameSite=None; Partitioned; Secure` for Discord's third-party iframe context
**Plans**: TBD

Plans:
- [ ] 18-01: TBD during planning

### Phase 19: Discord Room Management
**Goal**: Complete Discord Activity integration with instance ID auto-join and production deployment
**Depends on**: Phase 18
**Requirements**: DISC-10, DISC-11, DISC-12, DISC-13, DISC-14, DISC-15
**Success Criteria** (what must be TRUE):
  1. Players in same Discord voice channel auto-join same game instance (no manual codes)
  2. Discord safe area CSS variables prevent UI cutoff on mobile notches/home indicators
  3. Full multiplayer game works in Discord Activity (tested on desktop and mobile Discord apps)
  4. Discord Activity deployed to production with HTTPS and URL mappings configured
  5. cloudflared tunnel setup documented for local Discord Activity testing
**Plans**: TBD

Plans:
- [ ] 19-01: TBD during planning

### Phase 20: Sound & Settings
**Goal**: Add sound mute toggle and host-configurable round time
**Depends on**: Phase 17 (needs platform abstraction to work in both modes)
**Requirements**: SETS-01, SETS-02, SETS-03
**Success Criteria** (what must be TRUE):
  1. User can toggle sound mute via icon button (speaker with slash when muted)
  2. Mute preference persists across sessions (localStorage)
  3. Host can configure round time (30s, 45s, 60s) in lobby before game starts
  4. Configured round time applies to all players' turn timers in that room
**Plans**: TBD

Plans:
- [ ] 20-01: TBD during planning

### Phase 21: Card Playability Highlights
**Goal**: Show visual indicators for which cards are valid to play
**Depends on**: Phase 17 (needs platform abstraction to work in both modes)
**Requirements**: MOBUI-01
**Success Criteria** (what must be TRUE):
  1. Cards in hand show green glow when playable on current pile (visible in light and dark mode)
  2. Cards in hand show gray/disabled state when not playable
  3. Playability indicators work without hover (always visible on mobile)
  4. Highlights correctly handle Shithead's complex rules (7s, 8s invisibility, 2s reset pile)
**Plans**: TBD

Plans:
- [ ] 21-01: TBD during planning

### Phase 22: Mobile Card Categories
**Goal**: Improve mobile UX with normal/power card category navigation and carousel for large hands
**Depends on**: Phase 17 (needs platform abstraction to work in both modes)
**Requirements**: MOBUI-02, MOBUI-03, MOBUI-04, MOBUI-05
**Success Criteria** (what must be TRUE):
  1. When hand has > 5 cards, category buttons appear ("Power Cards (N)" | "Normal Cards (N)")
  2. Tapping category button shows cards with large touch targets (60px minimum)
  3. Swipeable carousel allows navigating through cards within a category
  4. Power category includes 2, 7, 8, 10, and Joker with visual distinction (gold/purple borders)
  5. Normal category shows all non-power cards
  6. "Play Selected" confirmation button prevents accidental plays from mobile mis-taps
  7. All mobile breakpoints tested (existing desktop layouts unchanged)
**Plans**: TBD

Plans:
- [ ] 22-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 16 → 17 → 18 → 19 → 20 → 21 → 22

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 16. Networking Foundation | 5/5 | Complete | 2026-02-16 |
| 17. Platform Abstraction | 2/2 | Complete | 2026-02-17 |
| 18. Discord Authentication | 0/TBD | Not started | - |
| 19. Discord Room Management | 0/TBD | Not started | - |
| 20. Sound & Settings | 0/TBD | Not started | - |
| 21. Card Playability Highlights | 0/TBD | Not started | - |
| 22. Mobile Card Categories | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-15*
*Last updated: 2026-02-17 — Phase 17 complete*
