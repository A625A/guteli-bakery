import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/delivery-review',
  testMatch: 'review.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/delivery-review',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1050 },
    baseURL: 'http://127.0.0.1:3141',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 scripts/delivery-review/serve.py --port 3141',
    url: 'http://127.0.0.1:3141',
    reuseExistingServer: false,
  },
});
