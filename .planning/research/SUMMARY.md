# Project Research Summary

**Project:** Shithead Online v2.0
**Domain:** Multiplayer card game expansion (Discord Activity + mobile UI improvements)
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

This research synthesizes findings for adding Discord Activity integration and mobile UI improvements to an existing, fully functional multiplayer Shithead card game (v1.0 is live and working). The v2.0 milestone is platform expansion (embed in Discord voice channels) plus UX polish (mobile card categorization, playability highlights, sound mute, host settings).

The recommended approach is **adapter-based dual-mode architecture**: 80% of the codebase remains unchanged, with a platform detection layer that abstracts authentication, connection, and room management differences between standalone web and Discord Activity modes. The existing Vue 3 + Bun + WebSocket stack is well-positioned for this integration. Only two new client dependencies are required: `@discord/embedded-app-sdk` v2.4.0 for Discord integration and `@vueuse/sound` v2.1.3 for sound management. No server-side framework changes needed.

The critical risk is **networking proxy complexity**. Discord Activities run in a sandboxed iframe where all network traffic routes through Discord's proxy (`{clientId}.discordsays.com`). The project has already experienced WebSocket proxy failures (ngrok blocked on iOS mobile, Docker DNS failed WS upgrade). These past lessons are red flags that Discord proxy must be tested FIRST, in Phase 1, before any other work. CSP restrictions, cookie partitioning, and URL mapping configuration are the most dangerous pitfalls that can cause rewrites if discovered late. Mobile UI refactoring carries additional risk of breaking existing responsive layouts. Mitigation: prototype networking early, design abstraction layer before implementation, test all breakpoints during mobile UI changes.

## Key Findings

### Recommended Stack

Discord Activity integration requires minimal stack changes. The existing validated stack (Vue 3, Bun, Vite, Tailwind CSS v4, WebSockets) remains unchanged. Two new client dependencies enable the v2.0 features:

**Core additions:**
- **@discord/embedded-app-sdk v2.4.0**: Official Discord SDK for Activities, handles OAuth2 and iframe communication, proxy networking support — chosen because it's the official SDK with clear documentation
- **@vueuse/sound v2.1.3**: Vue 3 composable wrapping Howler.js, provides reactive sound management with minimal bundle impact (~1kb + lazy-loaded Howler.js) — chosen for Vue-native reactivity and mute toggle support
- **Environment variables**: `VITE_DISCORD_CLIENT_ID` (client), `DISCORD_CLIENT_SECRET` (server) for OAuth2
- **Vite proxy configuration**: `/.proxy` prefix routes to backend during local dev, simulates Discord's production proxy

**No new frameworks or build tools required.** Server uses native Bun `fetch()` for Discord OAuth2 token exchange. Mobile UI improvements leverage existing Tailwind v4 touch utilities (no gesture libraries needed). WebSocket multiplayer continues working unchanged through Discord's transparent proxy.

**Critical version requirements:** None beyond v1.0 stack. Discord SDK v2.4.0 is latest stable (released Sept 2025). @vueuse/sound v2.1.3 is stable despite no recent updates (underlying Howler.js v2.2.4 is mature).

### Expected Features

v2.0 adds UX refinements and platform expansion. All features are additive — v1.0 game engine, rules, and multiplayer infrastructure remain unchanged.

**Must have (table stakes):**
- **Sound mute toggle** — Mobile game standard, players in public settings need audio control. Simple boolean state + localStorage.
- **Card playability highlights** — Digital card game standard (Hearthstone, MTG Arena). Shithead has complex rules (7s, 8s, pile state), players need visual cues showing valid plays. Always-visible green glow for mobile (no hover).
- **Mobile card categorization** — Threshold-based (>5 cards), splits hand into "Power Cards" (2, 8, 10) and "Normal Cards". Fixes v1.0's unusable large hand display on mobile.
- **Host settings for round time** — Enables playgroup customization without code changes. Standard multiplayer pattern.
- **Discord Activity iframe integration** — Milestone goal. Requires SDK initialization, OAuth2 flow, proxy networking, instance ID for auto-join from voice channel.

