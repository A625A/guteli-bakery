import { defineConfig, devices } from '@playwright/test';
import { createHandoffEnvironment } from './playwright.handoff-environment';
import { requireTestDatabaseUrl } from './src/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'local production privacy checks',
);
if (!['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname))
  throw new Error(
    'Privacy tests require an isolated local guteli_test database.',
  );
const { uploadsRoot, uploadsStateFile } = createHandoffEnvironment('privacy');

// Next development mode overrides HTML Cache-Control. Verify actual production responses.
export default defineConfig({
  testDir: './tests/privacy',
  workers: 1,
  retries: 0,
  reporter: 'list',
  metadata: { uploadsStateFile },
  globalTeardown: './playwright.global-teardown.mjs',
  use: { baseURL: 'http://127.0.0.1:3103' },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && npm run build && node scripts/start-privacy-test.mjs',
    url: 'http://127.0.0.1:3103',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      COMMERCIAL_ORDERS_ENABLED: 'true', // Existing checkout regression scenarios only.
      DATABASE_URL: databaseUrl,
      DATABASE_URL_TEST: databaseUrl,
      BETTER_AUTH_SECRET: 'privacy-test-only-auth-secret-at-least-32-bytes',
      BETTER_AUTH_URL: 'http://127.0.0.1:3103',
      RATE_LIMIT_SECRET: 'privacy-test-only-rate-secret-at-least-32-bytes',
      RECEIPT_TOKEN_SECRET:
        'privacy-test-only-receipt-secret-at-least-32-bytes',
      TRUSTED_PROXY_HOPS: '1',
      UPLOADS_ROOT: uploadsRoot,
      NEXT_PUBLIC_DEMO_MODE: 'true',
      PAYMENTS_ENABLED: 'false',
      WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
      WHATSAPP_WEBHOOKS_ENABLED: 'false',
      WHATSAPP_AUTOMATION_AUTHORIZED: 'false',
    },
  },
  projects: [{ name: 'privacy', use: { ...devices['Desktop Chrome'] } }],
});
