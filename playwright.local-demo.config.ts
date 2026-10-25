import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
const root = process.env.GUTELI_LOCAL_DEMO_ROOT;
if (!root) throw new Error('Use scripts/local-demo/demo.py check');
export default defineConfig({
  testDir: './tests/local-demo',
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 15000 },
  outputDir: join(root, 'playwright'),
  reporter: [['list'], ['json', { outputFile: join(root, 'results.json') }]],
  use: {
    actionTimeout: 15000,
    baseURL: 'http://127.0.0.1:3126',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