**Should have (differentiators):**
- **Smart category threshold** — Only show categories when hand >5 cards. Avoids unnecessary taps for small hands. Rare pattern (most games always use category view or never do).
- **Power card visual distinction** — Special styling for 2/8/10 in category view. Aligns with Shithead's game mechanics, reduces cognitive load.
- **Dual-mode architecture** — Standalone web AND Discord Activity from same codebase. Rare pattern (most games are platform-exclusive).
- **Card play confirmation in grid view** — Modal with "Play Selected" button. Prevents accidental plays from mobile mis-taps.

**Defer (explicitly out of scope for v2.0):**
- Separate music vs SFX controls (v2.0 only has SFX)
- Advanced host settings beyond round time
- Spectator mode for Discord Activity
- Accessibility features (screen reader, keyboard nav)
- Animated playability highlights (static glow sufficient)

### Architecture Approach

Discord Activities are iframe-based web applications with specialized proxy networking. The key architectural insight: 80% of existing codebase remains unchanged. Integration requires an adapter layer that abstracts platform differences.

The existing v1.0 architecture is well-positioned: server-authoritative game state (already necessary), player-specific views via WebSocket (compatible with Discord proxy), composable Vue 3 frontend (easy to inject adapters), monorepo structure (shared logic extracted). Discord's proxy architecture (`{clientId}.discordsays.com`) routes traffic through Cloudflare Workers, providing IP hiding and malicious endpoint blocking. WebSocket connections work identically from server's perspective — the proxy is transparent to Bun's WebSocket implementation.

**Major components:**

1. **Platform Detection Layer** — Detects standalone web vs Discord iframe at bootstrap (iframe check + URL params). Single detection point prevents race conditions.

2. **Auth Adapters** — Abstract authentication differences. Web mode: nickname input + anonymous UUID. Discord mode: OAuth2 flow via SDK, token exchange with server, Discord user info (username/avatar/id). Both implement common interface: `getPlayerId()`, `getPlayerInfo()`, `isReady()`.

3. **Connection Adapters** — Abstract WebSocket URL construction. Web mode: direct connection to server (existing v1.0 logic). Discord mode: proxy URL format `wss://{clientId}.discordsays.com/game-ws`. Adapter injected into `useGameSocket` composable.

4. **Room Adapters** — Abstract room joining paradigm. Web mode: manual room codes shared by host. Discord mode: instance ID from SDK enables auto-join for voice channel participants. Server generates deterministic code from instance ID hash.

5. **Existing Game Logic (UNCHANGED)** — `useGameSocket`, `useSwapPhase`, `usePlayingPhase`, all game components. Platform-agnostic, receives state from adapters.

**Server changes (minimal):** New `POST /auth/discord` endpoint for OAuth2 token exchange (client sends code, server exchanges with Discord API using client_secret, returns access_token). WebSocket upgrade handler accepts Discord proxy origin (`discordsays.com`). Room constructor supports optional instance ID for deterministic codes. No changes to game engine, RoomManager, or WebSocket protocol.

### Critical Pitfalls

Research identified 14 domain pitfalls. Top 5 critical risks:

1. **CSP Networking Assumptions** — Discord Activity sandbox blocks standard `fetch()`/`WebSocket()` patterns. All traffic must route through Discord's proxy with `/.proxy` prefix or URL mappings. Project's history (ngrok WS blocked on iOS, Docker DNS WS failures, Bun upgrade event issues) proves proxy complexity is high. **Mitigation:** Test WebSocket proxy FIRST in Phase 1 before any UI work. Use Vite proxy for local dev, validate with cloudflared tunnel early.

2. **Cookie Authentication Hell** — Third-party iframe context requires `SameSite=None; Partitioned; Secure` cookies with `Domain={clientId}.discordsays.com`. Browsers block standard cookies. **Mitigation:** Design dual-mode auth from day one. Use Discord OAuth2 for Activity mode, separate cookie domains per platform. Test in actual Discord client early.

3. **URL Mapping Configuration Gotchas** — Production deployments fail despite local cloudflared working. Root URLs add extra `/`, protocol must be omitted from targets, no port numbers supported, order matters. **Mitigation:** Separate Discord applications for dev/staging/prod. Document URL mapping rules in deployment checklist. Test prod-like domain before final deploy.

4. **Dual-Mode Architecture Debt** — Sprinkling `if (isDiscordActivity)` checks throughout codebase creates unmaintainable spaghetti. Research finding: "Evolutionary Architecture Fallacy" — architecture won't naturally emerge from code without upfront design. **Mitigation:** Design abstraction layer (interfaces for Auth/Connection/Room adapters) BEFORE writing any Discord code. Use dependency injection, not global checks.

