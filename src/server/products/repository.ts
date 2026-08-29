import { and, asc, eq, isNull } from 'drizzle-orm';

import { categories, productImages, products } from '@/server/db/schema';
import { createObjectStorage } from '@/server/storage';
import type { ObjectStorage } from '@/server/storage';
import type { PublicProductDto } from './types';

type CatalogDatabase = typeof import('@/server/db/client').db;

async function getDatabase(database?: CatalogDatabase) {
  return database ?? (await import('@/server/db/client')).db;
}

const publicProductSelection = {
  productId: products.id,
  productSlug: products.slug,
  productName: products.name,
  priceMinor: products.priceMinor,
  saleUnit: products.saleUnit,
  stockQuantity: products.stockQuantity,
  categoryId: categories.id,
  categorySlug: categories.slug,
  categoryName: categories.name,
  imageStorageKey: productImages.storageKey,
  imageMimeType: productImages.mimeType,
};

const publicProductFilters = and(
  eq(products.active, true),
  isNull(products.deletedAt),
  eq(categories.active, true),
);

type PublicProductRow = {
  productId: string;
  productSlug: string;
  productName: string;
  priceMinor: number;
  saleUnit: string | null;
  stockQuantity: number | null;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  imageStorageKey: string | null;
  imageMimeType: string | null;
};

function toPublicProduct(
  row: PublicProductRow,
  storage: ObjectStorage,
): PublicProductDto {
  return {
    id: row.productId,
    slug: row.productSlug,
    name: row.productName,
    category: {
      id: row.categoryId,
      slug: row.categorySlug,
      name: row.categoryName,
    },
    priceMinor: row.priceMinor,
    saleUnit: row.saleUnit,
    stockAvailable: row.stockQuantity === null || row.stockQuantity > 0,
    imageUrl: row.imageStorageKey
      ? storage.publicUrl(row.imageStorageKey)
      : null,
  };
}

function mapRows(rows: PublicProductRow[], storage: ObjectStorage) {
  const mapped = new Map<string, PublicProductDto>();
  for (const row of rows) {
    if (!mapped.has(row.productId)) {
      mapped.set(row.productId, toPublicProduct(row, storage));
    }
  }
  return [...mapped.values()];
}

export async function findPublicProducts(
  database?: CatalogDatabase,
  storage: ObjectStorage = createObjectStorage(),
): Promise<readonly PublicProductDto[]> {
  const connection = await getDatabase(database);
  const rows = await connection
    .select(publicProductSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .where(publicProductFilters)
    .orderBy(
      asc(categories.sortOrder),
      asc(categories.id),
      asc(products.sortOrder),
      asc(products.id),
      asc(productImages.sortOrder),
      asc(productImages.id),
    );
  return mapRows(rows, storage);
}

export async function findPublicProductBySlug(
  slug: string,
  database?: CatalogDatabase,
  storage: ObjectStorage = createObjectStorage(),
): Promise<PublicProductDto | null> {
  const connection = await getDatabase(database);
  const rows = await connection
    .select(publicProductSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .where(and(publicProductFilters, eq(products.slug, slug)))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  return mapRows(rows, storage)[0] ?? null;
}

export type PublicMediaRecord = Readonly<{
  storageKey: string;
  mimeType: string;
}>;

export async function findPublicMedia(
  storageKey: string,
  database?: CatalogDatabase,
): Promise<PublicMediaRecord | null> {
  const connection = await getDatabase(database);
  const [row] = await connection
    .select({
      storageKey: productImages.storageKey,
      mimeType: productImages.mimeType,
    })
    .from(productImages)
    .innerJoin(products, eq(productImages.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(productImages.storageKey, storageKey),
        eq(products.active, true),
        isNull(products.deletedAt),
        eq(categories.active, true),
      ),
    )
    .limit(1);
  return row ?? null;
}
