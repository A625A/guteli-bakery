import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'drizzle-kit';
import { migrationDatabaseUrl } from './src/server/config/database';

loadEnvConfig(process.cwd());

const databaseUrl = migrationDatabaseUrl(process.env);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
});
