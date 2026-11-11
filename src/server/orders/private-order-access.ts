import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { orders } from '@/server/db/schema';
import { hashReceiptToken } from './identifiers';
import type { OrdersTransaction } from './types';

/** Caller verified the checkout cookie and holds the catalog lock first. */
export async function lockPublicOrderById(
  transaction: OrdersTransaction,
  orderId: string,
) {
  const [order] = await transaction
    .select({ id: orders.id, publicId: orders.publicId })
    .from(orders)
    .where(and(eq(orders.id, orderId), isNull(orders.anonymizedAt)))
    .for('update')
    .limit(1);
  return order ?? null;
}

async function readPrivateOrder(
  reader: Pick<OrdersTransaction, 'select'>,
  token: string,
  publicId: string | null,
  lock: boolean,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !publicId || publicId.length > 32)
    return null;
  const query = reader
    .select({ id: orders.id, publicId: orders.publicId })
    .from(orders)
    .where(
      and(
        eq(orders.receiptTokenHash, hashReceiptToken(token)),
        eq(orders.publicId, publicId),
        isNull(orders.anonymizedAt),
      ),
    )
    .limit(1);
  const [order] = await (lock ? query.for('update') : query);
  return order ?? null;
}

/** Cheap indexed rejection before unverified public requests can queue on global locks. */
export function findPrivateOrder(
  reader: Pick<OrdersTransaction, 'select'>,
  token: string,
  publicId: string | null,
) {
  return readPrivateOrder(reader, token, publicId, false);
}

/** Caller holds catalog lock first; always repeat proof validation after a preflight. */
export function lockPrivateOrder(
  transaction: OrdersTransaction,
  token: string,
  publicId: string | null,
) {
  return readPrivateOrder(transaction, token, publicId, true);
}
