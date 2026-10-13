import { asc, eq } from 'drizzle-orm';

import { orderItems, orders } from '@/server/db/schema';
import { reviewOrderPricing } from './review-pricing';
import { hashReceiptToken } from './identifiers';
import type { OrdersDatabase } from './types';

const receiptTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export type PublicReceipt = Readonly<{
  publicId: string;
  pricedAt: string;
  validUntil: string | null;
  fulfillment: 'pickup' | 'delivery';
  requestedDate: string;
  orderStatus: string;
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

  const rows = await (
    await getDatabase(database)
  )
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
    .where(eq(orders.receiptTokenHash, hashReceiptToken(receiptToken)))
    .orderBy(asc(orderItems.productName), asc(orderItems.sourceProductId));

  const [first] = rows;
  if (!first) return null;

  const review = await reviewOrderPricing(first.id, database, clock);
  return {
    publicId: first.publicId,
    pricedAt: review!.pricedAt,
    validUntil: review!.validUntil,
    fulfillment: first.fulfillment === 'PICKUP' ? 'pickup' : 'delivery',
    requestedDate: first.requestedDate,
    orderStatus: review?.orderStatus ?? first.orderStatus,
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
}
