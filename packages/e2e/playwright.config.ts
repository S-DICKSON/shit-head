import { defineConfig } from '@playwright/test';

// In Docker, E2E_BASE_URL points to the client service (e.g. http://client:5173).
// Locally / CI, tests use localhost and webServer starts the services.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const isDocker = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests',
  testIgnore: process.env.CI ? ['**/screenshots.spec.ts'] : [],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list']] : [['html', { open: 'never' }]],
  timeout: 30_000,

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'mobile-375',
      use: {
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'mobile-390',
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
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
    {
      name: 'discord-laptop-1219',
      use: {
        viewport: { width: 1219, height: 643 },
      },
    },
  ],

  // In Docker, client/server are managed by docker-compose — skip webServer.
  // Locally / CI, Playwright starts them.
  webServer: isDocker
    ? undefined
    : [
        {
          command: 'bun run src/index.ts',
          cwd: '../server',
          url: 'http://localhost:3000/health',
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
          env: {
            NODE_ENV: 'development',
            PORT: '3000',
          },
        },
        {
          command: 'bunx vite',
          cwd: '../client',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
