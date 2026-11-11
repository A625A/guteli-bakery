import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { CATALOG_MUTATION_LOCK } from '@/server/products/catalog-mutation-lock';
import { findPublicProducts } from '@/server/products/repository';
import { LocalObjectStorage } from '@/server/storage/local-storage';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'catalog concurrency integration tests',
);
const readerPool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  lock_timeout: 500,
  statement_timeout: 2_000,
});
const blockerPool = new Pool({ connectionString: databaseUrl, max: 1 });
const database = drizzle({ client: readerPool });
const storage = new LocalObjectStorage(
  '/private/tmp/guteli-catalog-concurrency',
);

describe('public catalog concurrency', () => {
  beforeAll(async () => {
    await readerPool.query('DROP SCHEMA public CASCADE');
    await readerPool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await readerPool.query('CREATE SCHEMA public');
    await migrate(database, {
      migrationsFolder: join(process.cwd(), 'drizzle'),
    });
  });

  afterAll(async () => {
    await Promise.all([readerPool.end(), blockerPool.end()]);
  });

  it('allows a catalog read while another catalog reader holds its lock', async () => {
    const blocker = await blockerPool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT pg_advisory_xact_lock_shared($1::bigint)', [
        CATALOG_MUTATION_LOCK,
      ]);

      await expect(findPublicProducts(database, storage)).resolves.toEqual([]);
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }
  });

  it('waits for an exclusive catalog writer before reading products', async () => {
    const blocker = await blockerPool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT pg_advisory_xact_lock($1::bigint)', [
        CATALOG_MUTATION_LOCK,
      ]);

      await expect(findPublicProducts(database, storage)).rejects.toMatchObject(
        {
          cause: { code: '55P03' },
        },
      );
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }

    await expect(findPublicProducts(database, storage)).resolves.toEqual([]);
  });
});
