import 'server-only';

import { randomUUID } from 'node:crypto';

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { requireAdmin } from '@/server/auth/authorize';
import {
  assertRecentReauthentication,
  MAX_REAUTHENTICATION_AGE_SECONDS,
} from '@/server/auth/reauth';
import { db } from '@/server/db/client';
import {
  auditLogs,
  categories,
  imageCleanupJobs,
  productImages,
  products,
} from '@/server/db/schema';
import { createHmacSubject } from '@/server/security/client-subject';
import { consumeFixedWindowRateLimit } from '@/server/security/rate-limit';
import { requireTrustedMutationOrigin } from '@/server/security/origin';
import type { ObjectStorage } from '@/server/storage';

import {
  AdminProductError,
  revalidateCatalogActorAfterLock,
  type AdminProductDto,
} from './admin-products';
import { acquireCatalogMutationLock } from './catalog-mutation-lock';

type CatalogTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type CleanupRecord = Readonly<{ id: string; storageKey: string }>;

const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 15 * 60 * 1000;

export type ProductImageErrorCode =
  'PRODUCT_IMAGE_NOT_FOUND' | 'IMAGE_STORAGE_UNAVAILABLE' | 'RATE_LIMITED';

export class ProductImageError extends Error {
  readonly code: ProductImageErrorCode;
  readonly retryAfterSeconds?: number;

  constructor(code: ProductImageErrorCode, retryAfterSeconds?: number) {
    super(code);
    this.name = 'ProductImageError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const productSelection = {
  id: products.id,
  categoryId: products.categoryId,
  categoryName: categories.name,
  name: products.name,
  slug: products.slug,
  description: products.description,
  saleUnit: products.saleUnit,
  sku: products.sku,
  priceMinor: products.priceMinor,
  stockQuantity: products.stockQuantity,
  active: products.active,
  featured: products.featured,
  sortOrder: products.sortOrder,
  version: products.version,
  deletedAt: products.deletedAt,
};

type ProductRow = Omit<AdminProductDto, 'deletedAt' | 'images'> & {
  deletedAt: Date | null;
};

async function lockProduct(transaction: CatalogTransaction, productId: string) {
  const [product] = await transaction
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, productId))
    .for('update')
    .limit(1);
  if (!product || product.deletedAt)
    throw new AdminProductError('PRODUCT_NOT_FOUND');
  return product;
}

async function activeImages(
  transaction: CatalogTransaction,
  productId: string,
) {
  return transaction
    .select({
      id: productImages.id,
      storageKey: productImages.storageKey,
      mimeType: productImages.mimeType,
      width: productImages.width,
      height: productImages.height,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(
      and(
        eq(productImages.productId, productId),
        isNull(productImages.removedAt),
      ),
    )
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
}

function toDto(
  product: ProductRow,
  images: Awaited<ReturnType<typeof activeImages>>,
): AdminProductDto {
  return {
    id: product.id,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    name: product.name,
    slug: product.slug,
    description: product.description,
    saleUnit: product.saleUnit,
    sku: product.sku,
    priceMinor: product.priceMinor,
    stockQuantity: product.stockQuantity,
    active: product.active,
    featured: product.featured,
    sortOrder: product.sortOrder,
    version: product.version,
    deletedAt: product.deletedAt?.toISOString() ?? null,
    images,
  };
}

async function writeImageAudit(
  transaction: CatalogTransaction,
  input: Readonly<{
    actorId: string;
    productId: string;
    imageId: string;
    action: 'PRODUCT_IMAGE_ADDED' | 'PRODUCT_IMAGE_REMOVED';
    requestId: string;
    version: number;
    width?: number;
    height?: number;
  }>,
) {
  await transaction.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: 'PRODUCT_IMAGE',
    entityId: input.imageId,
    requestId: input.requestId,
    metadata: {
      productId: input.productId,
      version: input.version,
      ...(input.width && input.height
        ? { mimeType: 'image/webp', width: input.width, height: input.height }
        : {}),
    },
  });
}

async function persistCleanupFailure(record: CleanupRecord) {
  await db
    .update(productImages)
    .set({
      cleanupAttempts: sql`${productImages.cleanupAttempts} + 1`,
      lastCleanupErrorCode: 'OBJECT_DELETE_FAILED',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productImages.id, record.id),
        eq(productImages.cleanupPending, true),
      ),
    )
    .catch(() => undefined);
}

async function enqueueCompensationCleanup(storageKey: string) {
  const now = new Date();
  await db
    .insert(imageCleanupJobs)
    .values({
      storageKey,
      cleanupAttempts: 1,
      lastCleanupErrorCode: 'OBJECT_DELETE_FAILED',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: imageCleanupJobs.storageKey,
      set: {
        cleanupAttempts: sql`${imageCleanupJobs.cleanupAttempts} + 1`,
        lastCleanupErrorCode: 'OBJECT_DELETE_FAILED',
        updatedAt: now,
      },
    });
}

