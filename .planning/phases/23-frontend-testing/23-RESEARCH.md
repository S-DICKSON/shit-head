# Phase 23: Frontend Testing - Research

**Researched:** 2026-02-18
**Domain:** Vue 3 + Vitest + vue-test-utils + Bun — component and composable testing
**Confidence:** HIGH (verified via codebase analysis + official docs + confirmed Bun issues)

## Summary

Phase 23 adds comprehensive frontend tests to the client package. The stack is already configured: Vitest 2.x with jsdom, @vue/test-utils 2.4, and 41 passing tests across 4 files. The two failing tests in App.test.ts are pre-existing and fixable (RouterView stub missing + useGameSocket triggering Bun's WebSocket warning).

The central testing challenge is `useGameSocket`: it is a singleton composable that opens a real WebSocket connection on import, uses localStorage, and most view components depend on it directly. Tests must mock this composable via `vi.mock()` to avoid real network connections and enable isolated rendering.

The platform abstraction layer (AuthAdapter, ConnectionAdapter, RoomAdapter) uses typed `InjectionKey<T>` symbols. Components that inject these adapters require `global.provide` with the **exported symbol key** — creating a new Symbol in the test will not work.

The Bun WeakMap issue is not a blocker for new tests: it manifests only when vue-test-utils stubs a component (via `shallowMount` or `global.stubs`) while Bun's jsdom is active. New tests should use `mount` with manual `vi.mock()` module mocking rather than shallow stubbing, which avoids the WeakMap path entirely.

**Primary recommendation:** Mock `useGameSocket` at the module level with `vi.mock()`, mount components with real router plugin or RouterView/RouterLink stubs, and provide adapter injection keys using the exported Symbol instances from `src/platform/keys.ts`.

---

## Standard Stack

The client package already has all required testing infrastructure. No new packages needed.

### Core (already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| vitest | ^2.0.0 (actual: 2.1.9) | Test runner, assertions, mocking | Already configured |
| @vue/test-utils | ^2.4.0 | Component mount/unmount, wrapper API | Already installed |
| jsdom | ^25.0.0 | DOM simulation for Vitest | Already configured as env |

### Supporting (already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @vitejs/plugin-vue | ^5.0.0 | .vue file compilation in Vitest | Already in vitest.config.ts |
| vue | ^3.5.0 | Reactivity for composable testing | - |

### Not Needed
| Category | What not to add | Reason |
|----------|-----------------|--------|
| E2E | Playwright, Cypress | Phase scope is unit + component tests only |
| WebSocket mocking | vitest-websocket-mock | useGameSocket is mocked at module level, not tested live |
| Testing Library | @testing-library/vue | vue-test-utils already present, consistent with existing tests |
| happy-dom | - | Would need jsdom for localStorage compat; don't switch environments mid-phase |

**Installation:** None required — all dependencies already present.

---

## Architecture Patterns

### Current Test File Organization
```
packages/client/src/
├── composables/
│   ├── useCardGrouping.test.ts       # Pure composable — no mocks needed
│   ├── useDoubleTap.test.ts          # Pure composable — vi.useFakeTimers()
│   ├── useSoundEffects.test.ts       # Mocks AudioContext globally
│   └── __tests__/
│       └── useGameSocket.proxy.test.ts  # Tests exported pure function only
└── components/
    └── __tests__/
        └── App.test.ts               # 2 pre-existing failures (fixable)
```

### Recommended New Test File Organization
```
packages/client/src/
├── composables/
│   ├── usePlayingPhase.test.ts       # New: mock useGameSocket, test selection logic
│   └── useSwapPhase.test.ts          # New: mock useGameSocket, test swap logic
└── components/
    └── __tests__/
        ├── App.test.ts               # Fix: add RouterView stub + mock useGameSocket
        ├── Landing.test.ts           # New: mock useGameSocket, test form states
        ├── Lobby.test.ts             # New: mock useGameSocket + useRouter, test player list
        ├── ConnectionStatus.test.ts  # New: mock useGameSocket connectionState
        ├── NotificationToast.test.ts # New: mock useGameSocket notifications
        ├── detection.test.ts         # New: pure function — test platform detection
        └── WebAuthAdapter.test.ts    # New: mock localStorage, test adapter methods
```

### Pattern 1: Mocking useGameSocket (THE Core Pattern)
**What:** `useGameSocket` is a singleton that opens a real WebSocket on import. All view components call it. Tests must mock the entire module.
**When to use:** Any test for a component or composable that calls `useGameSocket()`.
**Source:** Vitest docs on module factory mocking (verified).

```typescript
// Source: https://vitest.dev/guide/mocking#modules
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHashHistory } from 'vue-router';

// vi.mock is hoisted — runs before all imports
vi.mock('../../composables/useGameSocket', () => {
  // Singleton cache: ensure every call to useGameSocket() returns the same object
  let _cache: ReturnType<typeof createMockSocket> | null = null;

  function createMockSocket() {
    return {
      status: ref('OPEN'),
      connectionState: ref('connected'),
      connectionError: ref(null),
      playerId: ref<string | null>('player-1'),
      roomState: ref(null),
      gameView: ref(null),
      error: ref(null),
      notifications: ref([]),
      reconnecting: ref(false),
      reconnectTarget: ref(null),
      swapTimeRemaining: ref(30),
      readyPlayers: ref<string[]>([]),
      swapPhaseComplete: ref(false),
      swapPhaseReason: ref(null),
      turnTimeRemaining: ref(45),
      turnTimerPlayerIndex: ref(-1),
      burnTriggered: ref(false),
      shitheadNickname: ref(null),
      send: vi.fn(),
      onMessage: vi.fn(() => vi.fn()), // returns unregister fn
      close: vi.fn(),
      open: vi.fn(),
      retryConnection: vi.fn(),
      addNotification: vi.fn(),
      dismissNotification: vi.fn(),
    };
  }

  return {
    useGameSocket: () => {
      if (!_cache) _cache = createMockSocket();
      return _cache;
    },
    resolveWebSocketUrl: (hostname: string, protocol: string, host: string, serverUrl?: string) => {
      // Keep the real implementation for proxy tests
      if (serverUrl) return `${serverUrl}/game-ws`;
      if (hostname.endsWith('.discordsays.com')) {
        const ws = protocol === 'https:' ? 'wss:' : 'ws:';
        return `${ws}//${host}/.proxy/ws`;
      }
      if (hostname === 'localhost' || hostname === '127.0.0.1') return `ws://${hostname}:3000/game-ws`;
      const ws = protocol === 'https:' ? 'wss:' : 'ws:';
      return `${ws}//${host}/game-ws`;
    },
  };
});

