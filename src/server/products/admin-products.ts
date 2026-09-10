import 'server-only';

import { and, asc, count, eq, gt, inArray, sql } from 'drizzle-orm';

import {
  AuthorizationError,
  requireAdmin,
  type AuthorizedActor,
} from '@/server/auth/authorize';
import {
  assertRecentReauthentication,
  MAX_REAUTHENTICATION_AGE_SECONDS,
} from '@/server/auth/reauth';
import { db } from '@/server/db/client';
import {
  auditLogs,
  categories,
  productImages,
  products,
  session,
  user,
} from '@/server/db/schema';
import { requireTrustedMutationOrigin } from '@/server/security/origin';

import type {
  AdminProductCreateInput,
  AdminProductUpdateInput,
} from './admin-contracts';
import { parseAdminCatalogPagination } from './admin-contracts';

type CatalogTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AdminProductErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_SLUG_EXISTS'
  | 'STALE_PRODUCT'
  | 'INACTIVE_CATEGORY';

export class AdminProductError extends Error {
  readonly code: AdminProductErrorCode;

  constructor(code: AdminProductErrorCode) {
    super(code);
    this.name = 'AdminProductError';
    this.code = code;
  }
}

export type AdminProductDto = Readonly<{
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  saleUnit: string | null;
  sku: string | null;
  priceMinor: number;
  stockQuantity: number | null;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  version: number;
  deletedAt: string | null;
  images: readonly Readonly<{
    id: string;
    storageKey: string;
    mimeType: string;
    width: number;
    height: number;
    sortOrder: number;
  }>[];
}>;

const CATALOG_MUTATION_LOCK = 4_728_519_206;

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

function safeProductState(candidate: ProductRow) {
  return {
    categoryId: candidate.categoryId,
    name: candidate.name,
    slug: candidate.slug,
    priceMinor: candidate.priceMinor,
    stockQuantity: candidate.stockQuantity,
    active: candidate.active,
    featured: candidate.featured,
    sortOrder: candidate.sortOrder,
    version: candidate.version,
    deleted: candidate.deletedAt !== null,
  };
}

function isAvailable(
  candidate: Pick<ProductRow, 'active' | 'stockQuantity' | 'deletedAt'>,
) {
  return (
    candidate.active &&
    candidate.deletedAt === null &&
    (candidate.stockQuantity === null || candidate.stockQuantity > 0)
  );
}

function isUniqueViolation(error: unknown) {
  const cause =
    error && typeof error === 'object' && 'cause' in error
      ? error.cause
      : error;
  return (
    !!cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    cause.code === '23505'
  );
}

function productValues(input: AdminProductCreateInput) {
  return {
    categoryId: input.categoryId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    saleUnit: input.saleUnit,
    sku: input.sku,
    priceMinor: input.priceMinor,
    stockQuantity: input.stockQuantity,
    active: input.active,
    featured: input.featured,
    sortOrder: input.sortOrder,
  };
}

async function initialActor(requestHeaders: Headers) {
  requireTrustedMutationOrigin(requestHeaders);
  return requireAdmin(requestHeaders);
}

async function acquireCatalogMutationLock(transaction: CatalogTransaction) {
  await transaction.execute(
    sql`SELECT pg_advisory_xact_lock(${CATALOG_MUTATION_LOCK})`,
  );
}

export async function revalidateCatalogActorAfterLock(
  transaction: CatalogTransaction,
  actor: AuthorizedActor,
) {
  const now = new Date();
  const [current] = await transaction
    .select({ role: user.role, mfaVerifiedAt: session.mfaVerifiedAt })
    .from(user)
    .innerJoin(
      session,
      and(eq(session.id, actor.sessionId), eq(session.userId, user.id)),
    )
    .where(
      and(
        eq(user.id, actor.userId),
        eq(user.active, true),
        inArray(user.role, ['OWNER', 'ADMIN']),
        gt(session.expiresAt, now),
      ),
    )
    .limit(1);
  if (!current?.mfaVerifiedAt) throw new AuthorizationError('FORBIDDEN');
  return {
    actor: {
      ...actor,
      role: current.role,
      mfaVerifiedAt: current.mfaVerifiedAt,
    } satisfies AuthorizedActor,
    now,
  } as const;
}

