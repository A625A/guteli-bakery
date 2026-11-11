import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import journal from '../../drizzle/meta/_journal.json';
import snapshot from '../../drizzle/meta/0017_snapshot.json';
import { requireTestDatabaseUrl } from '@/test/database-url';

const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'migration verification',
  ),
});
const db = drizzle({ client: pool });
beforeAll(async () => {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
});
afterAll(() => pool.end());

it('installs all 18 migrations in order, verifies hashes and reruns without changes', async () => {
  expect(journal.entries.map((e) => e.idx)).toEqual(
    Array.from({ length: 18 }, (_, i) => i),
  );
  const { rows } = await pool.query(
    'select hash, created_at from drizzle.__drizzle_migrations order by id',
  );
  expect(rows).toHaveLength(journal.entries.length);
  for (const [i, entry] of journal.entries.entries()) {
    const contents = await readFile(
      join('drizzle', `${entry.tag}.sql`),
      'utf8',
    );
    expect(rows[i].hash).toBe(
      createHash('sha256').update(contents).digest('hex'),
    );
    expect(String(rows[i].created_at)).toBe(String(entry.when));
    if (i) expect(entry.when).toBeGreaterThan(journal.entries[i - 1].when);
  }
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
  expect(
    (
      await pool.query(
        'select hash, created_at from drizzle.__drizzle_migrations order by id',
      )
    ).rows,
  ).toEqual(rows);
});

it('matches every table, column, foreign key, unique/check constraint, index and enum in the final snapshot', async () => {
  const tables = await pool.query(
    "select tablename from pg_tables where schemaname = 'public'",
  );
  expect(tables.rows.map((r) => r.tablename).sort()).toEqual(
    Object.values(snapshot.tables)
      .map((t) => t.name)
      .sort(),
  );
  for (const table of Object.values(snapshot.tables)) {
    const columns = await pool.query(
      'select column_name, is_nullable from information_schema.columns where table_schema = $1 and table_name = $2',
      ['public', table.name],
    );
    expect(columns.rows.map((r) => r.column_name).sort(), table.name).toEqual(
      Object.keys(table.columns).sort(),
    );
    for (const column of Object.values(table.columns)) {
      expect(
        columns.rows.find((r) => r.column_name === column.name)?.is_nullable,
        `${table.name}.${column.name}`,
      ).toBe(column.notNull ? 'NO' : 'YES');
    }
    const constraints = await pool.query(
      'select conname, convalidated from pg_constraint where conrelid = $1::regclass',
      [`public.${table.name}`],
    );
    for (const name of [
      ...Object.keys(table.foreignKeys),
      ...Object.keys(table.uniqueConstraints),
      ...Object.keys(table.checkConstraints),
    ]) {
      // PostgreSQL truncates ASCII identifiers to NAMEDATALEN - 1 (63 bytes).
      expect(
        constraints.rows.find((r) => r.conname === name.slice(0, 63)),
        name,
      ).toMatchObject({ convalidated: true });
    }
    const indexes = await pool.query(
      'select c.relname as name, i.indisvalid from pg_index i join pg_class c on c.oid = i.indexrelid where i.indrelid = $1::regclass',
      [`public.${table.name}`],
    );
    for (const name of Object.keys(table.indexes))
      expect(
        indexes.rows.find((r) => r.name === name),
        name,
      ).toMatchObject({ indisvalid: true });
  }
  for (const type of Object.values(snapshot.enums)) {
    const labels = await pool.query(
      'select enumlabel from pg_enum where enumtypid = $1::regtype order by enumsortorder',
      [`public.${type.name}`],
    );
    expect(labels.rows.map((r) => r.enumlabel)).toEqual(type.values);
  }
});

it('makes the empty storefront query succeed without seeding or provisioning accounts', async () => {
  const { listPublicProducts } =
    await import('@/server/products/list-public-products');
  const { LocalObjectStorage } = await import('@/server/storage/local-storage');
  const result = await listPublicProducts(
    db,
    new LocalObjectStorage('/tmp/guteli-empty-schema-media'),
  );
  expect(result.categories).toEqual([]);
  expect(
    Number((await pool.query('select count(*) from "user"')).rows[0].count),
  ).toBe(0);
});
