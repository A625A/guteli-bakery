import { access, constants, lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import journal from '../../../drizzle/meta/_journal.json';
import { privateHeaders } from '@/server/privacy/headers';

export const dynamic = 'force-dynamic';

/** Public readiness never exposes component names, paths, credentials or exceptions. */
export async function GET() {
  try {
    const { pool } = await import('@/server/db/client');
    const query = {
      text: 'select count(*)::int as migrations, max(created_at)::text as latest from drizzle.__drizzle_migrations',
      query_timeout: 1000,
    };
    const result = await pool.query(query);
    if (
      result.rows[0]?.migrations !== journal.entries.length ||
      result.rows[0]?.latest !== String(journal.entries.at(-1)?.when)
    )
      throw new Error();
    await pool.query({
      text: 'select 1 from operational_checks limit 1',
      ...{ query_timeout: 1000 },
    });
    const root = process.env.UPLOADS_ROOT;
    if (!root) throw new Error();
    const info = await lstat(root);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error();
    await access(root, constants.R_OK | constants.W_OK | constants.X_OK);
    if (
      process.env.REQUIRE_PERSISTENT_STORAGE === 'true' &&
      (await readFile(join(root, '.guteli-volume'), 'utf8')).trim() !==
        'guteli-uploads-v1'
    )
      throw new Error();
    return Response.json({ status: 'ok' }, { headers: privateHeaders });
  } catch {
    return Response.json(
      { status: 'unavailable' },
      { status: 503, headers: privateHeaders },
    );
  }
}
