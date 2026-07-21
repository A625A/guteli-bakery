import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/handoff',
  testMatch: 'unavailable.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3102',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3102',
    url: 'http://127.0.0.1:3102',
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_DEMO_MODE: 'false',
      NEXT_PUBLIC_WHATSAPP_DESTINATION: '50255555555',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
