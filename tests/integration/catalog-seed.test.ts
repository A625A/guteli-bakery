import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { asc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { categories, productImages, products } from '@/server/db/schema';
import { seedCatalog } from '../../scripts/seed';
import { requireTestDatabaseUrl } from '@/test/database-url';
import { LocalObjectStorage } from '@/server/storage/local-storage';
import type { ObjectStorage } from '@/server/storage/types';

const execFileAsync = promisify(execFile);
const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'catalog seed integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
let uploadsRoot: string;

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

async function runSeed() {
  await execFileAsync('npm', ['run', 'db:seed'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DATABASE_URL_TEST: databaseUrl,
      UPLOADS_ROOT: uploadsRoot,
    },
  });
}

describe('catalog seed and local storage', () => {
  beforeAll(async () => {
    uploadsRoot = await mkdtemp('/tmp/guteli-catalog-seed-');
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
    await rm(uploadsRoot, { recursive: true, force: true });
  });

  it('seeds the exact approved catalog idempotently', async () => {
    await runSeed();
    const firstCategories = await db
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.sortOrder));
    const firstProducts = await db
      .select({
        id: products.id,
        slug: products.slug,
        priceMinor: products.priceMinor,
        saleUnit: products.saleUnit,
      })
      .from(products)
      .orderBy(asc(products.sortOrder));
    const firstImages = await db
      .select({
        productId: productImages.productId,
        storageKey: productImages.storageKey,
      })
      .from(productImages);

    await runSeed();
    const secondCategories = await db
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.sortOrder));
    const secondProducts = await db
      .select({
        id: products.id,
        slug: products.slug,
        priceMinor: products.priceMinor,
        saleUnit: products.saleUnit,
      })
      .from(products)
      .orderBy(asc(products.sortOrder));
    const secondImages = await db
      .select({
        productId: productImages.productId,
        storageKey: productImages.storageKey,
      })
      .from(productImages);

    expect(firstCategories).toHaveLength(4);
    expect(firstProducts).toHaveLength(10);
    expect(firstImages).toHaveLength(9);
    expect(secondCategories).toEqual(firstCategories);
    expect(secondProducts).toEqual(firstProducts);
    expect(secondImages).toEqual(firstImages);
    expect(firstCategories.map(({ id }) => id)).toEqual([
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000103',
      '00000000-0000-4000-8000-000000000104',
    ]);
    expect(firstProducts.map(({ id }) => id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-000000000007',
      '00000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-000000000009',
      '00000000-0000-4000-8000-000000000010',
    ]);
    expect(firstProducts.map(({ priceMinor }) => priceMinor)).toEqual([
      6000, 7500, 7500, 7500, 6000, 7500, 7500, 7500, 5500, 6000,
    ]);
    expect(firstProducts.map(({ saleUnit }) => saleUnit)).toEqual([
      'Bolsa de 5',
      'Bolsa de 5',
      'Bolsa de 5',
      'Bolsa de 5',
      null,
      null,
      null,
      'Bolsa de 5',
      null,
      'Bolsa de 15',
    ]);

    const storedFiles = await Promise.all(
      firstImages.map(async ({ storageKey }) => {
        const object = await readFile(join(uploadsRoot, storageKey));
        return { storageKey, bytes: object.byteLength };
      }),
    );
    expect(storedFiles).toHaveLength(9);
    expect(storedFiles.every(({ bytes }) => bytes > 0)).toBe(true);
    expect(
      firstImages.every(({ storageKey }) =>
        storageKey.startsWith('catalog/v1/'),
      ),
    ).toBe(true);
  });

  it('rejects unsafe keys and does not overwrite existing objects', async () => {
    const storage = new LocalObjectStorage(uploadsRoot);
    await expect(
      storage.putIfMissing('../outside.webp', Buffer.from('bad')),
    ).rejects.toThrow();
    await expect(
      storage.putIfMissing('/outside.webp', Buffer.from('bad')),
    ).rejects.toThrow();
    await expect(
      storage.putIfMissing('nested\\outside.webp', Buffer.from('bad')),
    ).rejects.toThrow();
    await expect(
      storage.putIfMissing('nested/../../outside.webp', Buffer.from('bad')),
    ).rejects.toThrow();

    await expect(
      storage.putIfMissing('atomic/object.webp', Buffer.from('first')),
    ).resolves.toBe(true);
    await expect(
      storage.putIfMissing('atomic/object.webp', Buffer.from('second')),
    ).resolves.toBe(false);
    await expect(storage.read('atomic/object.webp')).resolves.toEqual(
      Buffer.from('first'),
    );
    const concurrentResults = await Promise.all([
      storage.putIfMissing('atomic/concurrent.webp', Buffer.from('one')),
      storage.putIfMissing('atomic/concurrent.webp', Buffer.from('two')),
    ]);
    expect(concurrentResults.sort()).toEqual([false, true]);
    const concurrentObject = await storage.read('atomic/concurrent.webp');
    expect(
      concurrentObject?.equals(Buffer.from('one')) ||
        concurrentObject?.equals(Buffer.from('two')),
    ).toBe(true);
    expect(storage.publicUrl('atomic/object.webp')).toBe(
      '/api/media/atomic/object.webp',
    );
    expect(storage.publicUrl('atomic/object.webp')).not.toContain(uploadsRoot);
  });

  it('rolls back database rows when storage fails', async () => {
    await resetDatabase();
    const failingStorage: ObjectStorage = {
      putIfMissing: async () => {
        throw new Error('storage unavailable');
      },
      read: async () => null,
      publicUrl: (key: string) => `/api/media/${key}`,
    };

    await expect(seedCatalog(databaseUrl, failingStorage)).rejects.toThrow(
      'storage unavailable',
    );
    await expect(db.select().from(categories)).resolves.toHaveLength(0);
    await expect(db.select().from(products)).resolves.toHaveLength(0);
    await expect(db.select().from(productImages)).resolves.toHaveLength(0);
  });
});
