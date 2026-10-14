import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { whatsappDeliveryReceipts } from '@/server/db/schema';
import type { OrdersDatabase } from '@/server/orders/types';
import {
  readWebhookSettings,
  type WebhookSettings,
} from '@/server/notifications/automation-settings';
import {
  reconcileDelivery,
  recordWhatsAppOptOut,
} from '@/server/notifications/delivery-receipts';
export const dynamic = 'force-dynamic';
const digits = z.string().regex(/^[1-9]\d{7,14}$/);
const statusSchema = z.object({
  id: z.string().min(1).max(256),
  recipient_id: digits,
  status: z.enum(['sent', 'delivered', 'read', 'failed']),
  timestamp: z.string().regex(/^\d{1,12}$/),
});
const bodySchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z
    .array(
      z.object({
        id: z.string().max(30),
        changes: z
          .array(
            z.object({
              field: z.string().max(100),
              value: z.object({
                messaging_product: z.literal('whatsapp'),
                metadata: z.object({ phone_number_id: z.string().max(30) }),
                statuses: z.array(z.unknown()).max(100).optional(),
                messages: z.array(z.unknown()).max(100).optional(),
              }),
            }),
          )
          .max(100),
      }),
    )
    .max(100),
});
const messageSchema = z.object({
  from: digits,
  type: z.literal('text'),
  text: z.object({ body: z.string().max(4096) }),
});
const headers = {
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
};
const response = (status: number) => new Response(null, { status, headers });
function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
type Dependencies = {
  database?: OrdersDatabase;
  settings?: WebhookSettings | null;
  now?: () => Date;
};
export function createWhatsAppWebhookHandlers(dependencies: Dependencies = {}) {
  const config = () =>
    dependencies.settings === undefined
      ? readWebhookSettings()
      : dependencies.settings;
  return {
    async GET(request: Request) {
      const settings = config();
      if (!settings) return response(503);
      const q = new URL(request.url).searchParams;
      const challenge = q.get('hub.challenge');
      if (
        q.get('hub.mode') !== 'subscribe' ||
        !equal(
          q.get('hub.verify_token') ?? '',
          settings.WHATSAPP_VERIFY_TOKEN,
        ) ||
        !challenge ||
        !/^\d{1,256}$/.test(challenge)
      )
        return response(403);
      return new Response(challenge, {
        headers: { ...headers, 'content-type': 'text/plain' },
      });
    },
    async POST(request: Request) {
      const settings = config();
      if (!settings) return response(503);
      const signature = request.headers.get('x-hub-signature-256') ?? '';
      if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return response(401);
      if (!request.body) return response(400);
      let raw: Buffer;
      const reader = request.body.getReader();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        void reader.cancel().catch(() => undefined);
      }, 5000);
      try {
        const chunks: Uint8Array[] = [];
        let length = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (timedOut) throw new Error('Body deadline');
          if (done) break;
          length += value.byteLength;
          if (length > 65536) {
            void reader.cancel().catch(() => undefined);
            return response(413);
          }
          chunks.push(value);
        }
        raw = Buffer.concat(chunks);
      } catch {
        return response(400);
      } finally {
        clearTimeout(timeout);
        void reader.cancel().catch(() => undefined);
      }
      if (
        !equal(
          signature,
          `sha256=${createHmac('sha256', settings.WHATSAPP_APP_SECRET).update(raw).digest('hex')}`,
        )
      )
        return response(401);
      let payload: z.infer<typeof bodySchema>;
      try {
        payload = bodySchema.parse(JSON.parse(raw.toString('utf8')));
      } catch {
        return response(400);
      }
      try {
        const database =
          dependencies.database ?? (await import('@/server/db/client')).db;
        const now = (dependencies.now ?? (() => new Date()))();
        for (const entry of payload.entry) {
          if (entry.id !== settings.WHATSAPP_BUSINESS_ACCOUNT_ID) continue;
          for (const change of entry.changes) {
            if (
              change.field !== 'messages' ||
              change.value.metadata.phone_number_id !==
                settings.WHATSAPP_PHONE_NUMBER_ID
            )
              continue;
            for (const value of change.value.statuses ?? []) {
              const parsed = statusSchema.safeParse(value);
              if (!parsed.success) continue;
              const status = parsed.data;
              const occurredAt = new Date(Number(status.timestamp) * 1000);
              if (
                occurredAt.getTime() > now.getTime() + 300000 ||
                occurredAt.getTime() < now.getTime() - 7 * 86400000
              )
                continue;
              await database.transaction(async (tx) => {
                await tx
                  .insert(whatsappDeliveryReceipts)
                  .values({
                    providerMessageId: status.id,
                    recipient: status.recipient_id,
                    status: status.status,
                    occurredAt,
                    receivedAt: now,
                  })
                  .onConflictDoNothing();
                await reconcileDelivery(tx, status.id, now);
              });
            }
            for (const value of change.value.messages ?? []) {
              const parsed = messageSchema.safeParse(value);
              if (!parsed.success) continue;
              if (
                /^(STOP|BAJA|CANCELAR|UNSUBSCRIBE|ALTO|SALIR)[.!]?$/i.test(
                  parsed.data.text.body.trim(),
                )
              )
                await recordWhatsAppOptOut(database, parsed.data.from, now);
            }
          }
        }
        return response(200);
      } catch {
        return response(503);
      }
    },
  };
}
const handlers = createWhatsAppWebhookHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;
