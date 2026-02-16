# Phase 17: Platform Abstraction - Research

**Researched:** 2026-02-16
**Domain:** Platform abstraction patterns, adapter/strategy design patterns, Discord Activity vs standalone web dual-mode architecture
**Confidence:** HIGH

## Summary

Phase 17 establishes clean dual-mode architecture using the adapter pattern to separate Discord Activity-specific concerns from standalone web functionality. The standard approach uses TypeScript interfaces for platform-agnostic contracts (Auth, Connection, Room), concrete adapter implementations for each platform (DiscordAuthAdapter, WebAuthAdapter), and Vue 3's provide/inject pattern with InjectionKey symbols for type-safe dependency injection.

Platform detection happens at startup by checking if `window.self !== window.top` (iframe detection for Discord) or attempting Discord SDK initialization with try-catch. The existing game logic in useGameSocket, Room components, and game engine remains completely platform-agnostic — no `if (isDiscord)` checks in business logic. All platform-specific behavior is encapsulated in adapters and injected as dependencies.

**Primary recommendation:** Define TypeScript interfaces for Auth, Connection, and Room adapters; implement web adapters using existing localStorage/WebSocket code; use Vue provide/inject with InjectionKey for type-safe adapter injection; detect platform at app startup and provide appropriate adapters; keep all game logic adapter-agnostic.

## Standard Stack

### Core Libraries (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 Composition API | 3.x | Provide/inject dependency injection | Built-in, type-safe with InjectionKey pattern |
| TypeScript | 5.x | Interface definitions for adapters | Compile-time type safety, IDE autocomplete |
| @vueuse/core | Latest | Reactive composables (already in use) | De facto Vue 3 utility library, used in existing socket code |
| @discord/embedded-app-sdk | Latest | Discord Activity integration (Phase 18+) | Official Discord SDK for Activities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vite import.meta.env | Built-in | Environment variable access | Development vs production platform config |
| localStorage | Native | Web auth persistence | Standalone web mode adapter implementation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Provide/inject | Pinia global store | Over-engineering for adapter injection; Pinia better for app state, not platform abstraction |
| Interface + adapter | Feature flags with if/else | Pollutes game logic; tech debt accumulates; fails requirement DISC-03 |
| TypeScript interfaces | Abstract classes | Interfaces lighter; adapters are data/behavior, not inheritance hierarchies |

**Installation:**
```bash
# Discord SDK (Phase 18, not Phase 17)
bun add @discord/embedded-app-sdk

# No new dependencies for Phase 17 — uses existing Vue 3, TypeScript, @vueuse/core
```

## Architecture Patterns

### Recommended Project Structure
```
packages/client/
├── src/
│   ├── platform/
│   │   ├── interfaces/
│   │   │   ├── AuthAdapter.ts          # NEW: Auth interface
│   │   │   ├── ConnectionAdapter.ts    # NEW: Connection interface
│   │   │   └── RoomAdapter.ts          # NEW: Room interface (if needed)
│   │   ├── adapters/
│   │   │   ├── web/
│   │   │   │   ├── WebAuthAdapter.ts   # NEW: Standalone auth (localStorage)
│   │   │   │   └── WebConnectionAdapter.ts # NEW: Wraps existing useGameSocket
│   │   │   └── discord/
│   │   │       ├── DiscordAuthAdapter.ts    # FUTURE: Phase 18
│   │   │       └── DiscordConnectionAdapter.ts # FUTURE: Phase 18
│   │   ├── detection.ts                # NEW: Platform detection logic
│   │   └── keys.ts                     # NEW: InjectionKey symbols
│   ├── composables/
│   │   └── useGameSocket.ts            # EXISTING: Stays platform-agnostic
│   └── main.ts                         # MODIFIED: Detect platform, provide adapters
├── vite.config.ts                      # ALREADY UPDATED: Phase 16 proxy config
```

