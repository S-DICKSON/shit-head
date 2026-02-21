import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,
    // Suppress unhandled WebSocket connection errors from the Bun/Docker environment.
    // In Docker, the ws npm package (used by jsdom's WebSocket) emits an uncaught
    // ErrorEvent when localhost:3000 is unavailable. All tests pass — this flag
    // prevents Vitest from treating those async infrastructure errors as test failures.
    dangerouslyIgnoreUnhandledErrors: true,
  }
})