// Access mock to manipulate state per test
import { useGameSocket } from '../../composables/useGameSocket';

describe('Landing.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const socket = useGameSocket();
    // Reset reactive state between tests
    socket.status.value = 'OPEN';
    socket.roomState.value = null;
  });

  it('enables create button when connected and nickname provided', async () => {
    const router = createRouter({ history: createWebHashHistory(), routes: [] });
    const wrapper = mount(Landing, {
      global: { plugins: [router] },
    });
    // find input, set value, assert button state...
  });
});
```

### Pattern 2: Fixing the App.test.ts Pre-existing Failures
**What:** App.vue renders `<RouterView />` which vue-test-utils can't resolve without a router plugin or stub. Also triggers Bun's WebSocket warning via useGameSocket import chain.
**When to use:** App.test.ts (fix existing) and any test of App.vue.

```typescript
// Source: https://test-utils.vuejs.org/guide/advanced/vue-router
import { mount } from '@vue/test-utils';
import App from '../../App.vue';

// Mock useGameSocket to prevent WebSocket connection
vi.mock('../../composables/useGameSocket', () => ({
  useGameSocket: () => ({
    status: ref('OPEN'),
    connectionState: ref('connected'),
    connectionError: ref(null),
    notifications: ref([]),
    // ... all fields App.vue children need
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()),
  }),
}));

describe('App.vue', () => {
  it('renders the app shell', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: true,        // Stub to avoid "Failed to resolve component" warning
          NotificationToast: true, // Stub child components that need useGameSocket
          ConnectionStatus: true,
        },
      },
    });
    expect(wrapper.find('.min-h-screen').exists()).toBe(true);
  });
});
```

**Important:** Stubbing components via `global.stubs: { ComponentName: true }` can trigger the Bun WeakMap error if the stub name doesn't match. Use string names matching the component's registered name, or provide real router plugin instead of stubs.

### Pattern 3: Testing Provide/Inject with InjectionKey (Platform Adapters)
**What:** Components that inject platform adapters use typed Symbol keys from `src/platform/keys.ts`. Tests must use the SAME exported Symbol — creating a new Symbol fails.
**Source:** https://github.com/vuejs/vue-test-utils/issues/1597 (verified).

```typescript
// Source: Official vue-test-utils InjectionKey pattern
import { mount } from '@vue/test-utils';
import { AuthAdapterKey, RoomAdapterKey } from '../../platform/keys';
import SomeDiscordComponent from '../SomeDiscordComponent.vue';