5. **Mobile Responsive Refactoring Breaking Existing Layouts** — Changes to breakpoints, flexbox/grid, component hierarchy have cascading effects. "Breakpoint Hell" — complex CSS that breaks desktop while fixing mobile. **Mitigation:** Test all breakpoints before/after changes. Use container queries instead of media queries. Additive changes (new mobile components) over replacements (modifying shared components). Visual regression testing.

**Moderate pitfalls requiring attention:**
- Mobile Discord safe area ignorance (UI cut off by notches)
- WebSocket reconnection state loss (mobile network hiccups eject players)
- Local development environment drift (cloudflared vs production behavior)
- Third-party library CSP incompatibility
- OAuth2 implementation mistakes (invalid scopes, token lifecycle)

## Implications for Roadmap

Based on research, suggested phase structure prioritizes networking foundation and architecture before features:

### Phase 1: Networking Foundation & Proxy Setup
**Rationale:** Project history proves WebSocket proxy complexity is high (ngrok, Docker DNS failures). Discord's CSP restrictions block standard networking. Must validate proxy compatibility BEFORE building features or risk late rewrites. Phase 1 is risk mitigation.

**Delivers:**
- Vite `/.proxy` dev proxy configuration
- WebSocket connection through Discord proxy (prototype)
- URL mapping documentation and test setup
- cloudflared tunnel for local Discord Activity testing
- Validation that existing Bun WebSocket server works through Discord proxy

**Addresses:**
- Pitfall 1 (CSP networking) — validates proxy early
- Pitfall 3 (URL mapping) — establishes patterns before production
- Pitfall 8 (environment drift) — creates parity between local/prod

**Research flag:** NEEDS RESEARCH — Phase-specific research on Discord proxy URL mapping configuration, CSP workarounds, production deployment patterns.

---

### Phase 2: Platform Detection & Authentication Layer
**Rationale:** After networking validated, establish abstraction layer. Architecture must be designed before Discord features or suffer permanent tech debt (Pitfall 4). Auth differences permeate system (nickname vs OAuth2, cookies vs tokens).

**Delivers:**
- Platform detector (iframe + URL param check)
- Auth adapter interfaces and implementations (Web + Discord)
- Discord OAuth2 flow (authorize → server token exchange → authenticate)
- Server `POST /auth/discord` endpoint
- Cookie partitioning for Discord mode (`SameSite=None; Partitioned`)

**Uses:**
- `@discord/embedded-app-sdk` v2.4.0

**Addresses:**
- Pitfall 4 (dual-mode architecture debt) — designs abstraction early
- Pitfall 2 (cookie authentication) — handles partitioning correctly
- Pitfall 10 (OAuth2 mistakes) — implements full flow including refresh tokens

**Research flag:** SKIP RESEARCH — OAuth2 patterns well-documented, adapter pattern straightforward. Phase execution can proceed from project research.

---

### Phase 3: Connection & Room Adapters
**Rationale:** With auth established, abstract WebSocket connection and room joining differences. Enables game logic to remain platform-agnostic.

**Delivers:**
- Connection adapter interfaces and implementations
- Integration with `useGameSocket` composable (inject adapter)
- Room adapter interfaces and implementations
- Server support for Discord instance ID (deterministic room codes)
- WebSocket upgrade handler accepts Discord proxy origin

**Implements:**
- Connection abstraction (direct WS vs proxy URL)
- Room abstraction (manual codes vs instance ID auto-join)

**Addresses:**
- Pitfall 13 (activity session vs room code confusion) — separate paradigms cleanly

**Research flag:** SKIP RESEARCH — WebSocket patterns known, room management straightforward extension.

---

### Phase 4: Sound Mute Toggle (Quick Win)
**Rationale:** Independent feature, no dependencies on other v2.0 work. Quick UX win that unblocks public use of app. Sound notifications exist in v1.0, just need mute control.

**Delivers:**
- `useGameSounds` composable with mute state
- Icon button in UI (speaker with slash when muted)
- localStorage persistence across sessions

**Uses:**
- `@vueuse/sound` v2.1.3

**Addresses:**
- Table stakes feature from research
- Simple implementation, high impact