async function imagesFor(productIds: readonly string[]) {
  if (productIds.length === 0)
    return new Map<string, AdminProductDto['images']>();
  const rows = await db
    .select({
      productId: productImages.productId,
      id: productImages.id,
      storageKey: productImages.storageKey,
      mimeType: productImages.mimeType,
      width: productImages.width,
      height: productImages.height,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(inArray(productImages.productId, [...productIds]))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  const grouped = new Map<
    string,
    Array<Omit<(typeof rows)[number], 'productId'>>
  >();
  for (const { productId, ...image } of rows) {
    const current = grouped.get(productId) ?? [];
    current.push(image);
    grouped.set(productId, current);
  }
  return grouped;
}

function toDto(
  row: ProductRow,
  images: AdminProductDto['images'] = [],
): AdminProductDto {
  return {
    ...row,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    images,
  };
}

export async function adminListProducts(
  requestHeaders: Headers,
  pagination: Readonly<{ page?: unknown; pageSize?: unknown }> = {},
) {
  await requireAdmin(requestHeaders);
  const parsed = parseAdminCatalogPagination(pagination);
  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select(productSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(
        asc(categories.sortOrder),
        asc(categories.name),
        asc(products.sortOrder),
        asc(products.name),
        asc(products.id),
      )
      .limit(parsed.pageSize)
      .offset(parsed.offset),
    db.select({ value: count() }).from(products),
  ]);
  const groupedImages = await imagesFor(rows.map(({ id }) => id));
  return {
    products: rows.map((row) => toDto(row, groupedImages.get(row.id) ?? [])),
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  } as const;
}

export async function adminGetProduct(id: string, requestHeaders: Headers) {
  await requireAdmin(requestHeaders);
  const [row] = await db
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);
  if (!row) return null;
  const groupedImages = await imagesFor([id]);
  return toDto(row, groupedImages.get(id) ?? []);
}

async function lockProduct(transaction: CatalogTransaction, id: string) {
  const [row] = await transaction
    .select(productSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .for('update')
    .limit(1);
  return row ?? null;
}

async function assertActiveCategory(
  transaction: CatalogTransaction,
  categoryId: string,
) {
  const [category] = await transaction
    .select({ id: categories.id, active: categories.active })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .for('update')
    .limit(1);
  if (!category?.active) throw new AdminProductError('INACTIVE_CATEGORY');
}

async function writeProductAudit(
  transaction: CatalogTransaction,
  input: {
    actorId: string;
    productId: string;
    action: string;
    requestId: string;
    before: ReturnType<typeof safeProductState> | null;
    after: ReturnType<typeof safeProductState>;
  },
) {
  const changes = input.before
    ? Object.fromEntries(
        Object.entries(input.after).filter(
          ([key, value]) =>
            input.before?.[key as keyof typeof input.before] !== value,
        ),
      )
    : input.after;
  await transaction.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: 'PRODUCT',
    entityId: input.productId,
    requestId: input.requestId,
    metadata: { changes },
  });
}

export async function createAdminProduct(
  input: AdminProductCreateInput,
  requestHeaders: Headers,
  requestId: string,
) {
  const initial = await initialActor(requestHeaders);
  try {
    return await db.transaction(async (transaction) => {
      await acquireCatalogMutationLock(transaction);
      if (input.active)
        await assertActiveCategory(transaction, input.categoryId);
      else {
        const [category] = await transaction
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, input.categoryId))
          .for('update')
          .limit(1);
        if (!category) throw new AdminProductError('INACTIVE_CATEGORY');
      }
      const { actor, now } = await revalidateCatalogActorAfterLock(
        transaction,
        initial,
      );
      const [created] = await transaction
        .insert(products)
        .values({
          ...productValues(input),
          createdAt: now,
          updatedAt: now,
          version: 1,
        })
        .returning();
      const [category] = await transaction
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, created.categoryId));
      const row = {
        ...created,
        categoryName: category.name,
      } satisfies ProductRow;
      await writeProductAudit(transaction, {
        actorId: actor.userId,
        productId: created.id,
        action: 'PRODUCT_CREATED',
        requestId,
        before: null,
        after: safeProductState(row),
      });
      return { product: toDto(row) } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminProductError('PRODUCT_SLUG_EXISTS');
    }
    throw error;
  }
}

