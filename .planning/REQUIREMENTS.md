# Requirements: Shithead Online v2.0

**Defined:** 2026-02-15
**Core Value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction

## v2.0 Requirements

Requirements for v2.0 milestone: UI improvements + Discord Activity integration.

### Mobile UI

- [ ] **MOBUI-01**: Card playability highlights show which cards in hand are valid to play on current pile
- [ ] **MOBUI-02**: When hand has > 5 cards, display splits into normal and power card categories
- [ ] **MOBUI-03**: Power card category includes 2, 7, 8, 10, and Joker cards
- [ ] **MOBUI-04**: Category navigation allows switching between normal and power card views on mobile
- [ ] **MOBUI-05**: Touch-optimized card interactions with proper touch targets on mobile

### Sound & Settings

- [ ] **SETS-01**: Sound mute toggle persists across sessions (localStorage)
- [ ] **SETS-02**: Host can configure round time (30s, 45s, 60s) in lobby before game starts
- [ ] **SETS-03**: Configured round time applies to all players' turn timers

### Discord Activity — Platform Infrastructure

- [x] **DISC-01**: Platform detection distinguishes Discord Activity from standalone web at startup
- [x] **DISC-02**: Platform abstraction layer (adapters) separates Discord vs web concerns from game logic
- [x] **DISC-03**: Standalone web app continues working unchanged after Discord integration

### Discord Activity — Authentication

- [ ] **DISC-04**: Discord SDK initializes and completes OAuth2 flow in Activity iframe
- [ ] **DISC-05**: Server-side token exchange endpoint exchanges OAuth code for access token (client secret never exposed)
- [ ] **DISC-06**: Discord user identity (username, avatar) used as player info in Discord mode

### Discord Activity — Networking

- [x] **DISC-07**: WebSocket connections work through Discord's proxy (discordsays.com)
- [x] **DISC-08**: All API requests route through Discord proxy with proper URL mappings
- [x] **DISC-09**: Vite dev server proxy configured for local Discord Activity development

### Discord Activity — Room Management

- [ ] **DISC-10**: Discord Activity uses instance ID for automatic room creation/joining
- [ ] **DISC-11**: Players in same Discord voice channel auto-join same game instance
- [ ] **DISC-12**: Room codes still work for standalone web mode (unchanged)

### Discord Activity — Mobile & Polish

- [ ] **DISC-13**: Discord safe area CSS variables applied to prevent UI cutoff on mobile devices
- [ ] **DISC-14**: Discord Activity deployed and configured in Discord Developer Portal
- [ ] **DISC-15**: cloudflared tunnel setup documented for local Discord Activity testing

## Future Requirements

Deferred to later milestones.

### AI & Social

- **FUTURE-01**: Practice mode vs AI bots
- **FUTURE-02**: Statistics/win tracking (requires persistence)
- **FUTURE-03**: Public room matchmaking

### Discord Advanced

- **FUTURE-04**: Thermal state management (reduce animations when device overheating)
- **FUTURE-05**: OAuth2 token refresh flow (7-day expiry handling)
- **FUTURE-06**: Spectator mode for Discord Activity

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Just nicknames for web, Discord identity for Activity |
| Public matchmaking | Room codes only, play with friends |
| Chat system | Focus on gameplay |
| Native mobile apps | Browser-based only |
| Leaderboards / stats | No accounts to track against |
| discord.js bot library | Not needed for Activities (client-side SDK only) |
| Colyseus/Playroom state sync | Existing WebSocket multiplayer works, don't add new sync libs |
| Separate Discord Activity build | Same Vite build serves both modes |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MOBUI-01 | Phase 21 | Pending |
| MOBUI-02 | Phase 22 | Pending |
| MOBUI-03 | Phase 22 | Pending |
| MOBUI-04 | Phase 22 | Pending |
| MOBUI-05 | Phase 22 | Pending |
| SETS-01 | Phase 20 | Pending |
| SETS-02 | Phase 20 | Pending |
| SETS-03 | Phase 20 | Pending |
| DISC-01 | Phase 17 | Complete |
| DISC-02 | Phase 17 | Complete |
| DISC-03 | Phase 17 | Complete |
| DISC-04 | Phase 18 | Pending |
| DISC-05 | Phase 18 | Pending |
| DISC-06 | Phase 18 | Pending |
| DISC-07 | Phase 16 | Complete |
| DISC-08 | Phase 16 | Complete |
| DISC-09 | Phase 16 | Complete |
| DISC-10 | Phase 19 | Pending |
| DISC-11 | Phase 19 | Pending |
| DISC-12 | Phase 19 | Pending |
| DISC-13 | Phase 19 | Pending |
| DISC-14 | Phase 19 | Pending |
| DISC-15 | Phase 19 | Pending |

**Coverage:**
- v2.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-17 after Phase 17 completion*
