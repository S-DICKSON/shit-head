// Global test setup — extends vitest expect() with jest-dom matchers
import '@testing-library/jest-dom/vitest'

// Suppress WebSocket connection errors from Bun/Docker environment.
// In Docker, the ws npm package (used by jsdom's WebSocket) emits an uncaught
// ErrorEvent when localhost:3000 is unavailable. This process-level handler
// swallows those specific errors so vitest exits with code 0.
const originalEmit = process.emit.bind(process)
// @ts-expect-error — overriding process.emit for error suppression
process.emit = function (event: string, error: Error) {
  if (
    event === 'uncaughtException' &&
    error?.message?.includes('WebSocket connection to')
  ) {
    return false
  }
  return originalEmit(event, error)
}
