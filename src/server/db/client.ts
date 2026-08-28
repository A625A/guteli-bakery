import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getServerEnv } from '@/server/config/env';

const createPool = () =>
  new Pool({
    connectionString: getServerEnv().DATABASE_URL,
  });

const globalForDb = globalThis as typeof globalThis & {
  __guteliPool?: Pool;
};

const pool =
  process.env.NODE_ENV === 'development'
    ? (globalForDb.__guteliPool ??= createPool())
    : createPool();

const db = drizzle({ client: pool });

export { db, pool };
