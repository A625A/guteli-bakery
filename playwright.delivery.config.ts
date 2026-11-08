import { defineConfig, devices } from '@playwright/test';
import { requireTestDatabaseUrl } from './src/test/database-url';
const database = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'delivery browser tests',
);
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'delivery-map.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/delivery',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3137',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && npm run dev -- --hostname 127.0.0.1 --port 3137',
    url: 'http://127.0.0.1:3137',
    reuseExistingServer: false,
    env: {
      DATABASE_URL: database,
      DATABASE_URL_TEST: database,
      // Synthetic loopback tests only; provider and all outbound commerce stay off.
      COMMERCIAL_ORDERS_ENABLED: 'true',
      NEXT_PUBLIC_DEMO_MODE: 'true',
      DELIVERY_MAPS_ENABLED: 'false',
      DELIVERY_PROVIDER_APPROVED: 'false',
      DELIVERY_COVERAGE_ENABLED: 'false',
      PAYMENTS_ENABLED: 'false',
      WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
      WHATSAPP_AUTOMATION_AUTHORIZED: 'false',
      BETTER_AUTH_SECRET: 'delivery-browser-test-auth-secret-at-least-32',
      BETTER_AUTH_URL: 'http://127.0.0.1:3137',
      RATE_LIMIT_SECRET: 'delivery-browser-rate-limit-secret-32-bytes',
      RECEIPT_TOKEN_SECRET: 'delivery-browser-receipt-secret-32-bytes',
      TRUSTED_PROXY_HOPS: '1',
      UPLOADS_ROOT: 'test-results/delivery/uploads',
    },
  },
});