export async function updateAdminProduct(
  id: string,
  input: AdminProductUpdateInput,
  requestHeaders: Headers,
  requestId: string,
) {
  const initial = await initialActor(requestHeaders);
  try {
    return await db.transaction(async (transaction) => {
      await acquireCatalogMutationLock(transaction);
      const current = await lockProduct(transaction, id);
      if (!current) throw new AdminProductError('PRODUCT_NOT_FOUND');
      if (input.active)
        await assertActiveCategory(transaction, input.categoryId);
      const { actor, now } = await revalidateCatalogActorAfterLock(
        transaction,
        initial,
      );
      if (current.version !== input.expectedVersion) {
        throw new AdminProductError('STALE_PRODUCT');
      }
      if (isAvailable(current) && !input.active) {
        assertRecentReauthentication(
          actor,
          MAX_REAUTHENTICATION_AGE_SECONDS,
          now,
        );
      }
      const [updated] = await transaction
        .update(products)
        .set({
          ...productValues(input),
          version: current.version + 1,
          updatedAt: now,
        })
        .where(and(eq(products.id, id), eq(products.version, current.version)))
        .returning();
      if (!updated) throw new AdminProductError('STALE_PRODUCT');
      const [category] = await transaction
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, updated.categoryId));
      const row = {
        ...updated,
        categoryName: category.name,
      } satisfies ProductRow;
      await writeProductAudit(transaction, {
        actorId: actor.userId,
        productId: id,
        action: 'PRODUCT_UPDATED',
        requestId,
        before: safeProductState(current),
        after: safeProductState(row),
      });
      return { product: toDto(row) } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminProductError('PRODUCT_SLUG_EXISTS');
    }
    throw error;
  }
}

export async function duplicateAdminProduct(
  id: string,
  input: Readonly<{ name: string; slug: string; expectedVersion: number }>,
  requestHeaders: Headers,
  requestId: string,
) {
  const initial = await initialActor(requestHeaders);
  try {
    return await db.transaction(async (transaction) => {
      await acquireCatalogMutationLock(transaction);
      const source = await lockProduct(transaction, id);
      if (!source || source.deletedAt) {
        throw new AdminProductError('PRODUCT_NOT_FOUND');
      }
      const { actor, now } = await revalidateCatalogActorAfterLock(
        transaction,
        initial,
      );
      if (source.version !== input.expectedVersion) {
        throw new AdminProductError('STALE_PRODUCT');
      }
      const [created] = await transaction
        .insert(products)
        .values({
          categoryId: source.categoryId,
          name: input.name,
          slug: input.slug,
          description: source.description,
          saleUnit: source.saleUnit,
          sku: source.sku,
          priceMinor: source.priceMinor,
          stockQuantity: source.stockQuantity,
          active: false,
          featured: source.featured,
          sortOrder: source.sortOrder,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      const row = {
        ...created,
        categoryName: source.categoryName,
      } satisfies ProductRow;
      await writeProductAudit(transaction, {
        actorId: actor.userId,
        productId: created.id,
        action: 'PRODUCT_DUPLICATED',
        requestId,
        before: null,
        after: safeProductState(row),
      });
      return { product: toDto(row) } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminProductError('PRODUCT_SLUG_EXISTS');
    }
    throw error;
  }
}

export async function deleteAdminProduct(
  id: string,
  expectedVersion: number,
  requestHeaders: Headers,
  requestId: string,
) {
  const initial = await initialActor(requestHeaders);
  return db.transaction(async (transaction) => {
    await acquireCatalogMutationLock(transaction);
    const current = await lockProduct(transaction, id);
    if (!current) throw new AdminProductError('PRODUCT_NOT_FOUND');
    const { actor, now } = await revalidateCatalogActorAfterLock(
      transaction,
      initial,
    );
    if (current.version !== expectedVersion) {
      throw new AdminProductError('STALE_PRODUCT');
    }
    if (isAvailable(current)) {
      assertRecentReauthentication(
        actor,
        MAX_REAUTHENTICATION_AGE_SECONDS,
        now,
      );
    }
    const [updated] = await transaction
      .update(products)
      .set({
        active: false,
        deletedAt: current.deletedAt ?? now,
        version: current.version + 1,
        updatedAt: now,
      })
      .where(and(eq(products.id, id), eq(products.version, current.version)))
      .returning();
    if (!updated) throw new AdminProductError('STALE_PRODUCT');
    const row = {
      ...updated,
      categoryName: current.categoryName,
    } satisfies ProductRow;
    await writeProductAudit(transaction, {
      actorId: actor.userId,
      productId: id,
      action: 'PRODUCT_REMOVED',
      requestId,
      before: safeProductState(current),
      after: safeProductState(row),
    });
    return { product: toDto(row) } as const;
  });
}
