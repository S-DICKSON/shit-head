# Domain Pitfalls: Discord Activity Integration + Mobile UI Refactoring

**Domain:** Adding Discord Activity support and mobile UI improvements to existing multiplayer web game
**Researched:** 2026-02-15
**Confidence:** HIGH (verified with official Discord docs, community patterns, project's own proxy lessons)

## Executive Summary

Adding Discord Activity support to an existing multiplayer game introduces critical pitfalls across networking (CSP/proxy), authentication (dual-mode user identity), mobile compatibility (safe areas, touch events), and state management (reconnection, session recovery). **The most dangerous mistakes stem from assuming the Discord iframe environment behaves like standalone web** — it doesn't. CSP restrictions block standard networking patterns, cookies require special partitioning, and mobile Discord apps have unique constraints that desktop doesn't.

**This project has already experienced WebSocket proxy issues** (ngrok failed on iOS mobile due to interstitial page blocking WS upgrade, Docker internal DNS failed WS proxy through Vite). These lessons inform prevention strategies below.

Additionally, **mobile UI refactoring carries its own risks** — breaking existing responsive layouts, introducing "breakpoint hell", and diverging code paths between mobile and desktop. The combination of Discord Activity + mobile UI improvements creates compounding complexity that must be managed carefully through proper phase ordering.

---

## Critical Pitfalls

Mistakes that cause rewrites, failed deployments, or fundamental architecture changes.

### Pitfall 1: CSP Networking Assumptions — "Just Use Fetch/WebSocket"

**What goes wrong:**
Developers port existing game code with standard `fetch()` and `WebSocket()` calls, then discover all network requests fail with `blocked:csp` errors when running in Discord Activity iframe. Relative URLs like `/api/token` are blocked. External URLs like `https://api.example.com` are blocked. WebSocket connections to `ws://localhost:3000` fail. Nothing works.

**Why it happens:**
Discord Activities run in a sandboxed iframe where **all network traffic is routed through Discord's proxy** for security. The proxy enforces strict Content Security Policy rules that block direct external requests. Developers assume iframe = normal browser context, but Discord's CSP treats it like a hostile environment.

**This project already learned:** Bun's `node:http/node:net` upgrade events don't fire properly. Custom WebSocket proxy plugins fail. The standard approach (Vite proxy with `ws: true`, `changeOrigin: true`, HTTP target) is the only reliable pattern.

**Consequences:**
- Existing WebSocket multiplayer code completely broken
- API calls fail silently or with cryptic CSP errors
- Days spent debugging "why doesn't fetch work?"
- Late discovery forces architectural changes after UI work is done
- May require rewriting network layer entirely

**Prevention:**
1. **Test networking FIRST** — Prototype Discord Activity with WebSocket connection before any UI work
2. **Use `/.proxy` prefix** for relative URLs: `fetch('/.proxy/api/token')` instead of `fetch('/api/token')`
3. **Configure URL Mappings** in Discord Developer Portal for external resources (CDNs, APIs)
4. **Apply patching utilities** like `@robojs/patch` or SDK's `patchUrlMappings()` to intercept and transform network calls automatically
5. **Never bypass with workarounds** — Use Discord's proxy architecture or it will break in production
6. **Avoid ngrok for WS testing on mobile** — Project already experienced ngrok free tier interstitial blocking WebSocket upgrade on iOS

**Detection warning signs:**
- Console errors: `blocked:csp` or `Content Security Policy directive violated`
- Network tab shows requests with status `(blocked:csp)`
- WebSocket upgrade requests fail with CSP errors
- Fetch returns opaque responses or fails with CORS-like errors
- WebSocket connections work on desktop but fail on mobile Discord

**Which phase addresses this:**
Phase 1 (Networking Foundation) — Must establish proxy-compatible networking before building dual-mode infrastructure. If left to later phases, requires rework.

**Severity:** CRITICAL

**Sources:**
- [Discord Networking Docs](https://docs.discord.com/developers/activities/development-guides/networking)
- [Patch Your Discord Activity's Network Requests for Smooth CSP Compliance](https://blog.waveplay.com/discord-proxy-csp-patch/)
- [Robo.js Discord Proxy Guide](https://robojs.dev/discord-activities/proxy)
- [Activity can't connect websocket in some mobile phone versions](https://github.com/discord/discord-api-docs/issues/7054)

---

### Pitfall 2: Cookie Authentication Hell — Partitioned, SameSite, and Domain Requirements

**What goes wrong:**
Existing game uses standard HTTP-only cookies for session management. After adding Discord Activity support, authentication breaks in the iframe. Cookies aren't sent with requests. Session state is lost between page loads. Login loops occur. Mobile Discord shows different behavior than desktop.

**Why it happens:**
Discord Activities run at `{clientId}.discordsays.com` in a third-party iframe context. Browsers now block third-party cookies by default. Discord requires cookies to specify:
- `Domain={clientId}.discordsays.com` (not your original domain)
- `SameSite=None; Partitioned` (not `SameSite=Lax`)
- `Secure` flag (HTTPS only)

Without these attributes, browsers reject cookies entirely. Additionally, partitioned cookies are isolated per top-level site — Discord Activity cookies don't leak to other activities, but also don't work outside the iframe.

**Consequences:**
- Authentication completely broken in Discord Activity mode
- Session state lost on every request
- Users forced to re-authenticate repeatedly
- Mobile Safari/iOS WebKit may behave differently than Chrome
- Debugging across browsers becomes nightmare
- Late discovery means rewriting auth system under pressure

**Prevention:**
1. **Design dual-mode auth from day one** — Separate cookie domains for standalone vs Discord Activity
2. **Detect iframe context** and set cookie attributes accordingly:
   ```typescript
   const isDiscordActivity = window.parent !== window
   const cookieAttrs = isDiscordActivity
     ? `Domain=${clientId}.discordsays.com; SameSite=None; Partitioned; Secure`
     : `Domain=${yourDomain}; SameSite=Lax; Secure`
   ```
3. **Use Discord OAuth2 for Activity mode** — Don't try to force existing session system into iframe
4. **Test in actual Discord client early** — Localhost testing won't catch partitioned cookie issues
5. **Never rely on SDK data alone** — Always validate with server-to-server Discord API calls

**Detection warning signs:**
- Cookies visible in dev tools but not sent with requests
- Authentication works in standalone web but fails in Discord
- Login succeeds but session immediately lost
- Different behavior between Discord desktop and mobile apps
- Browser console warnings about `SameSite` or third-party cookies

**Which phase addresses this:**
Phase 2 (Authentication Layer) — After networking established, before building rooms/state management. Requires coordination with Phase 1's proxy setup.

**Severity:** CRITICAL

**Sources:**
- [Discord Networking Docs - Cookie Requirements](https://docs.discord.com/developers/activities/development-guides/networking)
- [Cookie Partitioning & CHIPS](https://privacysandbox.google.com/cookies/chips)
- [Transition from unpartitioned to partitioned cookies](https://privacysandbox.google.com/cookies/chips-transition)
- [Discord OAuth2 common problems](https://github.com/requarks/wiki/discussions/5415)

---

### Pitfall 3: URL Mapping Configuration Gotchas — Production Deploy Failures

**What goes wrong:**
Local development with cloudflared tunnel works perfectly. Push to production. Discord Activity loads but all assets 404. WebSocket connections fail. External APIs unreachable. The game is broken in production despite working locally.

**Why it happens:**
Discord's URL Mapping system has subtle configuration requirements that differ between local and production:
- **Root URLs add extra `/`** — Mapping `/` to `cdn.example.com` causes `/file.png` to become `cdn.example.com//file.png` (double slash)
- **Protocol must be omitted** — Targets like `https://api.example.com` are rejected; use `api.example.com`
- **Targets must point to directories not files** — Can't map to `cdn.com/assets/bundle.js`, must map to `cdn.com/assets/`
- **Shortest prefixes must be listed last** — If you have `/api` and `/api/v2`, order matters for routing
- **Custom ports not supported** — Can't map to `example.com:8080`
- **patchUrlMappings doesn't support parameter matched ports** — URL Mappings with port numbers in targets cause errors

Additionally, production deployments often use different domain names than local tunnels, requiring different URL mappings. Developers forget to update mappings when deploying.

**Consequences:**
- Production deployment appears successful but Activity is broken
- Hours debugging "why does local work but production fail?"
- Can't test production-like environment without deploying
- Emergency hotfixes to URL mappings require Discord approval delays
- May need to restructure asset hosting to fit mapping constraints

**Prevention:**
1. **Use separate Discord applications for dev/staging/prod** — Different URL mappings per environment
2. **Document URL mapping rules** in deployment checklist:
   - No `https://` prefix in targets
   - No trailing slashes on prefixes (unless intentional)
   - No file paths in targets, only directories
   - Order matters: longer prefixes before shorter
   - No port numbers in URL targets
3. **Test with production-like domain early** — Don't rely on cloudflared until late in dev
4. **Use CDN for assets** — Discord docs explicitly warn "GitHub is not a CDN"
5. **Validate mappings in Discord Developer Portal** before deploying code changes
6. **Monitor mapping errors** — Add logging for `blocked:csp` in production

**Detection warning signs:**
- Local cloudflared tunnel works, production domain doesn't
- Asset URLs have double slashes (`//`)
- Requests to external APIs returning 404 or CSP errors
- WebSocket connections failing with different error in production
- Discord Developer Portal shows "Invalid target" warnings

**Which phase addresses this:**
Phase 3 (Deployment & URL Mapping) — After local dev working, before production rollout. Requires coordination with infra team for CDN setup.

**Severity:** CRITICAL

**Sources:**
- [Discord Local Development Docs](https://docs.discord.com/developers/activities/development-guides/local-development)
- [Root URL Mappings add an additional / - GitHub Issue](https://github.com/discord/discord-api-docs/issues/7223)
- [Discord URL Mapping Patch Guide](https://github.com/discord/embedded-app-sdk/blob/main/patch-url-mappings.md)
- [patchUrlMappings parameter matched ports issue](https://github.com/discord/embedded-app-sdk/issues/302)

---

### Pitfall 4: Dual-Mode Architecture Debt — Bolting Discord onto Standalone Web

**What goes wrong:**
Developers add Discord Activity support by sprinkling `if (isDiscordActivity)` checks throughout existing codebase. Separate code paths for authentication, networking, room joining, session management. Tech debt accumulates. Bugs in one mode don't appear in other. Maintenance becomes nightmare. Features drift between modes.

**Why it happens:**
Easiest path is to add Discord support to existing codebase with conditional logic. Avoids big refactor. But Discord Activity has fundamentally different lifecycle:
- **Initialization**: Standalone = page load, Discord = SDK ready + OAuth dance
- **User identity**: Standalone = nickname form, Discord = OAuth2 user object
- **Room joining**: Standalone = share code, Discord = activity session ID
- **Networking**: Standalone = direct WebSocket, Discord = proxy + URL mappings
- **Session persistence**: Standalone = localStorage, Discord = partitioned cookies

These differences permeate entire system. Conditional logic spreads like cancer.

**Research finding (2026):** "Evolutionary Architecture Fallacy" — the misconception that architecture will naturally emerge from code without upfront design. Teams treat architecture as unchangeable while developers make architectural changes without feeding those changes back. This creates implementation-architecture disconnect that compounds over time.

**Consequences:**
- Codebase becomes unmaintainable spaghetti of if/else branches
- Bugs introduced in one mode don't get caught by testing other mode
- Features added to one mode forgotten in other mode
- New developers can't understand dual-mode flow
- Refactoring becomes impossible without breaking something
- Eventually forced into full rewrite to untangle mess

**Prevention:**
1. **Design abstraction layer from day one**:
   ```typescript
   interface GamePlatform {
     init(): Promise<void>
     getUser(): Promise<User>
     joinRoom(code: string): Promise<RoomSession>
     sendMessage(msg: GameMessage): void
   }

   class StandalonePlatform implements GamePlatform { ... }
   class DiscordPlatform implements GamePlatform { ... }
   ```
2. **Use dependency injection** — Pass platform instance to game engine, not global checks
3. **Share game logic** — Core game engine must be platform-agnostic
4. **Separate entry points** — Different main.ts files for standalone vs Discord, same game engine
5. **Test both modes equally** — CI runs full test suite for both configurations
6. **Document platform differences** — Maintain architecture doc explaining abstraction
7. **Establish feedback loop** between implementation and architecture — update docs when code changes architectural assumptions

**Detection warning signs:**
- `if (window.discordSdk)` checks scattered across many files
- Duplicate code with slight variations between modes
- Features that work in one mode but not other
- PRs touching both standalone and Discord paths for single feature
- Difficulty explaining to new developer how dual-mode works

**Which phase addresses this:**
Phase 0 (Architecture Foundation) — Before any Discord code written. Must design abstraction before implementation, or suffer permanent tech debt.

**Severity:** CRITICAL

**Sources:**
- [Discord's Embedded App SDK - Architecture Patterns](https://colyseus.io/blog/discord-embedded-sdk/)
- [Multiplayer Experience Guide](https://docs.discord.com/developers/activities/development-guides/multiplayer-experience)
- [5 embedded software architecture pitfalls](https://www.embedded.com/5-embedded-software-architecture-pitfalls/)
- [7 Tech Stack Pitfalls to Avoid in 2026](https://www.informationweek.com/software-services/7-tech-stack-pitfalls-to-avoid-in-2026)

---

### Pitfall 5: Mobile Responsive Refactoring — Breaking Existing Layouts

**What goes wrong:**
Team adds mobile card categorization UI (normal/power card categories). Changes Tailwind classes, modifies component structure, adjusts breakpoints. Deploys. Desktop layout is broken. Tablet view has weird gaps. Landscape mobile is unusable. The "improvement" broke existing responsive behavior that was already working.

**Why it happens:**
Responsive design refactoring is high-risk because changes to breakpoints, flexbox/grid structure, or component hierarchy have cascading effects. What fixes mobile can break desktop. "Breakpoint Hell" — drowning in complex CSS just to make a button look right across five different devices.

**Research finding (2026):** Templates work for MVP but "break at scale." Growth-stage apps need custom UX systems. When refactoring responsive layouts, developers face technical complexity that creates significant risk of breaking existing features.

**Consequences:**
- Existing desktop/mobile responsive layout broken
- Weird layout bugs only appear on specific viewport sizes
- Hours debugging "why does this work on iPhone but not iPad?"
- Emergency hotfixes to restore working layout
- User complaints about "new UI is worse"
- Rollback required, wasting sprint time

**Prevention:**
1. **Test all breakpoints before and after** — Desktop (1920px, 1440px, 1280px), Tablet (1024px, 768px), Mobile (414px, 375px, 360px)
2. **Use container queries instead of media queries** — Make components respond to their own size, not viewport size. Reduces likelihood of breaking existing layouts.
3. **Design for content needs, not devices** — Breakpoints should be where content naturally requires adjustment, not arbitrary device sizes
4. **Additive changes over replacements** — Add mobile-specific components alongside existing ones, don't replace shared components
5. **Visual regression testing** — Screenshot tests at all breakpoints to catch layout breaks
6. **Test both orientations** — Portrait and landscape mobile have different constraints
7. **Real device testing** — Emulators miss real-world issues (notches, safe areas, browser chrome)

**Detection warning signs:**
- Changes to shared layout components (App.vue, Game.vue)
- Modifications to Tailwind breakpoint utilities (sm:, md:, lg:)
- Adjustments to flexbox/grid that affect parent containers
- CSS that uses viewport units (vw, vh) instead of relative units
- Pull requests that touch > 10 component files for "mobile fix"

**Which phase addresses this:**
Phase 4 (Mobile UI Redesign) — When implementing card category UI. Requires careful component isolation and comprehensive breakpoint testing before merge.

**Severity:** CRITICAL

**Sources:**
- [Responsive Design in 2026: What's New and What's Next](https://medium.com/@netizens_technologies/responsive-design-in-2026-whats-new-and-what-s-next-137285d4f0c6)
- [Why Responsive Design Still Fails In 2025](https://blog.imagine.bo/responsive-design-still-fails/)
- [Responsive Web Design: Why Most Mobile-Friendly Sites Fail](https://inkbotdesign.com/responsive-web-design/)
- [Top 10 Mistakes to Avoid in Responsive Web Design Projects in 2024](https://medium.com/@uidesign0005/top-10-mistakes-to-avoid-in-responsive-web-design-projects-in-2024-0578d5304a58)

---

## Moderate Pitfalls

Mistakes that cause delays, bugs, or technical debt but are recoverable.

### Pitfall 6: Mobile Discord Safe Area Ignorance — UI Cut Off by Notches

**What goes wrong:**
Discord Activity looks perfect on desktop. Deploy to mobile Discord app. UI elements are cut off by iPhone notch, Android navigation bar, or camera punch-holes. Bottom buttons unreachable. Top status cut off. Players can't interact with game.

**Why it happens:**
Mobile devices have "unsafe" screen areas where OS UI or hardware obscures content. Discord provides CSS variables (`--discord-safe-area-inset-top/bottom/left/right`) that define safe boundaries, but developers forget to apply them. Desktop doesn't have safe areas, so problem invisible until mobile testing.

Additionally, **Discord SDK now strictly enforces mobile compatibility** — Activities that don't handle safe areas correctly may fail app review/validation.

**Consequences:**
- UI unusable on mobile devices
- Failed Discord app review/validation
- Emergency redesign needed post-launch
- Players complain game "doesn't work on phone"
- Reputation damage from broken mobile experience

**Prevention:**
1. **Test on real mobile devices early** — Not just Chrome DevTools mobile emulation
2. **Apply safe area padding** to root container:
   ```css
   .game-container {
     padding-top: var(--discord-safe-area-inset-top, 0);
     padding-bottom: var(--discord-safe-area-inset-bottom, 0);
     padding-left: var(--discord-safe-area-inset-left, 0);
     padding-right: var(--discord-safe-area-inset-right, 0);
   }
   ```
3. **Design mobile-first** — Assume safe areas exist, add them to standalone web too (doesn't hurt)
4. **Test landscape and portrait** — Safe areas differ by orientation
5. **Use Discord's thermal state API** — Reduce animations when device overheating

**Detection warning signs:**
- UI elements positioned at exact screen edges
- Fixed position elements without safe area offsets
- DevTools mobile emulation looks fine, real device doesn't
- Different layout between iOS and Android
- Players report "can't see timer" or "button cut off"

**Which phase addresses this:**
Phase 4 (Mobile UI Redesign) — When implementing card category UI, must simultaneously add safe area handling. Don't defer to later phase.

**Severity:** MODERATE

**Sources:**
- [Discord Mobile Development Guide](https://docs.discord.com/developers/activities/development-guides/mobile)
- [Discord Development 2025 Year-in-Review](https://discord-media.com/en/news/development-2025-the-complete-year-in-review-api-migration-guide.html)

---

### Pitfall 7: WebSocket Reconnection State Loss — Players Ejected on Network Hiccup

**What goes wrong:**
Mobile player's network briefly drops (switching WiFi to cellular, going through tunnel, etc). WebSocket disconnects. Player is ejected from game. Other players see them as disconnected. Game state is lost. Player can't rejoin ongoing game. Terrible UX.

**Why it happens:**
Existing game may handle disconnects with simple "remove player after timeout" logic. But mobile networks are flaky. Brief disconnects are normal. Discord Activity adds another layer — Discord SDK connection can drop independent of game WebSocket. Without proper reconnection + state recovery, normal mobile usage becomes unplayable.

**Research finding (2026):** Discord gateway can enter "infinite reconnection loop" with WebSocket close code 1005, with no circuit breaker or exponential backoff. Server implementations must handle reconnection gracefully with proper timeout and retry logic.

**Consequences:**
- Mobile players constantly ejected from games
- Games ruined by single network hiccup
- Players frustrated, stop using Activity
- Support requests flood in: "why do I get kicked?"
- Reputation damage: "game is broken on mobile"

**Prevention:**
1. **Implement reconnection grace period** — 30-60 seconds before ejecting player
2. **Store player state on server** — Don't delete game state immediately on disconnect
3. **Provide reconnection token** — Let player rejoin same game session
4. **Show "reconnecting..." UI** — Don't just freeze and timeout
5. **Test with network throttling** — Chrome DevTools can simulate flaky connections
6. **Handle Discord SDK reconnection** — SDK may disconnect independently of game WebSocket
7. **Log reconnection patterns** — Monitor how often players disconnect to tune grace period
8. **Implement exponential backoff** — Avoid infinite reconnection loops with increasing retry delays
9. **Add circuit breaker** — Stop retry attempts after reasonable limit

**Detection warning signs:**
- Players reporting frequent disconnects
- Higher disconnect rate on mobile than desktop
- No reconnection logic in codebase
- Game state deleted immediately on disconnect
- No distinction between "voluntary leave" and "network hiccup"
- Infinite reconnection attempts without backoff

**Which phase addresses this:**
Phase 5 (Reconnection & State Recovery) — After basic multiplayer working, before mobile polish. Essential for mobile Discord experience.

**Severity:** MODERATE

**Sources:**
- [Discord Gateway Reconnection Docs](https://discord.com/developers/docs/events/gateway)
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [WebSockets: The Complete Guide for 2026](https://devtoolbox.dedyn.io/blog/websocket-complete-guide)
- [Discord gateway infinite reconnection loop issue](https://github.com/openclaw/openclaw/issues/11836)

---

### Pitfall 8: Local Development Environment Drift — Works in Cloudflared, Breaks in Production

**What goes wrong:**
Developer uses cloudflared for local testing against Discord proxy. Everything works. Deploys to production. Different networking behavior. Assets load differently. WebSocket connection fails. URL mappings configured wrong. Production is broken despite passing local tests.

**Why it happens:**
Cloudflared tunnel creates a unique temporary subdomain (e.g., `random-slug-123.trycloudflare.com`) that doesn't match production domain. URL mappings configured for cloudflared domain don't work with production domain. Additionally:
- **Free-tier tunneling is insecure** — Discord docs warn: "someone else could claim that domain and host a malicious site"
- **Tunnel domains change** — Cloudflared generates new subdomain each run unless paid tier
- **Local server vs production CDN** — Different asset loading patterns
- **Environment variables differ** — OAuth2 redirect URLs, client IDs, secrets

Developer gets lulled into false confidence by local testing, then production fails.

**Project history:** This project already dealt with proxy issues (ngrok WS blocked on iOS, Docker DNS failed WS). Local testing doesn't catch all production networking scenarios.

**Consequences:**
- "Works on my machine" syndrome
- Production deployments require emergency fixes
- Can't catch production issues until after deploy
- Delays shipping due to prod-only bugs
- May need separate staging environment with prod-like setup

**Prevention:**
1. **Use separate Discord applications** for dev, staging, prod — Different OAuth2 credentials, different URL mappings
2. **Document URL mapping rules** per environment in deployment checklist
3. **Create staging environment** with prod-like domain before final production deploy
4. **Test production URL mappings** before code changes go live
5. **Use paid cloudflared tier** (or alternative) for stable tunnel domain in dev
6. **Maintain parity checklist** — Document differences between local, staging, prod
7. **Reset URL mappings** after finishing with temporary tunnel domains (security warning from Discord)
8. **Learn from past proxy issues** — ngrok, Docker DNS failures are warnings about proxy complexity

**Detection warning signs:**
- Different behavior between local cloudflared and production
- OAuth2 redirect errors only in production
- Asset 404s only in production
- WebSocket connection fails only in production
- Having to manually update URL mappings after every deploy

**Which phase addresses this:**
Phase 3 (Deployment & URL Mapping) — Establish staging environment and deployment process. Don't skip staging.

**Severity:** MODERATE

**Sources:**
- [Discord Local Development Guide](https://docs.discord.com/developers/activities/development-guides/local-development)
- [Discord Proxy Documentation](https://robojs.dev/discord-activities/proxy)

---

### Pitfall 9: Third-Party Library CSP Incompatibility — NPM Packages Break in Discord

**What goes wrong:**
Game uses third-party libraries (game engines, UI frameworks, analytics, error tracking). Works fine in standalone web. Add Discord Activity support. Libraries fail with CSP errors because they make hardcoded external requests.

Example failures:
- Analytics SDK sends data to `https://analytics.example.com`
- Game engine loads assets from `https://cdn.gameengine.com`
- Error tracking pings `https://sentry.io/api/...`
- WebSocket library connects to `wss://realtime.example.com`

All blocked by Discord's CSP.

**Why it happens:**
Third-party libraries don't know they're running in Discord Activity iframe. They use hardcoded external URLs that aren't in Discord URL mappings. Discord proxy blocks them.

**Consequences:**
- Features silently broken (analytics not tracking, errors not reported)
- Game engine assets fail to load, game crashes
- Hours debugging why library works standalone but not Discord
- May need to fork library to patch URLs
- May need to switch to different library entirely

**Prevention:**
1. **Audit dependencies early** — Check what external requests each library makes
2. **Use SDK's `patchUrlMappings()`** to intercept library requests:
   ```typescript
   await discordSdk.patchUrlMappings([
     { prefix: '/analytics', target: 'analytics.example.com' },
     { prefix: '/sentry', target: 'sentry.io' }
   ])
   ```
3. **Fork and patch problematic libraries** using `patch-package`
4. **Choose Discord-compatible libraries** — Prioritize libraries that support custom base URLs
5. **Self-host critical assets** — Don't rely on third-party CDNs for essential resources
6. **Test in Discord early** — Don't wait until integration phase to discover library issues

**Detection warning signs:**
- Console errors from third-party libraries: `blocked:csp`
- Analytics dashboard shows zero events from Discord Activity
- Error tracking shows no errors despite bugs existing
- Game assets fail to load from third-party CDN
- Library configuration doesn't support custom base URLs

**Which phase addresses this:**
Phase 1 (Networking Foundation) — Audit and patch libraries before building on top of them. Library incompatibility discovered late causes cascading rework.

**Severity:** MODERATE

**Sources:**
- [Patch Your Discord Activity's Network Requests](https://blog.waveplay.com/discord-proxy-csp-patch/)
- [Discord URL Mapping Patch Guide](https://github.com/discord/embedded-app-sdk/blob/main/patch-url-mappings.md)
- [Scalability and CSP in Discord Activities](https://github.com/colyseus/colyseus/issues/707)

---

### Pitfall 10: OAuth2 Implementation Mistakes — Invalid Scopes and Token Lifecycle

**What goes wrong:**
Developer implements Discord OAuth2 flow. Uses wrong scopes like `guilds.channels.read` or `guilds.members.read`. Gets `invalid_scope` error. Or uses public key instead of application secret — secret should be alphanumeric ~30 characters, not 65-character hash. Or accidentally includes whitespace when copying secret. Authentication fails mysteriously.

Additionally, Discord OAuth2 access tokens expire after 7 days. Game doesn't implement refresh token flow. Players who opened Activity more than 7 days ago suddenly can't authenticate.

**Why it happens:**
OAuth2 has subtle configuration requirements. Developers copy-paste credentials incorrectly, use invalid scopes from outdated docs, or implement initial auth without refresh token mechanism. Works fine in short testing sessions, breaks after a week or with wrong credentials.

**Consequences:**
- Authentication completely broken at launch
- "Invalid client" errors (HTTP 401)
- Redirect failures during OAuth flow
- Players kicked after 7 days when tokens expire
- Hours debugging credential configuration

**Prevention:**
1. **Use correct credential types**:
   - Application secret: alphanumeric, ~30 characters
   - NOT the public key (65-character hash)
2. **Trim whitespace** when copying credentials
3. **Use valid scopes**: `identify`, `guilds`, `email` (NOT `guilds.channels.read` or `guilds.members.read`)
4. **Implement full OAuth2 flow** including refresh token mechanism
5. **Store refresh token securely** server-side
6. **Implement automatic refresh** before token expiry
7. **Test with artificially short token expiry** in dev (set to 5 minutes)
8. **Use PKCE extension** for user-facing applications (browser extensions, mobile apps) to authenticate securely without sharing client secret
9. **Implement state parameter** for CSRF protection

**Detection warning signs:**
- `invalid_scope` error when redirecting to callback
- `invalid_client` error (HTTP 401) during token exchange
- Redirect failures with authentication error
- Players reporting "logged out" after several days
- No refresh token logic in codebase

**Which phase addresses this:**
Phase 2 (Authentication Layer) — Implement full OAuth2 flow including refresh, not just initial exchange. Test token expiry before shipping.

**Severity:** MODERATE

**Sources:**
- [Discord OAuth2 Documentation](https://docs.discord.com/developers/topics/oauth2)
- [Discord OAuth fails to complete](https://github.com/requarks/wiki/discussions/5415)
- [Discord OAuth not working - nextauth discussion](https://github.com/nextauthjs/next-auth/discussions/948)
- [Problem with oauth2 scope](https://github.com/discord/discord-api-docs/issues/7169)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 11: HMR (Hot Module Replacement) Breaking in Discord Proxy

**What goes wrong:**
Vite's HMR works perfectly in standalone web dev. Add Discord proxy patching with `@robojs/patch`. HMR stops working. Code changes don't hot reload. Must full page refresh every change. Dev experience becomes painful.

**Why it happens:**
HMR uses WebSocket connection to Vite dev server. If proxy patching runs after HMR initializes, it doesn't catch the HMR WebSocket. HMR continues trying to connect to unmapped URL, fails CSP check, dies silently.

**Prevention:**
- Use Vite plugin method for `@robojs/patch` (runs before HMR)
- Call `patchUrlMappings()` at very beginning of entry point
- Add URL mapping for Vite's HMR WebSocket path (`/__vite_hmr` or `/__hmr`)

**Which phase addresses this:**
Phase 1 (Networking Foundation) — Fix during initial proxy setup, don't let it linger.

**Severity:** MINOR

**Sources:**
- [Patch Your Discord Activity's Network Requests](https://blog.waveplay.com/discord-proxy-csp-patch/)

---

### Pitfall 12: Thermal State Ignorance — Mobile Devices Overheat, Activity Crashes

**What goes wrong:**
Game runs smooth animations, particle effects, constant re-renders. Works great on desktop. On mobile Discord, devices overheat, activity becomes sluggish, eventually crashes or is killed by OS.

**Why it happens:**
Mobile devices have limited thermal capacity. Heavy JS/rendering causes overheating. Discord provides thermal state API (`NOMINAL`, `FAIR`, `SERIOUS`, `CRITICAL`) but developers ignore it.

**Research finding (2026):** Mobile game UX trend: excessive animations transform apps into "sluggish spectacles." Overdone animations contribute to performance lags on mid-range devices where users expect instantaneous responses.

**Prevention:**
- Subscribe to thermal state changes via Discord SDK
- Reduce animation frame rate when thermal state deteriorates
- Disable particle effects in `SERIOUS`/`CRITICAL` states
- Lower visual quality on mobile
- Test on real mobile devices for extended sessions (20+ minutes)
- Avoid excessive animations that don't serve user intent

**Which phase addresses this:**
Phase 4 (Mobile UI Redesign) — Add thermal management when optimizing mobile experience.

**Severity:** MINOR

**Sources:**
- [Discord Mobile Development Guide - Thermal State](https://docs.discord.com/developers/activities/development-guides/mobile)
- [7 UI Pitfalls Mobile App Developers Should Avoid in 2026](https://www.webpronews.com/7-ui-pitfalls-mobile-app-developers-should-avoid-in-2026/)

---

### Pitfall 13: Activity Session ID vs Room Code Confusion — Wrong Multiplayer Paradigm

**What goes wrong:**
Existing game uses shareable room codes (e.g., "JOIN-1234"). Players manually share codes. Discord Activities use Discord's activity session IDs — everyone in same voice channel automatically joins same activity instance. Developers try to force room code paradigm into Discord Activity, creating friction.

**Why it happens:**
Discord's multiplayer model is "implicit join" (you're in voice channel = you're in activity). Standalone web is "explicit join" (enter room code). Trying to make Discord Activity users enter room codes fights the platform.

**Prevention:**
- Use activity session ID for Discord mode (implicit join from voice channel)
- Use room codes for standalone mode (explicit join)
- Abstraction layer handles both paradigms
- Don't force Discord users through room code flow
- Consider "invite to activity" for cross-channel play

**Which phase addresses this:**
Phase 4 (Dual-Mode Room Joining) — Design after architecture layer established, before UI polish.

**Severity:** MINOR

**Sources:**
- [Multiplayer Experience Guide](https://docs.discord.com/developers/activities/development-guides/multiplayer-experience)

---

### Pitfall 14: Mobile UI Visual Hierarchy Loss — Categories Without Structure

**What goes wrong:**
Mobile card categorization UI shows "Normal Cards" and "Power Cards" buttons. No visual distinction. Same color, same size. Players can't quickly see which category they need. Adds friction instead of improving UX.

**Why it happens:**
Developers implement functional categorization without applying visual design principles. Categories should have clear visual hierarchy and distinction.

**Research finding (2026):** "Poor visual hierarchy" is a top mobile UX mistake. On mobile, layouts often collapse but hierarchy shouldn't. When users lose visual cues, they lose interest. Preserve logical flow with headers, whitespace, and color contrast.

**Prevention:**
- **Distinct colors per category**: Power cards get gold/purple border, normal cards standard styling
- **Visual hierarchy**: Size, scale, color contrast distinguish categories
- **Dark background**: Makes cards and categories "pop"
- **Iconography**: Use symbols for quick interpretation (lightning bolt for power cards)
- **Large tap targets**: Mobile finger-friendly (minimum 44x44px)

**Which phase addresses this:**
Phase 4 (Mobile UI Redesign) — Apply visual design during card category implementation.

**Severity:** MINOR

**Sources:**
- [11 UX Design Mistakes That Haunt Responsive Web Experiences](https://medium.com/@walkerbrooke301/build-once-fail-everywhere-top-responsive-design-flaws-2f1444142cb5)
- [7 UI Pitfalls Mobile App Developers Should Avoid in 2026](https://www.webpronews.com/7-ui-pitfalls-mobile-app-developers-should-avoid-in-2026/)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Phase 0: Architecture Foundation | Dual-mode architecture debt — spaghetti if/else code | Design abstraction layer BEFORE writing Discord code | CRITICAL |
| Phase 1: Networking Foundation | CSP blocking all network requests, WebSocket upgrade failures | Prototype WebSocket connection through Discord proxy FIRST before any other work | CRITICAL |
| Phase 2: Authentication Layer | Cookie partitioning breaks sessions, OAuth2 token lifecycle misunderstood | Design dual-mode auth with separate cookie domains, implement full OAuth2 flow including refresh | CRITICAL |
| Phase 3: Deployment & URL Mapping | Production URL mappings differ from local cloudflared, root URL slash issues | Use separate Discord apps per environment, document URL mapping rules, establish staging env | CRITICAL |
| Phase 4: Mobile UI Redesign | Breaking existing responsive layouts when adding card categories | Test all breakpoints before/after, use container queries, additive changes not replacements | CRITICAL |
| Phase 4: Mobile UI Redesign | Safe areas cut off UI, thermal overheating causes crashes | Test on real mobile devices early, apply CSS safe area variables, implement thermal state handling | MODERATE |
| Phase 5: Reconnection & State Recovery | Network hiccups eject mobile players permanently | Implement grace period + rejoin token, test with network throttling, exponential backoff | MODERATE |

---

## Lessons from Project History

This project has already encountered WebSocket proxy issues that inform prevention strategies:

1. **ngrok free tier fails on iOS mobile** — Interstitial page blocks WebSocket upgrade. Lesson: Use cloudflared or paid tier for mobile testing.

2. **Docker internal DNS fails WS proxy** — Vite's http-proxy can't upgrade WebSocket through Docker service names. Lesson: Use `host.docker.internal` for Docker development.

3. **Bun node:http/node:net upgrade events don't fire properly** — Custom WebSocket proxy plugins fail under Bun. Lesson: Use standard Vite proxy patterns, don't try to be clever.

**These experiences are RED FLAGS that Discord Activity proxy will be complex.** The project has already proven that WebSocket proxy patterns are fragile. Discord Activity's proxy layer is mandatory, not optional. **Testing networking must be Phase 1, not deferred.**

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| CSP/Proxy Networking | **HIGH** | Verified with official Discord docs, multiple community sources, project's own proxy history |
| Cookie Partitioning | **MEDIUM-HIGH** | Discord docs + browser standards, some edge cases unclear (mobile Safari nuances) |
| URL Mapping | **HIGH** | Official docs + GitHub issues document specific gotchas |
| Mobile Safe Areas | **HIGH** | Official Discord mobile guide, SDK enforcement confirmed |
| Reconnection Patterns | **HIGH** | WebSocket best practices + Discord-specific gateway docs, project history with WS issues |
| Dual-Mode Architecture | **HIGH** | Engineering best practices + 2026 research on evolutionary architecture fallacy |
| OAuth2 Lifecycle | **HIGH** | Standard OAuth2 + Discord-specific docs + community issues documenting common mistakes |
| Third-Party Libraries | **MEDIUM-HIGH** | Common CSP pattern, specific library compatibility needs testing |
| Mobile Responsive Refactoring | **HIGH** | 2026 research on responsive design failures, container query solutions |
| Visual Hierarchy | **HIGH** | Established UX principles + 2026 mobile UI trends research |

**Overall confidence: HIGH**

Areas requiring validation during implementation:
- Specific third-party library compatibility (test early in Phase 1)
- Mobile Safari cookie partitioning edge cases (test in Phase 2)
- Real-device thermal state behavior under load (test in Phase 4)
- Reconnection behavior under various network conditions (test in Phase 5)

---

## Sources

### Official Discord Documentation
- [Discord Activities Overview](https://docs.discord.com/developers/activities/overview)
- [Discord Activities Networking Guide](https://docs.discord.com/developers/activities/development-guides/networking)
- [Discord Activities Mobile Development](https://docs.discord.com/developers/activities/development-guides/mobile)
- [Discord Activities Local Development](https://docs.discord.com/developers/activities/development-guides/local-development)
- [Discord OAuth2 Documentation](https://docs.discord.com/developers/topics/oauth2)
- [Discord Embedded App SDK Reference](https://docs.discord.com/developers/developer-tools/embedded-app-sdk)
- [Discord Multiplayer Experience Guide](https://docs.discord.com/developers/activities/development-guides/multiplayer-experience)

### Community Resources & Patterns
- [Patch Your Discord Activity's Network Requests (Waveplay Blog)](https://blog.waveplay.com/discord-proxy-csp-patch/)
- [Robo.js Discord Proxy Guide](https://robojs.dev/discord-activities/proxy)
- [Robo.js Authentication Guide](https://robojs.dev/discord-activities/authentication)
- [Robo.js Multiplayer Guide](https://robojs.dev/discord-activities/multiplayer)
- [Colyseus + Discord Embedded SDK Integration](https://colyseus.io/blog/discord-embedded-sdk/)
- [Discord URL Mapping Patch Documentation](https://github.com/discord/embedded-app-sdk/blob/main/patch-url-mappings.md)

### Browser Standards & Security
- [Cookies Having Independent Partitioned State (CHIPS)](https://privacysandbox.google.com/cookies/chips)
- [Transition from unpartitioned to partitioned cookies](https://privacysandbox.google.com/cookies/chips-transition)

### Technical Guides
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [WebSockets: The Complete Guide for 2026](https://devtoolbox.dedyn.io/blog/websocket-complete-guide)

### Responsive Design & Mobile UI
- [Responsive Design in 2026: What's New and What's Next](https://medium.com/@netizens_technologies/responsive-design-in-2026-whats-new-and-what-s-next-137285d4f0c6)
- [Why Responsive Design Still Fails In 2025](https://blog.imagine.bo/responsive-design-still-fails/)
- [Responsive Web Design: Why Most Mobile-Friendly Sites Fail](https://inkbotdesign.com/responsive-web-design/)
- [11 UX Design Mistakes That Haunt Responsive Web Experiences](https://medium.com/@walkerbrooke301/build-once-fail-everywhere-top-responsive-design-flaws-2f1444142cb5)
- [Top 10 Mistakes to Avoid in Responsive Web Design Projects in 2024](https://medium.com/@uidesign0005/top-10-mistakes-to-avoid-in-responsive-web-design-projects-in-2024-0578d5304a58)
- [7 UI Pitfalls Mobile App Developers Should Avoid in 2026](https://www.webpronews.com/7-ui-pitfalls-mobile-app-developers-should-avoid-in-2026/)

### Architecture & Tech Stack
- [5 embedded software architecture pitfalls](https://www.embedded.com/5-embedded-software-architecture-pitfalls/)
- [7 Tech Stack Pitfalls to Avoid in 2026](https://www.informationweek.com/software-services/7-tech-stack-pitfalls-to-avoid-in-2026)

### Discord Community Issues
- [Root URL Mappings add an additional / - GitHub Issue](https://github.com/discord/discord-api-docs/issues/7223)
- [CSP Issues in Discord Activities - Colyseus Discussion](https://github.com/colyseus/colyseus/issues/707)
- [Activity can't connect websocket in some mobile versions](https://github.com/discord/discord-api-docs/issues/7054)
- [patchUrlMappings parameter matched ports issue](https://github.com/discord/embedded-app-sdk/issues/302)
- [Discord OAuth fails to complete](https://github.com/requarks/wiki/discussions/5415)
- [Discord OAuth not working - nextauth](https://github.com/nextauthjs/next-auth/discussions/948)
- [Problem with oauth2 scope](https://github.com/discord/discord-api-docs/issues/7169)
- [Discord gateway infinite reconnection loop](https://github.com/openclaw/openclaw/issues/11836)
- [Help getting client to talk to backend with CSP](https://github.com/discord/embedded-app-sdk/issues/240)

### Platform Updates
- [Discord Development 2025: The Complete Year-in-Review](https://discord-media.com/en/news/development-2025-the-complete-year-in-review-api-migration-guide.html)
- [Discord Patch Notes: February 4, 2026](https://discord.com/blog/discord-patch-notes-february-4-2026)

---

**Research complete. This document should inform phase ordering and risk mitigation during roadmap creation.**
