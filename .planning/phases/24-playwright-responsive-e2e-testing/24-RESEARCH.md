# Phase 24: Playwright Responsive E2E Testing - Research

**Researched:** 2026-02-21
**Domain:** Playwright E2E Testing, Multi-Viewport Responsive Testing, WebSocket Testing
**Confidence:** HIGH (Playwright 1.58.2 verified via official docs and local install)

## Summary

This phase adds Playwright E2E tests to verify the Shithead/Karma game UI renders and
functions correctly across five viewport breakpoints: mobile (375x667, 390x844), tablet
(768x1024), laptop (1280x800), desktop (1920x1080), and a Discord iframe size. Tests
cover four screens: home (Landing), lobby, prepare phase (SwapPhase), and active gameplay
(PlayingPhase).

The project runs everything through Docker — the Makefile drives all dev/test workflows
using `docker compose`. Playwright tests must fit this pattern: they run against the real
dev stack (both client + server). The existing CI workflow uses Bun directly on the
ubuntu runner (no Docker for Playwright), which is the right approach — Playwright tests
should run on the CI host with its own installed browsers.

Playwright 1.58.2 is already installed globally on this machine. The package must be
added to the project under `packages/client` or as a new `packages/e2e` package. Given
the existing monorepo structure (all packages under `packages/`), a dedicated
`packages/e2e` directory is the recommended approach: it keeps E2E concerns separate from
unit tests, has its own `playwright.config.ts`, and can start both the Vite dev server
and Bun server as `webServer` entries before running tests.

**Primary recommendation:** Create `packages/e2e` with Playwright, configure 6 viewport
projects in `playwright.config.ts`, run the real frontend + backend (no mocks) using
`webServer` array config, and add a `make e2e` Makefile target. Use `page.routeWebSocket`
only if you need to pre-seed UI state; otherwise drive the real WebSocket flow to test
authentic game interactions.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.58.2 | E2E testing framework, viewport config, WebSocket inspection | Industry standard, built-in multi-project viewport config, native WebSocket support since 1.48 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | Playwright is self-contained | @playwright/test includes assertions, fixtures, and browser binaries |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @playwright/test | Cypress | Playwright has better multi-viewport projects, native WebSocket API, and faster test runs across multiple browsers |
| @playwright/test | Vitest browser mode | Vitest browser mode is for component tests, not true E2E with a real server |

**Installation (inside packages/e2e):**
```bash
bun add -d @playwright/test
bunx playwright install chromium  # Install browser binaries
```

**Note on Bun + Playwright:** The `npm init playwright@latest` wizard uses npm and fails
in Bun monorepos. Install the package manually with `bun add -d @playwright/test` and
create `playwright.config.ts` by hand. This is a known issue documented in the Playwright
GitHub tracker. (Verified: MEDIUM confidence from WebSearch + GitHub issue cross-reference)

## Architecture Patterns

### Recommended Project Structure

```
packages/e2e/
├── playwright.config.ts    # Multi-project viewport config + webServer
├── package.json            # { "@playwright/test": "^1.58.2" }
├── tsconfig.json           # Standard TS config for test files
└── tests/
    ├── pages/              # Page Object Model classes
    │   ├── LandingPage.ts
    │   ├── LobbyPage.ts
    │   ├── SwapPhasePage.ts
    │   └── GamePage.ts
    ├── home.spec.ts         # Landing screen tests
    ├── lobby.spec.ts        # Lobby screen tests
    ├── swap-phase.spec.ts   # Pre-game card swap tests
    └── game.spec.ts         # Active gameplay tests
```

### Pattern 1: Multi-Project Viewport Configuration

