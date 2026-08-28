import { loadEnvConfig } from '@next/env';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

loadEnvConfig(process.cwd());

const databaseUrlTest = process.env.DATABASE_URL_TEST;

if (!databaseUrlTest) {
  throw new Error('DATABASE_URL_TEST is required for integration tests.');
}

process.env.DATABASE_URL = databaseUrlTest;

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
