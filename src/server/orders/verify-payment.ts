import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  paymentMethods,
  methodMatchesFulfillment,
} from '@/domain/payment-method';
import { requireOwner, authorizeOwnerAccess } from '@/server/auth/authorize';
import { assertRecentReauthentication } from '@/server/auth/reauth';
import { db } from '@/server/db/client';
import {
  auditLogs,
  orderPaymentEvents,
  orderPricingState,
  orders,
} from '@/server/db/schema';
import { requireTrustedMutationOrigin } from '@/server/security/origin';
import { acquireCatalogMutationLock } from '@/server/products/catalog-mutation-lock';
import { lockAdminOrderByPublicId } from './repository';
import { reviewPricingInTransaction } from './review-pricing';
import {
  AdminOrderError,
  revalidateAdminActorAfterOrderLock,
} from './update-order';

export const manualPaymentInput = z
  .object({
    kind: z.enum(['VERIFIED', 'REFUNDED']),
    amountMinor: z.number().int().nonnegative().max(2_147_483_647),
    currency: z.literal('GTQ'),
    paymentMethod: z.enum(paymentMethods),
    expectedVersion: z.number().int().positive(),
    revisionId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    confirmation: z.literal(true),
    evidence: z.enum([
      'BANK_FUNDS_RECEIVED',
      'CASH_COLLECTED',
      'REFUND_RETURNED',
    ]),
    note: z
      .string()
      .trim()
      .max(160)
      .regex(/^[^\p{Cc}\p{Cf}]*$/u)
      .default(''),
  })
  .strict();

export async function recordManualPayment(
  publicId: string,
  input: z.infer<typeof manualPaymentInput>,
  headers: Headers,
  requestId: string,
) {
  requireTrustedMutationOrigin(headers);
  const initialActor = await requireOwner(headers);
  const parsed = manualPaymentInput.safeParse(input);
  if (!parsed.success) throw new AdminOrderError('VALIDATION_ERROR');
  const data = parsed.data;
  const requestHash = createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
  return db.transaction(async (tx) => {
    // Same global lock order as price review and delivery quotes prevents deadlocks.
    await acquireCatalogMutationLock(tx);
    const order = await lockAdminOrderByPublicId(tx, publicId);
    if (!order) throw new AdminOrderError('ORDER_NOT_FOUND');
    const { actor, now } = await revalidateAdminActorAfterOrderLock(
      tx,
      initialActor,
    );
    authorizeOwnerAccess(actor);
    assertRecentReauthentication(actor, 600, now);
    const [existing] = await tx
      .select()
      .from(orderPaymentEvents)
      .where(
        and(
          eq(orderPaymentEvents.orderId, order.id),
          eq(orderPaymentEvents.idempotencyKey, data.idempotencyKey),
        ),
      );
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw new AdminOrderError('PAYMENT_IDEMPOTENCY_CONFLICT');
      return {
        publicId,
        // The event is idempotent, but the order may have advanced to a refund
        // while the original response was lost. Return its current projection.
        paymentStatus: order.paymentStatus,
        version: order.version,
      };
    }
    if (order.version !== data.expectedVersion)
      throw new AdminOrderError('STALE_ORDER');
    const [current] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, order.id));
    if (
      !current.paymentMethod ||
      current.paymentMethod !== data.paymentMethod ||
      !methodMatchesFulfillment(data.paymentMethod, current.fulfillment)
    )
      throw new AdminOrderError('INVALID_PAYMENT_METHOD');
    const [receipt] = await tx
      .select()
      .from(orderPaymentEvents)
      .where(
        and(
          eq(orderPaymentEvents.orderId, order.id),
          eq(orderPaymentEvents.kind, 'VERIFIED'),
        ),
      );
    if (data.kind === 'VERIFIED') {
      if (order.orderStatus === 'CANCELLED')
        throw new AdminOrderError('TERMINAL_ORDER');
      if (receipt || !['UNPAID', 'FAILED'].includes(order.paymentStatus))
        throw new AdminOrderError('PAYMENT_ALREADY_RECORDED');
      if (order.orderStatus === 'RECEIVED')
        throw new AdminOrderError('PAYMENT_CONFIRMATION_REQUIRED');
      if (
        data.paymentMethod === 'BANK_TRANSFER'
          ? data.evidence !== 'BANK_FUNDS_RECEIVED'
          : data.evidence !== 'CASH_COLLECTED'
      )
        throw new AdminOrderError('VALIDATION_ERROR');
      if (
        data.paymentMethod !== 'BANK_TRANSFER' &&
        !(
          data.paymentMethod === 'CASH_PICKUP'
            ? ['READY', 'COMPLETED']
            : ['OUT_FOR_DELIVERY', 'COMPLETED']
        ).includes(order.orderStatus)
      )
        throw new AdminOrderError('CASH_COLLECTION_REQUIRED');
      const review = await reviewPricingInTransaction(tx, order.id);
      const [state] = await tx
        .select()
        .from(orderPricingState)
        .where(eq(orderPricingState.orderId, order.id));
      if (
        !review ||
        !state.acceptedAt ||
        state.currentRevisionId !== data.revisionId ||
        state.acceptedRevisionId !== data.revisionId
      )
        throw new AdminOrderError('PAYMENT_ACCEPTANCE_REQUIRED');
      if (review.totalMinor === null || review.totalMinor !== data.amountMinor)
        throw new AdminOrderError('PAYMENT_AMOUNT_MISMATCH');
    } else {
      if (
        !receipt ||
        order.paymentStatus !== 'PAID' ||
        order.orderStatus !== 'CANCELLED' ||
        data.evidence !== 'REFUND_RETURNED' ||
        data.revisionId !== receipt.revisionId
      )
        throw new AdminOrderError('REFUND_NOT_ALLOWED');
      if (receipt.amountMinor !== data.amountMinor)
        throw new AdminOrderError('PAYMENT_AMOUNT_MISMATCH');
    }
    const status =
      data.kind === 'VERIFIED' ? ('PAID' as const) : ('REFUNDED' as const);
    const [updated] = await tx
      .update(orders)
      .set({
        paymentStatus: status,
        version: sql`${orders.version} + 1`,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))
      .returning({ version: orders.version });
    await tx.insert(orderPaymentEvents).values({
      orderId: order.id,
      kind: data.kind,
      amountMinor: data.amountMinor,
      currency: data.currency,
      paymentMethod: data.paymentMethod,
      verifiedAt: now,
      actorId: actor.userId,
      revisionId: data.revisionId,
      evidence: data.evidence,
      note: data.note || null,
      previousStatus: order.paymentStatus,
      newStatus: status,
      idempotencyKey: data.idempotencyKey,
      requestHash,
      resultVersion: updated.version,
    });
    await tx.insert(auditLogs).values({
      actorId: actor.userId,
      action:
        data.kind === 'VERIFIED'
          ? 'ORDER_PAYMENT_VERIFIED'
          : 'ORDER_PAYMENT_REFUNDED',
      entityType: 'ORDER',
      entityId: order.id,
      requestId,
      metadata: {
        before: { paymentStatus: order.paymentStatus },
        after: {
          paymentStatus: status,
          amountMinor: data.amountMinor,
          currency: 'GTQ',
          paymentMethod: data.paymentMethod,
          revisionId: data.revisionId,
        },
      },
      createdAt: now,
    });
    return { publicId, paymentStatus: status, version: updated.version };
  });
}
