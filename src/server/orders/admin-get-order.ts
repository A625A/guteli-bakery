import 'server-only';

import { asc, desc, eq, sql } from 'drizzle-orm';

import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import {
  auditLogs,
  orderItems,
  orders,
  outboxEvents,
} from '@/server/db/schema';
import type { OrderStatus } from '@/domain/order-state';

import { allowedOrderTransitions } from './update-order';

type SafeStatusHistory = Readonly<{
  action: 'ORDER_STATUS_CHANGED';
  from: OrderStatus;
  to: OrderStatus;
  createdAt: string;
}>;

function readStatus(value: unknown): OrderStatus | null {
  if (typeof value !== 'string') return null;
  const statuses: readonly string[] = [
    'RECEIVED',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
  ];
  return statuses.includes(value) ? (value as OrderStatus) : null;
}

function safeHistoryEntry(candidate: {
  action: string;
  metadata: unknown;
  createdAt: Date;
}): SafeStatusHistory | null {
  if (
    candidate.action !== 'ORDER_STATUS_CHANGED' ||
    !candidate.metadata ||
    typeof candidate.metadata !== 'object'
  ) {
    return null;
  }
  const metadata = candidate.metadata as {
    before?: { orderStatus?: unknown };
    after?: { orderStatus?: unknown };
  };
  const from = readStatus(metadata.before?.orderStatus);
  const to = readStatus(metadata.after?.orderStatus);
  if (!from || !to) return null;
  return {
    action: 'ORDER_STATUS_CHANGED',
    from,
    to,
    createdAt: candidate.createdAt.toISOString(),
  };
}

export async function adminGetOrder(publicId: string, requestHeaders: Headers) {
  await requireAdmin(requestHeaders);
  const [order] = await db
    .select({
      id: orders.id,
      publicId: orders.publicId,
      customerName: orders.customerName,
      phone: orders.phone,
      fulfillment: orders.fulfillment,
      requestedDate: orders.requestedDate,
      deliveryLocation: orders.deliveryLocation,
      notes: orders.notes,
      subtotalMinor: orders.subtotalMinor,
      shippingMinor: orders.shippingMinor,
      totalMinor: orders.totalMinor,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      version: orders.version,
      terminalAt: orders.terminalAt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(eq(orders.publicId, publicId))
    .limit(1);
  if (!order) return null;

  const [items, historyRows, notifications] = await Promise.all([
    db
      .select({
        productName: orderItems.productName,
        categoryLabel: orderItems.categoryLabel,
        saleUnit: orderItems.saleUnit,
        unitPriceMinor: orderItems.unitPriceMinor,
        quantity: orderItems.quantity,
        lineTotalMinor: orderItems.lineTotalMinor,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .orderBy(asc(orderItems.createdAt), asc(orderItems.id)),
    db
      .select({
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.entityId, order.id))
      .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id)),
    db
      .select({
        eventType: outboxEvents.eventType,
        state: outboxEvents.state,
        attempts: outboxEvents.attempts,
        lastErrorCode: outboxEvents.lastErrorCode,
        createdAt: outboxEvents.createdAt,
        updatedAt: outboxEvents.updatedAt,
        sentAt: outboxEvents.sentAt,
      })
      .from(outboxEvents)
      .where(sql`${outboxEvents.payload}->>'orderId' = ${order.id}`)
      .orderBy(desc(outboxEvents.createdAt), desc(outboxEvents.id)),
  ]);
  return {
    publicId: order.publicId,
    customerName: order.customerName,
    phone: order.phone,
    fulfillment: order.fulfillment,
    requestedDate: order.requestedDate,
    deliveryLocation: order.deliveryLocation,
    notes: order.notes,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: order.totalMinor,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    version: order.version,
    terminalAt: order.terminalAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    allowedTransitions: allowedOrderTransitions(
      order.orderStatus,
      order.fulfillment,
    ),
    items,
    statusHistory: historyRows
      .map(safeHistoryEntry)
      .filter((entry): entry is SafeStatusHistory => entry !== null),
    notifications: notifications.map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
      sentAt: notification.sentAt?.toISOString() ?? null,
    })),
  } as const;
}
