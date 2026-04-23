import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
  },
  // In CI: start the server. Locally: assumes dev server already running.
  ...(process.env['CI']
    ? {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:3001/api/auth/me',
          timeout: 120_000,
        },
      }
    : {}),
  projects: [
    {
      name: 'api',
      use: {},
    },
  ],
})
