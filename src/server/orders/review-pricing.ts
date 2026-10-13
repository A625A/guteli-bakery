import 'server-only';
import { createHash } from 'node:crypto';
import { asc, eq, sql } from 'drizzle-orm';
import type {
  CheckoutPricingReview,
  PricingSnapshot,
} from '@/domain/checkout-pricing';
import { priceProduct } from '@/domain/pricing';
import { getMinimumOrderDate } from '@/lib/date';
import {
  orderItems,
  orderPricingRevisions,
  orderPricingState,
  orders,
} from '@/server/db/schema';
import { acquireCatalogMutationLock } from '@/server/products/catalog-mutation-lock';
import { readPromotions } from '@/server/products/promotions';
import { lockRequestedProducts } from './repository';
import type { OrdersDatabase, OrdersTransaction } from './types';

const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Caller holds catalog lock before the order lock. Time is sampled only after all locks. */
export async function reviewPricingInTransaction(
  transaction: OrdersTransaction,
  orderId: string,
  clock: () => Date = () => new Date(),
  expectedRevision?: string,
  authorizeAt: (now: Date) => boolean = () => true,
): Promise<CheckoutPricingReview | null> {
  const [order] = await transaction
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .for('update');
  if (!order) return null;
  const [state] = await transaction
    .select()
    .from(orderPricingState)
    .where(eq(orderPricingState.orderId, order.id));
  const [previous] = state
    ? await transaction
        .select()
        .from(orderPricingRevisions)
        .where(eq(orderPricingRevisions.id, state.currentRevisionId))
    : [];
  const storedItems = await transaction
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.sourceProductId));
  const frozen =
    order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED';
  const catalog = frozen
    ? []
    : await lockRequestedProducts(
        transaction,
        storedItems.map((item) => item.sourceProductId),
        true,
      );
  const promotions = frozen ? [] : await readPromotions(transaction);
  const now = clock();
  const boundaries: string[] = [];
  const items = frozen
    ? (previous?.snapshot.items ??
      storedItems.map((item) => ({
        productId: item.sourceProductId,
        catalogVersion: 0,
        productName: item.productName,
        categoryLabel: item.categoryLabel,
        saleUnit: item.saleUnit,
        basePriceMinor: item.unitPriceMinor,
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor: item.lineTotalMinor,
        available: true,
        promotion: null,
      })))
    : storedItems.map((item) => {
        const product = catalog.find(
          (product) => product.id === item.sourceProductId,
        );
        const pricing = priceProduct(
          item.sourceProductId,
          product?.priceMinor ?? item.unitPriceMinor,
          promotions,
          now,
        );
        if (pricing.nextChangeAt) boundaries.push(pricing.nextChangeAt);
        const promotion = pricing.promotion;
        // Stock was allocated once at creation. Do not test remaining stock for that allocation.
        return {
          productId: item.sourceProductId,
          catalogVersion: product?.version ?? 0,
          productName: item.productName,
          categoryLabel: item.categoryLabel,
          saleUnit: item.saleUnit,
          basePriceMinor: pricing.basePriceMinor,
          unitPriceMinor: pricing.unitPriceMinor,
          quantity: item.quantity,
          lineTotalMinor: pricing.unitPriceMinor * item.quantity,
          available: Boolean(product?.available),
          promotion: promotion
            ? {
                id: promotion.id,
                name: promotion.name,
                version: promotion.version,
                discountBps: promotion.discountBps,
                startsAt: promotion.startsAt,
                endsAt: promotion.endsAt,
              }
            : null,
        };
      });
  const subtotalMinor = frozen
    ? order.subtotalMinor
    : items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  const totalMinor =
    order.shippingMinor === null ? null : subtotalMinor + order.shippingMinor;
  if (
    ![subtotalMinor, totalMinor ?? 0].every(
      (value) =>
        Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647,
    )
  )
    throw new RangeError('Invalid checkout total');
  const snapshot: PricingSnapshot = {
    items,
    subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: frozen ? order.totalMinor : totalMinor,
    requestedDate: order.requestedDate,
    fulfillment: order.fulfillment,
    deliveryQuoteVersion: state?.quoteVersion ?? 0,
    deliveryLocationHash:
      order.deliveryLocation === null
        ? null
        : fingerprint(order.deliveryLocation),
  };
  let revisionId = state?.currentRevisionId ?? null;
  let accepted = Boolean(
    revisionId && state?.acceptedRevisionId === revisionId,
  );
  if (!frozen && previous?.fingerprint !== fingerprint(snapshot)) {
    const [revision] = await transaction
      .insert(orderPricingRevisions)
      .values({
        orderId,
        fingerprint: fingerprint(snapshot),
        snapshot,
        createdAt: now,
      })
      .returning();
    revisionId = revision.id;
    accepted = false;
    await transaction
      .insert(orderPricingState)
      .values({ orderId, currentRevisionId: revisionId })
      .onConflictDoUpdate({
        target: orderPricingState.orderId,
        set: {
          currentRevisionId: revisionId,
          acceptedRevisionId: null,
          acceptedAt: null,
        },
      });
    if (
      subtotalMinor !== order.subtotalMinor ||
      totalMinor !== order.totalMinor
    )
      await transaction
        .update(orders)
        .set({
          subtotalMinor,
          totalMinor,
          version: sql`${orders.version} + 1`,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId));
  }
  const canAccept =
    authorizeAt(now) &&
    !frozen &&
    order.paymentStatus !== 'PENDING' &&
    order.orderStatus !== 'CANCELLED' &&
    order.orderStatus !== 'COMPLETED' &&
    totalMinor !== null &&
    items.length > 0 &&
    items.every((item) => item.available) &&
    order.requestedDate >= getMinimumOrderDate(now);
  const conflict =
    expectedRevision !== undefined &&
    (expectedRevision !== revisionId || !canAccept);
  if (expectedRevision !== undefined && !conflict) {
    await transaction
      .update(orderPricingState)
      .set({ acceptedRevisionId: revisionId, acceptedAt: now })
      .where(eq(orderPricingState.orderId, orderId));
    accepted = true;
  }
  return {
    publicId: order.publicId,
    revisionId,
    accepted: accepted && (frozen || canAccept),
    canAccept,
    conflict,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: snapshot.totalMinor,
    items,
    pricedAt: now.toISOString(),
    validUntil: boundaries.sort()[0] ?? null,
  };
}

export async function reviewOrderPricing(
  orderId: string,
  database?: OrdersDatabase,
  clock: () => Date = () => new Date(),
  expectedRevision?: string,
) {
  const db = database ?? (await import('@/server/db/client')).db;
  return db.transaction(async (transaction) => {
    await acquireCatalogMutationLock(transaction);
    return reviewPricingInTransaction(
      transaction,
      orderId,
      clock,
      expectedRevision,
    );
  });
}