**Research flag:** SKIP RESEARCH — Standard pattern, library well-documented.

---

### Phase 5: Card Playability Highlights
**Rationale:** After dual-mode infrastructure established, add UX improvements. Playability highlights reduce rule confusion (Shithead has complex rules). High impact on new player experience.

**Delivers:**
- Compute valid plays from game state (integration with existing game engine)
- Always-visible visual indicators (green glow for playable, gray for disabled)
- Mobile-first design (no hover required)
- Dark background optimization (makes highlights pop)

**Addresses:**
- Table stakes feature from research
- Works in both standalone and Discord modes

**Research flag:** PROTOTYPE COLORS — Needs device testing to validate green glow visibility in light/dark mode, color blindness considerations.

---

### Phase 6: Mobile Card Category UI
**Rationale:** Fixes v1.0 pain point (large hands unusable on mobile). Requires careful breakpoint testing to avoid breaking existing layouts (Pitfall 5).

**Delivers:**
- Threshold-based categorization (>5 cards)
- Category buttons: "Power Cards (N)" | "Normal Cards (N)"
- Grid modal with 3-column layout, large tap targets (60px min)
- "Play Selected" confirmation button (prevents mis-taps)
- Power card visual distinction (gold/purple border)
- Safe area CSS variables for Discord mobile

**Addresses:**
- Table stakes feature from research
- Pitfall 5 (responsive refactoring) — test all breakpoints
- Pitfall 6 (safe areas) — apply Discord CSS variables
- Pitfall 14 (visual hierarchy) — distinct colors, iconography

**Research flag:** PROTOTYPE LAYOUT — Test grid sizes (2x3 vs 3x3) on real iOS/Android devices before implementation.

---

### Phase 7: Host Settings (Round Time)
**Rationale:** After mobile UI stable, add configuration features. Host settings enable playgroup customization.

**Delivers:**
- Host detection (whoever creates room/launches activity)
- Settings UI with progressive disclosure (host-only)
- Round time options (30s, 60s default, 90s)
- Validation and state sync to all clients
- Server enforcement of configured time

**Addresses:**
- Table stakes feature from research
- Standard multiplayer pattern

**Research flag:** SKIP RESEARCH — Form validation and state sync are known patterns.

---

### Phase 8: Discord Activity End-to-End Integration
**Rationale:** After all features working in standalone mode, validate full Discord Activity flow. Integration testing phase.

**Delivers:**
- Full OAuth2 flow tested in Discord iframe
- Multiplayer game in voice channel (instance ID routing)
- Room join/leave, game flow validation
- Mobile Discord app testing (iOS and Android)
- Production deployment with HTTPS and URL mappings
- Discord Developer Portal configuration documented

**Addresses:**
- Milestone goal (Discord Activity integration)
- Validates all adapters working together

**Research flag:** INTEGRATION TESTING — Not research, but comprehensive testing across platforms/devices.

---

### Phase 9: Reconnection & State Recovery (Mobile Polish)
**Rationale:** Mobile networks are flaky. Without reconnection grace period, Discord Activity becomes unusable on mobile.

**Delivers:**
- Grace period (30-60s) before ejecting player
- Server stores player state during disconnect
- Reconnection token for rejoining game session
- "Reconnecting..." UI indicator
- Exponential backoff with circuit breaker (avoid infinite loops)
- Discord SDK reconnection handling

**Addresses:**
- Pitfall 7 (reconnection state loss) — mobile UX essential
- Research finding: Discord gateway can enter infinite reconnection loop

**Research flag:** SKIP RESEARCH — WebSocket reconnection patterns well-documented, test with network throttling.

---

### Phase Ordering Rationale

**Risk-first approach:**
1. **Networking (Phase 1) validates highest risk early** — Project history proves WS proxy is complex. Prototyping in Phase 1 prevents late rewrites.
2. **Architecture (Phase 2-3) before features prevents tech debt** — Dual-mode abstraction designed upfront avoids "Evolutionary Architecture Fallacy" spaghetti code.
3. **Features build incrementally (Phase 4-7) on stable foundation** — Each feature works in both modes because adapters established.
4. **Integration (Phase 8) validates full system** — All pieces working together in Discord.
5. **Polish (Phase 9) enhances mobile experience** — Reconnection makes Activity usable on flaky networks.

