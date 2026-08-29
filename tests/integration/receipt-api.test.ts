import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createPostOrderHandler } from '@/app/api/orders/route';
import { createGetReceiptHandler } from '@/app/api/order-status/[receiptToken]/route';
import { categories, products } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'receipt API integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

const now = new Date('2026-08-29T12:00:00.000Z');
const securitySettings = {
  rateLimitSecret: 'rate-limit-secret-with-at-least-32-bytes',
  receiptTokenSecret: 'receipt-token-secret-with-at-least-32-bytes',
  trustedProxyHops: 0,
};
const categoryId = '00000000-0000-4000-8000-000000000101';
const firstProductId = '00000000-0000-4000-8000-000000000001';
const secondProductId = '00000000-0000-4000-8000-000000000002';

function createOrderHandler() {
  return createPostOrderHandler({
    database: db,
    now: () => now,
    getOrderSecuritySettings: () => securitySettings,
    getDirectClientAddress: () => '203.0.113.42',
  });
}

function createReceiptHandler() {
  return createGetReceiptHandler({ database: db });
}

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

async function insertProducts() {
  await db.insert(categories).values({
    id: categoryId,
    name: 'Pretzels',
    slug: 'pretzels',
  });
  await db.insert(products).values([
    {
      id: firstProductId,
      categoryId,
      name: 'Zeta Pretzel',
      slug: 'zeta-pretzel',
      priceMinor: 7500,
    },
    {
      id: secondProductId,
      categoryId,
      name: 'Alfa Pretzel',
      slug: 'alfa-pretzel',
      priceMinor: 5000,
    },
  ]);
}

async function createOrder() {
  const response = await createOrderHandler()(
    new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': '11111111-1111-4111-8111-111111111111',
      },
      body: JSON.stringify({
        customerName: 'María López',
        phone: '+502 5555-5555',
        fulfillment: 'delivery',
        requestedDate: '2026-08-31',
        deliveryLocation: 'Zona 10, Guatemala',
        notes: 'Llamar al llegar',
        items: [
          { productId: firstProductId, quantity: 1 },
          { productId: secondProductId, quantity: 2 },
        ],
      }),
    }),
  );

  expect(response.status).toBe(201);
  return (await response.json()) as { order: { receiptToken: string } };
}

describe('GET /api/order-status/[receiptToken]', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    await resetDatabase();
    await insertProducts();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await pool.end();
  });

  it('returns a deterministic PII-free receipt DTO for a valid token', async () => {
    const { order } = await createOrder();
    const response = await createReceiptHandler()(
      new Request(`http://localhost/api/order-status/${order.receiptToken}`),
      { params: Promise.resolve({ receiptToken: order.receiptToken }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual({
      receipt: {
        publicId: expect.stringMatching(/^GUT-26-/),
        fulfillment: 'delivery',
        requestedDate: '2026-08-31',
        orderStatus: 'RECEIVED',
        paymentStatus: 'UNPAID',
        subtotalMinor: 17500,
        shippingMinor: null,
        totalMinor: null,
        items: [
          {
            productName: 'Alfa Pretzel',
            categoryLabel: 'Pretzels',
            saleUnit: null,
            unitPriceMinor: 5000,
            quantity: 2,
            lineTotalMinor: 10000,
          },
          {
            productName: 'Zeta Pretzel',
            categoryLabel: 'Pretzels',
            saleUnit: null,
            unitPriceMinor: 7500,
            quantity: 1,
            lineTotalMinor: 7500,
          },
        ],
      },
    });

    const publicBody = JSON.stringify(body);
    for (const privateValue of [
      'María López',
      '+502 5555-5555',
      'Zona 10, Guatemala',
      'Llamar al llegar',
      order.receiptToken,
    ]) {
      expect(publicBody).not.toContain(privateValue);
    }
  });

  it('returns the same generic no-store error for malformed and unknown tokens', async () => {
    const handler = createReceiptHandler();
    const malformed = await handler(
      new Request('http://localhost/api/order-status/not-a-token'),
      { params: Promise.resolve({ receiptToken: 'not-a-token' }) },
    );
    const unknownToken = 'a'.repeat(43);
    const unknown = await handler(
      new Request(`http://localhost/api/order-status/${unknownToken}`),
      { params: Promise.resolve({ receiptToken: unknownToken }) },
    );

    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(malformed.headers.get('cache-control')).toBe('no-store');
    expect(unknown.headers.get('cache-control')).toBe('no-store');
    expect(await malformed.json()).toMatchObject({
      error: { code: 'ORDER_NOT_FOUND' },
    });
    expect(await unknown.json()).toMatchObject({
      error: { code: 'ORDER_NOT_FOUND' },
    });
  });
});