describe('SomeDiscordComponent', () => {
  it('renders with injected adapters', () => {
    const mockAuthAdapter = {
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', name: 'Alice' }),
      authenticate: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      signOut: vi.fn(),
    };

    const mockRoomAdapter = {
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
    };

    const wrapper = mount(SomeDiscordComponent, {
      global: {
        provide: {
          [AuthAdapterKey as symbol]: mockAuthAdapter,
          [RoomAdapterKey as symbol]: mockRoomAdapter,
        },
      },
    });
    // assertions...
  });
});
```

### Pattern 4: Pure Composable Tests (No Mocking Needed)
**What:** Composables that only use Vue reactivity APIs can be called directly, no vue-test-utils required.
**Source:** https://vuejs.org/guide/scaling-up/testing (official Vue docs).

```typescript
// Source: https://vuejs.org/guide/scaling-up/testing#testing-composables
import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useCardGrouping } from './useCardGrouping';

describe('useCardGrouping', () => {
  it('groups cards by rank', () => {
    const hand = ref([
      { kind: 'standard', rank: '7', suit: 'H' },
      { kind: 'standard', rank: '7', suit: 'D' },
    ]);
    const { groupedCards } = useCardGrouping(hand);
    expect(groupedCards.value[0].count).toBe(2);
  });
});
```

### Pattern 5: Platform Detection Testing
**What:** `detectPlatform()` is a pure function that reads `window.self !== window.top` and URLSearchParams. jsdom supports both.

```typescript
// Source: codebase analysis — detection.ts reads window and URLSearchParams
import { detectPlatform } from '../detection';