**What:** Configure each viewport breakpoint as a named Playwright project; all test
files run against all projects automatically.
**When to use:** Always — this is the core pattern for responsive E2E testing.
**Example:**
```typescript
// Source: https://playwright.dev/docs/test-projects
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'mobile-375',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet',
      use: {
        viewport: { width: 768, height: 1024 },
        hasTouch: false,
      },
    },
    {
      name: 'laptop',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'discord-iframe',
      // Discord Activity iframes fill the voice channel panel.
      // Typical desktop dimensions are ~460px wide x full panel height.
      // Mobile Discord uses ~375px. Use a conservative "small panel" size.
      // LOW confidence on exact dimensions — Discord does not publish pixel specs.
      use: {
        viewport: { width: 460, height: 720 },
      },
    },
  ],

  webServer: [
    {
      command: 'bun run --cwd ../server bun run src/index.ts',
      url: 'http://localhost:3000',
      name: 'Server',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'bun run --cwd ../client bun run dev',
      url: 'http://localhost:5173',
      name: 'Client',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
```

### Pattern 2: Page Object Model (POM)

**What:** Each screen gets a TypeScript class with locators and interaction methods.
Keeps test files clean and locators centralized.
**When to use:** Always for this project — 4 screens x 6 viewports = 24 test runs per
suite; POM prevents locator duplication.
**Example:**
```typescript
// Source: https://playwright.dev/docs/pom
import { expect, type Locator, type Page } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly nicknameInput: Locator;
  readonly roomCodeInput: Locator;
  readonly createRoomButton: Locator;
  readonly joinRoomButton: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    // Prefer role-based locators — most resilient to markup changes
    this.nicknameInput = page.getByLabel('Your Nickname');
    this.roomCodeInput = page.getByPlaceholder('ABC123');
    this.createRoomButton = page.getByRole('button', { name: /Create New Room/i });
    this.joinRoomButton = page.getByRole('button', { name: /Join Room/i });
    this.heading = page.getByRole('heading', { name: 'Karma' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async fillNickname(name: string) {
    await this.nicknameInput.fill(name);
  }

  async createRoom(nickname: string) {
    await this.fillNickname(nickname);
    await this.createRoomButton.click();
  }
}
```

### Pattern 3: WebSocket Inspection (Not Mocking)

**What:** For the home screen, lobby, and some game tests, drive the REAL WebSocket
connection through the actual server. Use `page.on('websocket')` to observe messages
without mocking.
**When to use:** Tests that need authentic game state (lobby, gameplay).
**Example:**
```typescript
// Source: https://playwright.dev/docs/network (WebSocket section)
test('lobby shows players after joining', async ({ page }) => {
  // Listen to WS traffic without intercepting it
  page.on('websocket', ws => {
    ws.on('framereceived', frame => {
      // Optional: log for debugging
      console.log('WS received:', frame.payload);
    });
  });

  await page.goto('/');
  await page.getByLabel('Your Nickname').fill('TestPlayer');
  await page.getByRole('button', { name: /Create New Room/ }).click();
  // Wait for real navigation to lobby
  await page.waitForURL(/\/room\//);
  await expect(page.getByText('TestPlayer')).toBeVisible();
});
```

### Pattern 4: WebSocket Mocking for UI-Only Tests

**What:** Use `page.routeWebSocket` to mock the server and pre-seed specific UI states
without needing a real game in progress. Useful for testing the swap phase and game UI
independently.
**When to use:** Testing screens that require a specific game state (e.g., swap phase,
in-game), where spinning up a real 2-player game is complex.
**Example:**
```typescript
// Source: https://playwright.dev/docs/api/class-websocketroute
import { test, expect } from '@playwright/test';

test('swap phase shows player cards', async ({ page }) => {
  // Mock the WebSocket — browser won't connect to real server
  await page.routeWebSocket('**/game-ws', ws => {
    ws.onMessage(message => {
      const msg = JSON.parse(message as string);
      // Respond to create-room with room state, then game-view with swap state
      if (msg.type === 'create-room') {
        ws.send(JSON.stringify({
          type: 'room-updated',
          room: { code: 'TEST01', players: [{ id: 'p1', nickname: 'Player1', isHost: true }], ... }
        }));
        // Immediately send game-view with swap phase
        ws.send(JSON.stringify({
          type: 'game-view',
          view: { phase: 'swap', hand: [...], faceUp: [...], ... }
        }));
      }
    });
  });

  await page.goto('/');
  // ... proceed to swap phase
});
```

