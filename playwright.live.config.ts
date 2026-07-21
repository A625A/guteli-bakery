import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/handoff',
  testMatch: 'live.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3101',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101',
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_DEMO_MODE: 'false',
      NEXT_PUBLIC_WHATSAPP_DESTINATION: '50242569861',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
