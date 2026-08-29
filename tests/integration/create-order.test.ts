import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

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
  'create order integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

const now = new Date('2026-08-29T12:00:00.000Z');
const receiptTokenSecret = 'receipt-token-secret-with-at-least-32-bytes';
const idempotencySubject = 'hmac-order-subject';
const productId = '00000000-0000-4000-8000-000000000001';
const categoryId = '00000000-0000-4000-8000-000000000101';

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

async function insertProduct(
  overrides: Partial<{
    categoryActive: boolean;
    deletedAt: Date | null;
    name: string;
    priceMinor: number;
    productActive: boolean;
    saleUnit: string | null;
    stockQuantity: number | null;
  }> = {},
) {
  await db.insert(categories).values({
    id: categoryId,
    name: 'Pretzels',
    slug: 'pretzels',
    active: overrides.categoryActive ?? true,
  });
  await db.insert(products).values({
    id: productId,
    categoryId,
    name: overrides.name ?? 'Pretzel Original',
    slug: 'pretzel-original',
    priceMinor: overrides.priceMinor ?? 7500,
    saleUnit: overrides.saleUnit ?? 'Bolsa de 5',
    stockQuantity: overrides.stockQuantity ?? null,
    active: overrides.productActive ?? true,
    deletedAt: overrides.deletedAt ?? null,
  });
}

function parsedRequest(
  overrides: Partial<{
    customerName: string;
    deliveryLocation: string;
    fulfillment: 'pickup' | 'delivery';
    items: Array<{ productId: string; quantity: number }>;
    notes: string;
    phone: string;
  }> = {},
) {
  const fulfillment = overrides.fulfillment ?? 'pickup';
  return createOrderRequestSchema.parse({
    customerName: overrides.customerName ?? 'María López',
    phone: overrides.phone ?? '+502 5555-5555',
    fulfillment,
    requestedDate: '2026-08-31',
    ...(fulfillment === 'delivery'
      ? { deliveryLocation: overrides.deliveryLocation ?? 'Zona 10, Guatemala' }
      : {}),
    ...(overrides.notes ? { notes: overrides.notes } : {}),
    items: overrides.items ?? [{ productId, quantity: 2 }],
  });
}

function createInput(
  request = parsedRequest(),
  overrides: Partial<Parameters<typeof createOrder>[0]> = {},
) {
  return {
    request,
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    idempotencySubject,
    requestId: 'req_create_order_test',
    receiptTokenSecret,
    now,
    database: db,
    createOrderId: () => '00000000-0000-4000-8000-000000000201',
    createPublicId: () => 'GUT-26-TEST0001',
    ...overrides,
  };
}

async function counts() {
  const [orderRows, itemRows, idempotencyRows, outboxRows, auditRows] =
    await Promise.all([
      db.select().from(orders),
      db.select().from(orderItems),
      db.select().from(idempotencyRecords),
      db.select().from(outboxEvents),
      db.select().from(auditLogs),
    ]);
  return {
    orders: orderRows.length,
    items: itemRows.length,
    idempotency: idempotencyRows.length,
    outbox: outboxRows.length,
    audit: auditRows.length,
  };
}