**IMPORTANT:** `routeWebSocket` only supports Chromium-based browsers. For the mobile
and tablet projects using device presets based on Chromium, this works fine. For any
WebKit project, WS mocking is unavailable — fall back to real server for those.
(Verified: HIGH confidence, official Playwright docs state Chromium-only restriction)

### Pattern 5: Viewport-Sensitive Assertions

**What:** Within a single test, add viewport-conditional checks where layouts differ.
**When to use:** When a specific element is hidden/visible at certain breakpoints.
```typescript
test('navigation adapts to viewport', async ({ page, viewport }) => {
  await page.goto('/');
  const isMobile = viewport!.width < 768;
  if (isMobile) {
    // On mobile, card areas stack vertically
    await expect(page.getByTestId('player-cards')).toBeVisible();
  } else {
    // On desktop, layout has more horizontal space
    await expect(page.getByTestId('opponent-area')).toBeVisible();
  }
});
```

### Anti-Patterns to Avoid

- **Mocking useGameSocket in E2E:** The Vitest unit tests mock useGameSocket. E2E tests
  must use the REAL composable with a real WebSocket. Do not replicate the Vitest mock
  pattern in Playwright tests.
- **Running Playwright inside Docker:** The existing Makefile runs Vitest inside Docker.
  Playwright needs its own installed browser binaries. Run Playwright on the host (CI
  runner or local machine), pointing at a locally running dev stack. Do not put Playwright
  inside a Docker container for this project.
- **Testing too many game states with real multi-player:** Coordinating 2+ real browser
  instances for full game flow is complex. Use `routeWebSocket` to mock game state for
  the swap phase and game screens.
- **CSS-selector-only locators:** CSS classes change with Tailwind refactors. Use
  `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder` first; fall back to
  `getByTestId` with `data-testid` attributes as needed.
- **Running Playwright tests with `make test`:** E2E tests are slow and require browsers.
  Keep them in a separate `make e2e` target, NOT mixed with `make test` (Vitest).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser viewport emulation | Custom JS to resize browser | `use: { viewport: { width, height } }` in project config | Playwright sets viewport, deviceScaleFactor, userAgent, hasTouch atomically |
| Device presets | Hardcode userAgent + viewport + touchpoints | `...devices['iPhone SE']` spread | Playwright's device registry has 50+ real device profiles with correct UA, viewport, and touch settings |
| WebSocket inspection | Manual XHR interception or socket.io interceptors | `page.on('websocket')` + frame events | Native Playwright WS inspection is zero-setup |
| Multi-browser per test | Running tests in multiple browsers yourself | Playwright `projects` array | Each project auto-runs all test files with its config |
| Test server management | Shell scripts to start/kill dev servers | `webServer` array in `playwright.config.ts` | Playwright starts, health-checks, and tears down servers automatically |

**Key insight:** Playwright's built-in viewport/device system does everything needed.
The only custom code required is Page Object Model classes and test assertions.

## Common Pitfalls

### Pitfall 1: Playwright Init Wizard Fails with Bun

**What goes wrong:** Running `bun create playwright` or `npm init playwright@latest`
in a Bun monorepo fails because the init script attempts npm package operations.
**Why it happens:** The Playwright init wizard is hardcoded to use npm.
**How to avoid:** Skip the wizard entirely. Manually run:
```bash
cd packages/e2e
bun init -y
bun add -d @playwright/test
bunx playwright install chromium
```
Then create `playwright.config.ts` and `tsconfig.json` by hand.
**Warning signs:** Error messages mentioning npm or package-lock.json during init.

### Pitfall 2: webServer Command Path Resolution

**What goes wrong:** The `webServer.command` in `playwright.config.ts` is resolved
relative to the config file location (`packages/e2e`), not the monorepo root. Commands
like `bun run dev` won't work without explicit path context.
**Why it happens:** Playwright runs the command as a shell command from the config
file's directory.
**How to avoid:** Use absolute paths or `--cwd` flags:
```typescript
webServer: {
  command: 'bun run dev',
  cwd: '../client',  // relative to playwright.config.ts location
  url: 'http://localhost:5173',
}
```
OR reference the Makefile from the repo root:
```typescript
command: 'make dev-no-docker',  // add a Makefile target
cwd: '../..',
```

