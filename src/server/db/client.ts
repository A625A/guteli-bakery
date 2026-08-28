import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getServerEnv } from '@/server/config/env';

const DATABASE_CONNECTION_TIMEOUT_MS = 750;

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
  const databasePool = new Pool({
    connectionString: getServerEnv().DATABASE_URL,
    connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
  });

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
  process.env.NODE_ENV === 'development'
    ? (globalForDb.__guteliPool ??= createPool())
    : createPool();

const db = drizzle({ client: pool });

export { db, pool };
