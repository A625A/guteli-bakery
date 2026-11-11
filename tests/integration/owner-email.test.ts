import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  categories,
  products,
  orders,
  orderItems,
  outboxEvents,
} from '@/server/db/schema';
import {
  enqueueOwnerOrderEmail,
  OWNER_EMAIL_EVENT,
} from '@/server/notifications/email-outbox';
import { processNextOwnerEmail } from '@/server/notifications/email-worker';
import { readEmailSettings } from '@/server/notifications/email-settings';
import { requireTestDatabaseUrl } from '@/test/database-url';

const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'owner email tests',
  ),
});
const database = drizzle({ client: pool });
let now = new Date();
let identity: { orderId: string; requestId: string };
const settings = () =>
  readEmailSettings({
    COMMERCIAL_ORDERS_ENABLED: 'true',
    EMAIL_NOTIFICATIONS_ENABLED: 'true',
    EMAIL_PROVIDER_READY: 'true',
    EMAIL_TEST_CONFIRMED: 'true',
    EMAIL_PROVIDER: 'resend',
    RESEND_API_KEY: 're_test-only-no-real-network-123456789',
    EMAIL_FROM: 'orders@bakery.example',
    EMAIL_OWNER_TO: 'owner@example.com',
    EMAIL_ADMIN_ORIGIN: 'https://bakery.example',
    EMAIL_SEND_AFTER: '2026-11-01T00:00:00-06:00',
  })!;
const event = async () =>
  (
    await database
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.eventType, OWNER_EMAIL_EVENT))
  )[0];
const enqueue = () =>
  database.transaction((tx) => enqueueOwnerOrderEmail(tx, identity, now));

beforeEach(async () => {
  now = new Date('2026-11-08T12:00:00Z');
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
      name: 'Pan',
      slug: 'pan',
      priceMinor: 2500,
    })
    .returning();
  const [order] = await database
    .insert(orders)
    .values({
      publicId: 'GUT-26-EMAIL123',
      customerName: 'Private name',
      phone: '55551234',
      fulfillment: 'PICKUP',
      paymentMethod: 'BANK_TRANSFER',
      requestedDate: '2099-01-01',
      subtotalMinor: 2500,
      shippingMinor: 0,
      totalMinor: 2500,
      receiptTokenHash: randomUUID(),
    })
    .returning();
  await database.insert(orderItems).values({
    orderId: order.id,
    sourceProductId: product.id,
    productName: product.name,
    categoryLabel: category.name,
    unitPriceMinor: 2500,
    quantity: 1,
    lineTotalMinor: 2500,
  });
  identity = { orderId: order.id, requestId: 'email-test' };
});
afterAll(() => pool.end());

it('queues atomically with order changes, deduplicates concurrent enqueue, and does no sending while disabled', async () => {
  await expect(
    database.transaction(async (tx) => {
      await enqueueOwnerOrderEmail(tx, identity, now);
      throw new Error('rollback');
    }),
  ).rejects.toThrow('rollback');
  expect(await event()).toBeUndefined();
  await Promise.all([enqueue(), enqueue()]);
  expect(await database.select().from(outboxEvents)).toHaveLength(1);
  const fetchImpl = vi.fn();
  expect(
    await processNextOwnerEmail({ database, settings: null, fetchImpl }),
  ).toBe('DISABLED');
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(JSON.stringify((await event()).payload)).not.toMatch(
    /Private name|55551234|receiptToken/,
  );
});

it('concurrent scheduled invocations claim one email and record acceptance, without claiming inbox delivery', async () => {
  await enqueue();
  const fetchImpl = vi.fn<typeof fetch>(async () =>
    Response.json({ id: randomUUID() }),
  );
  const options = { database, settings: settings(), fetchImpl, now: () => now };
  expect(
    (
      await Promise.all([
        processNextOwnerEmail(options),
        processNextOwnerEmail(options),
      ])
    ).sort(),
  ).toEqual(['ACCEPTED', 'IDLE']);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(await event()).toMatchObject({
    state: 'SENT',
    deliveryStatus: 'ACCEPTED',
    attempts: 1,
    sentAt: null,
  });
  expect(await processNextOwnerEmail(options)).toBe('IDLE');
});

it('retries uncertain failures with identical bytes, recipient and idempotency key after order edits', async () => {
  await enqueue();
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error('private provider diagnostic'))
    .mockResolvedValueOnce(Response.json({ id: randomUUID() }));
  const options = { database, settings: settings(), fetchImpl, now: () => now };
  expect(await processNextOwnerEmail(options)).toBe('RETRY');
  expect(await event()).toMatchObject({
    state: 'PENDING',
    attempts: 1,
    lastErrorCode: 'EMAIL_SEND_OUTCOME_UNKNOWN',
  });
  await database
    .update(orders)
    .set({ subtotalMinor: 4000, totalMinor: 4000 })
    .where(eq(orders.id, identity.orderId));
  now = new Date(now.getTime() + 60_001);
  expect(await processNextOwnerEmail(options)).toBe('ACCEPTED');
  const first = fetchImpl.mock.calls[0][1]!;
  const second = fetchImpl.mock.calls[1][1]!;
  expect(second.body).toBe(first.body);
  expect(second.headers).toEqual(first.headers);
  expect(JSON.stringify(await event())).not.toContain('private provider');
});

