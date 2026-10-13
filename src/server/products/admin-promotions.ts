import 'server-only';
import { asc, eq, inArray, isNull } from 'drizzle-orm';
import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import {
  auditLogs,
  categories,
  products,
  promotions,
  promotionProducts,
} from '@/server/db/schema';
import { requireTrustedMutationOrigin } from '@/server/security/origin';
import { fromGuatemalaLocal } from '@/lib/promotion-time';
import { acquireCatalogMutationLock } from './catalog-mutation-lock';
import { revalidateCatalogActorAfterLock } from './admin-products';
import {
  promotionInputSchema,
  type PromotionInput,
} from './promotion-contract';
import { readPromotions } from './promotions';

export class PromotionError extends Error {
  constructor(
    readonly code:
      'PROMOTION_NOT_FOUND' | 'STALE_PROMOTION' | 'INVALID_PROMOTION_PRODUCTS',
  ) {
    super(code);
  }
}

export async function adminPromotionEditor(headers: Headers) {
  await requireAdmin(headers);
  const offers = await readPromotions(db);
  const choices = await db
    .select({
      id: products.id,
      name: products.name,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(isNull(products.deletedAt))
    .orderBy(asc(categories.name), asc(products.name), asc(products.id));
  return {
    promotions: offers.sort(
      (a, b) =>
        b.startsAt.localeCompare(a.startsAt) || a.id.localeCompare(b.id),
    ),
    products: choices,
  };
}

export async function savePromotion(
  input: PromotionInput,
  headers: Headers,
  requestId: string,
  update?: { id: string; expectedVersion: number },
) {
  requireTrustedMutationOrigin(headers);
  const initialActor = await requireAdmin(headers);
  const parsed = promotionInputSchema.safeParse(input);
  if (!parsed.success) throw new RangeError('Invalid promotion');
  input = parsed.data;
  return db.transaction(async (transaction) => {
    await acquireCatalogMutationLock(transaction);
    const { actor, now } = await revalidateCatalogActorAfterLock(
      transaction,
      initialActor,
    );
    if (update) {
      const [current] = await transaction
        .select()
        .from(promotions)
        .where(eq(promotions.id, update.id))
        .for('update');
      if (!current) throw new PromotionError('PROMOTION_NOT_FOUND');
      if (current.version !== update.expectedVersion)
        throw new PromotionError('STALE_PROMOTION');
    }
    if (input.scope === 'SELECTED') {
      const found = await transaction
        .select({ id: products.id, deletedAt: products.deletedAt })
        .from(products)
        .where(inArray(products.id, [...input.productIds]));
      if (
        found.length !== input.productIds.length ||
        found.some((p) => p.deletedAt !== null)
      )
        throw new PromotionError('INVALID_PROMOTION_PRODUCTS');
    }
    const values = {
      name: input.name,
      scope: input.scope,
      discountBps: Math.round(input.discountPercent * 100),
      startsAt: fromGuatemalaLocal(input.startsAtLocal),
      endsAt: fromGuatemalaLocal(input.endsAtLocal),
      enabled: input.enabled,
      updatedAt: now,
      version: update ? update.expectedVersion + 1 : 1,
    };
    const [saved] = update
      ? await transaction
          .update(promotions)
          .set(values)
          .where(eq(promotions.id, update.id))
          .returning()
      : await transaction.insert(promotions).values(values).returning();
    await transaction
      .delete(promotionProducts)
      .where(eq(promotionProducts.promotionId, saved.id));
    if (input.scope === 'SELECTED')
      await transaction.insert(promotionProducts).values(
        input.productIds.map((productId) => ({
          promotionId: saved.id,
          productId,
        })),
      );
    await transaction.insert(auditLogs).values({
      actorId: actor.userId,
      entityType: 'PROMOTION',
      entityId: saved.id,
      action: update ? 'PROMOTION_UPDATED' : 'PROMOTION_CREATED',
      requestId,
      metadata: {
        scope: saved.scope,
        discountBps: saved.discountBps,
        enabled: saved.enabled,
        version: saved.version,
        productCount: input.productIds.length,
      },
    });
    return {
      promotion: (await readPromotions(transaction)).find(
        (p) => p.id === saved.id,
      )!,
    };
  });
}
