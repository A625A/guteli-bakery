import { asc, eq } from 'drizzle-orm';
import {
  orderItems,
  orderPricingRevisions,
  orderPricingState,
  orders,
  outboxEvents,
} from '../db/schema';
import type { OrdersTransaction } from '../orders/types';

export const OWNER_EMAIL_EVENT = 'OWNER_ORDER_EMAIL';

/** Called inside order creation's transaction, after authoritative pricing review. No network I/O. */
export async function enqueueOwnerOrderEmail(
  transaction: OrdersTransaction,
  identity: { orderId: string; requestId: string },
  now: Date,
) {
  const [order] = await transaction
    .select()
    .from(orders)
    .where(eq(orders.id, identity.orderId));
  if (!order) throw new Error('Cannot queue email for missing order');
  const storedItems = await transaction
    .select({
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      lineTotalMinor: orderItems.lineTotalMinor,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.id));
  const [current] = await transaction
    .select({ snapshot: orderPricingRevisions.snapshot })
    .from(orderPricingState)
    .innerJoin(
      orderPricingRevisions,
      eq(orderPricingRevisions.id, orderPricingState.currentRevisionId),
    )
    .where(eq(orderPricingState.orderId, order.id));
  const items =
    current?.snapshot.items.map(
      ({ productName, quantity, lineTotalMinor }) => ({
        productName,
        quantity,
        lineTotalMinor,
      }),
    ) ?? storedItems;
  await transaction
    .insert(outboxEvents)
    .values({
      eventType: OWNER_EMAIL_EVENT,
      dedupeKey: `email:order:${order.id}`,
      payload: {
        ...identity,
        ownerEmail: {
          snapshot: {
            publicId: order.publicId,
            fulfillment: order.fulfillment,
            requestedDate: order.requestedDate,
            paymentMethod: order.paymentMethod,
            subtotalMinor: order.subtotalMinor,
            shippingMinor: order.shippingMinor,
            totalMinor: order.totalMinor,
            items,
          },
        },
      },
      state: 'PENDING',
      deliveryStatus: 'QUEUED',
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: outboxEvents.dedupeKey });
}
