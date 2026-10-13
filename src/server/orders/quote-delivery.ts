import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { orderPricingState } from '@/server/db/schema';

import { acquireCatalogMutationLock } from '@/server/products/catalog-mutation-lock';
import { reviewPricingInTransaction } from './review-pricing';
import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import { requireTrustedMutationOrigin } from '@/server/security/origin';

import {
  AdminOrderError,
  allowedOrderTransitions,
  revalidateAdminActorAfterOrderLock,
} from './update-order';
import {
  insertAdminOrderAudit,
  lockAdminOrderByPublicId,
  persistAdminDeliveryQuote,
} from './repository';

const POSTGRES_INTEGER_MAX = 2_147_483_647;

export type DeliveryQuoteInput = Readonly<{
  orderId: string;
  shippingMinor: number;
  expectedVersion: number;
}>;

export async function quoteDelivery(
  input: DeliveryQuoteInput,
  requestHeaders: Headers,
  requestId: string,
) {
  requireTrustedMutationOrigin(requestHeaders);
  const initialActor = await requireAdmin(requestHeaders);
  return db.transaction(async (transaction) => {
    await acquireCatalogMutationLock(transaction);
    const order = await lockAdminOrderByPublicId(transaction, input.orderId);
    if (!order) throw new AdminOrderError('ORDER_NOT_FOUND');
    const { actor, now } = await revalidateAdminActorAfterOrderLock(
      transaction,
      initialActor,
    );
    if (order.version !== input.expectedVersion) {
      throw new AdminOrderError('STALE_ORDER');
    }
    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED') {
      throw new AdminOrderError('PAID_PRICING_IMMUTABLE');
    }
    if (order.fulfillment === 'PICKUP') {
      throw new AdminOrderError('PICKUP_QUOTE_FORBIDDEN');
    }
    if (
      order.orderStatus === 'COMPLETED' ||
      order.orderStatus === 'CANCELLED'
    ) {
      throw new AdminOrderError('TERMINAL_ORDER');
    }
    const review = await reviewPricingInTransaction(transaction, order.id);
    const totalMinor = review!.subtotalMinor + input.shippingMinor;
    if (
      !Number.isSafeInteger(totalMinor) ||
      totalMinor > POSTGRES_INTEGER_MAX
    ) {
      throw new AdminOrderError('DELIVERY_QUOTE_OVERFLOW');
    }
    const updated = await persistAdminDeliveryQuote(
      transaction,
      order.id,
      input.shippingMinor,
      totalMinor,
      now,
    );
    await transaction
      .update(orderPricingState)
      .set({
        acceptedRevisionId: null,
        acceptedAt: null,
        quoteVersion: sql`${orderPricingState.quoteVersion} + 1`,
      })
      .where(eq(orderPricingState.orderId, order.id));
    await insertAdminOrderAudit(transaction, {
      actorId: actor.userId,
      orderId: order.id,
      action: 'ORDER_DELIVERY_QUOTED',
      requestId,
      before: {
        shippingMinor: order.shippingMinor,
        totalMinor: order.totalMinor,
      },
      after: {
        shippingMinor: updated.shippingMinor,
        totalMinor: updated.totalMinor,
      },
    });
    return {
      order: {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
        terminalAt: updated.terminalAt?.toISOString() ?? null,
        allowedTransitions: allowedOrderTransitions(
          updated.orderStatus,
          updated.fulfillment,
        ),
      },
    } as const;
  });
}