### Pattern 1: TypeScript Adapter Interfaces
**What:** Define platform-agnostic contracts for Auth, Connection, and Room operations
**When to use:** Always — foundation for dual-mode architecture
**Example:**
```typescript
// packages/client/src/platform/interfaces/AuthAdapter.ts
export interface AuthAdapter {
  /**
   * Get current authenticated user info
   * Returns null if not authenticated
   */
  getCurrentUser(): Promise<{ id: string; name: string } | null>;

  /**
   * Trigger authentication flow
   * Web: no-op (uses playerId from server)
   * Discord: OAuth via SDK
   */
  authenticate(): Promise<void>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Sign out current user
   */
  signOut(): Promise<void>;
}

// packages/client/src/platform/interfaces/ConnectionAdapter.ts
import type { ClientMessage, ServerMessage } from '@shit-head/shared';

export interface ConnectionAdapter {
  /**
   * Connection status (OPEN, CONNECTING, CLOSED, etc.)
   */
  readonly status: Ref<string>;

  /**
   * Send typed message to server
   */
  send(message: ClientMessage): void;

  /**
   * Register message handler
   * Returns unregister function
   */
  onMessage(handler: (msg: ServerMessage) => void): () => void;

  /**
   * Close connection
   */
  close(): void;

  /**
   * Reconnect to server
   */
  open(): void;
}
```

### Pattern 2: Web Adapter Implementations (Wrapping Existing Code)
**What:** Implement adapters using existing localStorage and useGameSocket logic
**When to use:** Phase 17 — reuse existing v1.0 functionality without changes
**Example:**
```typescript
// packages/client/src/platform/adapters/web/WebAuthAdapter.ts
import type { AuthAdapter } from '../../interfaces/AuthAdapter';

export class WebAuthAdapter implements AuthAdapter {
  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    const playerId = localStorage.getItem('shithead-player-id');
    const nickname = localStorage.getItem('shithead-player-nickname');

    if (!playerId || !nickname) return null;

    return { id: playerId, name: nickname };
  }

  async authenticate(): Promise<void> {
    // Standalone web: authentication happens implicitly when joining/creating room
    // Server assigns playerId, client stores it
    // No explicit auth flow needed
  }

  isAuthenticated(): boolean {
    return localStorage.getItem('shithead-player-id') !== null;
  }

  async signOut(): Promise<void> {
    localStorage.removeItem('shithead-player-id');
    localStorage.removeItem('shithead-player-nickname');
    localStorage.removeItem('shithead-room-code');
  }
}

// packages/client/src/platform/adapters/web/WebConnectionAdapter.ts
import type { ConnectionAdapter } from '../../interfaces/ConnectionAdapter';
import type { ClientMessage, ServerMessage } from '@shit-head/shared';
import { useGameSocket } from '@/composables/useGameSocket';

export class WebConnectionAdapter implements ConnectionAdapter {
  private socket = useGameSocket();

  get status() {
    return this.socket.status;
  }

  send(message: ClientMessage): void {
    this.socket.send(message);
  }

  onMessage(handler: (msg: ServerMessage) => void): () => void {
    return this.socket.onMessage(handler);
  }

  close(): void {
    this.socket.close();
  }

  open(): void {
    this.socket.open();
  }
}
```

### Pattern 3: Platform Detection at Startup
**What:** Detect Discord vs standalone web at app initialization
**When to use:** Once, in main.ts before mounting Vue app
**Example:**
```typescript
// packages/client/src/platform/detection.ts
export type Platform = 'discord' | 'web';

/**
 * Detect if app is running in Discord Activity iframe
 *
 * Methods:
 * 1. Check window.self !== window.top (iframe detection)
 * 2. Check for Discord SDK query params (more reliable)
 * 3. Try Discord SDK initialization (definitive but async)
 */
export function detectPlatform(): Platform {
  // Method 1: Basic iframe detection
  // Discord Activities run in iframe, standalone web doesn't
  const inIframe = window.self !== window.top;

  // Method 2: Check for Discord-specific query params
  // Discord adds frame_id, instance_id, platform to URL
  const url = new URL(window.location.href);
  const hasDiscordParams = url.searchParams.has('frame_id') ||
                           url.searchParams.has('instance_id');

  if (inIframe && hasDiscordParams) {
    return 'discord';
  }

  // Default to web for standalone
  return 'web';
}

/**
 * Async platform detection using Discord SDK initialization
 * More reliable but requires async/await
 */
export async function detectPlatformAsync(): Promise<Platform> {
  try {
    // Only attempt if basic detection suggests Discord
    if (window.self === window.top) {
      return 'web';
    }

    // Try to initialize Discord SDK (Phase 18+)
    // If this succeeds, we're definitely in Discord
    const { DiscordSDK } = await import('@discord/embedded-app-sdk');
    const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
    await discordSdk.ready(); // Throws if not in Discord

    return 'discord';
  } catch (error) {
    // SDK initialization failed — not in Discord
    return 'web';
  }
}
```

