// Global test setup — extends vitest expect() with jest-dom matchers
import '@testing-library/jest-dom/vitest'

// Mock global WebSocket to prevent real connections in tests.
// In Docker/Bun, jsdom's WebSocket (backed by the ws npm package) creates real
// TCP connections to localhost:3000 that fail with ERR_UNHANDLED_ERROR when no
// server is reachable from the test container. Mocking at the global level
// ensures no test can accidentally create a real WebSocket connection.
const MockWebSocket = class extends EventTarget {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  readyState = 1 // OPEN
  url: string
  protocol = ''
  extensions = ''
  bufferedAmount = 0
  binaryType = 'blob'

  onopen: ((ev: Event) => void) | null = null
  onclose: ((ev: Event) => void) | null = null
  onmessage: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  constructor(url: string) {
    super()
    this.url = url
  }

  send() { /* no-op */ }
  close() { this.readyState = 3 }
}

// @ts-expect-error — replacing global WebSocket with mock
globalThis.WebSocket = MockWebSocket