describe('createOrder', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    await resetDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('uses stored prices and writes immutable pickup snapshots with PII-free operations records', async () => {
    await insertProduct();
    const request = parsedRequest({ notes: 'Llamar al llegar' });

    const result = await createOrder(createInput(request));

    expect(result).toMatchObject({
      kind: 'created',
      order: {
        publicId: 'GUT-26-TEST0001',
        orderStatus: 'RECEIVED',
        paymentStatus: 'UNPAID',
        subtotalMinor: 15000,
        shippingMinor: 0,
        totalMinor: 15000,
      },
    });
    expect(result.order.receiptToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const [storedOrder] = await db.select().from(orders);
    const [storedItem] = await db.select().from(orderItems);
    const [outbox] = await db.select().from(outboxEvents);
    const [audit] = await db.select().from(auditLogs);

    expect(storedOrder).toMatchObject({
      customerName: 'María López',
      phone: '+502 5555-5555',
      fulfillment: 'PICKUP',
      subtotalMinor: 15000,
      shippingMinor: 0,
      totalMinor: 15000,
      receiptTokenHash: createHash('sha256')
        .update(result.order.receiptToken)
        .digest('hex'),
    });
    expect(storedItem).toMatchObject({
      orderId: storedOrder.id,
      sourceProductId: productId,
      productName: 'Pretzel Original',
      categoryLabel: 'Pretzels',
      saleUnit: 'Bolsa de 5',
      unitPriceMinor: 7500,
      quantity: 2,
      lineTotalMinor: 15000,
    });
    expect(outbox).toMatchObject({
      eventType: 'OWNER_ORDER_CREATED',
      payload: { orderId: storedOrder.id, requestId: 'req_create_order_test' },
      state: 'PENDING',
      attempts: 0,
    });
    expect(audit).toMatchObject({
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: storedOrder.id,
      requestId: 'req_create_order_test',
      metadata: { fulfillment: 'PICKUP', itemCount: 1 },
    });

    const operationsJson = JSON.stringify({
      outbox: outbox.payload,
      audit: audit.metadata,
    });
    for (const privateValue of [
      request.customerName,
      request.phone,
      request.notes,
      result.order.receiptToken,
    ]) {
      expect(operationsJson).not.toContain(privateValue);
    }
  });

  it('keeps delivery shipping and total pending and omits delivery location from operations records', async () => {
    await insertProduct({ priceMinor: 6000 });
    const request = parsedRequest({
      fulfillment: 'delivery',
      deliveryLocation: 'Zona 14, edificio 5',
    });

    const result = await createOrder(createInput(request));
    const [storedOrder] = await db.select().from(orders);
    const [outbox] = await db.select().from(outboxEvents);
    const [audit] = await db.select().from(auditLogs);

    expect(result.order).toMatchObject({
      subtotalMinor: 12000,
      shippingMinor: null,
      totalMinor: null,
    });
    expect(storedOrder).toMatchObject({
      fulfillment: 'DELIVERY',
      deliveryLocation: 'Zona 14, edificio 5',
      shippingMinor: null,
      totalMinor: null,
    });
    expect(
      JSON.stringify({ outbox: outbox.payload, audit: audit.metadata }),
    ).not.toContain('Zona 14, edificio 5');
  });

  it.each([
    ['a missing product', {}, '00000000-0000-4000-8000-000000000099'],
    ['an inactive product', { productActive: false }, productId],
    ['a product in an inactive category', { categoryActive: false }, productId],
    ['a soft-deleted product', { deletedAt: now }, productId],
  ] as const)(
    'rejects %s without creating an aggregate',
    async (_scenario, productOverrides, requestedProductId) => {
      if (requestedProductId === productId) {
        await insertProduct(productOverrides);
      }
      const request = parsedRequest({
        items: [{ productId: requestedProductId, quantity: 1 }],
      });

      await expect(createOrder(createInput(request))).rejects.toMatchObject({
        code: 'PRODUCT_UNAVAILABLE',
      });

      expect(await counts()).toEqual({
        orders: 0,
        items: 0,
        idempotency: 0,
        outbox: 0,
        audit: 0,
      });
    },
  );

  it('replays the same request with its original receipt token and conflicts on changed content', async () => {
    await insertProduct();
    const request = parsedRequest();
    const first = await createOrder(createInput(request));
    const replay = await createOrder(createInput(request));
    const changedRequest = parsedRequest({
      items: [{ productId, quantity: 1 }],
    });

    expect(first.kind).toBe('created');
    expect(replay).toEqual({
      kind: 'replayed',
      order: first.order,
    });
    await expect(
      createOrder(createInput(changedRequest)),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(await counts()).toEqual({
      orders: 1,
      items: 1,
      idempotency: 1,
      outbox: 1,
      audit: 1,
    });
  });

  it('retries a public identifier collision without duplicating the new aggregate', async () => {
    await insertProduct();
    await db.insert(orders).values({
      id: '00000000-0000-4000-8000-000000000202',
      publicId: 'GUT-26-COLLIDE1',
      customerName: 'Cliente previo',
      phone: '+502 4444-4444',
      fulfillment: 'PICKUP',
      requestedDate: '2026-08-31',
      subtotalMinor: 1,
      shippingMinor: 0,
      totalMinor: 1,
      receiptTokenHash: 'a'.repeat(64),
    });
    const publicIds = ['GUT-26-COLLIDE1', 'GUT-26-RETRY001'];
    const internalIds = [
      '00000000-0000-4000-8000-000000000203',
      '00000000-0000-4000-8000-000000000204',
    ];

    const result = await createOrder(
      createInput(parsedRequest(), {
        createOrderId: () => internalIds.shift()!,
        createPublicId: () => publicIds.shift()!,
      }),
    );

    expect(result.order.publicId).toBe('GUT-26-RETRY001');
    expect(await counts()).toEqual({
      orders: 2,
      items: 1,
      idempotency: 1,
      outbox: 1,
      audit: 1,
    });
  });

  it('does not decrement untracked stock', async () => {
    await insertProduct({ stockQuantity: null });

    await createOrder(createInput(parsedRequest()));

    const [product] = await db
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, productId));
    expect(product.stockQuantity).toBeNull();
  });

  it('atomically decrements tracked stock after pricing', async () => {
    await insertProduct({ stockQuantity: 3 });

    await createOrder(createInput(parsedRequest()));

    const [product] = await db
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, productId));
    expect(product.stockQuantity).toBe(1);
  });

  it('rolls back every write when tracked stock is insufficient', async () => {
    await insertProduct({ stockQuantity: 1 });

    await expect(
      createOrder(createInput(parsedRequest())),
    ).rejects.toMatchObject({
      code: 'PRODUCT_OUT_OF_STOCK',
    });
    const [product] = await db
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, productId));

    expect(product.stockQuantity).toBe(1);
    expect(await counts()).toEqual({
      orders: 0,
      items: 0,
      idempotency: 0,
      outbox: 0,
      audit: 0,
    });
  });

  it('rejects totals beyond PostgreSQL signed integer bounds before persisting', async () => {
    await insertProduct({ priceMinor: 2_147_483_647 });

    await expect(
      createOrder(createInput(parsedRequest())),
    ).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
    expect(await counts()).toEqual({
      orders: 0,
      items: 0,
      idempotency: 0,
      outbox: 0,
      audit: 0,
    });
  });

  it('rolls back the order, stock, idempotency, and outbox when the late audit insert fails', async () => {
    await insertProduct({ stockQuantity: 3 });

    await expect(
      createOrder(
        createInput(parsedRequest(), {
          requestId: 'r'.repeat(129),
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: '22001' } });
    const [product] = await db
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, productId));

    expect(product.stockQuantity).toBe(3);
    expect(await counts()).toEqual({
      orders: 0,
      items: 0,
      idempotency: 0,
      outbox: 0,
      audit: 0,
    });
  });
});
