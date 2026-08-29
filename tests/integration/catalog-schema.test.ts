import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { categories, productImages, products } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'catalog schema integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

describe('catalog schema', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('persists catalog rows and enforces catalog constraints', async () => {
    const [category] = await db
      .insert(categories)
      .values({ name: 'Pretzels', slug: 'pretzels' })
      .returning();

    expect(category).toMatchObject({
      name: 'Pretzels',
      slug: 'pretzels',
      active: true,
      sortOrder: 0,
    });
    expect(category.id).toEqual(expect.any(String));
    expect(category.createdAt).toBeInstanceOf(Date);
    expect(category.updatedAt).toBeInstanceOf(Date);

    const [product] = await db
      .insert(products)
      .values({
        categoryId: category.id,
        slug: 'pretzel-original',
        name: 'Pretzel Original',
        description: 'Pretzel horneado.',
        saleUnit: 'Unidad',
        sku: 'PRETZEL-ORIGINAL',
        priceMinor: 6000,
        stockQuantity: null,
        featured: true,
        sortOrder: 0,
      })
      .returning();

    expect(product).toMatchObject({
      categoryId: category.id,
      slug: 'pretzel-original',
      description: 'Pretzel horneado.',
      saleUnit: 'Unidad',
      sku: 'PRETZEL-ORIGINAL',
      priceMinor: 6000,
      stockQuantity: null,
      active: true,
      featured: true,
      sortOrder: 0,
      deletedAt: null,
    });
    expect(product.createdAt).toBeInstanceOf(Date);
    expect(product.updatedAt).toBeInstanceOf(Date);

    const [image] = await db
      .insert(productImages)
      .values({
        productId: product.id,
        storageKey: 'catalog/pretzel-original.webp',
        mimeType: 'image/webp',
        width: 1200,
        height: 1200,
        sortOrder: 0,
      })
      .returning();

    expect(image).toMatchObject({
      productId: product.id,
      storageKey: 'catalog/pretzel-original.webp',
      mimeType: 'image/webp',
      width: 1200,
      height: 1200,
      sortOrder: 0,
    });
    expect(image.createdAt).toBeInstanceOf(Date);
    expect(image.updatedAt).toBeInstanceOf(Date);

    await expect(
      db
        .insert(categories)
        .values({ name: 'Another Pretzel', slug: 'pretzels' }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });

    await expect(
      db.insert(products).values({
        categoryId: category.id,
        slug: 'pretzel-original',
        name: 'Duplicate Pretzel',
        priceMinor: 6000,
      }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });

    await expect(
      db.insert(products).values({
        categoryId: category.id,
        slug: 'negative-price',
        name: 'Negative Price',
        priceMinor: -1,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(products).values({
        categoryId: category.id,
        slug: 'negative-stock',
        name: 'Negative Stock',
        priceMinor: 1,
        stockQuantity: -1,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      // The image proves product deletion uses the default NO ACTION behavior.
      db.delete(products).where(eq(products.id, product.id)),
    ).rejects.toMatchObject({ cause: { code: '23503' } });

    await expect(
      // The product proves category deletion uses the default NO ACTION behavior.
      db.delete(categories).where(eq(categories.id, category.id)),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
  });
});
