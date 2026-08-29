import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { categories, productImages, products } from '@/server/db/schema';
import { db, pool } from '@/server/db/client';
import {
  findPublicProductBySlug,
  findPublicProducts,
} from '@/server/products/repository';
import { listPublicProducts } from '@/server/products/list-public-products';
import { GET as getMedia } from '@/app/api/media/[...key]/route';
import { seedCatalog } from '../../scripts/seed';
import { requireTestDatabaseUrl } from '@/test/database-url';
import { LocalObjectStorage } from '@/server/storage/local-storage';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'public products integration tests',
);
let uploadsRoot: string;

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

describe('public product repository', () => {
  beforeAll(async () => {
    uploadsRoot = await mkdtemp('/tmp/guteli-public-products-');
    process.env.UPLOADS_ROOT = uploadsRoot;
    await resetDatabase();
    await seedCatalog(databaseUrl, new LocalObjectStorage(uploadsRoot));
  });

  afterAll(async () => {
    await pool.end();
    await rm(uploadsRoot, { recursive: true, force: true });
  });

  it('returns only active products in active categories, in deterministic order', async () => {
    const [hiddenCategory] = await db
      .insert(categories)
      .values({ name: 'Hidden', slug: 'hidden', active: false, sortOrder: 0 })
      .returning();
    await db.insert(products).values({
      categoryId: hiddenCategory.id,
      slug: 'hidden-product',
      name: 'Hidden product',
      priceMinor: 1,
      sortOrder: 0,
    });

    const [activeCategory] = await db
      .insert(categories)
      .values({ name: 'Earlier', slug: 'earlier', active: true, sortOrder: 0 })
      .returning();
    await db.insert(products).values({
      categoryId: activeCategory.id,
      slug: 'earlier-product',
      name: 'Earlier product',
      priceMinor: 2,
      sortOrder: 0,
    });
    await db.insert(products).values({
      categoryId: activeCategory.id,
      slug: 'inactive-product',
      name: 'Inactive product',
      priceMinor: 3,
      active: false,
      sortOrder: 1,
    });
    await db.insert(products).values({
      categoryId: activeCategory.id,
      slug: 'deleted-product',
      name: 'Deleted product',
      priceMinor: 4,
      deletedAt: new Date(),
      sortOrder: 2,
    });
    await db
      .update(categories)
      .set({ sortOrder: 1 })
      .where(eq(categories.slug, 'pretzels'));
    await db
      .update(categories)
      .set({ sortOrder: 2 })
      .where(eq(categories.slug, 'bagels'));
    await db
      .update(categories)
      .set({ sortOrder: 3 })
      .where(eq(categories.slug, 'burger-buns'));
    await db
      .update(categories)
      .set({ sortOrder: 4 })
      .where(eq(categories.slug, 'nuditos'));

    const productsResult = await findPublicProducts(
      db,
      new LocalObjectStorage(uploadsRoot),
    );
    expect(productsResult.map(({ slug }) => slug)).toEqual([
      'earlier-product',
      'pretzel-original',
      'pretzel-jalapeno',
      'pretzel-pepperoni',
      'pretzel-tomato-basil',
      'bagel-original',
      'bagel-jalapeno',
      'bagel-pepperoni',
      'bagel-tomato-basil',
      'burger-buns',
      'nuditos',
    ]);
    expect(
      productsResult.every(
        (product) =>
          Object.keys(product).sort().join(',') ===
          'category,id,imageUrl,name,priceMinor,saleUnit,slug,stockAvailable',
      ),
    ).toBe(true);
    expect(productsResult.find(({ slug }) => slug === 'nuditos')).toMatchObject(
      {
        stockAvailable: true,
        imageUrl: null,
      },
    );

    const categoriesResult = await listPublicProducts(
      db,
      new LocalObjectStorage(uploadsRoot),
    );
    expect(categoriesResult.categories.map(({ slug }) => slug)).toEqual([
      'earlier',
      'pretzels',
      'bagels',
      'burger-buns',
      'nuditos',
    ]);
    expect(
      categoriesResult.categories.flatMap(({ products }) => products),
    ).toHaveLength(11);
  });

  it('does not resolve hidden slugs and maps stock semantics and first image', async () => {
    const hidden = await findPublicProductBySlug(
      'inactive-product',
      db,
      new LocalObjectStorage(uploadsRoot),
    );
    expect(hidden).toBeNull();
    const deleted = await findPublicProductBySlug(
      'deleted-product',
      db,
      new LocalObjectStorage(uploadsRoot),
    );
    expect(deleted).toBeNull();
    const hiddenCategory = await findPublicProductBySlug(
      'hidden-product',
      db,
      new LocalObjectStorage(uploadsRoot),
    );
    expect(hiddenCategory).toBeNull();

    const [bagel] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, 'bagel-original'));
    await db
      .update(products)
      .set({ stockQuantity: 0 })
      .where(eq(products.id, bagel.id));
    const outOfStock = await findPublicProductBySlug(
      'bagel-original',
      db,
      new LocalObjectStorage(uploadsRoot),
    );
    expect(outOfStock?.stockAvailable).toBe(false);

    await db
      .update(products)
      .set({ active: false })
      .where(eq(products.slug, 'bagel-original'));
    const hiddenMedia = await getMedia(
      new Request(
        'http://localhost/api/media/catalog/v1/00000000-0000-4000-8000-000000000005.webp',
      ),
      {
        params: Promise.resolve({
          key: ['catalog', 'v1', '00000000-0000-4000-8000-000000000005.webp'],
        }),
      },
    );
    expect(hiddenMedia.status).toBe(404);

    const [pretzel] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, 'pretzel-original'));
    await db.insert(productImages).values({
      productId: pretzel.id,
      storageKey: 'catalog/v1/pretzel-original-second.webp',
      mimeType: 'image/webp',
      width: 1,
      height: 1,
      sortOrder: 1,
    });
    const firstImage = await findPublicProductBySlug(
      'pretzel-original',
      db,
      new LocalObjectStorage(uploadsRoot),
    );
    expect(firstImage?.imageUrl).toBe(
      '/api/media/catalog/v1/00000000-0000-4000-8000-000000000001.webp',
    );
  });
});
