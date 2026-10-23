import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireTestDatabaseUrl } from './src/test/database-url';
const database = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'Oracle demo',
);
if (new URL(database).hostname !== '127.0.0.1')
  throw new Error('Loopback fixtures only');
const uploads = mkdtempSync(join(tmpdir(), 'guteli-oracle-browser-'));
export default defineConfig({
  testDir: './tests/oracle-browser',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3110', ...devices['Desktop Chrome'] },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && node --conditions=react-server --import tsx tests/support/seed-admin-owner.ts && node scripts/oracle/start-demo-test.mjs',
    url: 'http://127.0.0.1:3110',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: database,
      DATABASE_URL_TEST: database,
      BETTER_AUTH_SECRET: 'oracle-demo-test-auth-secret-at-least-32-bytes',
      BETTER_AUTH_URL: 'http://127.0.0.1:3110',
      RATE_LIMIT_SECRET: 'oracle-demo-test-rate-secret-at-least-32-bytes',
      RECEIPT_TOKEN_SECRET: 'oracle-demo-test-receipt-secret-at-least-32-bytes',
      TRUSTED_PROXY_HOPS: '1',
      UPLOADS_ROOT: uploads,
      COMMERCIAL_ORDERS_ENABLED: 'false',
      PAYMENTS_ENABLED: 'false',
      WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
      WHATSAPP_WEBHOOKS_ENABLED: 'false',
    },
  },
});
