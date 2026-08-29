import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { resolveUploadsRoot } from '@/server/config/uploads-root';
import { categories, productImages, products } from '@/server/db/schema';
import {
  catalogSeedCategories,
  catalogSeedProducts,
} from '@/server/products/seed-data';
import { LocalObjectStorage } from '@/server/storage/local-storage';
import type { ObjectStorage } from '@/server/storage/types';

const IMAGE_DIMENSION = 720;
const IMAGE_IDS = [
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-000000001002',
  '00000000-0000-4000-8000-000000001003',
  '00000000-0000-4000-8000-000000001004',
  '00000000-0000-4000-8000-000000001005',
  '00000000-0000-4000-8000-000000001006',
  '00000000-0000-4000-8000-000000001007',
  '00000000-0000-4000-8000-000000001008',
  '00000000-0000-4000-8000-000000001009',
] as const;

export async function seedCatalog(databaseUrl: string, storage: ObjectStorage) {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool });

  try {
    await db.transaction(async (tx) => {
      for (const category of catalogSeedCategories) {
        await tx
          .insert(categories)
          .values(category)
          .onConflictDoUpdate({
            target: categories.id,
            set: {
              name: category.name,
              slug: category.slug,
              active: true,
              sortOrder: category.sortOrder,
            },
          });
      }

      let imageIndex = 0;
      for (const [productIndex, product] of catalogSeedProducts.entries()) {
        await tx
          .insert(products)
          .values({
            id: product.id,
            categoryId: product.categoryId,
            slug: product.slug,
            name: product.name,
            description: '',
            saleUnit: product.saleUnit,
            sku: null,
            priceMinor: product.priceMinor,
            stockQuantity: null,
            active: true,
            featured: false,
            sortOrder: productIndex,
            deletedAt: null,
          })
          .onConflictDoUpdate({
            target: products.id,
            set: {
              categoryId: product.categoryId,
              slug: product.slug,
              name: product.name,
              description: '',
              saleUnit: product.saleUnit,
              sku: null,
              priceMinor: product.priceMinor,
              stockQuantity: null,
              active: true,
              featured: false,
              sortOrder: productIndex,
              deletedAt: null,
            },
          });

        if (!product.imageFile) continue;

        const storageKey = `catalog/v1/${product.id}.webp`;
        const sourcePath = join(
          process.cwd(),
          'public/images/products',
          product.imageFile,
        );
        const bytes = await readFile(sourcePath);
        await storage.putIfMissing(storageKey, bytes, {
          contentType: 'image/webp',
        });
        await tx
          .insert(productImages)
          .values({
            id: IMAGE_IDS[imageIndex],
            productId: product.id,
            storageKey,
            mimeType: 'image/webp',
            width: IMAGE_DIMENSION,
            height: IMAGE_DIMENSION,
            sortOrder: 0,
          })
          .onConflictDoUpdate({
            target: productImages.storageKey,
            set: {
              productId: product.id,
              mimeType: 'image/webp',
              width: IMAGE_DIMENSION,
              height: IMAGE_DIMENSION,
              sortOrder: 0,
            },
          });
        imageIndex += 1;
      }
    });
  } finally {
    await pool.end();
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL is required to seed the catalog.');
  }
  await seedCatalog(databaseUrl, new LocalObjectStorage(resolveUploadsRoot()));
}

if (process.argv[1]?.endsWith('/scripts/seed.ts')) {
  void main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Catalog seed failed.',
    );
    process.exitCode = 1;
  });
}