describe('detectPlatform', () => {
  it('returns web when not in iframe', () => {
    // jsdom: window.self === window.top by default
    expect(detectPlatform()).toBe('web');
  });

  it('returns discord when iframe + Discord params present', () => {
    // Override URLSearchParams via jsdom
    Object.defineProperty(window, 'location', {
      value: { search: '?frame_id=abc&instance_id=xyz' },
      writable: true,
    });
    // Simulate iframe: window.self !== window.top is tricky in jsdom
    // Use: Object.defineProperty(window, 'top', { value: null, writable: true })
    Object.defineProperty(window, 'top', { value: null, writable: true });
    expect(detectPlatform()).toBe('discord');
  });
});
```

### Anti-Patterns to Avoid
- **Testing useGameSocket internals directly:** The composable opens a real WebSocket. Test the composable's behavior via components that use it (with the composable mocked) or test only the exported pure functions like `resolveWebSocketUrl`.
- **Reusing singleton mock state without reset:** The vi.mock factory caches state between tests. Always reset ref values in `beforeEach`.
- **shallowMount without controlling which components get stubbed:** The Bun WeakMap error fires in the stub registration path. Use `mount` with explicit `global.stubs` only for router-related components, or provide real router plugin.
- **Providing fresh Symbol instead of exported InjectionKey:** `Symbol('AuthAdapter') !== Symbol('AuthAdapter')`. Always import the key from `src/platform/keys.ts`.
- **Testing router navigation in unit tests:** Use `vi.mock('vue-router', ...)` or provide a real router and call `await router.isReady()` before assertions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive mock state | `reactive({})` in beforeEach | `ref()` in vi.mock factory + reset in beforeEach | Matches actual composable shape; singleton cache works correctly |
| WebSocket simulation | Custom WS mock server | `vi.mock` the entire useGameSocket module | Components only care about the composable's return values, not actual WS frames |
| Router mock | Custom `$router` object | Pass real router via `global.plugins` or mock with `vi.mock('vue-router', ...)` | Vue Router 4 is async; real router handles `router.isReady()` correctly |
| Timer faking | `setTimeout` override | `vi.useFakeTimers()` / `vi.advanceTimersByTime()` | Already proven in useDoubleTap.test.ts |
| localStorage mock | Manual localStorage polyfill | jsdom provides it natively; just read/write in tests | jsdom's localStorage is synchronous and in-memory |

**Key insight:** This project's components are predominantly thin view layers over `useGameSocket`. The highest-value tests mock the socket and test rendering + user interaction, not WebSocket protocol.

---

## Common Pitfalls

### Pitfall 1: The Bun WebSocket Warning + WeakMap Error
**What goes wrong:** Running component tests produces `[bun] Warning: ws.WebSocket 'upgrade' event is not implemented in bun` and occasionally `TypeError: WeakMap keys must be objects`.
**Why it happens:** `useGameSocket` imports `@vueuse/core`'s `useWebSocket` which initializes a real WebSocket. Bun's WebSocket doesn't support the `upgrade` event. The WeakMap error occurs when vue-test-utils tries to register stubs with Bun's jsdom WeakMap implementation.
**How to avoid:** Mock `useGameSocket` at the module level with `vi.mock()` before any component import. Avoid `shallowMount` which triggers stub registration — use `mount` with selective `global.stubs` for router components only.
**Warning signs:** `[bun] Warning: ws.WebSocket 'upgrade'` in test output; test assertions on empty wrapper text.

### Pitfall 2: vi.mock Module Path Must Match Actual Import Path
**What goes wrong:** `vi.mock('../../composables/useGameSocket')` works in one test file but not another because the relative path differs by file location.
**Why it happens:** Vitest resolves vi.mock paths relative to the test file, not the aliased import.
**How to avoid:** Use path aliases consistently. If the project uses `@/` alias, mock with `vi.mock('@/composables/useGameSocket')` — but verify the alias is configured in `vitest.config.ts`. Current config has no `resolve.alias` configured.
**Current state:** Existing tests use relative paths (`../useGameSocket`). New tests should use relative paths from their location, or add `resolve.alias: { '@': '/app/packages/client/src' }` to vitest.config.ts.

### Pitfall 3: InjectionKey Symbol Must Be the Exported Instance
**What goes wrong:** Component under test injects `AuthAdapterKey` but test provides `Symbol('AuthAdapter')` — injection returns `undefined`, component crashes or renders empty.
**Why it happens:** Every `Symbol()` call creates a unique identity. Vue's provide/inject matches by identity, not description.
**How to avoid:** Always import the key from `src/platform/keys.ts`:
```typescript
import { AuthAdapterKey } from '../platform/keys';
// NOT: const AuthAdapterKey = Symbol('AuthAdapter');
```

### Pitfall 4: Singleton Mock State Leaking Between Tests
**What goes wrong:** Test A sets `socket.roomState.value = { code: 'ABCD', ... }`. Test B expects `roomState.value` to be null but it's still set.
**Why it happens:** The `vi.mock` factory caches the mock object (`_cache`). Tests share the same object.
**How to avoid:** Reset all reactive refs in `beforeEach`:
```typescript
beforeEach(() => {
  const socket = useGameSocket() as ReturnType<typeof useGameSocket>;
  socket.roomState.value = null;
  socket.status.value = 'OPEN';
  socket.connectionState.value = 'connected';
  vi.clearAllMocks(); // reset call counts on vi.fn()
});
```

### Pitfall 5: Vue Router is Async in Vue Router 4
**What goes wrong:** Component navigation guards run but test assertions fire before navigation completes, finding stale DOM.
**Why it happens:** Vue Router 4's `router.push()` returns a Promise. Tests that don't await it see the pre-navigation state.
**How to avoid:**
```typescript
import { flushPromises } from '@vue/test-utils';

it('redirects to game when gameView is set', async () => {
  socket.gameView.value = mockGameView;
  await wrapper.find('button').trigger('click');
  await flushPromises(); // flush router navigation
  expect(router.currentRoute.value.name).toBe('game');
});
```

### Pitfall 6: useGameSocket.proxy.test.ts Must Stay Isolated
**What goes wrong:** Adding a `vi.mock` for useGameSocket in the same test file as the proxy test would override the real `resolveWebSocketUrl` export.
**Why it happens:** vi.mock replaces the entire module.
**How to avoid:** The proxy test file (`useGameSocket.proxy.test.ts`) tests the exported pure function `resolveWebSocketUrl` and must NOT mock useGameSocket. Keep it separate. New component tests that need the mock go in their own files.

---

## Code Examples

### Setting Up vitest.config.ts with Alias (Recommended Addition)
```typescript
// Source: Vitest docs + codebase analysis
// File: packages/client/vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),  // enables @/composables/... in test mocks
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,  // auto-clear mock call history between tests
  },
})
```

### Test Helper: Creating a Mock Socket Factory
```typescript
// Source: codebase analysis of useGameSocket.ts return shape
// Recommended location: src/test/mocks/useGameSocket.mock.ts
import { ref } from 'vue';
import { vi } from 'vitest';

