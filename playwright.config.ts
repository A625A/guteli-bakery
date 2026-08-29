import { defineConfig, devices } from '@playwright/test';
import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { requireTestDatabaseUrl } from './src/test/database-url';

const databaseUrlTest = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'E2E tests',
);
const uploadsRoot = mkdtempSync(join(tmpdir(), 'guteli-playwright-'));
const uploadsStateFile =
  process.env.GUTELI_PLAYWRIGHT_ROOT_STATE ??
  join(tmpdir(), `guteli-playwright-roots-${process.pid}.txt`);
process.env.GUTELI_PLAYWRIGHT_ROOT_STATE = uploadsStateFile;
appendFileSync(uploadsStateFile, `${uploadsRoot}\n`, { mode: 0o600 });

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  metadata: { guteliUploadsRoot: uploadsRoot, uploadsStateFile },
  globalTeardown: './playwright.global-teardown.mjs',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && npm run dev -- --hostname 127.0.0.1',
    env: {
      DATABASE_URL: databaseUrlTest,
      DATABASE_URL_TEST: databaseUrlTest,
      UPLOADS_ROOT: uploadsRoot,
    },
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
