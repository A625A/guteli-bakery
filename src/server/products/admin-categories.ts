import 'server-only';

import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';

import {
  assertRecentReauthentication,
  MAX_REAUTHENTICATION_AGE_SECONDS,
} from '@/server/auth/reauth';
import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import { auditLogs, categories, products } from '@/server/db/schema';
import { requireTrustedMutationOrigin } from '@/server/security/origin';

import type {
  AdminCategoryCreateInput,
  AdminCategoryUpdateInput,
} from './admin-contracts';
import { parseAdminCatalogPagination } from './admin-contracts';
import { revalidateCatalogActorAfterLock } from './admin-products';

type CatalogTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AdminCategoryErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_SLUG_EXISTS'
  | 'STALE_CATEGORY'
  | 'CATEGORY_CONFIRMATION_REQUIRED';

export class AdminCategoryError extends Error {
  readonly code: AdminCategoryErrorCode;

  constructor(code: AdminCategoryErrorCode) {
    super(code);
    this.name = 'AdminCategoryError';
    this.code = code;
  }
}

export type AdminCategoryDto = Readonly<{
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  version: number;
  productCount: number;
}>;

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

async function lockCategory(transaction: CatalogTransaction, id: string) {
  const [row] = await transaction
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      active: categories.active,
      sortOrder: categories.sortOrder,
      version: categories.version,
    })
    .from(categories)
    .where(eq(categories.id, id))
    .for('update')
    .limit(1);
  return row ?? null;
}

async function productCount(transaction: CatalogTransaction, id: string) {
  const [{ value }] = await transaction
    .select({ value: count() })
    .from(products)
    .where(
      and(
        eq(products.categoryId, id),
        eq(products.active, true),
        isNull(products.deletedAt),
      ),
    );
  return value;
}

async function writeCategoryAudit(
  transaction: CatalogTransaction,
  input: {
    actorId: string;
    categoryId: string;
    action: string;
    requestId: string;
    changes: Record<string, unknown>;
  },
) {
  await transaction.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: 'CATEGORY',
    entityId: input.categoryId,
    requestId: input.requestId,
    metadata: { changes: input.changes },
  });
}

export async function adminListCategories(
  requestHeaders: Headers,
  pagination: Readonly<{ page?: unknown; pageSize?: unknown }> = {},
) {
  await requireAdmin(requestHeaders);
  const parsed = parseAdminCatalogPagination(pagination);
  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        active: categories.active,
        sortOrder: categories.sortOrder,
        version: categories.version,
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, categories.id),
          eq(products.active, true),
          isNull(products.deletedAt),
        ),
      )
      .groupBy(categories.id)
      .orderBy(
        asc(categories.sortOrder),
        asc(categories.name),
        asc(categories.id),
      )
      .limit(parsed.pageSize)
      .offset(parsed.offset),
    db.select({ value: count() }).from(categories),
  ]);
  return {
    categories: rows satisfies AdminCategoryDto[],
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  } as const;
}

export async function adminGetCategory(id: string, requestHeaders: Headers) {
  await requireAdmin(requestHeaders);
  const [row] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      active: categories.active,
      sortOrder: categories.sortOrder,
      version: categories.version,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(
      products,
      and(
        eq(products.categoryId, categories.id),
        eq(products.active, true),
        isNull(products.deletedAt),
      ),
    )
    .where(eq(categories.id, id))
    .groupBy(categories.id)
    .limit(1);
  return row ?? null;
}

