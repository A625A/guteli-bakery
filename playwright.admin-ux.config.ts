import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
process.env.GUTELI_SUMMARY_DEMO = process.env.ADMIN_UX_LIVE ? 'false' : 'true';
export default defineConfig({
  ...base,
  testDir: './tests/browser',
  testMatch: process.env.ADMIN_UX_FULL
    ? '**/*.spec.ts'
    : process.env.ADMIN_UX_LIVE
      ? 'checkout-summary.spec.ts'
      : 'admin-ux.spec.ts',
  projects: process.env.ADMIN_UX_FULL
    ? base.projects!.map((project) =>
        project.name === 'storefront'
          ? {
              ...project,
              testIgnore: [
                /admin-(auth|catalog|orders|shell|users|ux)\.spec\.ts/,
                /order-persistence\.spec\.ts/,
              ],
            }
          : project,
      )
    : [{ name: 'admin-ux', use: { ...devices['Desktop Chrome'] } }],
  use: { baseURL: 'http://127.0.0.1:3219', trace: 'retain-on-failure' },
  webServer: {
    ...base.webServer,
    command:
      'node scripts/reset-test-database.mjs && npm run db:migrate && npm run db:seed && node --conditions=react-server --import tsx tests/support/seed-admin-owner.ts && npm run dev -- --hostname 127.0.0.1 --port 3219',
    url: 'http://127.0.0.1:3219',
    env: {
      ...(base.webServer as { env: Record<string, string> }).env,
      BETTER_AUTH_URL: 'http://127.0.0.1:3219',
      NEXT_PUBLIC_DEMO_MODE: process.env.ADMIN_UX_LIVE ? 'false' : 'true',
      ...(process.env.ADMIN_UX_LIVE
        ? { NEXT_PUBLIC_WHATSAPP_DESTINATION: '50242569861' }
        : {}),
    },
    reuseExistingServer: false,
  },
  timeout: 120000,
});
