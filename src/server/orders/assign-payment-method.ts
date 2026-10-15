import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  paymentMethods,
  methodMatchesFulfillment,
} from '@/domain/payment-method';
import { requireOwner, authorizeOwnerAccess } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import { orders } from '@/server/db/schema';
import { requireTrustedMutationOrigin } from '@/server/security/origin';
import {
  AdminOrderError,
  revalidateAdminActorAfterOrderLock,
} from './update-order';
import { insertAdminOrderAudit, lockAdminOrderByPublicId } from './repository';

export const paymentMethodInput = z
  .object({
    paymentMethod: z.enum(paymentMethods),
    instructionsDraft: z.string().trim().max(500).default(''),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export async function assignPaymentMethod(
  publicId: string,
  input: z.infer<typeof paymentMethodInput>,
  headers: Headers,
  requestId: string,
) {
  requireTrustedMutationOrigin(headers);
  const initialActor = await requireOwner(headers);
  const data = paymentMethodInput.parse(input);
  return db.transaction(async (transaction) => {
    const order = await lockAdminOrderByPublicId(transaction, publicId);
    if (!order) throw new AdminOrderError('ORDER_NOT_FOUND');
    const { actor, now } = await revalidateAdminActorAfterOrderLock(
      transaction,
      initialActor,
    );
    authorizeOwnerAccess(actor);
    if (order.version !== data.expectedVersion)
      throw new AdminOrderError('STALE_ORDER');
    if (['COMPLETED', 'CANCELLED'].includes(order.orderStatus))
      throw new AdminOrderError('TERMINAL_ORDER');
    if (['PAID', 'PENDING', 'REFUNDED'].includes(order.paymentStatus))
      throw new AdminOrderError('PAYMENT_METHOD_LOCKED');
    if (!methodMatchesFulfillment(data.paymentMethod, order.fulfillment))
      throw new AdminOrderError('INVALID_PAYMENT_METHOD');
    const [before] = await transaction
      .select({ method: orders.paymentMethod })
      .from(orders)
      .where(eq(orders.id, order.id));
    const [updated] = await transaction
      .update(orders)
      .set({
        paymentMethod: data.paymentMethod,
        paymentInstructionsDraft:
          data.paymentMethod === 'BANK_TRANSFER'
            ? data.instructionsDraft || null
            : null,
        paymentMethodUpdatedAt: now,
        updatedAt: now,
        version: sql`${orders.version} + 1`,
      })
      .where(eq(orders.id, order.id))
      .returning({
        publicId: orders.publicId,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        version: orders.version,
      });
    // Never include account instructions in audit metadata or public responses.
    await insertAdminOrderAudit(transaction, {
      actorId: actor.userId,
      orderId: order.id,
      action: 'ORDER_PAYMENT_METHOD_CHANGED',
      requestId,
      before: { paymentMethod: before.method },
      after: { paymentMethod: updated.paymentMethod },
    });
    return { order: updated };
  });
}
