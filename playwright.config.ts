import { defineConfig, devices } from '@playwright/test';

import { requireTestDatabaseUrl } from './src/test/database-url';

const databaseUrlTest = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'E2E tests',
);

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    env: {
      DATABASE_URL: databaseUrlTest,
    },
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
