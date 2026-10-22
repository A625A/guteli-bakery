import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import journal from '../../drizzle/meta/_journal.json';
vi.mock('server-only', () => ({}));
vi.mock('@/server/db/client', () => ({ pool: { query: vi.fn() } }));
import { pool } from '@/server/db/client';
import { GET } from '@/app/readyz/route';
const dirs: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true });
});
async function prepared() {
  const dir = await mkdtemp(join(tmpdir(), 'guteli-readyz-'));
  dirs.push(dir);
  vi.stubEnv('UPLOADS_ROOT', dir);
  vi.stubEnv('REQUIRE_PERSISTENT_STORAGE', 'true');
  await writeFile(join(dir, '.guteli-volume'), 'guteli-uploads-v1');
  vi.mocked(pool.query).mockResolvedValue({
    rows: [
      {
        migrations: journal.entries.length,
        latest: String(journal.entries.at(-1)?.when),
      },
    ],
  } as never);
  return dir;
}
describe('safe public readiness', () => {
  it('returns only availability for prepared schema and storage', async () => {
    await prepared();
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('fails closed for database outage without leaking diagnostics', async () => {
    await prepared();
    vi.mocked(pool.query).mockRejectedValue(
      new Error('CANARY_SECRET_DATABASE'),
    );
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
  });
  it('fails closed for missing migrations', async () => {
    await prepared();
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{ migrations: 0, latest: null }],
    } as never);
    expect((await GET()).status).toBe(503);
  });
  it('fails closed for missing storage marker', async () => {
    const dir = await prepared();
    await rm(join(dir, '.guteli-volume'));
    expect((await GET()).status).toBe(503);
  });
  it('does not create a missing uploads directory', async () => {
    const dir = await prepared();
    vi.stubEnv('UPLOADS_ROOT', join(dir, 'missing'));
    expect((await GET()).status).toBe(503);
  });
});
