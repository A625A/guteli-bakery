import { defineConfig, devices } from '@playwright/test';
import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { requireTestDatabaseUrl } from './src/test/database-url';

const databaseUrlTest = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'production runtime browser tests',
);
const uploadsRoot = mkdtempSync(
  join(tmpdir(), 'guteli-playwright-production-'),
);
const uploadsStateFile = join(
  tmpdir(),
  `guteli-playwright-roots-production-${process.pid}.txt`,
);
appendFileSync(uploadsStateFile, `${uploadsRoot}\n`, { mode: 0o600 });

const configuredAppPort = Number(process.env.GUTELI_PRODUCTION_APP_PORT);
const configuredTlsPort = Number(process.env.GUTELI_PRODUCTION_TLS_PORT);
const appPort = Number.isSafeInteger(configuredAppPort)
  ? configuredAppPort
  : 30_000 + (process.pid % 15_000) * 2;
const tlsPort = Number.isSafeInteger(configuredTlsPort)
  ? configuredTlsPort
  : appPort + 1;
process.env.GUTELI_PRODUCTION_APP_PORT = String(appPort);
process.env.GUTELI_PRODUCTION_TLS_PORT = String(tlsPort);
const productionOrigin = `https://127.0.0.1:${tlsPort}`;

export default defineConfig({
  testDir: './tests/production',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  metadata: { uploadsStateFile },
  globalTeardown: './playwright.global-teardown.mjs',
  use: {
    baseURL: productionOrigin,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && node --conditions=react-server --import tsx tests/support/seed-admin-owner.ts && node tests/support/production-tls-server.mjs',
    env: {
      DATABASE_URL: databaseUrlTest,
      DATABASE_URL_TEST: databaseUrlTest,
      BETTER_AUTH_SECRET:
        'production-test-auth-secret-must-be-at-least-32-bytes',
      BETTER_AUTH_URL: productionOrigin,
      RATE_LIMIT_SECRET: 'production-test-rate-limit-secret-32-bytes',
      RECEIPT_TOKEN_SECRET: 'production-test-receipt-secret-32-bytes',
      TRUSTED_PROXY_HOPS: '1',
      UPLOADS_ROOT: uploadsRoot,
      GUTELI_PRODUCTION_APP_PORT: String(appPort),
      GUTELI_PRODUCTION_TLS_PORT: String(tlsPort),
    },
    url: productionOrigin,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
