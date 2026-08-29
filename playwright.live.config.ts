import { defineConfig, devices } from '@playwright/test';
import { createHandoffEnvironment } from './playwright.handoff-environment';
import { requireTestDatabaseUrl } from './src/test/database-url';

const databaseUrlTest = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'live handoff tests',
);
const { uploadsRoot, uploadsStateFile } = createHandoffEnvironment('live');

export default defineConfig({
  testDir: './tests/handoff',
  testMatch: 'live.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  globalTeardown: './playwright.global-teardown.mjs',
  metadata: { uploadsStateFile },
  use: {
    baseURL: 'http://127.0.0.1:3101',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && npm run dev -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101',
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_DEMO_MODE: 'false',
      NEXT_PUBLIC_WHATSAPP_DESTINATION: '50242569861',
      DATABASE_URL: databaseUrlTest,
      DATABASE_URL_TEST: databaseUrlTest,
      UPLOADS_ROOT: uploadsRoot,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
