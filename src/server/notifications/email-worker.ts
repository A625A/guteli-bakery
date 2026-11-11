import { createHash, randomUUID } from 'node:crypto';
import { and, asc, eq, isNull, lte, or } from 'drizzle-orm';
import { outboxEvents } from '../db/schema';
import type { OrdersDatabase } from '../orders/types';
import { buildOwnerOrderEmail } from './email-message';
import type { EmailSettings } from './email-settings';
import { OWNER_EMAIL_EVENT } from './email-outbox';
import { sendOwnerEmail } from './email-provider';

const MAX_ATTEMPTS = 5;
// Stop conservatively before Resend's 24h key expiry. A late ambiguous retry could duplicate mail.
const SAFE_RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const fingerprint = (settings: EmailSettings) =>
  createHash('sha256')
    .update(
      JSON.stringify([
        settings.EMAIL_FROM,
        settings.EMAIL_OWNER_TO,
        settings.EMAIL_ADMIN_ORIGIN,
        settings.RESEND_API_KEY,
      ]),
    )
    .digest('hex');

type Options = {
  database: OrdersDatabase;
  settings: EmailSettings | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

/** One durable, leased claim. Safe across scheduled/serverless restarts and concurrent runs. */
export async function processNextOwnerEmail({
  database,
  settings,
  fetchImpl,
  now = () => new Date(),
}: Options) {
  if (!settings) return 'DISABLED';
  const prepared = await database.transaction(async (transaction) => {
    const [event] = await transaction
      .select()
      .from(outboxEvents)
      .where(
        and(
          eq(outboxEvents.eventType, OWNER_EMAIL_EVENT),
          eq(outboxEvents.state, 'PENDING'),
          lte(outboxEvents.nextAttemptAt, now()),
          or(
            isNull(outboxEvents.leaseExpiresAt),
            lte(outboxEvents.leaseExpiresAt, now()),
          ),
        ),
      )
      .orderBy(asc(outboxEvents.createdAt), asc(outboxEvents.id))
      .limit(1)
      .for('update', { skipLocked: true });
    if (!event) return null;
    const block = async (code: string, unknown = false) => {
      await transaction
        .update(outboxEvents)
        .set({
          state: 'BLOCKED',
          deliveryStatus: unknown ? 'UNKNOWN' : 'BLOCKED',
          lastErrorCode: code,
          leaseExpiresAt: null,
          updatedAt: now(),
        })
        .where(eq(outboxEvents.id, event.id));
      return { blocked: true as const };
    };
    if (event.createdAt < new Date(settings.EMAIL_SEND_AFTER))
      return block('EMAIL_BEFORE_ACTIVATION');
    if (!event.payload.ownerEmail || !event.dedupeKey)
      return block('EMAIL_INVALID_EVENT');
    const data = event.payload.ownerEmail;
    const configurationFingerprint = fingerprint(settings);
    if (
      data.frozen &&
      data.frozen.configurationFingerprint !== configurationFingerprint
    )
      return block('EMAIL_CONFIGURATION_CHANGED', true);
    const frozen = data.frozen ?? {
      firstAttemptAt: now().toISOString(),
      configurationFingerprint,
      request: {
        from: settings.EMAIL_FROM,
        to: [settings.EMAIL_OWNER_TO],
        ...buildOwnerOrderEmail(data.snapshot, settings.EMAIL_ADMIN_ORIGIN),
      },
    };
    const age = now().getTime() - Date.parse(frozen.firstAttemptAt);
    if (!Number.isFinite(age) || age < 0 || age >= SAFE_RETRY_WINDOW_MS)
      return block('EMAIL_IDEMPOTENCY_EXPIRED', true);
    if (event.attempts >= MAX_ATTEMPTS) return block('EMAIL_RETRY_LIMIT', true);
    const attemptToken = randomUUID();
    await transaction
      .update(outboxEvents)
      .set({
        payload: { ...event.payload, ownerEmail: { ...data, frozen } },
        deliveryStatus: 'SENDING',
        attemptToken,
        attempts: event.attempts + 1,
        leaseExpiresAt: new Date(now().getTime() + 60_000),
        updatedAt: now(),
      })
      .where(eq(outboxEvents.id, event.id));
    return { blocked: false as const, event, frozen, attemptToken };
  });
  if (!prepared) return 'IDLE';
  if (prepared.blocked) return 'BLOCKED';
  const result = await sendOwnerEmail({
    apiKey: settings.RESEND_API_KEY,
    payload: prepared.frozen.request,
    idempotencyKey: prepared.event.dedupeKey!,
    fetchImpl,
  });
  const claim = and(
    eq(outboxEvents.id, prepared.event.id),
    eq(outboxEvents.attemptToken, prepared.attemptToken),
  );
  if (result.kind === 'accepted') {
    await database
      .update(outboxEvents)
      .set({
        state: 'SENT',
        deliveryStatus: 'ACCEPTED',
        providerMessageId: `resend:${result.providerMessageId}`,
        lastErrorCode: null,
        leaseExpiresAt: null,
        updatedAt: now(),
      })
      .where(claim);
    return 'ACCEPTED';
  }
  const retry =
    result.kind === 'retryable' && prepared.event.attempts + 1 < MAX_ATTEMPTS;
  await database
    .update(outboxEvents)
    .set({
      state: retry
        ? 'PENDING'
        : result.kind === 'permanent_failure'
          ? 'FAILED'
          : 'BLOCKED',
      deliveryStatus: retry
        ? 'QUEUED'
        : result.kind === 'permanent_failure'
          ? 'FAILED'
          : 'UNKNOWN',
      lastErrorCode:
        retry || result.kind === 'permanent_failure'
          ? result.code
          : 'EMAIL_RETRY_LIMIT',
      leaseExpiresAt: null,
      nextAttemptAt: new Date(
        now().getTime() +
          Math.min(3600, 60 * 2 ** prepared.event.attempts) * 1000,
      ),
      updatedAt: now(),
    })
    .where(claim);
  return retry
    ? 'RETRY'
    : result.kind === 'permanent_failure'
      ? 'FAILED'
      : 'BLOCKED';
}
