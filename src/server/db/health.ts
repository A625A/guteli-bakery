import 'server-only';

import { pool } from '@/server/db/client';

export async function checkDatabaseConnection() {
  await pool.query('select 1');

  return { database: 'up' as const };
}
