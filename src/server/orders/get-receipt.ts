import { and, asc, eq, isNull } from 'drizzle-orm';

import { orderItems, orders } from '@/server/db/schema';
import { acquireCatalogMutationLock } from '@/server/products/catalog-mutation-lock';
import { reviewPricingInTransaction } from './review-pricing';
import { hashReceiptToken } from './identifiers';
import type { OrdersDatabase } from './types';

const receiptTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export type PublicReceipt = Readonly<{
  paymentVerified?: boolean;
  refundVerified?: boolean;
  publicId: string;
  pricedAt: string;
  validUntil: string | null;
  fulfillment: 'pickup' | 'delivery';
  requestedDate: string;
  orderStatus: string;
  paymentMethod?: import('@/domain/payment-method').PaymentMethod | null;
  paymentStatus: string;
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  items: readonly Readonly<{
    productName: string;
    categoryLabel: string;
    saleUnit: string | null;
    unitPriceMinor: number;
    quantity: number;
    lineTotalMinor: number;
  }>[];
}>;

async function getDatabase(database?: OrdersDatabase) {
  return database ?? (await import('@/server/db/client')).db;
}

export async function getReceipt(
  receiptToken: string,
  database?: OrdersDatabase,
  clock?: () => Date,
): Promise<PublicReceipt | null> {
  if (!receiptTokenPattern.test(receiptToken)) return null;

  const databaseClient = await getDatabase(database);
  const publicReceiptAccess = and(
    eq(orders.receiptTokenHash, hashReceiptToken(receiptToken)),
    isNull(orders.anonymizedAt),
  );
  // Unknown public tokens must not contend with catalog mutations. This is only
  // a preflight: access is checked again under the order lock below.
  const [candidate] = await databaseClient
    .select({ id: orders.id })
    .from(orders)
    .where(publicReceiptAccess)
    .limit(1);
  if (!candidate) return null;

  return databaseClient.transaction(async (transaction) => {
    await acquireCatalogMutationLock(transaction);
    const rows = await transaction
      .select({
        id: orders.id,
        publicId: orders.publicId,
        fulfillment: orders.fulfillment,
        requestedDate: orders.requestedDate,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        subtotalMinor: orders.subtotalMinor,
        shippingMinor: orders.shippingMinor,
        totalMinor: orders.totalMinor,
        productName: orderItems.productName,
        categoryLabel: orderItems.categoryLabel,
        saleUnit: orderItems.saleUnit,
        unitPriceMinor: orderItems.unitPriceMinor,
        quantity: orderItems.quantity,
        lineTotalMinor: orderItems.lineTotalMinor,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(publicReceiptAccess)
      .for('update', { of: orders })
      .orderBy(asc(orderItems.productName), asc(orderItems.sourceProductId));

    const [first] = rows;
    if (!first) return null;

    const review = await reviewPricingInTransaction(
      transaction,
      first.id,
      clock,
    );
    return {
      paymentVerified: review?.paymentVerified ?? false,
      refundVerified: review?.refundVerified ?? false,
      publicId: first.publicId,
      pricedAt: review!.pricedAt,
      validUntil: review!.validUntil,
      fulfillment: first.fulfillment === 'PICKUP' ? 'pickup' : 'delivery',
      requestedDate: first.requestedDate,
      orderStatus: review?.orderStatus ?? first.orderStatus,
      paymentMethod: review?.paymentMethod ?? null,
      paymentStatus: review?.paymentStatus ?? first.paymentStatus,
      subtotalMinor: review?.subtotalMinor ?? first.subtotalMinor,
      shippingMinor: review ? review.shippingMinor : first.shippingMinor,
      totalMinor: review ? review.totalMinor : first.totalMinor,
      items: [...(review?.items ?? rows)]
        .sort((a, b) => a.productName.localeCompare(b.productName))
        .map((row) => ({
          productName: row.productName,
          categoryLabel: row.categoryLabel,
          saleUnit: row.saleUnit,
          unitPriceMinor: row.unitPriceMinor,
          quantity: row.quantity,
          lineTotalMinor: row.lineTotalMinor,
        })),
    };
  });
}
