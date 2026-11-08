import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireTestDatabaseUrl } from './src/test/database-url';
const database = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'local Netlify simulation',
);
if (new URL(database).hostname !== '127.0.0.1')
  throw new Error('Loopback fixtures only.');
process.env.GUTELI_TEST_LARGE_UPLOAD = 'true';
process.env.GUTELI_PHOTO_ARTIFACTS = 'test-results/netlify/photos';
export default defineConfig({
  testDir: './tests/netlify',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/netlify/browser',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'https://127.0.0.1:3149',
    ignoreHTTPSErrors: true,
    trace: 'off',
  },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && node --conditions=react-server --import tsx tests/support/seed-admin-owner.ts && node tests/support/netlify-test-server.mjs',
    url: 'https://127.0.0.1:3149/readyz',
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: database,
      DATABASE_URL_UNPOOLED: database,
      DATABASE_URL_TEST: database,
      BETTER_AUTH_URL: 'https://127.0.0.1:3149',
      BETTER_AUTH_SECRET: 'netlify-test-auth-secret-at-least-32-bytes',
      RATE_LIMIT_SECRET: 'netlify-test-rate-secret-at-least-32-bytes',
      RECEIPT_TOKEN_SECRET: 'netlify-test-receipt-secret-at-least-32-bytes',
      UPLOADS_ROOT: mkdtempSync(join(tmpdir(), 'guteli-netlify-seed-')),
      TRUSTED_PROXY_HOPS: '0',
      NEXT_PUBLIC_DEMO_MODE: 'true',
      COMMERCIAL_ORDERS_ENABLED: 'false',
      PAYMENTS_ENABLED: 'false',
      WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
      WHATSAPP_WEBHOOKS_ENABLED: 'false',
      DELIVERY_MAPS_ENABLED: 'false',
      DELIVERY_PROVIDER_APPROVED: 'false',
      DELIVERY_COVERAGE_ENABLED: 'false',
    },
  },
});