export async function retryPendingImageCleanup(
  storage: ObjectStorage,
  limit = 5,
) {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 0), 25);
  if (boundedLimit === 0) return { completed: 0, failed: 0 } as const;
  const pending = await db
    .select({ id: imageCleanupJobs.id })
    .from(imageCleanupJobs)
    .orderBy(asc(imageCleanupJobs.updatedAt), asc(imageCleanupJobs.id))
    .limit(boundedLimit);
  let completed = 0;
  let failed = 0;

  for (const candidate of pending) {
    const outcome = await db.transaction(async (transaction) => {
      await acquireCatalogMutationLock(transaction);
      const [job] = await transaction
        .select({
          id: imageCleanupJobs.id,
          storageKey: imageCleanupJobs.storageKey,
        })
        .from(imageCleanupJobs)
        .where(eq(imageCleanupJobs.id, candidate.id))
        .for('update')
        .limit(1);
      if (!job) return 'missing' as const;
      const [activeReference] = await transaction
        .select({ id: productImages.id })
        .from(productImages)
        .where(
          and(
            eq(productImages.storageKey, job.storageKey),
            isNull(productImages.removedAt),
          ),
        )
        .for('update')
        .limit(1);
      if (activeReference) {
        await transaction
          .delete(imageCleanupJobs)
          .where(eq(imageCleanupJobs.id, job.id));
        return 'completed' as const;
      }
      try {
        await storage.delete(job.storageKey);
      } catch {
        await transaction
          .update(imageCleanupJobs)
          .set({
            cleanupAttempts: sql`${imageCleanupJobs.cleanupAttempts} + 1`,
            lastCleanupErrorCode: 'OBJECT_DELETE_FAILED',
            updatedAt: new Date(),
          })
          .where(eq(imageCleanupJobs.id, job.id));
        return 'failed' as const;
      }
      await transaction
        .delete(imageCleanupJobs)
        .where(eq(imageCleanupJobs.id, job.id));
      return 'completed' as const;
    });
    if (outcome === 'completed') completed += 1;
    if (outcome === 'failed') failed += 1;
  }
  return { completed, failed } as const;
}

export async function cleanupRemovedProductImages(
  records: readonly CleanupRecord[],
  storage: ObjectStorage,
) {
  for (const record of records) {
    try {
      await db.transaction(async (transaction) => {
        await acquireCatalogMutationLock(transaction);
        const [activeReference] = await transaction
          .select({ id: productImages.id })
          .from(productImages)
          .where(
            and(
              eq(productImages.storageKey, record.storageKey),
              isNull(productImages.removedAt),
            ),
          )
          .for('update')
          .limit(1);
        if (!activeReference) await storage.delete(record.storageKey);
        await transaction
          .update(productImages)
          .set({
            cleanupPending: false,
            cleanupCompletedAt: new Date(),
            lastCleanupErrorCode: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(productImages.id, record.id),
              eq(productImages.cleanupPending, true),
            ),
          );
      });
    } catch {
      await persistCleanupFailure(record);
    }
  }
}

async function newObject(
  storage: ObjectStorage,
  body: Buffer,
): Promise<{ storageKey: string; created: true }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const storageKey = `products/${randomUUID()}.webp`;
    if (
      await storage.putIfMissing(storageKey, body, {
        contentType: 'image/webp',
      })
    ) {
      return { storageKey, created: true };
    }
  }
  throw new ProductImageError('IMAGE_STORAGE_UNAVAILABLE');
}

export async function consumeAdminUploadLimit(requestHeaders: Headers) {
  requireTrustedMutationOrigin(requestHeaders);
  const actor = await requireAdmin(requestHeaders);
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Invalid upload security environment');
  }
  const result = await db.transaction((transaction) =>
    consumeFixedWindowRateLimit(transaction, {
      policy: 'admin-product-upload',
      subject: createHmacSubject(secret, 'admin-product-upload', actor.userId),
      limit: UPLOAD_LIMIT,
      windowMs: UPLOAD_WINDOW_MS,
      now: new Date(),
    }),
  );
  if (!result.allowed) {
    throw new ProductImageError('RATE_LIMITED', result.retryAfterSeconds);
  }
  return actor;
}

