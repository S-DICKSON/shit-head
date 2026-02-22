# Roadmap: Shithead Online

## Current Milestone: v3.0 Quality & Testing

### Phase 24: Playwright Responsive E2E Testing

**Goal:** Add Playwright E2E testing to validate the UI works across mobile, tablet, laptop, desktop, and Discord iframe viewport sizes. Tests cover home screen, lobby screen, prepare phase (card swaps), and active in-game play.
**Depends on:** None (first phase of v3.0)
**Plans:** 4 plans

Plans:
- [x] 24-01-PLAN.md — Scaffold packages/e2e with Playwright config and Page Object Models
- [x] 24-02-PLAN.md — Home screen and lobby screen E2E tests (real WS)
- [x] 24-03-PLAN.md — Swap phase and game screen E2E tests (WS mocked) + CI integration
- [x] 24-04-PLAN.md — Gap closure: Switch mobile projects from WebKit to Chromium, remove skip guards

**Status:** Complete (verified 11/11 must-haves)

**Details:**
Enable quicker workflows for Claude to verify the interface renders and functions correctly at multiple viewport breakpoints:
- Mobile (375x667, 390x844)
- Tablet (768x1024)
- Laptop (1280x800)
- Desktop (1920x1080)
- Discord iframe (embed dimensions)

Screens to test:
- Home screen
- Lobby screen
- Prepare phase (card swap UI)
- Active in-game (gameplay UI)

---

### Phase 25: Bot Player

**Goal:** Add a bot player that can join a game room and play autonomously following valid game rules, enabling solo play and manual testing without needing other human players.
**Depends on:** Phase 24 (all prior phases complete)
**Plans:** 5 plans

Plans:
- [ ] 25-01-PLAN.md — Shared types (isBot) + Room bot infrastructure (addBot/removeBot)
- [ ] 25-02-PLAN.md — BotPlayer move selection logic (TDD)
- [ ] 25-03-PLAN.md — Wire bot into WebSocket handlers (add-bot/remove-bot, turn detection, auto-play)
- [ ] 25-04-PLAN.md — Client lobby UI bot controls (Add Bot, Remove, bot indicator)
- [ ] 25-05-PLAN.md — Integration tests + manual playtest verification

**Status:** Planned

**Details:**
- Bot joins a room as a regular player (server-side, no browser needed)
- Bot follows game rules: plays valid cards, picks up when needed, handles swap phase
- Simple strategy sufficient (play lowest valid card, basic heuristics)
- Host can add/remove bots from lobby
- Bots work in both standalone web and Discord Activity modes
- Useful for solo play and manual testing without multiple browser tabs

---
