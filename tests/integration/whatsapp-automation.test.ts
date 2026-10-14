import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { categories, products, outboxEvents } from '@/server/db/schema';
import { createOrder } from '@/server/orders/create-order';
import { requireTestDatabaseUrl } from '@/test/database-url';
const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'WhatsApp tests',
  ),
});
const database = drizzle({ client: pool });
let now = new Date();
let productId: string;
function input(optIn = false, key = randomUUID()) {
  return {
    database,
    now,
    clock: () => now,
    requestId: 'notification-test',
    receiptTokenSecret: 'test-only-automation-receipt-secret-32bytes',
    idempotencyKey: key,
    idempotencySubject: 'test-customer',
    request: {
      customerName: 'Ana',
      phone: '55551234',
      fulfillment: 'pickup' as const,
      requestedDate: '2099-01-01',
      whatsappOptIn: optIn,
      items: [{ productId, quantity: 5 }],
    },
  };
}
beforeEach(async () => {
  now = new Date();
  await pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
  );
  await migrate(database, { migrationsFolder: join(process.cwd(), 'drizzle') });
  const [category] = await database
    .insert(categories)
    .values({ name: 'Pan', slug: 'pan' })
    .returning();
  const [product] = await database
    .insert(products)
    .values({
      categoryId: category.id,
      name: 'Café & Pan',
      slug: 'pan',
      priceMinor: 10000,
      saleUnit: 'Bolsa',
    })
    .returning();
  productId = product.id;
});
afterAll(() => pool.end());
it('atomically queues one owner and one consented customer event despite concurrent order retries', async () => {
  const request = input(true);
  await Promise.all([createOrder(request), createOrder(request)]);
  const events = await database.select().from(outboxEvents);
  expect(events.map((e) => e.eventType).sort()).toEqual([
    'CUSTOMER_ORDER_CREATED',
    'OWNER_ORDER_CREATED',
  ]);
  expect(events.every((e) => e.state === 'PENDING' && e.attempts === 0)).toBe(
    true,
  );
  const consent = await pool.query(
    'SELECT destination, consent_version, consent_text FROM order_whatsapp_consents',
  );
  expect(consent.rows).toEqual([
    expect.objectContaining({
      destination: '50255551234',
      consent_version: 'order-updates-v1',
      consent_text: expect.stringContaining('BAJA'),
    }),
  ]);
  await expect(
    createOrder({
      ...request,
      request: { ...request.request, whatsappOptIn: false },
    }),
  ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
});
it('without consent only the owner event is created', async () => {
  await createOrder(input());
  expect(
    (await database.select().from(outboxEvents)).map((e) => e.eventType),
  ).toEqual(['OWNER_ORDER_CREATED']);
  expect(
    (await pool.query('SELECT * FROM order_whatsapp_consents')).rowCount,
  ).toBe(0);
});

import { processNextWhatsAppEvent } from '@/server/notifications/automation-worker';
import { automationSettings } from '../support/whatsapp-fixture';
it('disabled processor never contacts Meta; enabled workers claim each recipient once and report acceptance without delivery', async () => {
  await createOrder(input(true));
  const fetchImpl = vi.fn(async () =>
    Response.json({ messages: [{ id: `wamid.${randomUUID()}` }] }),
  );
  expect(
    await processNextWhatsAppEvent({
      database,
      settings: null,
      fetchImpl,
      now: () => now,
    }),
  ).toBe('DISABLED');
  expect(fetchImpl).not.toHaveBeenCalled();
  const options = {
    database,
    settings: automationSettings(now),
    fetchImpl,
    now: () => now,
  };
  await Promise.all([
    processNextWhatsAppEvent(options),
    processNextWhatsAppEvent(options),
    processNextWhatsAppEvent(options),
  ]);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  const payloads = fetchImpl.mock.calls.map((call) =>
    JSON.parse((call as unknown as [string, RequestInit])[1].body as string),
  );
  expect(payloads.map((p) => p.to).sort()).toEqual([
    '50244441234',
    '50255551234',
  ]);
  expect(
    payloads.every((p) =>
      p.template.components[0].parameters[0].text.includes('Q500'),
    ),
  ).toBe(true);
  expect(
    payloads.every(
      (p) =>
        !p.template.components[0].parameters[0].text.includes(
          'Pago verificado',
        ),
    ),
  ).toBe(true);
  const events = await database.select().from(outboxEvents);
  expect(
    events.every((e) => e.deliveryStatus === 'ACCEPTED' && e.sentAt === null),
  ).toBe(true);
});

import { createHmac } from 'node:crypto';
import { createWhatsAppWebhookHandlers } from '@/app/api/webhooks/whatsapp/route';
function webhook(body: unknown, signature = true) {
  const text = JSON.stringify(body);
  return new Request('https://bakery.example/api/webhooks/whatsapp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hub-signature-256': signature
        ? `sha256=${createHmac('sha256', automationSettings(now).WHATSAPP_APP_SECRET).update(text).digest('hex')}`
        : 'sha256=invalid',
    },
    body: text,
  });
}
function envelope(statuses: unknown[] = [], messages: unknown[] = []) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '456',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { phone_number_id: '123' },
              statuses,
              messages,
            },
          },
        ],
      },
    ],
  };
}
it('authenticates callbacks and reconciles an early delivered callback without downgrading or claiming payment', async () => {
  await createOrder(input());
  const settings = automationSettings(now);
  const handlers = createWhatsAppWebhookHandlers({
    database,
    settings: { ...settings, WHATSAPP_WEBHOOKS_ENABLED: 'true' },
    now: () => now,
  });
  const status = {
    id: 'wamid.early',
    recipient_id: '50244441234',
    status: 'delivered',
    timestamp: String(Math.floor(now.getTime() / 1000)),
  };
  expect((await handlers.POST(webhook(envelope([status]), false))).status).toBe(
    401,
  );
  const fetchImpl = vi.fn(async () => {
    expect((await handlers.POST(webhook(envelope([status])))).status).toBe(200);
    return Response.json({ messages: [{ id: 'wamid.early' }] });
  });
  await processNextWhatsAppEvent({
    database,
    settings,
    fetchImpl,
    now: () => now,
  });
  await handlers.POST(
    webhook(envelope([{ ...status, status: 'sent' }, status])),
  );
  const [event] = await database.select().from(outboxEvents);
  expect(event.deliveryStatus).toBe('DELIVERED');
  expect(
    (await pool.query('SELECT payment_status FROM orders')).rows[0]
      .payment_status,
  ).toBe('UNPAID');
});
it('signed customer opt-out blocks queued messages while preserving the independent owner notification', async () => {
  await createOrder(input(true));
  const settings = automationSettings(now);
  const handlers = createWhatsAppWebhookHandlers({
    database,
    settings: { ...settings, WHATSAPP_WEBHOOKS_ENABLED: 'true' },
    now: () => now,
  });
  const stop = {
    id: 'inbound-stop',
    from: '50255551234',
    type: 'text',
    text: { body: 'BAJA' },
  };
  expect((await handlers.POST(webhook(envelope([], [stop])))).status).toBe(200);
  const fetchImpl = vi.fn(async () =>
    Response.json({ messages: [{ id: 'wamid.owner' }] }),
  );
  const options = { database, settings, fetchImpl, now: () => now };
  await processNextWhatsAppEvent(options);
  await processNextWhatsAppEvent(options);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(
    JSON.parse(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    ).to,
  ).toBe('50244441234');
});

