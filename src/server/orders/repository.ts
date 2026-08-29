import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  auditLogs,
  categories,
  idempotencyRecords,
  orderItems,
  orders,
  outboxEvents,
  products,
} from '@/server/db/schema';
import type { OrderOutboxPayload } from '@/server/db/schema';
import type { OrdersTransaction, PaymentStatus } from './types';
import type { OrderStatus } from '@/domain/order-state';

export const CREATE_ORDER_OPERATION = 'CREATE_ORDER';

export type LockedProduct = Readonly<{
  id: string;
  name: string;
  priceMinor: number;
  saleUnit: string | null;
  stockQuantity: number | null;
  categoryLabel: string;
}>;

export type PersistedOrder = Readonly<{
  id: string;
  publicId: string;
  receiptTokenHash: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
}>;

export type NewOrderValues = Readonly<{
  id: string;
  publicId: string;
  customerName: string;
  phone: string;
  fulfillment: 'PICKUP' | 'DELIVERY';
  requestedDate: string;
  deliveryLocation: string | null;
  notes: string | null;
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  receiptTokenHash: string;
}>;

export type NewOrderItemValues = Readonly<{
  orderId: string;
  sourceProductId: string;
  productName: string;
  categoryLabel: string;
  saleUnit: string | null;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
}>;

export async function acquireIdempotencyLock(
  transaction: OrdersTransaction,
  operation: string,
  subject: string,
  key: string,
) {
  const identity = JSON.stringify([operation, subject, key]);

  await transaction.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))`,
  );
}

export async function findIdempotentOrder(
  transaction: OrdersTransaction,
  operation: string,
  subject: string,
  key: string,
) {
  const [record] = await transaction
    .select({
      requestHash: idempotencyRecords.requestHash,
      id: orders.id,
      publicId: orders.publicId,
      receiptTokenHash: orders.receiptTokenHash,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      subtotalMinor: orders.subtotalMinor,
      shippingMinor: orders.shippingMinor,
      totalMinor: orders.totalMinor,
    })
    .from(idempotencyRecords)
    .innerJoin(orders, eq(idempotencyRecords.orderId, orders.id))
    .where(
      and(
        eq(idempotencyRecords.operation, operation),
        eq(idempotencyRecords.subject, subject),
        eq(idempotencyRecords.key, key),
      ),
    )
    .limit(1);

  return record ?? null;
}

export async function lockRequestedProducts(
  transaction: OrdersTransaction,
  productIds: readonly string[],
): Promise<readonly LockedProduct[]> {
  return transaction
    .select({
      id: products.id,
      name: products.name,
      priceMinor: products.priceMinor,
      saleUnit: products.saleUnit,
      stockQuantity: products.stockQuantity,
      categoryLabel: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        inArray(products.id, productIds),
        eq(products.active, true),
        isNull(products.deletedAt),
        eq(categories.active, true),
      ),
    )
    .orderBy(asc(products.id))
    .for('update');
}

export async function insertOrder(
  transaction: OrdersTransaction,
  values: NewOrderValues,
): Promise<PersistedOrder> {
  const [order] = await transaction.insert(orders).values(values).returning({
    id: orders.id,
    publicId: orders.publicId,
    receiptTokenHash: orders.receiptTokenHash,
    orderStatus: orders.orderStatus,
    paymentStatus: orders.paymentStatus,
    subtotalMinor: orders.subtotalMinor,
    shippingMinor: orders.shippingMinor,
    totalMinor: orders.totalMinor,
  });

  return order;
}

export async function insertOrderItems(
  transaction: OrdersTransaction,
  values: NewOrderItemValues[],
) {
  await transaction.insert(orderItems).values(values);
}

export async function decrementTrackedStock(
  transaction: OrdersTransaction,
  productId: string,
  quantity: number,
  now: Date,
) {
  return transaction
    .update(products)
    .set({
      stockQuantity: sql`${products.stockQuantity} - ${quantity}`,
      updatedAt: now,
    })
    .where(
      and(
        eq(products.id, productId),
        sql`${products.stockQuantity} >= ${quantity}`,
      ),
    )
    .returning({ id: products.id });
}

export async function insertIdempotencyRecord(
  transaction: OrdersTransaction,
  values: Readonly<{
    subject: string;
    key: string;
    requestHash: string;
    orderId: string;
    expiresAt: Date;
  }>,
) {
  await transaction.insert(idempotencyRecords).values({
    operation: CREATE_ORDER_OPERATION,
    ...values,
  });
}

export async function insertOrderCreatedOutboxEvent(
  transaction: OrdersTransaction,
  payload: OrderOutboxPayload,
  now: Date,
) {
  await transaction.insert(outboxEvents).values({
    eventType: 'OWNER_ORDER_CREATED',
    payload,
    state: 'PENDING',
    attempts: 0,
    nextAttemptAt: now,
  });
}

export async function insertOrderCreatedAuditLog(
  transaction: OrdersTransaction,
  values: Readonly<{
    orderId: string;
    requestId: string;
    fulfillment: 'PICKUP' | 'DELIVERY';
    itemCount: number;
  }>,
) {
  await transaction.insert(auditLogs).values({
    action: 'ORDER_CREATED',
    entityType: 'ORDER',
    entityId: values.orderId,
    requestId: values.requestId,
    metadata: {
      fulfillment: values.fulfillment,
      itemCount: values.itemCount,
    },
  });
}