**Dependency ordering:**
- Phases 1-3 are sequential (proxy → auth → connection/room)
- Phases 4-7 can be parallelized after Phase 3 (independent features)
- Phase 8 requires Phases 1-7 complete (integration)
- Phase 9 can be built after Phase 3 (uses connection adapter)

**Avoids pitfalls:**
- Phase 1 prevents CSP networking surprises
- Phase 2 prevents cookie authentication hell and architecture debt
- Phase 3 prevents room code confusion
- Phase 6 prevents responsive layout breakage (careful testing)
- Phase 9 prevents mobile reconnection frustration

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 1 (Networking):** Discord URL mapping configuration rules, CSP workarounds, production deployment patterns for proxy
- **Phase 5 (Playability):** Color scheme prototyping for mobile visibility and color blindness
- **Phase 6 (Mobile UI):** Grid layout testing on real devices (2x3 vs 3x3), optimal threshold testing

**Phases with standard patterns (skip research-phase):**
- **Phase 2 (Auth):** OAuth2 patterns well-documented, adapter pattern straightforward
- **Phase 3 (Connection/Room):** WebSocket and room management are known patterns
- **Phase 4 (Sound Mute):** Standard pattern, @vueuse/sound documented
- **Phase 7 (Host Settings):** Form validation and state sync known patterns
- **Phase 9 (Reconnection):** WebSocket reconnection patterns documented

**Integration testing (not research):**
- **Phase 8:** Comprehensive testing phase, not research phase

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Discord SDK v2.4.0 verified via npm/GitHub. @vueuse/sound stable. Existing v1.0 stack proven. |
| Features | HIGH | Well-established patterns (Hearthstone, MTG Arena) for card game UX. Discord Activity SDK documentation clear. |
| Architecture | HIGH | Adapter pattern proven, composable Vue 3 supports injection. Project structure already modular. WebSocket proxy transparency confirmed in Discord docs. |
| Pitfalls | HIGH | Verified with official Discord docs, community sources, GitHub issues. Project's own proxy history validates complexity warnings. |

**Overall confidence: HIGH**

All research areas have strong confidence due to official documentation sources, community consensus, and project-specific validation (WebSocket proxy lessons from v1.0). Discord SDK v2.4.0 is latest stable release with examples. Tailwind v4 touch utilities verified in official docs. Adapter pattern is standard engineering practice.

### Gaps to Address

Research is comprehensive, but these areas need validation during implementation:

- **Discord proxy WebSocket compatibility with Bun server** — Conceptually clear (proxy is transparent), but v1.0's proxy issues (ngrok, Docker DNS) flag this for early testing. Phase 1 prototype validates assumptions before committing to implementation. HIGH PRIORITY.

- **Mobile card grid layout optimization** — Research validates concept (threshold-based categories), but optimal grid size (2x3 vs 3x3) and threshold (>5 vs >7 cards) needs real device testing. Phase 6 should include device testing sprint before finalizing layout.

- **Color scheme visibility (playability highlights)** — Green glow validated in research (Hearthstone, MTG Arena use it), but needs testing in v1.0's specific Tailwind theme for light/dark mode visibility. Color blindness considerations (add shape/icon, not just color). Phase 5 should prototype with mock game state on mobile devices.

- **Third-party library CSP compatibility** — V1.0 dependencies need audit in Phase 1. If any libraries make external requests (analytics, error tracking), must configure URL mappings or patch with `patchUrlMappings()`.

- **Production URL mapping behavior** — Local cloudflared testing may not catch all production issues (project history: ngrok mobile failure). Phase 3 should establish staging environment with production-like domain before final production deploy.

- **Mobile Safari cookie partitioning edge cases** — Discord docs and browser standards clear, but mobile Safari sometimes behaves differently. Phase 2 auth testing should include real iOS Discord app, not just Chrome DevTools.

**Handling strategy:** All gaps have testing/validation strategies embedded in suggested phases. High-priority gaps (proxy, URL mappings) addressed in Phase 1-3. Medium-priority gaps (colors, grid) addressed during feature implementation phases with device testing. No gaps require additional research beyond implementation validation.

## Sources

### Primary (HIGH confidence)

