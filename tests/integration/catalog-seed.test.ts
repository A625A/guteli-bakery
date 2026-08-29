import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  lstat,
  chmod,
  symlink,
  unlink,
} from 'node:fs/promises';
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
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder));
    const firstProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceMinor: products.priceMinor,
        saleUnit: products.saleUnit,
      })
      .from(products)
      .orderBy(asc(products.sortOrder));
    const firstImages = await db
      .select({
        id: productImages.id,
        productId: productImages.productId,
        storageKey: productImages.storageKey,
      })
      .from(productImages);

    await runSeed();
    const secondCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder));
    const secondProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceMinor: products.priceMinor,
        saleUnit: products.saleUnit,
      })
      .from(products)
      .orderBy(asc(products.sortOrder));
    const secondImages = await db
      .select({
        id: productImages.id,
        productId: productImages.productId,
        storageKey: productImages.storageKey,
      })
      .from(productImages);

    expect(firstCategories).toHaveLength(4);
    expect(firstProducts).toHaveLength(10);
    expect(firstImages).toHaveLength(9);
    expect(firstImages.map(({ id }) => id).sort()).toEqual([
      '00000000-0000-4000-8000-000000001001',
      '00000000-0000-4000-8000-000000001002',
      '00000000-0000-4000-8000-000000001003',
      '00000000-0000-4000-8000-000000001004',
      '00000000-0000-4000-8000-000000001005',
      '00000000-0000-4000-8000-000000001006',
      '00000000-0000-4000-8000-000000001007',
      '00000000-0000-4000-8000-000000001008',
      '00000000-0000-4000-8000-000000001009',
    ]);
    expect(secondCategories).toEqual(firstCategories);
    expect(secondProducts).toEqual(firstProducts);
    expect(secondImages).toEqual(firstImages);
    expect(firstCategories.map(({ id }) => id)).toEqual([
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000103',
      '00000000-0000-4000-8000-000000000104',
    ]);
    expect(firstCategories.map(({ name }) => name)).toEqual([
      'Pretzels',
      'Bagels',
      'Burger buns',
      'Nuditos',
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
    expect(firstProducts.map(({ name }) => name)).toEqual([
      'Originales',
      'Queso y jalapeño',
      'Queso y pepperoni',
      'Tomate y albahaca',
      'Originales',
      'Queso y jalapeño',
      'Queso y pepperoni',
      'Tomate y albahaca',
      'Burger buns',
      'Nuditos',
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
        const object = await new LocalObjectStorage(uploadsRoot).read(
          storageKey,
        );
        return { storageKey, bytes: object?.byteLength ?? 0 };
      }),
    );
    expect(storedFiles).toHaveLength(9);
    expect(storedFiles.every(({ bytes }) => bytes > 0)).toBe(true);
    const storedModes = await Promise.all(
      firstImages.map(async ({ storageKey }) => {
        const leaf = join(
          uploadsRoot,
          createHash('sha256').update(storageKey).digest('hex'),
        );
        const stats = await lstat(leaf);
        return stats.mode & 0o777;
      }),
    );
    expect(storedModes).toEqual(Array.from({ length: 9 }, () => 0o644));
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
    const objectLeaf = join(
      uploadsRoot,
      createHash('sha256').update('atomic/object.webp').digest('hex'),
    );
    await chmod(objectLeaf, 0o600);
    await expect(
      storage.putIfMissing('atomic/object.webp', Buffer.from('second')),
    ).resolves.toBe(false);
    await expect(storage.read('atomic/object.webp')).resolves.toEqual(
      Buffer.from('first'),
    );
    await expect(lstat(objectLeaf)).resolves.toMatchObject({ mode: 0o100644 });
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

    const rootEntries = await readdir(uploadsRoot);
    expect(rootEntries.some((entry) => entry.endsWith('.tmp'))).toBe(false);
  });

  it('publishes brand-new objects as readable even under a restrictive umask', async () => {
    const storage = new LocalObjectStorage(uploadsRoot);
    const key = 'atomic/restrictive-umask.webp';
    const leaf = join(
      uploadsRoot,
      createHash('sha256').update(key).digest('hex'),
    );
    const originalUmask = process.umask(0o077);

    try {
      await expect(
        storage.putIfMissing(key, Buffer.from('readable')),
      ).resolves.toBe(true);
      const stats = await lstat(leaf);
      expect(stats.mode & 0o777).toBe(0o644);
    } finally {
      process.umask(originalUmask);
    }
  });

  it('does not follow intermediate or leaf symlinks', async () => {
    const storage = new LocalObjectStorage(uploadsRoot);
    const outsideRoot = await mkdtemp('/tmp/guteli-storage-outside-');
    const outsideFile = join(outsideRoot, 'outside.webp');
    const intermediate = join(uploadsRoot, 'link');
    await symlink(outsideRoot, intermediate);

    await expect(
      storage.putIfMissing('link/escaped.webp', Buffer.from('safe')),
    ).resolves.toBe(true);
    await expect(storage.read('link/escaped.webp')).resolves.toEqual(
      Buffer.from('safe'),
    );
    await expect(
      readFile(join(outsideRoot, 'escaped.webp')),
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });

    const key = 'atomic/leaf.webp';
    const leaf = join(
      uploadsRoot,
      createHash('sha256').update(key).digest('hex'),
    );
    await storage.putIfMissing(key, Buffer.from('original'));
    await unlink(leaf);
    await symlink(outsideFile, leaf);
    await expect(
      storage.putIfMissing(key, Buffer.from('overwrite')),
    ).rejects.toThrow();
    await expect(storage.read(key)).rejects.toThrow();
    await rm(outsideRoot, { recursive: true, force: true });
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
