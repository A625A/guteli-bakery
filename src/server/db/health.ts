import 'server-only';

import { pool } from '@/server/db/client';

const DATABASE_HEALTH_QUERY_TIMEOUT_MS = 750;
const DATABASE_HEALTH_QUERY = {
  text: 'select 1',
  query_timeout: DATABASE_HEALTH_QUERY_TIMEOUT_MS,
};

export async function checkDatabaseConnection() {
  const client = await pool.connect();

  try {
    await client.query(DATABASE_HEALTH_QUERY);
    client.release();
  } catch (error) {
    client.release(true);
    throw error;
  }

  return { database: 'up' as const };
}