**Discord Official Documentation:**
- [Discord Embedded App SDK](https://github.com/discord/embedded-app-sdk) — SDK v2.4.0 verification, OAuth2 flow, proxy architecture
- [Discord Embedded App SDK npm](https://www.npmjs.com/package/@discord/embedded-app-sdk) — Version confirmation, installation
- [Discord Embedded App SDK Documentation](https://docs.discord.com/developers/developer-tools/embedded-app-sdk) — API reference, initialization patterns
- [Discord Activities Networking Guide](https://docs.discord.com/developers/activities/development-guides/networking) — Proxy routing, URL mappings, CSP requirements
- [Discord Activities Local Development Guide](https://docs.discord.com/developers/activities/development-guides/local-development) — Cloudflared setup, URL mapping configuration
- [Discord Activities Mobile Development](https://docs.discord.com/developers/activities/development-guides/mobile) — Safe areas, thermal state API
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2) — Token exchange, client_secret handling, refresh tokens

**Tailwind CSS:**
- [Tailwind CSS Touch Action Utilities](https://tailwindcss.com/docs/touch-action) — v4 touch utilities verification
- [Tailwind CSS v4 Hover on Touch Devices](https://bordermedia.org/blog/tailwind-css-4-hover-on-touch-device) — Automatic `@media (hover: hover)` wrapping

**Vite:**
- [Vite Environment Variables Guide](https://vite.dev/guide/env-and-mode) — `VITE_` prefix requirement, TypeScript support
- [Vite Server Options](https://vite.dev/config/server-options) — Proxy configuration for `/.proxy` pattern

**VueUse Sound:**
- [VueUse Sound GitHub](https://github.com/vueuse/sound) — v2.1.3 verification, stability assessment
- [VueUse Sound npm](https://www.npmjs.com/package/@vueuse/sound) — Package details
- [VueUse Sound Documentation](https://sound.vueuse.org/) — Usage patterns, mute toggle

### Secondary (MEDIUM confidence)

**Community Resources:**
- [Patch Your Discord Activity's Network Requests](https://blog.waveplay.com/discord-proxy-csp-patch/) — CSP workarounds, `patchUrlMappings` best practices
- [Robo.js Discord Proxy Guide](https://robojs.dev/discord-activities/proxy) — Community proxy patterns
- [Colyseus + Discord Embedded SDK](https://colyseus.io/blog/discord-embedded-sdk/) — Multiplayer integration patterns, instance ID usage
- [Discord URL Mapping Patch Guide](https://github.com/discord/embedded-app-sdk/blob/main/patch-url-mappings.md) — URL mapping configuration details

**Mobile Card Game UX:**
- [Patterns of Card UI Design (Chris Tse)](https://talks.ui-patterns.com/videos/patterns-of-card-ui-design-chris-tse) — Visual hierarchy, interactivity patterns
- [The Card Games UI Design of Fairtravel Battle](https://gdkeys.com/the-card-games-ui-design-of-fairtravel-battle/) — Category systems, large hand management
- [Game UI Database - Hearthstone](https://www.gameuidatabase.com/gameData.php?id=628) — Mobile layout differences, playability indicators validation

**Responsive Design:**
- [Responsive Design in 2026: What's New and What's Next](https://medium.com/@netizens_technologies/responsive-design-in-2026-whats-new-and-what-s-next-137285d4f0c6) — Container query patterns, mobile-first principles
- [Why Responsive Design Still Fails In 2025](https://blog.imagine.bo/responsive-design-still-fails/) — Common pitfalls, breakpoint hell

**WebSocket Patterns:**
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view) — Reconnection grace periods, exponential backoff
- [WebSockets: The Complete Guide for 2026](https://devtoolbox.dedyn.io/blog/websocket-complete-guide) — Best practices, state recovery

### Tertiary (LOW confidence, validation needed)

**Discord Community Issues (specific edge cases):**
- [Root URL Mappings add an additional / - GitHub Issue](https://github.com/discord/discord-api-docs/issues/7223) — URL mapping slash bug
- [Activity can't connect websocket in some mobile versions](https://github.com/discord/discord-api-docs/issues/7054) — Mobile WebSocket specific issues
- [Discord gateway infinite reconnection loop](https://github.com/openclaw/openclaw/issues/11836) — Exponential backoff requirement
- [patchUrlMappings parameter matched ports issue](https://github.com/discord/embedded-app-sdk/issues/302) — Port number limitation

---

**Research completed:** 2026-02-15
**Ready for roadmap:** yes