### Pitfall 3: Hash-Based Router Navigation

**What goes wrong:** The app uses `createWebHashHistory()` — URLs look like
`http://localhost:5173/#/room/ABC123`. `page.waitForURL('/room/ABC123')` won't match
because Playwright's `waitForURL` matches the full URL.
**Why it happens:** Vue Router hash mode puts the route in the URL hash fragment.
**How to avoid:** Use regex patterns for navigation assertions:
```typescript
await page.waitForURL(/\/#\/room\//);
// Or check for DOM elements instead
await expect(page.getByText('Players')).toBeVisible();
```

### Pitfall 4: WebSocket Requires Connection Before Tests Assert State

**What goes wrong:** Test navigates to `/` and immediately checks for UI elements that
only appear after WebSocket connects. Tests fail intermittently because the socket
handshake takes 50-200ms.
**Why it happens:** The Landing component shows "Connecting to server..." until WS opens;
buttons are disabled until connected.
**How to avoid:** Wait for connection before asserting interactive elements:
```typescript
// Wait for the socket to connect (buttons become enabled)
await expect(page.getByRole('button', { name: /Create New Room/ })).toBeEnabled({ timeout: 5000 });
```

### Pitfall 5: routeWebSocket is Chromium-Only

**What goes wrong:** Tests using `page.routeWebSocket()` fail on WebKit (Mobile Safari)
project with "not supported" errors.
**Why it happens:** Playwright's WebSocket mocking only supports Chromium-based browsers.
**How to avoid:** For non-Chromium projects, either:
1. Skip WS-mocked tests on those projects using `test.skip(browserName !== 'chromium')`
2. Use real server for all tests (simpler, recommended for this project)

### Pitfall 6: test.use() Viewport Override Scope Bug

