import { loadEnvConfig } from '@next/env';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { requireTestDatabaseUrl } from './src/test/database-url';

loadEnvConfig(process.cwd());

const databaseUrlTest = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'integration tests',
);

process.env.DATABASE_URL = databaseUrlTest;

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    fileParallelism: false,
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