import { promotions } from '@/server/db/schema';
it('retries definitive rate limits with backoff and fresh pricing, but never automatically retries an ambiguous send', async () => {
  const started = new Date(now);
  await database.insert(promotions).values({
    name: 'Oferta 70',
    scope: 'CATALOG',
    discountBps: 7000,
    startsAt: new Date(now.getTime() - 60000),
    endsAt: new Date(now.getTime() + 30000),
  });
  await createOrder(input());
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 429 }))
    .mockResolvedValueOnce(
      Response.json({ messages: [{ id: 'wamid.retry' }] }),
    );
  const options = {
    database,
    settings: automationSettings(started),
    fetchImpl,
    now: () => now,
  };
  expect(await processNextWhatsAppEvent(options)).toBe('RETRY');
  expect(await processNextWhatsAppEvent(options)).toBe('IDLE');
  now = new Date(started.getTime() + 61000);
  expect(await processNextWhatsAppEvent(options)).toBe('ACCEPTED');
  const bodies = fetchImpl.mock.calls.map(
    (call) =>
      JSON.parse(call[1].body).template.components[0].parameters[0].text,
  );
  expect(bodies[0]).toContain('Q150');
  expect(bodies[1]).toContain('Q500');
  expect(bodies[1]).not.toContain('Oferta 70');
  await createOrder(input(false));
  const uncertain = vi.fn(async () => {
    throw new Error('private token error should never be stored');
  });
  expect(
    await processNextWhatsAppEvent({ ...options, fetchImpl: uncertain }),
  ).toBe('UNKNOWN');
  now = new Date(now.getTime() + 3600000);
  expect(
    await processNextWhatsAppEvent({ ...options, fetchImpl: uncertain }),
  ).toBe('IDLE');
  expect(uncertain).toHaveBeenCalledTimes(1);
  expect(
    (await database.select().from(outboxEvents)).some(
      (e) => e.lastErrorCode === 'PROVIDER_NETWORK_ERROR',
    ),
  ).toBe(true);
});
it('holds a crashed in-flight claim and never sends expired, oversized, or future payment events', async () => {
  await createOrder(input());
  const [event] = await database.select().from(outboxEvents);
  const fetchImpl = vi.fn();
  const settings = automationSettings(now);
  await database
    .update(outboxEvents)
    .set({
      state: 'BLOCKED',
      deliveryStatus: 'SENDING',
      leaseExpiresAt: new Date(now.getTime() - 1),
    })
    .where(eq(outboxEvents.id, event.id));
  await processNextWhatsAppEvent({
    database,
    settings,
    fetchImpl,
    now: () => now,
  });
  expect((await database.select().from(outboxEvents))[0].deliveryStatus).toBe(
    'UNKNOWN',
  );
  await database
    .update(outboxEvents)
    .set({
      state: 'PENDING',
      deliveryStatus: 'QUEUED',
      createdAt: new Date(now.getTime() - 86400001),
    })
    .where(eq(outboxEvents.id, event.id));
  expect(
    await processNextWhatsAppEvent({
      database,
      settings,
      fetchImpl,
      now: () => now,
    }),
  ).toBe('BLOCKED');
  await createOrder(input(false));
  expect(
    await processNextWhatsAppEvent({
      database,
      settings: { ...settings, WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS: 10 },
      fetchImpl,
      now: () => now,
    }),
  ).toBe('BLOCKED');
  await database.insert(outboxEvents).values({
    eventType: 'CUSTOMER_PAYMENT_VERIFIED',
    dedupeKey: 'unverified-payment',
    payload: event.payload,
  });
  expect(
    await processNextWhatsAppEvent({
      database,
      settings,
      fetchImpl,
      now: () => now,
    }),
  ).toBe('IDLE');
  expect(fetchImpl).not.toHaveBeenCalled();
});
it('does not let wrong-account, wrong-sender or wrong-recipient callbacks establish delivery', async () => {
  await createOrder(input());
  const settings = automationSettings(now);
  await processNextWhatsAppEvent({
    database,
    settings,
    now: () => now,
    fetchImpl: async () => Response.json({ messages: [{ id: 'wamid.bound' }] }),
  });
  const handlers = createWhatsAppWebhookHandlers({
    database,
    settings: { ...settings, WHATSAPP_WEBHOOKS_ENABLED: 'true' },
    now: () => now,
  });
  const status = {
    id: 'wamid.bound',
    recipient_id: '50244441234',
    status: 'read',
    timestamp: String(Math.floor(now.getTime() / 1000)),
  };
  const wrongAccount = envelope([status]);
  wrongAccount.entry[0].id = '999';
  const wrongSender = envelope([status]);
  wrongSender.entry[0].changes[0].value.metadata.phone_number_id = '999';
  for (const body of [
    wrongAccount,
    wrongSender,
    envelope([{ ...status, recipient_id: '50255551234' }]),
  ])
    expect((await handlers.POST(webhook(body))).status).toBe(200);
  expect((await database.select().from(outboxEvents))[0].deliveryStatus).toBe(
    'ACCEPTED',
  );
  expect(
    (
      await handlers.GET(
        new Request(
          `https://bakery.example/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${settings.WHATSAPP_VERIFY_TOKEN}&hub.challenge=123`,
        ),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await handlers.GET(
        new Request(
          'https://bakery.example/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123',
        ),
      )
    ).status,
  ).toBe(403);
  await handlers.POST(webhook(envelope([status])));
  expect((await database.select().from(outboxEvents))[0].deliveryStatus).toBe(
    'READ',
  );
});

it('holds definitively rejected delivery after five rate-limit attempts without calling it uncertain', async () => {
  await createOrder(input());
  const settings = automationSettings(now);
  const fetchImpl = vi.fn(async () => new Response(null, { status: 429 }));
  for (let attempt = 0; attempt < 5; attempt++) {
    await processNextWhatsAppEvent({
      database,
      settings,
      fetchImpl,
      now: () => now,
    });
    now = new Date(now.getTime() + 600000);
  }
  expect(fetchImpl).toHaveBeenCalledTimes(5);
  const [event] = await database.select().from(outboxEvents);
  expect(event.deliveryStatus).toBe('BLOCKED');
  expect(event.lastErrorCode).toBe('RETRY_LIMIT');
  await processNextWhatsAppEvent({
    database,
    settings,
    fetchImpl,
    now: () => now,
  });
  expect(fetchImpl).toHaveBeenCalledTimes(5);
});