export function createMockSocket() {
  return {
    // Connection
    status: ref('OPEN'),
    connectionState: ref<'connected' | 'connecting' | 'reconnecting' | 'failed'>('connected'),
    connectionError: ref<null>(null),
    reconnecting: ref(false),
    reconnectTarget: ref(null),
    // Identity
    playerId: ref<string | null>(null),
    // Room
    roomState: ref<null>(null),
    // Game
    gameView: ref<null>(null),
    swapTimeRemaining: ref(30),
    readyPlayers: ref<string[]>([]),
    swapPhaseComplete: ref(false),
    swapPhaseReason: ref<null>(null),
    turnTimeRemaining: ref(45),
    turnTimerPlayerIndex: ref(-1),
    burnTriggered: ref(false),
    shitheadNickname: ref<null>(null),
    // Notifications
    notifications: ref<never[]>([]),
    // Methods
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()),
    close: vi.fn(),
    open: vi.fn(),
    retryConnection: vi.fn(),
    addNotification: vi.fn(),
    dismissNotification: vi.fn(),
    // Misc
    lastMessage: ref(null),
    error: ref(null),
  };
}
```

### Component Test: ConnectionStatus.vue
```typescript
// Source: codebase analysis of ConnectionStatus.vue
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('../useGameSocket', () => {
  let _cache: any = null;
  const createMock = () => ({
    connectionState: ref<'connected' | 'reconnecting' | 'failed'>('connected'),
    connectionError: ref<null>(null),
    retryConnection: vi.fn(),
  });
  return { useGameSocket: () => { if (!_cache) _cache = createMock(); return _cache; } };
});

import { useGameSocket } from '../useGameSocket';
import ConnectionStatus from './ConnectionStatus.vue';

describe('ConnectionStatus.vue', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'connected';
    s.connectionError.value = null;
    vi.clearAllMocks();
  });

  it('does not render overlay when connected', () => {
    const wrapper = mount(ConnectionStatus);
    expect(wrapper.find('[class*="fixed"]').exists()).toBe(false);
  });

  it('shows reconnecting spinner when connectionState is reconnecting', async () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'reconnecting';
    const wrapper = mount(ConnectionStatus);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Reconnecting...');
  });

  it('shows retry button and error when connectionState is failed', async () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'failed';
    s.connectionError.value = { message: 'Server unreachable', code: 'CONNECTION_FAILED', timestamp: 0, retryCount: 5 };
    const wrapper = mount(ConnectionStatus);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Connection Failed');
    await wrapper.find('button').trigger('click');
    expect(s.retryConnection).toHaveBeenCalledTimes(1);
  });
});
```

### Composable Test: usePlayingPhase.ts
```typescript
// Source: codebase analysis of usePlayingPhase.ts
// usePlayingPhase depends on useGameSocket — mock it first
vi.mock('./useGameSocket', () => {
  let _cache: any = null;
  return {
    useGameSocket: () => {
      if (!_cache) _cache = {
        send: vi.fn(),
        gameView: ref(null),
        playerId: ref('p1'),
        roomState: ref(null),
        turnTimeRemaining: ref(45),
        turnTimerPlayerIndex: ref(-1),
      };
      return _cache;
    }
  };
});
import { useGameSocket } from './useGameSocket';
import { usePlayingPhase } from './usePlayingPhase';

