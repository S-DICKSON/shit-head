import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { render } from '@testing-library/vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../../App.vue'

// vi.mock is hoisted before all imports — must be before any import of the mocked module
vi.mock('../../composables/useGameSocket', () => {
  // Singleton cache: ensure every call to useGameSocket() returns the same object
  let _cache: ReturnType<typeof createMock> | null = null

  function createMock() {
    return {
      status: ref('OPEN'),
      connectionState: ref<'connected' | 'connecting' | 'reconnecting' | 'failed'>('connected'),
      connectionError: ref<null>(null),
      notifications: ref<never[]>([]),
      reconnecting: ref(false),
      reconnectTarget: ref<null>(null),
      playerId: ref<string | null>(null),
      roomState: ref<null>(null),
      lastMessage: ref<null>(null),
      error: ref<null>(null),
      gameView: ref<null>(null),
      swapTimeRemaining: ref(30),
      readyPlayers: ref<string[]>([]),
      swapPhaseComplete: ref(false),
      swapPhaseReason: ref<null>(null),
      turnTimeRemaining: ref(45),
      turnTimerPlayerIndex: ref(-1),
      burnTriggered: ref(false),
      shitheadNickname: ref<null>(null),
      send: vi.fn(),
      onMessage: vi.fn(() => vi.fn()),
      close: vi.fn(),
      open: vi.fn(),
      retryConnection: vi.fn(),
      addNotification: vi.fn(),
      dismissNotification: vi.fn(),
    }
  }

  return {
    useGameSocket: () => {
      if (!_cache) _cache = createMock()
      return _cache
    },
    resolveWebSocketUrl: (hostname: string, protocol: string, host: string, serverUrl?: string) => {
      if (serverUrl) return `${serverUrl}/game-ws`
      if (hostname.endsWith('.discordsays.com')) {
        const ws = protocol === 'https:' ? 'wss:' : 'ws:'
        return `${ws}//${host}/.proxy/ws`
      }
      if (hostname === 'localhost' || hostname === '127.0.0.1') return `ws://${hostname}:3000/game-ws`
      const ws = protocol === 'https:' ? 'wss:' : 'ws:'
      return `${ws}//${host}/game-ws`
    },
  }
})

function createTestRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: { template: '<div></div>' } },
    ],
  })
}

describe('App.vue', () => {
  it('renders the app shell root element', () => {
    const router = createTestRouter()
    const { container } = render(App, {
      global: { plugins: [router] },
    })
    // The App.vue root div has class="min-h-screen bg-green-900".
    // In the Docker/Bun environment, the @tailwindcss/vite plugin transforms min-h-screen
    // to an inline style (min-height: 100dvh) while preserving the bg-green-900 class.
    // We check for bg-green-900 which is reliably present, and verify the element exists.
    expect(container.firstElementChild?.classList.contains('bg-green-900')).toBe(true)
    expect(container.firstElementChild?.tagName).toBe('DIV')
  })

  it('mounts without errors (no WebSocket connection)', () => {
    const router = createTestRouter()
    const { container } = render(App, {
      global: { plugins: [router] },
    })
    expect(container.innerHTML).not.toBe('')
  })
})
