import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import {
  outboxEvents,
  whatsappDeliveryReceipts,
  whatsappSuppressions,
} from '@/server/db/schema';
import type { OrdersDatabase, OrdersTransaction } from '@/server/orders/types';
const ranks: Record<string, number> = {
  ACCEPTED: 0,
  SENT: 1,
  FAILED: 2,
  DELIVERED: 3,
  READ: 4,
};
export async function reconcileDelivery(
  database: OrdersDatabase | OrdersTransaction,
  providerMessageId: string,
  now: Date,
) {
  await database.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.providerMessageId, providerMessageId))
      .for('update');
    if (!event || !event.dedupeKey) return;
    const receipts = await tx
      .select()
      .from(whatsappDeliveryReceipts)
      .where(
        and(
          eq(whatsappDeliveryReceipts.providerMessageId, providerMessageId),
          eq(whatsappDeliveryReceipts.recipient, event.recipient ?? ''),
        ),
      );
    let next = event.deliveryStatus;
    let occurredAt = event.deliveryUpdatedAt;
    for (const receipt of receipts) {
      const status = receipt.status.toUpperCase();
      if ((ranks[status] ?? -1) > (ranks[next] ?? -1)) {
        next = status;
        occurredAt = receipt.occurredAt;
      }
    }
    if (next === event.deliveryStatus) return;
    await tx
      .update(outboxEvents)
      .set({
        deliveryStatus: next,
        deliveryUpdatedAt: occurredAt,
        state: next === 'FAILED' ? 'FAILED' : 'SENT',
        lastErrorCode: next === 'FAILED' ? 'DELIVERY_FAILED' : null,
        sentAt:
          next === 'DELIVERED' || next === 'READ' ? occurredAt : event.sentAt,
        updatedAt: now,
      })
      .where(eq(outboxEvents.id, event.id));
  });
}
/** Used for both signed inbound keywords and owner-recorded off-channel withdrawal. */
export async function recordWhatsAppOptOut(
  database: OrdersDatabase | OrdersTransaction,
  destination: string,
  now: Date,
) {
  if (!/^[1-9]\d{7,14}$/.test(destination))
    throw new Error('Invalid destination');
  await database
    .insert(whatsappSuppressions)
    .values({ destination, revokedAt: now })
    .onConflictDoUpdate({
      target: whatsappSuppressions.destination,
      set: {
        revokedAt: sql`greatest(${whatsappSuppressions.revokedAt}, ${now})`,
      },
    });
}
