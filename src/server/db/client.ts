import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getServerEnv } from '@/server/config/env';
import { databasePoolOptions } from '@/server/config/database';

type DatabasePoolError = Error & { code?: unknown };

function classifyPoolError(error: DatabasePoolError) {
  switch (error.code) {
    case 'ECONNREFUSED':
      return 'connection_refused';
    case 'ECONNRESET':
    case 'EPIPE':
      return 'connection_reset';
    case 'ETIMEDOUT':
      return 'connection_timeout';
    case '57P01':
      return 'server_shutdown';
    default:
      return 'unknown';
  }
}

const createPool = () => {
  const databasePool = new Pool(
    databasePoolOptions({
      ...process.env,
      DATABASE_URL: getServerEnv().DATABASE_URL,
    }),
  );

  databasePool.on('error', (error: DatabasePoolError) => {
    console.error({
      event: 'database_pool_idle_error',
      classification: classifyPoolError(error),
    });
  });

  return databasePool;
};

const globalForDb = globalThis as typeof globalThis & {
  __guteliPool?: Pool;
};

const pool =
  process.env.NODE_ENV !== 'test'
    ? (globalForDb.__guteliPool ??= createPool())
    : createPool();

const db = drizzle({ client: pool });

export { db, pool };
