import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOrderRequestSchema } from '@/domain/order-contract';
import {
  auditLogs,
  categories,
  idempotencyRecords,
  orderItems,
  orders,
  outboxEvents,
  products,
} from '@/server/db/schema';
import { createOrder } from '@/server/orders/create-order';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'create order concurrency integration tests',
);
const managementPool = new Pool({ connectionString: databaseUrl });
const firstPool = new Pool({ connectionString: databaseUrl, max: 1 });
const secondPool = new Pool({ connectionString: databaseUrl, max: 1 });
const managementDb = drizzle({ client: managementPool });
const firstDb = drizzle({ client: firstPool });
const secondDb = drizzle({ client: secondPool });

const now = new Date('2026-08-29T12:00:00.000Z');
const receiptTokenSecret = 'receipt-token-secret-with-at-least-32-bytes';
const productId = '00000000-0000-4000-8000-000000000001';
const categoryId = '00000000-0000-4000-8000-000000000101';

async function resetDatabase() {
  await managementPool.query('DROP SCHEMA public CASCADE');
  await managementPool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await managementPool.query('CREATE SCHEMA public');
  await migrate(managementDb, {
    migrationsFolder: join(process.cwd(), 'drizzle'),
  });
  await managementDb.insert(categories).values({
    id: categoryId,
    name: 'Pretzels',
    slug: 'pretzels',
  });
  await managementDb.insert(products).values({
    id: productId,
    categoryId,
    name: 'Pretzel Original',
    slug: 'pretzel-original',
    priceMinor: 7500,
    stockQuantity: 1,
  });
}

function request() {
  return createOrderRequestSchema.parse({
    customerName: 'Ana López',
    phone: '+502 5555-5555',
    fulfillment: 'pickup',
    requestedDate: '2026-08-31',
    items: [{ productId, quantity: 1 }],
  });
}

describe('createOrder concurrency', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    await resetDatabase();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await Promise.all([
      managementPool.end(),
      firstPool.end(),
      secondPool.end(),
    ]);
  });

  it('allows exactly one simultaneous tracked-stock order across two PostgreSQL connections', async () => {
    const first = createOrder({
      request: request(),
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      idempotencySubject: 'hmac-shared-subject',
      requestId: 'req_concurrent_first',
      receiptTokenSecret,
      now,
      database: firstDb,
      createOrderId: () => '00000000-0000-4000-8000-000000000201',
      createPublicId: () => 'GUT-26-CONCUR001',
    });
    const second = createOrder({
      request: request(),
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
      idempotencySubject: 'hmac-shared-subject',
      requestId: 'req_concurrent_second',
      receiptTokenSecret,
      now,
      database: secondDb,
      createOrderId: () => '00000000-0000-4000-8000-000000000202',
      createPublicId: () => 'GUT-26-CONCUR002',
    });

    const results = await Promise.allSettled([first, second]);
    const accepted = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<typeof first>> =>
        result.status === 'fulfilled',
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(accepted).toHaveLength(1);
    expect(accepted[0].value.kind).toBe('created');
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({
      code: 'PRODUCT_OUT_OF_STOCK',
    });

    const [product] = await managementDb
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, productId));
    const [
      storedOrders,
      storedItems,
      storedIdempotency,
      storedOutbox,
      storedAudit,
    ] = await Promise.all([
      managementDb.select().from(orders),
      managementDb.select().from(orderItems),
      managementDb.select().from(idempotencyRecords),
      managementDb.select().from(outboxEvents),
      managementDb.select().from(auditLogs),
    ]);

    expect(product.stockQuantity).toBe(0);
    expect(storedOrders).toHaveLength(1);
    expect(storedItems).toHaveLength(1);
    expect(storedIdempotency).toHaveLength(1);
    expect(storedOutbox).toHaveLength(1);
    expect(storedAudit).toHaveLength(1);
  });

  it('creates one aggregate and replays the same key across two PostgreSQL connections', async () => {
    const sharedInput = {
      request: request(),
      idempotencyKey: '33333333-3333-4333-8333-333333333333',
      idempotencySubject: 'hmac-shared-idempotency-subject',
      receiptTokenSecret,
      now,
    } as const;
    const first = createOrder({
      ...sharedInput,
      requestId: 'req_same_key_first',
      database: firstDb,
      createOrderId: () => '00000000-0000-4000-8000-000000000211',
      createPublicId: () => 'GUT-26-SAMEKEY1',
    });
    const second = createOrder({
      ...sharedInput,
      requestId: 'req_same_key_second',
      database: secondDb,
      createOrderId: () => '00000000-0000-4000-8000-000000000212',
      createPublicId: () => 'GUT-26-SAMEKEY2',
    });

    const results = await Promise.all([first, second]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      'created',
      'replayed',
    ]);
    expect(results[0].order).toEqual(results[1].order);

    const [product] = await managementDb
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, productId));
    const [storedOrders, storedItems, storedIdempotency, storedOutbox] =
      await Promise.all([
        managementDb.select().from(orders),
        managementDb.select().from(orderItems),
        managementDb.select().from(idempotencyRecords),
        managementDb.select().from(outboxEvents),
      ]);

    expect(product.stockQuantity).toBe(0);
    expect(storedOrders).toHaveLength(1);
    expect(storedItems).toHaveLength(1);
    expect(storedIdempotency).toHaveLength(1);
    expect(storedOutbox).toHaveLength(1);
  });
});
