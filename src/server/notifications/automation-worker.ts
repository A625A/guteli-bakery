import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, isNotNull, lt, lte } from 'drizzle-orm';
import { buildCheckoutSummary } from '@/lib/order-summary';
import { whatsappDestination } from '@/domain/whatsapp-consent';
import {
  orderWhatsAppConsents,
  orders,
  outboxEvents,
  whatsappSuppressions,
} from '@/server/db/schema';
import type { OrdersDatabase } from '@/server/orders/types';
import { acquireCatalogMutationLock } from '@/server/products/catalog-mutation-lock';
import { reviewPricingInTransaction } from '@/server/orders/review-pricing';
import { MetaWhatsAppProvider } from './meta-whatsapp-provider';
import { reconcileDelivery } from './delivery-receipts';
import type { AutomationSettings } from './automation-settings';

const EVENTS = ['OWNER_ORDER_CREATED', 'CUSTOMER_ORDER_CREATED'];
const MAX_ATTEMPTS = 5;
type Options = {
  database: OrdersDatabase;
  settings: AutomationSettings | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};
/** One durable claim per call. No public HTTP trigger and no sending in checkout. */
export async function processNextWhatsAppEvent({
  database,
  settings,
  fetchImpl,
  now = () => new Date(),
}: Options) {
  if (!settings) return 'DISABLED';
  // A crashed worker may have sent. Do not recycle its claim or silently duplicate it.
  await database
    .update(outboxEvents)
    .set({
      deliveryStatus: 'UNKNOWN',
      lastErrorCode: 'SEND_OUTCOME_UNKNOWN',
      updatedAt: now(),
    })
    .where(
      and(
        eq(outboxEvents.deliveryStatus, 'SENDING'),
        lt(outboxEvents.leaseExpiresAt, now()),
      ),
    );
  const prepared = await database.transaction(async (tx) => {
    await acquireCatalogMutationLock(tx);
    const [event] = await tx
      .select()
      .from(outboxEvents)
      .where(
        and(
          eq(outboxEvents.state, 'PENDING'),
          isNotNull(outboxEvents.dedupeKey),
          inArray(outboxEvents.eventType, EVENTS),
          lte(outboxEvents.nextAttemptAt, now()),
        ),
      )
      .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
      .limit(1)
      .for('update', { skipLocked: true });
    if (!event) return null;
    const block = async (code: string) => {
      await tx
        .update(outboxEvents)
        .set({
          state: 'BLOCKED',
          deliveryStatus: 'BLOCKED',
          lastErrorCode: code,
          updatedAt: now(),
        })
        .where(eq(outboxEvents.id, event.id));
      return { blocked: true as const };
    };
    const age = now().getTime() - event.createdAt.getTime();
    if (
      event.createdAt < new Date(settings.WHATSAPP_SEND_AFTER) ||
      age > settings.WHATSAPP_MAX_QUEUE_AGE_SECONDS * 1000 ||
      age < 0
    )
      return block('OUTSIDE_AUTHORIZED_WINDOW');
    if (event.attempts >= MAX_ATTEMPTS) return block('RETRY_LIMIT');
    if (!/^[0-9a-f-]{36}$/i.test(event.payload.orderId))
      return block('INVALID_ORDER');
    const review = await reviewPricingInTransaction(
      tx,
      event.payload.orderId,
      now,
    );
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, event.payload.orderId));
    if (
      !review ||
      !order ||
      order.anonymizedAt ||
      ['CANCELLED', 'COMPLETED'].includes(order.orderStatus)
    )
      return block('ORDER_INELIGIBLE');
    const isCustomer = event.eventType === 'CUSTOMER_ORDER_CREATED';
    const [consent] = await tx
      .select()
      .from(orderWhatsAppConsents)
      .where(eq(orderWhatsAppConsents.orderId, order.id));
    const recipient = isCustomer
      ? consent?.destination
      : settings.OWNER_WHATSAPP_DESTINATION;
    if (
      !recipient ||
      (isCustomer && recipient !== whatsappDestination(order.phone))
    )
      return block('CONSENT_REQUIRED');
    const [suppressed] = await tx
      .select()
      .from(whatsappSuppressions)
      .where(eq(whatsappSuppressions.destination, recipient));
    if (suppressed) return block('RECIPIENT_OPTED_OUT');
    // Format from one current, locked snapshot; never replay a stale promotional body.
    const message = buildCheckoutSummary({ ...order, ...review });
    const body = `${isCustomer ? 'Recibimos tu solicitud de pedido.' : 'Nueva solicitud para la tienda.'} ${message.replace(/\s*\n\s*/g, ' | ').replace(/\s+/g, ' ')} | Para dejar de recibir estos mensajes, responde BAJA o contacta a Güteli.`;
    if (body.length > settings.WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS)
      return block('PAYLOAD_UNREPRESENTABLE');
    const attemptToken = randomUUID();
    await tx
      .update(outboxEvents)
      .set({
        state: 'BLOCKED',
        deliveryStatus: 'SENDING',
        recipient,
        attemptToken,
        attempts: event.attempts + 1,
        leaseExpiresAt: new Date(now().getTime() + 60000),
        lastErrorCode: null,
        updatedAt: now(),
      })
      .where(eq(outboxEvents.id, event.id));
    return {
      blocked: false as const,
      event,
      attemptToken,
      recipient,
      body,
      validUntil: review.validUntil,
      template: isCustomer
        ? settings.WHATSAPP_CUSTOMER_ORDER_TEMPLATE
        : settings.WHATSAPP_OWNER_ORDER_TEMPLATE,
    };
  });
  if (!prepared) return 'IDLE';
  if (prepared.blocked) return 'BLOCKED';
  const claim = and(
    eq(outboxEvents.id, prepared.event.id),
    eq(outboxEvents.attemptToken, prepared.attemptToken),
    inArray(outboxEvents.deliveryStatus, ['SENDING', 'UNKNOWN']),
  );
  const [suppressed] = await database
    .select()
    .from(whatsappSuppressions)
    .where(eq(whatsappSuppressions.destination, prepared.recipient));
  if (suppressed) {
    await database
      .update(outboxEvents)
      .set({
        deliveryStatus: 'BLOCKED',
        lastErrorCode: 'RECIPIENT_OPTED_OUT',
        updatedAt: now(),
      })
      .where(claim);
    return 'BLOCKED';
  }
  if (prepared.validUntil && now() >= new Date(prepared.validUntil)) {
    await database
      .update(outboxEvents)
      .set({
        state: 'PENDING',
        deliveryStatus: 'QUEUED',
        nextAttemptAt: now(),
        leaseExpiresAt: null,
        attempts: prepared.event.attempts,
        updatedAt: now(),
      })
      .where(claim);
    return 'REPRICE';
  }
  const provider = new MetaWhatsAppProvider(
    {
      apiBaseUrl: 'https://graph.facebook.com',
      apiVersion: settings.WHATSAPP_API_VERSION,
      phoneNumberId: settings.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: settings.WHATSAPP_ACCESS_TOKEN,
      ownerDestination: prepared.recipient,
      templateName: prepared.template,
      templateLanguage: settings.WHATSAPP_APPROVED_TEMPLATE_LANGUAGE,
      templateBodyMaxCharacters: settings.WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS,
      publicAdminBaseUrl: 'https://unused.invalid',
    },
    { fetchImpl },
  );
  const result = await provider.sendOrderSummary(prepared.body);
  const common = { updatedAt: now(), leaseExpiresAt: null };
  if (result.kind === 'accepted') {
    await database
      .update(outboxEvents)
      .set({
        ...common,
        state: 'SENT',
        deliveryStatus: 'ACCEPTED',
        providerMessageId: result.providerMessageId,
        lastErrorCode: null,
      })
      .where(claim);
    await reconcileDelivery(database, result.providerMessageId, now());
    return 'ACCEPTED';
  }
  // A definitive 429 rejection may be retried. Ambiguous outcomes never are.
  if (
    result.code === 'PROVIDER_RATE_LIMITED' &&
    prepared.event.attempts + 1 < MAX_ATTEMPTS
  ) {
    await database
      .update(outboxEvents)
      .set({
        ...common,
        state: 'PENDING',
        deliveryStatus: 'QUEUED',
        lastErrorCode: result.code,
        nextAttemptAt: new Date(
          now().getTime() +
            Math.min(3600, 60 * 2 ** prepared.event.attempts) * 1000,
        ),
      })
      .where(claim);
    return 'RETRY';
  }
  if (result.code === 'PROVIDER_RATE_LIMITED') {
    await database
      .update(outboxEvents)
      .set({
        ...common,
        state: 'BLOCKED',
        deliveryStatus: 'BLOCKED',
        lastErrorCode: 'RETRY_LIMIT',
      })
      .where(claim);
    return 'BLOCKED';
  }
  await database
    .update(outboxEvents)
    .set({
      ...common,
      state: result.kind === 'permanent_failure' ? 'FAILED' : 'BLOCKED',
      deliveryStatus:
        result.kind === 'permanent_failure' ? 'FAILED' : 'UNKNOWN',
      lastErrorCode: result.code,
    })
    .where(claim);
  return result.kind === 'permanent_failure' ? 'FAILED' : 'UNKNOWN';
}