export async function createAdminCategory(
  input: AdminCategoryCreateInput,
  requestHeaders: Headers,
  requestId: string,
) {
  requireTrustedMutationOrigin(requestHeaders);
  const initial = await requireAdmin(requestHeaders);
  try {
    return await db.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT pg_advisory_xact_lock(4728519206)`);
      const { actor, now } = await revalidateCatalogActorAfterLock(
        transaction,
        initial,
      );
      const [created] = await transaction
        .insert(categories)
        .values({
          name: input.name,
          slug: input.slug,
          active: input.active,
          sortOrder: input.sortOrder,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      await writeCategoryAudit(transaction, {
        actorId: actor.userId,
        categoryId: created.id,
        action: 'CATEGORY_CREATED',
        requestId,
        changes: {
          name: created.name,
          slug: created.slug,
          active: created.active,
          sortOrder: created.sortOrder,
          version: created.version,
        },
      });
      return { category: { ...created, productCount: 0 } } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminCategoryError('CATEGORY_SLUG_EXISTS');
    }
    throw error;
  }
}

export async function updateAdminCategory(
  id: string,
  input: AdminCategoryUpdateInput,
  requestHeaders: Headers,
  requestId: string,
) {
  requireTrustedMutationOrigin(requestHeaders);
  const initial = await requireAdmin(requestHeaders);
  try {
    return await db.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT pg_advisory_xact_lock(4728519206)`);
      const current = await lockCategory(transaction, id);
      if (!current) throw new AdminCategoryError('CATEGORY_NOT_FOUND');
      const { actor, now } = await revalidateCatalogActorAfterLock(
        transaction,
        initial,
      );
      if (current.version !== input.expectedVersion) {
        throw new AdminCategoryError('STALE_CATEGORY');
      }
      if (current.active && !input.active) {
        if (input.confirmAffectedProducts !== true) {
          throw new AdminCategoryError('CATEGORY_CONFIRMATION_REQUIRED');
        }
        assertRecentReauthentication(
          actor,
          MAX_REAUTHENTICATION_AGE_SECONDS,
          now,
        );
      }
      const [updated] = await transaction
        .update(categories)
        .set({
          name: input.name,
          slug: input.slug,
          active: input.active,
          sortOrder: input.sortOrder,
          version: current.version + 1,
          updatedAt: now,
        })
        .where(
          and(eq(categories.id, id), eq(categories.version, current.version)),
        )
        .returning();
      if (!updated) throw new AdminCategoryError('STALE_CATEGORY');
      const affected = await productCount(transaction, id);
      const changes = Object.fromEntries(
        Object.entries({
          name: updated.name,
          slug: updated.slug,
          active: updated.active,
          sortOrder: updated.sortOrder,
          version: updated.version,
        }).filter(
          ([key, value]) => current[key as keyof typeof current] !== value,
        ),
      );
      await writeCategoryAudit(transaction, {
        actorId: actor.userId,
        categoryId: id,
        action: 'CATEGORY_UPDATED',
        requestId,
        changes,
      });
      return { category: { ...updated, productCount: affected } } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AdminCategoryError('CATEGORY_SLUG_EXISTS');
    }
    throw error;
  }
}

export async function deactivateAdminCategory(
  id: string,
  input: Readonly<{
    expectedVersion: number;
    confirmAffectedProducts: boolean;
  }>,
  requestHeaders: Headers,
  requestId: string,
) {
  requireTrustedMutationOrigin(requestHeaders);
  const initial = await requireAdmin(requestHeaders);
  if (!input.confirmAffectedProducts) {
    throw new AdminCategoryError('CATEGORY_CONFIRMATION_REQUIRED');
  }
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(4728519206)`);
    const current = await lockCategory(transaction, id);
    if (!current) throw new AdminCategoryError('CATEGORY_NOT_FOUND');
    const { actor, now } = await revalidateCatalogActorAfterLock(
      transaction,
      initial,
    );
    if (current.version !== input.expectedVersion) {
      throw new AdminCategoryError('STALE_CATEGORY');
    }
    if (current.active) {
      assertRecentReauthentication(
        actor,
        MAX_REAUTHENTICATION_AGE_SECONDS,
        now,
      );
    }
    const [updated] = await transaction
      .update(categories)
      .set({ active: false, version: current.version + 1, updatedAt: now })
      .where(
        and(eq(categories.id, id), eq(categories.version, current.version)),
      )
      .returning();
    if (!updated) throw new AdminCategoryError('STALE_CATEGORY');
    const affected = await productCount(transaction, id);
    await writeCategoryAudit(transaction, {
      actorId: actor.userId,
      categoryId: id,
      action: 'CATEGORY_DEACTIVATED',
      requestId,
      changes: { active: false, version: updated.version },
    });
    return { category: { ...updated, productCount: affected } } as const;
  });
}