it('recovers crashed claims with the same key inside the provider deduplication window', async () => {
  await enqueue();
  const options = {
    database,
    settings: settings(),
    fetchImpl: async () => new Response(null, { status: 500 }),
    now: () => now,
  };
  await processNextOwnerEmail(options);
  const original = await event();
  await database
    .update(outboxEvents)
    .set({
      deliveryStatus: 'SENDING',
      leaseExpiresAt: new Date(now.getTime() + 60_000),
      nextAttemptAt: now,
    })
    .where(eq(outboxEvents.id, original.id));
  expect(await processNextOwnerEmail(options)).toBe('IDLE');
  now = new Date(now.getTime() + 60_001);
  const fetchImpl = vi.fn<typeof fetch>(async () =>
    Response.json({ id: randomUUID() }),
  );
  expect(await processNextOwnerEmail({ ...options, fetchImpl })).toBe(
    'ACCEPTED',
  );
  expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
    'Idempotency-Key': original.dedupeKey,
  });
});

it('never replays uncertain claims beyond 23h or against changed sender/recipient configuration', async () => {
  await enqueue();
  const fetchImpl = vi.fn(async () => {
    throw new Error('network failure');
  });
  const options = { database, settings: settings(), fetchImpl, now: () => now };
  await processNextOwnerEmail(options);
  now = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  expect(await processNextOwnerEmail(options)).toBe('BLOCKED');
  expect(await event()).toMatchObject({
    deliveryStatus: 'UNKNOWN',
    lastErrorCode: 'EMAIL_IDEMPOTENCY_EXPIRED',
  });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('shows permanent provider failure and excludes events older than the activation boundary', async () => {
  await enqueue();
  const fetchImpl = vi.fn(
    async () => new Response('private auth diagnostic', { status: 403 }),
  );
  expect(
    await processNextOwnerEmail({
      database,
      settings: settings(),
      fetchImpl,
      now: () => now,
    }),
  ).toBe('FAILED');
  expect(await event()).toMatchObject({
    state: 'FAILED',
    lastErrorCode: 'EMAIL_PROVIDER_REJECTED',
  });
  await database.delete(outboxEvents);
  await enqueue();
  expect(
    await processNextOwnerEmail({
      database,
      settings: {
        ...settings(),
        EMAIL_SEND_AFTER: new Date(now.getTime() + 1).toISOString(),
      },
      fetchImpl,
      now: () => now,
    }),
  ).toBe('BLOCKED');
  expect(await event()).toMatchObject({
    lastErrorCode: 'EMAIL_BEFORE_ACTIVATION',
  });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('real order creation/replay queues exactly one backup event and survives a provider failure', async () => {
  const { createOrder } = await import('@/server/orders/create-order');
  const [product] = await database.select().from(products).limit(1);
  const input = {
    database,
    now,
    clock: () => now,
    requestId: 'email-real-save',
    receiptTokenSecret: 'test-only-email-receipt-secret-32bytes',
    idempotencyKey: randomUUID(),
    idempotencySubject: 'test-email-customer',
    request: {
      customerName: 'Customer private name',
      phone: '55551234',
      fulfillment: 'pickup' as const,
      paymentMethod: 'BANK_TRANSFER' as const,
      requestedDate: '2099-01-01',
      items: [{ productId: product.id, quantity: 2 }],
    },
  };
  const [created, replay] = await Promise.all([
    createOrder(input),
    createOrder(input),
  ]);
  expect(created.order.publicId).toBe(replay.order.publicId);
  const events = await database
    .select()
    .from(outboxEvents)
    .where(eq(outboxEvents.eventType, OWNER_EMAIL_EVENT));
  expect(events).toHaveLength(1);
  expect(events[0].payload.ownerEmail?.snapshot).toMatchObject({
    publicId: created.order.publicId,
    subtotalMinor: 5000,
    totalMinor: 5000,
    paymentMethod: 'BANK_TRANSFER',
  });
  expect(
    await processNextOwnerEmail({
      database,
      settings: settings(),
      now: () => now,
      fetchImpl: async () => new Response(null, { status: 503 }),
    }),
  ).toBe('RETRY');
  const persisted = await database
    .select()
    .from(orders)
    .where(eq(orders.publicId, created.order.publicId));
  expect(persisted).toHaveLength(1);
  expect(persisted[0].paymentStatus).toBe('UNPAID');
});

it('blocks changed account/recipient configuration rather than reusing a key for different content', async () => {
  await enqueue();
  const fetchImpl = vi.fn(async () => {
    throw new Error('network failure');
  });
  await processNextOwnerEmail({
    database,
    settings: settings(),
    fetchImpl,
    now: () => now,
  });
  now = new Date(now.getTime() + 60_001);
  expect(
    await processNextOwnerEmail({
      database,
      settings: { ...settings(), EMAIL_OWNER_TO: 'different@example.com' },
      fetchImpl,
      now: () => now,
    }),
  ).toBe('BLOCKED');
  expect(await event()).toMatchObject({
    deliveryStatus: 'UNKNOWN',
    lastErrorCode: 'EMAIL_CONFIGURATION_CHANGED',
  });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('stops after five failed attempts without inventing success or discarding the saved order', async () => {
  await enqueue();
  const fetchImpl = vi.fn(async () => new Response(null, { status: 503 }));
  const options = { database, settings: settings(), fetchImpl, now: () => now };
  for (let attempt = 0; attempt < 5; attempt++) {
    expect(await processNextOwnerEmail(options)).toBe(
      attempt < 4 ? 'RETRY' : 'BLOCKED',
    );
    now = new Date(now.getTime() + 60 * 60 * 1000);
  }
  expect(await event()).toMatchObject({
    state: 'BLOCKED',
    deliveryStatus: 'UNKNOWN',
    lastErrorCode: 'EMAIL_RETRY_LIMIT',
    attempts: 5,
  });
  expect(await processNextOwnerEmail(options)).toBe('IDLE');
  expect(fetchImpl).toHaveBeenCalledTimes(5);
  expect(await database.select().from(orders)).toHaveLength(1);
});