### Pattern 4: Provide/Inject with InjectionKey (Type-Safe Dependency Injection)
**What:** Use Vue 3's provide/inject with InjectionKey symbols for type-safe adapter injection
**When to use:** Always — cleanest way to pass adapters to components
**Example:**
```typescript
// packages/client/src/platform/keys.ts
import type { InjectionKey } from 'vue';
import type { AuthAdapter } from './interfaces/AuthAdapter';
import type { ConnectionAdapter } from './interfaces/ConnectionAdapter';
import type { Platform } from './detection';

// Typed injection keys using Symbol
export const PlatformKey: InjectionKey<Platform> = Symbol('platform');
export const AuthAdapterKey: InjectionKey<AuthAdapter> = Symbol('authAdapter');
export const ConnectionAdapterKey: InjectionKey<ConnectionAdapter> = Symbol('connectionAdapter');

// packages/client/src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { detectPlatform } from './platform/detection';
import { PlatformKey, AuthAdapterKey, ConnectionAdapterKey } from './platform/keys';
import { WebAuthAdapter } from './platform/adapters/web/WebAuthAdapter';
import { WebConnectionAdapter } from './platform/adapters/web/WebConnectionAdapter';

const app = createApp(App);

// Detect platform at startup
const platform = detectPlatform();
console.log(`[Platform] Running in ${platform} mode`);

// Provide platform type
app.provide(PlatformKey, platform);

// Provide platform-specific adapters
if (platform === 'web') {
  app.provide(AuthAdapterKey, new WebAuthAdapter());
  app.provide(ConnectionAdapterKey, new WebConnectionAdapter());
} else {
  // Phase 18: Discord adapters
  // app.provide(AuthAdapterKey, new DiscordAuthAdapter());
  // app.provide(ConnectionAdapterKey, new DiscordConnectionAdapter());
  throw new Error('Discord adapters not implemented yet (Phase 18)');
}

app.mount('#app');
```

### Pattern 5: Using Adapters in Components (Platform-Agnostic Code)
**What:** Components inject adapters and use them without knowing the platform
**When to use:** Always — keeps game logic clean and testable
**Example:**
```vue
<!-- packages/client/src/components/PlayerInfo.vue -->
<script setup lang="ts">
import { inject, onMounted, ref } from 'vue';
import { AuthAdapterKey, PlatformKey } from '@/platform/keys';

// Inject adapters (platform-agnostic)
const authAdapter = inject(AuthAdapterKey);
const platform = inject(PlatformKey);

if (!authAdapter) {
  throw new Error('AuthAdapter not provided');
}

const user = ref<{ id: string; name: string } | null>(null);

onMounted(async () => {
  user.value = await authAdapter.getCurrentUser();
});

const handleSignOut = async () => {
  await authAdapter.signOut();
  user.value = null;
};
</script>

<template>
  <div>
    <div v-if="user">
      <p>{{ user.name }}</p>
      <button @click="handleSignOut">Sign Out</button>
    </div>
    <p v-else>Not authenticated</p>

    <!-- Platform indicator for debugging (optional) -->
    <span class="text-xs text-gray-500">Platform: {{ platform }}</span>
  </div>
</template>
```

### Pattern 6: Factory Pattern for Adapter Creation (Alternative to main.ts)
**What:** Use factory function to create adapters based on platform
**When to use:** If adapter creation becomes complex or needs testing
**Example:**
```typescript
// packages/client/src/platform/factory.ts
import type { Platform } from './detection';
import type { AuthAdapter } from './interfaces/AuthAdapter';
import type { ConnectionAdapter } from './interfaces/ConnectionAdapter';
import { WebAuthAdapter } from './adapters/web/WebAuthAdapter';
import { WebConnectionAdapter } from './adapters/web/WebConnectionAdapter';

export function createAuthAdapter(platform: Platform): AuthAdapter {
  switch (platform) {
    case 'web':
      return new WebAuthAdapter();
    case 'discord':
      // Phase 18: Discord adapter
      throw new Error('Discord auth adapter not implemented yet');
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

export function createConnectionAdapter(platform: Platform): ConnectionAdapter {
  switch (platform) {
    case 'web':
      return new WebConnectionAdapter();
    case 'discord':
      // Phase 18: Discord adapter
      throw new Error('Discord connection adapter not implemented yet');
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

// Usage in main.ts
import { createAuthAdapter, createConnectionAdapter } from './platform/factory';

const platform = detectPlatform();
app.provide(AuthAdapterKey, createAuthAdapter(platform));
app.provide(ConnectionAdapterKey, createConnectionAdapter(platform));
```

