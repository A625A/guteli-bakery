import 'server-only';

import { and, eq, gt, inArray } from 'drizzle-orm';

import {
  AuthorizationError,
  requireAdmin,
  type AuthorizedActor,
} from '@/server/auth/authorize';
import { assertRecentReauthentication } from '@/server/auth/reauth';
import { db } from '@/server/db/client';
import { session, user } from '@/server/db/schema';
import type { OrderStatus } from '@/domain/order-state';
import { requireTrustedMutationOrigin } from '@/server/security/origin';
import type { OrdersTransaction } from './types';

import {
  insertAdminOrderAudit,
  lockAdminOrderByPublicId,
  persistAdminOrderStatus,
} from './repository';

export type AdminOrderErrorCode =
  | 'ORDER_NOT_FOUND'
  | 'STALE_ORDER'
  | 'INVALID_STATUS_TRANSITION'
  | 'PICKUP_QUOTE_FORBIDDEN'
  | 'TERMINAL_ORDER'
  | 'DELIVERY_QUOTE_OVERFLOW';

export class AdminOrderError extends Error {
  readonly code: AdminOrderErrorCode;

  constructor(code: AdminOrderErrorCode) {
    super(code);
    this.name = 'AdminOrderError';
    this.code = code;
  }
}

export type UpdateOrderStatusInput = Readonly<{
  orderId: string;
  status: OrderStatus;
  expectedVersion: number;
}>;

const terminalStatuses = new Set<OrderStatus>(['COMPLETED', 'CANCELLED']);

export function allowedOrderTransitions(
  status: OrderStatus,
  fulfillment: 'PICKUP' | 'DELIVERY',
): readonly OrderStatus[] {
  if (terminalStatuses.has(status)) return [];
  if (status === 'RECEIVED') return ['CONFIRMED', 'CANCELLED'];
  if (status === 'CONFIRMED') return ['PREPARING', 'CANCELLED'];
  if (status === 'PREPARING') return ['READY', 'CANCELLED'];
  if (status === 'READY') {
    return fulfillment === 'PICKUP'
      ? ['COMPLETED', 'CANCELLED']
      : ['OUT_FOR_DELIVERY', 'CANCELLED'];
  }
  return ['COMPLETED', 'CANCELLED'];
}

/** Rechecks the live account/session after the order row lock has been won. */
export async function revalidateAdminActorAfterOrderLock(
  transaction: OrdersTransaction,
  actor: AuthorizedActor,
) {
  const now = new Date();
  const [current] = await transaction
    .select({
      role: user.role,
      mfaVerifiedAt: session.mfaVerifiedAt,
    })
    .from(user)
    .innerJoin(
      session,
      and(eq(session.id, actor.sessionId), eq(session.userId, user.id)),
    )
    .where(
      and(
        eq(user.id, actor.userId),
        eq(user.active, true),
        inArray(user.role, ['OWNER', 'ADMIN']),
        gt(session.expiresAt, now),
      ),
    )
    .limit(1);
  if (!current?.mfaVerifiedAt) throw new AuthorizationError('FORBIDDEN');
  return {
    actor: {
      ...actor,
      role: current.role,
      mfaVerifiedAt: current.mfaVerifiedAt,
    } satisfies AuthorizedActor,
    now,
  } as const;
}

export async function updateOrderStatus(
  input: UpdateOrderStatusInput,
  requestHeaders: Headers,
  requestId: string,
) {
  requireTrustedMutationOrigin(requestHeaders);
  const initialActor = await requireAdmin(requestHeaders);
  return db.transaction(async (transaction) => {
    const order = await lockAdminOrderByPublicId(transaction, input.orderId);
    if (!order) throw new AdminOrderError('ORDER_NOT_FOUND');
    const { actor, now } = await revalidateAdminActorAfterOrderLock(
      transaction,
      initialActor,
    );
    if (order.version !== input.expectedVersion) {
      throw new AdminOrderError('STALE_ORDER');
    }
    if (
      !allowedOrderTransitions(order.orderStatus, order.fulfillment).includes(
        input.status,
      )
    ) {
      throw new AdminOrderError('INVALID_STATUS_TRANSITION');
    }
    if (input.status === 'CANCELLED' && order.orderStatus !== 'RECEIVED') {
      assertRecentReauthentication(actor, 600, now);
    }
    const updated = await persistAdminOrderStatus(
      transaction,
      order.id,
      input.status,
      now,
    );
    await insertAdminOrderAudit(transaction, {
      actorId: actor.userId,
      orderId: order.id,
      action: 'ORDER_STATUS_CHANGED',
      requestId,
      before: { orderStatus: order.orderStatus },
      after: { orderStatus: updated.orderStatus },
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
