import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireTestDatabaseUrl } from './src/test/database-url';
const database = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'photo tests',
);
if (new URL(database).hostname !== '127.0.0.1')
  throw new Error('Loopback fixtures only');
const uploads = mkdtempSync(join(tmpdir(), 'guteli-ticket05-uploads-'));
export default defineConfig({
  testDir: './tests/oracle-browser',
  testMatch: 'photos.spec.ts',
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'artifacts/oracle-preparation/ticket-05/playwright',
  metadata: { uploads },
  use: { baseURL: 'http://127.0.0.1:3115' },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && node --conditions=react-server --import tsx tests/support/seed-admin-owner.ts && npm run dev -- --hostname 127.0.0.1 --port 3115',
    url: 'http://127.0.0.1:3115',
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: database,
      DATABASE_URL_TEST: database,
      BETTER_AUTH_SECRET: 'ticket05-test-auth-secret-at-least-32-bytes',
      BETTER_AUTH_URL: 'http://127.0.0.1:3115',
      RATE_LIMIT_SECRET: 'ticket05-test-rate-secret-at-least-32-bytes',
      RECEIPT_TOKEN_SECRET: 'ticket05-test-receipt-secret-at-least-32-bytes',
      TRUSTED_PROXY_HOPS: '1',
      UPLOADS_ROOT: uploads,
      NEXT_PUBLIC_DEMO_MODE: 'true',
      COMMERCIAL_ORDERS_ENABLED: 'false',
      PAYMENTS_ENABLED: 'false',
      WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
      WHATSAPP_WEBHOOKS_ENABLED: 'false',
    },
  },
});