export async function addProductImage(
  input: Readonly<{
    productId: string;
    expectedVersion: number;
    image: Readonly<{
      body: Buffer;
      mimeType: 'image/webp';
      width: number;
      height: number;
    }>;
    requestHeaders: Headers;
    requestId: string;
    storage: ObjectStorage;
  }>,
) {
  requireTrustedMutationOrigin(input.requestHeaders);
  const initialActor = await requireAdmin(input.requestHeaders);
  await retryPendingImageCleanup(input.storage);
  const object = await newObject(input.storage, input.image.body);
  try {
    const result = await db.transaction(async (transaction) => {
      await acquireCatalogMutationLock(transaction);
      const current = await lockProduct(transaction, input.productId);
      const { actor, now } = await revalidateCatalogActorAfterLock(
        transaction,
        initialActor,
      );
      if (current.version !== input.expectedVersion) {
        throw new AdminProductError('STALE_PRODUCT');
      }
      const previous = await transaction
        .select({ id: productImages.id, storageKey: productImages.storageKey })
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, input.productId),
            isNull(productImages.removedAt),
          ),
        )
        .for('update');
      const [created] = await transaction
        .insert(productImages)
        .values({
          productId: input.productId,
          storageKey: object.storageKey,
          mimeType: input.image.mimeType,
          width: input.image.width,
          height: input.image.height,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (previous.length) {
        await transaction
          .update(productImages)
          .set({ removedAt: now, cleanupPending: true, updatedAt: now })
          .where(
            inArray(
              productImages.id,
              previous.map(({ id }) => id),
            ),
          );
      }
      const [updated] = await transaction
        .update(products)
        .set({ version: current.version + 1, updatedAt: now })
        .where(
          and(
            eq(products.id, input.productId),
            eq(products.version, current.version),
          ),
        )
        .returning();
      if (!updated) throw new AdminProductError('STALE_PRODUCT');
      await writeImageAudit(transaction, {
        actorId: actor.userId,
        productId: input.productId,
        imageId: created.id,
        action: 'PRODUCT_IMAGE_ADDED',
        requestId: input.requestId,
        version: updated.version,
        width: created.width,
        height: created.height,
      });
      return {
        product: toDto({ ...updated, categoryName: current.categoryName }, [
          {
            id: created.id,
            storageKey: created.storageKey,
            mimeType: created.mimeType,
            width: created.width,
            height: created.height,
            sortOrder: created.sortOrder,
          },
        ]),
        cleanup: previous,
      };
    });
    await cleanupRemovedProductImages(result.cleanup, input.storage);
    return { product: result.product } as const;
  } catch (error) {
    if (object.created) {
      try {
        await input.storage.delete(object.storageKey);
      } catch {
        await enqueueCompensationCleanup(object.storageKey);
      }
    }
    throw error;
  }
}

export async function removeProductImage(
  input: Readonly<{
    productId: string;
    imageId: string;
    expectedVersion: number;
    requestHeaders: Headers;
    requestId: string;
    storage: ObjectStorage;
  }>,
) {
  requireTrustedMutationOrigin(input.requestHeaders);
  const initialActor = await requireAdmin(input.requestHeaders);
  await retryPendingImageCleanup(input.storage);
  const result = await db.transaction(async (transaction) => {
    await acquireCatalogMutationLock(transaction);
    const current = await lockProduct(transaction, input.productId);
    const [image] = await transaction
      .select({ id: productImages.id, storageKey: productImages.storageKey })
      .from(productImages)
      .where(
        and(
          eq(productImages.id, input.imageId),
          eq(productImages.productId, input.productId),
          isNull(productImages.removedAt),
        ),
      )
      .for('update')
      .limit(1);
    if (!image) throw new ProductImageError('PRODUCT_IMAGE_NOT_FOUND');
    const { actor, now } = await revalidateCatalogActorAfterLock(
      transaction,
      initialActor,
    );
    if (current.version !== input.expectedVersion) {
      throw new AdminProductError('STALE_PRODUCT');
    }
    assertRecentReauthentication(actor, MAX_REAUTHENTICATION_AGE_SECONDS, now);
    await transaction
      .update(productImages)
      .set({ removedAt: now, cleanupPending: true, updatedAt: now })
      .where(
        and(eq(productImages.id, image.id), isNull(productImages.removedAt)),
      );
    const [updated] = await transaction
      .update(products)
      .set({ version: current.version + 1, updatedAt: now })
      .where(
        and(
          eq(products.id, input.productId),
          eq(products.version, current.version),
        ),
      )
      .returning();
    if (!updated) throw new AdminProductError('STALE_PRODUCT');
    await writeImageAudit(transaction, {
      actorId: actor.userId,
      productId: input.productId,
      imageId: image.id,
      action: 'PRODUCT_IMAGE_REMOVED',
      requestId: input.requestId,
      version: updated.version,
    });
    return {
      product: toDto(
        { ...updated, categoryName: current.categoryName },
        await activeImages(transaction, input.productId),
      ),
      cleanup: [image],
    };
  });
  await cleanupRemovedProductImages(result.cleanup, input.storage);
  return { product: result.product } as const;
}