**What goes wrong:** Using `test.use({ viewport: ... })` inside a `describe()` block
doesn't always apply correctly in older Playwright versions.
**Why it happens:** Known Playwright issue (GitHub #27387).
**How to avoid:** Set viewport in `playwright.config.ts` projects, NOT in individual
test files. Use the project configuration exclusively for viewport management.

### Pitfall 7: Bun Server Startup Timing

**What goes wrong:** The Bun server starts quickly but the Vite client dev server takes
5-15 seconds to compile on first run. Playwright's default `webServer.timeout` of 60s
should be sufficient, but a slow machine may time out.
**Why it happens:** Vite's first compilation includes Tailwind v4 processing and TypeScript.
**How to avoid:** Set explicit timeouts in `webServer` config (60s for client, 30s for
server), and use `reuseExistingServer: true` locally so the dev server doesn't restart
on every test run.

### Pitfall 8: The Game State Requires Real Multi-Player Coordination

**What goes wrong:** Testing "active in-game play" with a real server requires 2+
players to have joined, swapped cards, and started the game. This is hard to orchestrate
with just one browser context.
**Why it happens:** The game requires `minPlayers` (2) before host can start.
**How to avoid:** Use `page.routeWebSocket()` to mock the server for game-state tests.
Send a crafted `game-view` message to put the UI directly into in-game state. This tests
UI rendering without needing real multiplayer orchestration.
Alternatively, use two browser contexts (one per player) and coordinate them in a single
test using `browser.newContext()`.

## Code Examples

### playwright.config.ts (Complete)

```typescript
// Source: https://playwright.dev/docs/test-projects + https://playwright.dev/docs/test-webserver
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Hash-based router — navigate with goto('/#/') not goto('/')
    // Actually baseURL + page.goto('/') works fine; hash is appended by the app
  },

  projects: [
    {
      name: 'mobile-375',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'mobile-390',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet-768',
      use: {
        viewport: { width: 768, height: 1024 },
        hasTouch: false,
      },
    },
    {
      name: 'laptop-1280',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'desktop-1920',
      use: {
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'discord-iframe-460',
      use: {
        viewport: { width: 460, height: 720 },
      },
    },
  ],

  webServer: [
    {
      command: 'bun run src/index.ts',
      cwd: '../server',
      url: 'http://localhost:3000',
      name: 'Bun Server',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
      },
    },
    {
      command: 'bun run vite',
      cwd: '../client',
      url: 'http://localhost:5173',
      name: 'Vite Client',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
```

### Page Object: LandingPage

```typescript
// Source: https://playwright.dev/docs/pom
import { type Page, type Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly nicknameInput: Locator;
  readonly roomCodeInput: Locator;
  readonly createRoomButton: Locator;
  readonly joinRoomButton: Locator;
  readonly heading: Locator;
  readonly connectionStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    // Using getByLabel — matches <label for="nickname"> in Landing.vue
    this.nicknameInput = page.getByLabel('Your Nickname');
    // Using getByPlaceholder — placeholder="ABC123" in Landing.vue
    this.roomCodeInput = page.getByPlaceholder('ABC123');
    this.createRoomButton = page.getByRole('button', { name: /Create New Room/i });
    this.joinRoomButton = page.getByRole('button', { name: /Join Room/i });
    this.heading = page.getByRole('heading', { name: 'Karma' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async waitForConnected() {
    // Wait for WS to open — Create button becomes enabled
    await this.createRoomButton.waitFor({ state: 'attached' });
    // Buttons start disabled until WS connects
    await this.page.waitForFunction(
      () => !document.querySelector('button[disabled]')?.textContent?.includes('Create'),
      { timeout: 5000 }
    );
  }

  async createRoom(nickname: string) {
    await this.nicknameInput.fill(nickname);
    await this.createRoomButton.click();
  }
}
```

### Test: Home Screen Responsive

```typescript
// packages/e2e/tests/home.spec.ts
import { test, expect } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';

test.describe('Home screen', () => {
  test('renders heading and form at all viewports', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    await expect(landing.heading).toBeVisible();
    await expect(landing.nicknameInput).toBeVisible();
    await expect(landing.createRoomButton).toBeVisible();
    await expect(landing.joinRoomButton).toBeVisible();
  });

  test('form fits within viewport without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('create room button enabled after WS connects', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.nicknameInput.fill('TestUser');
    // Button should become enabled when WS connects
    await expect(landing.createRoomButton).toBeEnabled({ timeout: 5000 });
  });
});
```

### WebSocket Mocking for Game State

```typescript
// Source: https://playwright.dev/docs/api/class-websocketroute
import { test, expect } from '@playwright/test';
import type { RoomState, PlayerGameView } from '@shit-head/shared';

test('game screen renders at viewport', async ({ page, browserName }) => {
  // routeWebSocket only works in Chromium
  test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

  const mockGameView: PlayerGameView = {
    // ... test fixture data
  };

  await page.routeWebSocket('**/game-ws', ws => {
    ws.onMessage(rawMsg => {
      const msg = JSON.parse(rawMsg as string);
      if (msg.type === 'create-room') {
        // Send room-updated then game-view messages
        ws.send(JSON.stringify({ type: 'room-updated', room: { /* ... */ } }));
        ws.send(JSON.stringify({ type: 'game-view', view: mockGameView }));
      }
    });
  });

  await page.goto('/');
  // proceed to trigger game state
});
```

### Makefile Target Addition

```makefile
# Add to existing Makefile

e2e: ## Run Playwright E2E tests (requires local dev environment)
	cd packages/e2e && bunx playwright test

e2e-ui: ## Run Playwright E2E tests with UI mode
	cd packages/e2e && bunx playwright test --ui

e2e-report: ## Open last Playwright test report
	cd packages/e2e && bunx playwright show-report
```

### GitHub Actions CI Step Addition

```yaml
# Add to .github/workflows/ci.yml after existing test steps
- name: Install Playwright browsers
  run: cd packages/e2e && bunx playwright install --with-deps chromium

- name: Run E2E tests
  run: cd packages/e2e && bunx playwright test
  env:
    CI: true

- name: Upload Playwright report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: packages/e2e/playwright-report/
    retention-days: 30
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cypress for E2E | Playwright preferred | 2022-2024 | Playwright has native multi-browser, faster, better async handling |
| page.route() for WS mocking | page.routeWebSocket() | Playwright 1.48 (Oct 2024) | Native WS interception, no external libraries needed |
| npm init playwright | Manual package setup for Bun | Ongoing | Bun monorepos must skip the wizard |
| Caching Playwright browsers in CI | No cache (download each run) | Current guidance | Download time ≈ cache restore time; no benefit to caching |

**Deprecated/outdated:**
- `playwright-github-action`: Replaced by direct `npx playwright install --with-deps`
- Vitest browser mode for E2E: That is for component testing, not full E2E with a real server stack

## Open Questions

1. **Discord iframe exact dimensions**
   - What we know: Discord Activities run in an iframe within the Discord voice channel
     panel. The iframe fills the panel. Desktop Discord panels vary by window size;
     mobile Discord is typically 375px wide.
   - What's unclear: Discord does not publish exact pixel dimensions in developer docs.
     The panel width on desktop typically ranges from 400-600px depending on window size.
   - Recommendation: Use 460x720 as a conservative "small panel" Discord dimension.
     This can be adjusted after measuring in actual Discord. Mark this viewport as
     `discord-iframe-460` so it's clearly approximate.

2. **webServer cwd vs command path for Bun server**
   - What we know: The Bun server starts with `bun run src/index.ts` from the server
     package directory. The Vite client needs `bun run vite` from the client directory.
   - What's unclear: Whether Playwright's `webServer.cwd` option resolves relative paths
     correctly across all platforms, or if absolute paths are needed.
   - Recommendation: Test both approaches; use absolute path with
     `path.resolve(__dirname, '../server')` as fallback.

3. **Two-player test coordination**
   - What we know: Playwright supports multiple browser contexts in a single test,
     enabling simulation of 2 players joining a room.
   - What's unclear: Whether the minPlayers=2 requirement should be tested with 2
     real browser contexts or via WS mocking.
   - Recommendation: Use `routeWebSocket` mocking for game/swap phase UI tests to avoid
     coordination complexity. Add one integration test using two contexts to verify real
     room creation + join flow.

## Sources

### Primary (HIGH confidence)
- Official Playwright docs: https://playwright.dev/docs/emulation — viewport and device emulation API
- Official Playwright docs: https://playwright.dev/docs/test-projects — multi-project viewport config
- Official Playwright docs: https://playwright.dev/docs/test-webserver — webServer array config
- Official Playwright docs: https://playwright.dev/docs/pom — Page Object Model pattern
- Official Playwright docs: https://playwright.dev/docs/api/class-websocketroute — WS mocking API
- Official Playwright docs: https://playwright.dev/docs/locators — locator priority order
- Official Playwright docs: https://playwright.dev/docs/network — WebSocket inspection events
- Official Playwright docs: https://playwright.dev/docs/ci — GitHub Actions integration
- Official Playwright docs: https://playwright.dev/docs/docker — Docker image info
- Local machine: `npx playwright --version` confirmed v1.58.2 installed

### Secondary (MEDIUM confidence)
- GitHub issue #29301: microsoft/playwright — Bun install failures with npm wizard
  (WebSearch finding confirmed by GitHub tracker reference)
- GitHub issue #27387: microsoft/playwright — test.use() viewport override scope bug
  (WebSearch finding; known regression)

### Tertiary (LOW confidence)
- Discord iframe dimensions (460x720): No official spec found. Based on observed Discord
  desktop voice panel behavior. Marked approximate.
- WebSearch: "Playwright Bun monorepo setup" — confirmed manual setup required; not
  officially documented by Playwright team

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Playwright 1.58.2 confirmed installed, official docs verified
- Architecture (viewport projects): HIGH — verified from official docs
- WebSocket mocking: HIGH — official docs, Chromium-only restriction confirmed
- pitfalls (Bun wizard, hash router, WS timing): MEDIUM — cross-referenced with GitHub issues
- Discord iframe dimensions: LOW — no official spec, empirical estimate only

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days — Playwright releases roughly monthly but 1.58.x is stable)