describe('usePlayingPhase', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.gameView.value = null;
    s.playerId.value = 'p1';
    s.roomState.value = null;
    vi.clearAllMocks();
  });

  it('isMyTurn is false when gameView is null', () => {
    const { isMyTurn } = usePlayingPhase();
    expect(isMyTurn.value).toBe(false);
  });

  it('isMyTurn is true when currentPlayerIndex matches local player', () => {
    const s = useGameSocket() as any;
    s.roomState.value = { players: [{ id: 'p1' }, { id: 'p2' }] };
    s.gameView.value = { currentPlayerIndex: 0, hand: [], faceUp: [], faceDownCount: 0 };
    const { isMyTurn } = usePlayingPhase();
    expect(isMyTurn.value).toBe(true);
  });
});
```

---

## State of the Art

| Old Pattern | Current Pattern | When Changed | Impact |
|-------------|-----------------|--------------|--------|
| Separate vitest.config.ts per environment | Single config with `environment: 'jsdom'` | Vitest 1.x+ | No change needed — current config is idiomatic |
| jest.fn() | vi.fn() | Vitest adoption | Already used in existing tests |
| Manual spy on window.WebSocket | vi.mock the composable | Best practice | Avoids fighting Bun WebSocket limitations |
| `shallowMount` by default | `mount` with selective stubs | Vue Test Utils 2.x best practice | Safer in Bun environment |

**Bun-specific note:** Bun's WebSocket warns on `upgrade` event. This is a warning, not a failure, but produces noise. Mocking `useGameSocket` eliminates the warning entirely.

---

## Open Questions

1. **Phase 19 work not yet complete**
   - What we know: Phase 19 adds DiscordLobby component, auto-join flow, spectator mode, host migration. Tests should cover these.
   - What's unclear: The exact component/composable API surface of Phase 19 work.
   - Recommendation: Plan tests for Phase 19 features based on the CONTEXT.md decisions; write them against the expected public API (injected adapters, message types from shared package).

2. **vitest.config.ts alias configuration**
   - What we know: No `resolve.alias` is currently set. Existing tests use relative imports.
   - What's unclear: Whether adding `@/` alias would break the proxy test or existing tests.
   - Recommendation: Keep relative imports consistent with existing pattern; OR add alias + verify all tests still pass. Adding alias is low risk.

3. **Bun WeakMap boundary with `global.stubs: { ... }`**
   - What we know: The WeakMap error fires when Bun's jsdom handles stub registration for some component names.
   - What's unclear: Exactly which stub configurations are safe. String array stubs (`stubs: ['RouterView']`) vs object stubs (`stubs: { RouterView: true }`) may differ.
   - Recommendation: Test both approaches in the App.test.ts fix first. String array form appears safer based on community reports.

4. **Scope of test coverage for Phases 20-22**
   - What we know: Sound/settings, card highlights, mobile categories are not yet built.
   - What's unclear: Whether Phase 23 should cover all of these or only through Phase 19.
   - Recommendation: The roadmap says "tests should cover Discord features including room management" — focus on through Phase 19. Phases 20-22 features can be tested in Phase 23 if built before testing starts, otherwise out of scope.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `packages/client/src/**` (composables, components, platform adapters, test files)
- [Vue Test Utils — Stubs and Shallow Mount](https://test-utils.vuejs.org/guide/advanced/stubs-shallow-mount)
- [Vue Test Utils — Testing Vue Router](https://test-utils.vuejs.org/guide/advanced/vue-router)
- [Vue Test Utils — Reusability & Composition (provide/inject)](https://test-utils.vuejs.org/guide/advanced/reusability-composition)
- [Vue.js Official Testing Guide](https://vuejs.org/guide/scaling-up/testing)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking)

### Secondary (MEDIUM confidence)
- [GitHub: vue-test-utils Bun test runner support #2524](https://github.com/vuejs/test-utils/issues/2524) — Confirmed WeakMap issue is Bun-level, not fixable in vue-test-utils
- [GitHub: InjectionKey Symbol testing pattern #1597](https://github.com/vuejs/vue-test-utils/issues/1597) — Export + import same Symbol is the fix
- [Vitest discussion: jsdom vs happy-dom](https://github.com/vitest-dev/vitest/discussions/1607) — jsdom is correct choice given localStorage dependencies

### Tertiary (LOW confidence)
- WebSearch results on composable singleton mock patterns — patterns verified against official Vitest docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and verified in vitest.config.ts
- Architecture patterns: HIGH — derived directly from reading the existing test files and component source
- Bun WeakMap pitfall: HIGH — confirmed via GitHub issue #2524 (closed, not fixed in vue-test-utils)
- InjectionKey pattern: HIGH — confirmed via official issue #1597 discussion + official provide docs
- Platform detection testing: MEDIUM — jsdom behavior for `window.self !== window.top` extrapolated from DOM spec, not directly tested

**Research date:** 2026-02-18
**Valid until:** 2026-05-18 (stable ecosystem — @vue/test-utils and Vitest APIs are stable)
