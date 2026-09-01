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
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && node --conditions=react-server --import tsx tests/support/seed-admin-owner.ts && npm run dev -- --hostname 127.0.0.1',
    env: {
      DATABASE_URL: databaseUrlTest,
      DATABASE_URL_TEST: databaseUrlTest,
      BETTER_AUTH_SECRET: 'playwright-auth-secret-must-be-at-least-32-bytes',
      BETTER_AUTH_URL: 'http://127.0.0.1:3000',
      RATE_LIMIT_SECRET: 'playwright-rate-limit-secret-32-bytes',
      RECEIPT_TOKEN_SECRET: 'playwright-receipt-token-secret-32-bytes',
      TRUSTED_PROXY_HOPS: '1',
      UPLOADS_ROOT: uploadsRoot,
    },
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