### Anti-Patterns to Avoid
- **Platform checks in game logic**: Never `if (platform === 'discord')` in Room.vue, GameBoard.vue, useGameSocket.ts — use adapters instead
- **Tight coupling to Discord SDK**: Don't import `@discord/embedded-app-sdk` in game components — only in Discord adapters
- **Global platform variable**: Don't `export const PLATFORM = 'web'` — inject via provide/inject for testability
- **Premature Discord implementation**: Phase 17 only implements web adapters; Discord adapters are Phase 18+ (don't build them yet)
- **Leaky abstractions**: Don't expose Discord-specific types (DiscordSDK, OAuth tokens) in adapter interfaces — keep interfaces platform-agnostic
- **Over-engineering**: Don't create RoomAdapter yet if existing useGameSocket works for both platforms — only abstract what differs

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dependency injection | Custom service locator | Vue provide/inject with InjectionKey | Built-in, type-safe, framework-integrated |
| Iframe detection | Custom postMessage listener | window.self !== window.top + query params | Standard web API, reliable, no race conditions |
| Platform-specific code switching | if/else in every component | Adapter pattern with interface | Separation of concerns, testable, avoids tech debt |
| Discord SDK wrapper | Custom SDK abstraction | Official @discord/embedded-app-sdk directly in Discord adapters | Maintained by Discord, well-documented, handles edge cases |
| Singleton management | Custom singleton pattern | Export class instances or use provide/inject | Simpler, leverages Vue reactivity, no global state gotchas |

**Key insight:** Platform abstraction looks simple ("just detect Discord and use different auth") but pollutes codebase quickly. One `if (isDiscord)` becomes dozens; game logic becomes untestable; adding platforms requires touching every file. Adapter pattern has upfront cost but prevents cascading tech debt.

## Common Pitfalls

### Pitfall 1: Platform Checks Leak Into Game Logic
**What goes wrong:** Components start with `if (platform === 'discord')` checks; spreads to every file; game logic tightly coupled to platforms
**Why it happens:** "Just one check" is easy; adapter pattern feels like over-engineering initially
**How to avoid:** Strict rule: game logic NEVER imports platform detection; only adapters know platform; enforce with code review
**Warning signs:** `import { detectPlatform }` in Room.vue, GameBoard.vue, or composables; if/else based on platform in business logic

### Pitfall 2: Forgetting to Provide Adapters
**What goes wrong:** App crashes at runtime with "inject() can only be used inside setup()" or "undefined adapter"
**Why it happens:** Provide happens in main.ts; easy to forget when adding new adapters
**How to avoid:** Throw errors in inject calls if adapter is undefined; add startup checks to verify all adapters provided
**Warning signs:** Runtime errors in components using inject; "Cannot read property of undefined" for adapter methods

### Pitfall 3: Adapter Interface Too Specific to One Platform
**What goes wrong:** Interface designed around Discord SDK structure; web adapter awkwardly implements Discord-shaped methods
**Why it happens:** Implementing Discord first and retrofitting web; or vice versa
**How to avoid:** Design interfaces from game logic needs (what does Room component need?), not platform capabilities (what does Discord SDK provide?)
**Warning signs:** Methods like `getDiscordGuildId()` in AuthAdapter interface; web adapter with empty method bodies

### Pitfall 4: Over-Abstracting Too Early
**What goes wrong:** Creating adapters for everything (AudioAdapter, UIAdapter, StorageAdapter); complexity explosion
**Why it happens:** Misunderstanding "abstraction is good" → abstract everything
**How to avoid:** Only abstract what differs between platforms; if both platforms use same implementation, keep it shared
**Warning signs:** 10+ adapter interfaces; adapters with single methods; adapters that just proxy to shared code

### Pitfall 5: Breaking Existing Standalone Web App
**What goes wrong:** Refactoring to adapters breaks v1.0 functionality; requirement DISC-03 violated
**Why it happens:** Changing useGameSocket internals; moving localStorage logic without testing
**How to avoid:** Web adapters wrap existing code, don't replace it; validate v1.0 features after refactoring (create room, join, play game)
**Warning signs:** Existing tests failing; manual testing shows broken reconnection, lost localStorage state

### Pitfall 6: Assuming Synchronous Platform Detection
**What goes wrong:** Platform detection requires async SDK initialization; app renders before detection completes
**Why it happens:** Discord SDK `ready()` is async; synchronous detection (iframe check) may be unreliable
**How to avoid:** Use synchronous detection (iframe + query params) for initial render; async validation optional for edge cases
**Warning signs:** App flashing between modes; platform changes after mount; race conditions in adapter provision

### Pitfall 7: Not Testing Web Adapter Separately
**What goes wrong:** Web adapter assumed to work because existing code works; bugs surface when Discord adapters added
**Why it happens:** Web adapter feels like "no changes" refactor; testing deferred to Discord integration
**How to avoid:** Write tests for web adapters in Phase 17; validate adapter interface contracts; ensure game logic works through adapters
**Warning signs:** No adapter-specific tests; relying only on existing integration tests; "works on my machine" without adapter validation

## Code Examples

Verified patterns from official sources and established practices:

### Vue 3 InjectionKey Pattern (Type-Safe Dependency Injection)
```typescript
// Source: https://vuejs.org/api/composition-api-dependency-injection
import { InjectionKey, provide, inject } from 'vue';

// Define typed injection key
export const myKey: InjectionKey<string> = Symbol('myKey');

// Provider
provide(myKey, 'value');

// Consumer (type is automatically inferred)
const value = inject(myKey); // Type: string | undefined
const valueWithDefault = inject(myKey, 'default'); // Type: string
```

### TypeScript Adapter Pattern
```typescript
// Source: https://refactoring.guru/design-patterns/adapter/typescript/example
// Target interface that client code expects
interface Target {
  request(): string;
}

// Adaptee with incompatible interface
class Adaptee {
  specificRequest(): string {
    return '.eetpadA eht fo roivaheb laicepS';
  }
}

// Adapter makes Adaptee's interface compatible with Target
class Adapter implements Target {
  private adaptee: Adaptee;

  constructor(adaptee: Adaptee) {
    this.adaptee = adaptee;
  }

  public request(): string {
    const result = this.adaptee.specificRequest().split('').reverse().join('');
    return `Adapter: (TRANSLATED) ${result}`;
  }
}

// Client code works with Target interface
function clientCode(target: Target) {
  console.log(target.request());
}

// Usage
const adaptee = new Adaptee();
const adapter = new Adapter(adaptee);
clientCode(adapter);
```

### Platform Detection (Iframe Check)
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/parent
// https://www.geeksforgeeks.org/javascript/how-to-check-a-webpage-is-loaded-inside-an-iframe-or-into-the-browser-window-using-javascript/

// Method 1: Compare window.self and window.top
if (window.self !== window.top) {
  console.log('Running in iframe (potentially Discord Activity)');
} else {
  console.log('Running standalone');
}

// Method 2: Use window.frameElement (may be null for cross-origin)
if (window.frameElement !== null) {
  console.log('Embedded in iframe');
} else {
  console.log('Not in iframe or cross-origin');
}

// Combined approach with query params
function detectDiscordActivity(): boolean {
  const inIframe = window.self !== window.top;
  const url = new URL(window.location.href);
  const hasDiscordParams = url.searchParams.has('frame_id') ||
                           url.searchParams.has('instance_id');
  return inIframe && hasDiscordParams;
}
```

### Discord Embedded App SDK Initialization (Phase 18+, Reference Only)
```typescript
// Source: https://docs.discord.com/developers/developer-tools/embedded-app-sdk
// https://github.com/discord/embedded-app-sdk
import { DiscordSDK } from '@discord/embedded-app-sdk';

const discordSdk = new DiscordSDK(YOUR_OAUTH2_CLIENT_ID);

async function setup() {
  // Wait for Discord client connection
  await discordSdk.ready();

  // Authorize user
  const { code } = await discordSdk.commands.authorize({
    client_id: YOUR_OAUTH2_CLIENT_ID,
    response_type: 'code',
    scope: ['identify', 'applications.commands'],
  });

  // Exchange code for access token via backend
  const response = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const { access_token } = await response.json();

  // Authenticate with Discord
  await discordSdk.commands.authenticate({ access_token });

  // SDK ready to use
}
```

### Vue Composable Pattern (Existing useGameSocket Structure)
```typescript
// Source: https://vuejs.org/guide/reusability/composables
// Existing pattern in packages/client/src/composables/useGameSocket.ts

export function useGameSocket() {
  // State managed by composable
  const status = ref('CONNECTING');
  const error = ref<string | null>(null);

  // Functions encapsulated
  const send = (msg: ClientMessage) => {
    // Implementation
  };

  const onMessage = (callback: MessageHandler) => {
    // Implementation
    return () => {
      // Cleanup function
    };
  };

  // Expose managed state and functions
  return {
    status,
    error,
    send,
    onMessage,
    // ... other exports
  };
}

// Usage in components
const { status, send, onMessage } = useGameSocket();
```

### Strategy Pattern with Dependency Injection
```typescript
// Source: https://www.angularspace.com/strategy-pattern-the-angular-way-di-and-runtime-flexibility/
// Applied to Vue 3 context

// Strategy interface
interface PaymentStrategy {
  pay(amount: number): Promise<void>;
}

// Concrete strategies
class CreditCardPayment implements PaymentStrategy {
  async pay(amount: number): Promise<void> {
    console.log(`Paid ${amount} with credit card`);
  }
}

class PayPalPayment implements PaymentStrategy {
  async pay(amount: number): Promise<void> {
    console.log(`Paid ${amount} with PayPal`);
  }
}

// Factory selects strategy
function createPaymentStrategy(type: string): PaymentStrategy {
  switch (type) {
    case 'credit': return new CreditCardPayment();
    case 'paypal': return new PayPalPayment();
    default: throw new Error(`Unknown payment type: ${type}`);
  }
}

// Usage with Vue provide/inject
const PaymentKey: InjectionKey<PaymentStrategy> = Symbol('payment');
app.provide(PaymentKey, createPaymentStrategy('credit'));

// Component uses strategy without knowing implementation
const payment = inject(PaymentKey);
await payment.pay(100);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Feature flags in every component | Adapter pattern with DI | 2020-2025 | Clean separation of concerns, testable, maintainable |
| Global `window.platform` variable | Provide/inject with InjectionKey | Vue 3 (2020+) | Type-safe, framework-integrated, no global state |
| Abstract classes for adapters | TypeScript interfaces | 2015+ (TS adoption) | Lighter, composition over inheritance, easier testing |
| Manual SDK initialization checks | Iframe + query param detection | 2022+ (Discord Activities) | Reliable, synchronous, no SDK dependency for detection |
| Vuex for dependency injection | Provide/inject | Vue 3 (2020+) | Purpose-built for DI, simpler API, less boilerplate |

**Deprecated/outdated:**
- **Feature flags for platform logic**: Leads to spaghetti code, tech debt, untestable components
- **Abstract classes for adapters**: Interfaces preferred in modern TypeScript; composition > inheritance
- **Global singleton services**: Use provide/inject instead for better testability and Vue reactivity integration
- **Vuex for everything**: Pinia for state, provide/inject for dependency injection (cleaner separation of concerns)

## Open Questions

Things that couldn't be fully resolved:

1. **Async vs synchronous platform detection**
   - What we know: Iframe check (`window.self !== window.top`) is synchronous but may have edge cases; Discord SDK `ready()` is definitive but async
   - What's unclear: Whether synchronous detection (iframe + query params) is reliable enough, or if async SDK check is needed
   - Recommendation: Start with synchronous detection (iframe + query params) for Phase 17 web-only validation. Async detection can be added in Phase 18 if needed.

2. **RoomAdapter necessity**
   - What we know: Auth and Connection differ between platforms; Room operations (create, join, leave) go through Connection adapter
   - What's unclear: Whether Room needs separate adapter or if Connection adapter is sufficient
   - Recommendation: Don't create RoomAdapter in Phase 17 unless testing reveals platform-specific room logic. Keep it simple; add only if needed.

3. **Discord auth token storage**
   - What we know: Standalone web stores playerId in localStorage; Discord uses OAuth access tokens
   - What's unclear: Whether Discord tokens should be stored (localStorage, memory, SDK manages them) and how they map to existing playerId flow
   - Recommendation: Phase 18 concern. For now, WebAuthAdapter uses existing localStorage; Discord adapter design deferred.

4. **Testing strategy for adapters**
   - What we know: Adapters should be tested separately from components; web adapter wraps existing code (already tested)
   - What's unclear: Whether to write new adapter-specific unit tests or rely on existing integration tests
   - Recommendation: Write basic unit tests for adapter interface compliance (methods exist, types correct). Integration tests validate behavior.

5. **Platform indicator in UI**
   - What we know: Helpful for debugging and user feedback (especially during dual-mode development)
   - What's unclear: Whether to show platform indicator in production or dev-only
   - Recommendation: Add small platform indicator (dev mode only via `import.meta.env.DEV`) for testing. Remove or hide in production.

## Sources

### Primary (HIGH confidence)
- [Vue.js Composition API Dependency Injection](https://vuejs.org/api/composition-api-dependency-injection) - InjectionKey, provide/inject TypeScript patterns
- [Vue.js Composables Guide](https://vuejs.org/guide/reusability/composables) - Composable structure, best practices, naming conventions
- [Discord Embedded App SDK Reference](https://docs.discord.com/developers/developer-tools/embedded-app-sdk) - SDK initialization, ready() method, Activity architecture
- [Discord How Activities Work](https://docs.discord.com/developers/activities/how-activities-work) - Iframe embedding, postMessage protocol, Activity lifecycle
- [MDN Window.parent property](https://developer.mozilla.org/en-US/docs/Web/API/Window/parent) - Iframe detection APIs
- [MDN Window.top property](https://developer.mozilla.org/en-US/docs/Web/API/Window/top) - Top-level window reference
- [Refactoring.Guru Adapter Pattern (TypeScript)](https://refactoring.guru/design-patterns/adapter/typescript/example) - TypeScript adapter implementation

### Secondary (MEDIUM confidence)
- [Hexagonal Architecture Pattern - AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html) - Ports and adapters pattern
- [GeeksforGeeks Iframe Detection](https://www.geeksforgeeks.org/javascript/how-to-check-a-webpage-is-loaded-inside-an-iframe-or-into-the-browser-window-using-javascript/) - Iframe detection methods
- [Vue School Abstracting Dependencies](https://vueschool.io/articles/vuejs-tutorials/abstracting-your-dependencies/) - Vue dependency abstraction patterns (article content unavailable, title referenced)
- [Michael Thiessen Composable Patterns](https://michaelnthiessen.com/composable-patterns-in-vue) - Vue composable design patterns
- [Strategy Pattern with DI (Angular)](https://www.angularspace.com/strategy-pattern-the-angular-way-di-and-runtime-flexibility/) - Strategy + DI pattern (Angular but applicable to Vue)
- [Writing Singleton for Vue.js Composition API](https://techreads.pipoprods.org/writing-a-singleton-for-vue-js-composition-api/) - Singleton pattern in Vue 3

### Tertiary (LOW confidence - flagged for validation)
- [GitHub discord/embedded-app-sdk](https://github.com/discord/embedded-app-sdk) - SDK source code (examples limited in search results)
- [GitHub discord/embedded-app-sdk-examples](https://github.com/discord/embedded-app-sdk-examples) - Official examples (not directly accessed, referenced in search)
- [Colyseus Discord SDK Blog](https://colyseus.io/blog/discord-embedded-sdk/) - Third-party perspective on Discord SDK
- WebSearch results on adapter pattern, platform abstraction (2026) - General ecosystem knowledge, concepts verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vue 3 provide/inject and TypeScript interfaces are established patterns
- Architecture patterns: HIGH - Adapter pattern, InjectionKey, composables verified with official Vue and Discord docs
- Platform detection: MEDIUM - Iframe detection is standard, but Discord-specific query params require Phase 18 validation
- Pitfalls: MEDIUM - Based on general adapter pattern anti-patterns and Vue best practices (not Discord Activity-specific experience)

**Research date:** 2026-02-16
**Valid until:** ~90 days (May 2026) - Vue 3 stable, adapter pattern timeless, Discord SDK evolving but core concepts stable

---

**Notes for planner:**
- **No user decisions in CONTEXT.md** — full research freedom, no locked constraints
- **Phase 17 implements web adapters ONLY** — Discord adapters are Phase 18 (don't build yet)
- **Existing v1.0 code stays working** — requirement DISC-03 critical; adapters wrap, don't replace
- **Game logic stays clean** — requirement DISC-02; no `if (isDiscord)` in useGameSocket, Room components, GameEngine
- **Platform detection synchronous** — iframe + query params sufficient for Phase 17; async SDK validation in Phase 18 if needed
- **Provide/inject is type-safe** — InjectionKey pattern ensures compile-time type safety, IDE autocomplete
- **Success criteria focus** — Platform detection works, adapters defined, web implemented, standalone web unchanged
