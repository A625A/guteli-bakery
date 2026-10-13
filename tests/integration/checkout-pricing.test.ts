import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  categories,
  products,
  promotions,
  orders,
  orderItems,
  orderPricingRevisions,
} from '@/server/db/schema';
import { createOrder } from '@/server/orders/create-order';
import { reviewOrderPricing } from '@/server/orders/review-pricing';
import { getReceipt } from '@/server/orders/get-receipt';
import { requireTestDatabaseUrl } from '@/test/database-url';
const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'checkout pricing',
  ),
});
const database = drizzle({ client: pool });
let now = new Date('2026-10-08T12:00:00Z');
let productId: string;
const secret = 'test-receipt-secret-with-at-least-32-bytes';
const input = () => ({
  database,
  now,
  clock: () => now,
  requestId: 'pricing-test',
  receiptTokenSecret: secret,
  idempotencyKey: 'pricing-checkout',
  idempotencySubject: 'test',
  request: {
    customerName: 'Ana',
    phone: '55551234',
    fulfillment: 'pickup' as const,
    requestedDate: '2026-10-12',
    items: [{ productId, quantity: 5 }],
  },
});
beforeEach(async () => {
  now = new Date('2026-10-08T12:00:00Z');
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
      name: 'Pan',
      slug: 'pan',
      categoryId: category.id,
      priceMinor: 10000,
      stockQuantity: 5,
    })
    .returning();
  productId = product.id;
  await database.insert(promotions).values({
    name: 'Oferta',
    scope: 'CATALOG',
    discountBps: 7000,
    startsAt: new Date('2026-10-08T06:00Z'),
    endsAt: new Date('2026-10-08T13:00Z'),
  });
});
afterAll(() => pool.end());
it('reprices one unpaid checkout at expiry, invalidates acceptance, and never allocates stock twice', async () => {
  const created = await createOrder(input());
  expect(created.order.totalMinor).toBe(15000);
  const [order] = await database.select().from(orders);
  const first = await reviewOrderPricing(order.id, database, () => now);
  expect(first!.totalMinor).toBe(15000);
  const accepted = await reviewOrderPricing(
    order.id,
    database,
    () => now,
    first!.revisionId!,
  );
  expect(accepted!.accepted).toBe(true);
  now = new Date('2026-10-08T13:00:00Z');
  const stale = await reviewOrderPricing(
    order.id,
    database,
    () => now,
    first!.revisionId!,
  );
  expect(stale).toMatchObject({
    totalMinor: 50000,
    accepted: false,
    conflict: true,
  });
  const replay = await createOrder(input());
  expect(replay).toMatchObject({
    kind: 'replayed',
    order: { publicId: created.order.publicId, totalMinor: 50000 },
  });
  expect((await database.select().from(products))[0].stockQuantity).toBe(0);
  expect(await database.select().from(orders)).toHaveLength(1);
  expect(await database.select().from(orderPricingRevisions)).toHaveLength(2);
  expect((await database.select().from(orderItems))[0].unitPriceMinor).toBe(
    3000,
  );
  expect(
    await getReceipt(created.order.receiptToken, database, () => now),
  ).toMatchObject({
    totalMinor: 50000,
    items: [{ unitPriceMinor: 10000, quantity: 5 }],
  });
});
it('preserves paid and refunded pricing after expiration and catalog changes', async () => {
  const created = await createOrder(input());
  const [order] = await database.select().from(orders);
  const review = await reviewOrderPricing(order.id, database, () => now);
  await reviewOrderPricing(order.id, database, () => now, review!.revisionId!);
  // Application fixture only: provider verification remains blocked under Ticket 01.
  await database
    .update(orders)
    .set({ paymentStatus: 'PAID' })
    .where(eq(orders.id, order.id));
  now = new Date('2026-10-09T13:00Z');
  await database
    .update(products)
    .set({ priceMinor: 15000 })
    .where(eq(products.id, productId));
  for (const paymentStatus of ['PAID', 'REFUNDED'] as const) {
    await database
      .update(orders)
      .set({ paymentStatus })
      .where(eq(orders.id, order.id));
    expect(
      await getReceipt(created.order.receiptToken, database, () => now),
    ).toMatchObject({
      paymentStatus,
      totalMinor: 15000,
      items: [{ unitPriceMinor: 3000 }],
    });
  }
  expect(await database.select().from(orderPricingRevisions)).toHaveLength(1);
});

it('serializes concurrent refreshes and samples expiry after an order-lock wait', async () => {
  await createOrder(input());
  const [order] = await database.select().from(orders);
  const first = await reviewOrderPricing(order.id, database, () => now);
  const blocker = await pool.connect();
  await blocker.query('BEGIN');
  await blocker.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [
    order.id,
  ]);
  const waiting = reviewOrderPricing(
    order.id,
    database,
    () => now,
    first!.revisionId!,
  );
  try {
    let blocked = false;
    for (let index = 0; index < 100; index++) {
      const state = await pool.query(
        `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%orders%FOR UPDATE%') AS waiting`,
      );
      if (state.rows[0].waiting) {
        blocked = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(blocked).toBe(true);
    now = new Date('2026-10-08T13:00:00Z');
    await blocker.query('COMMIT');
    expect(await waiting).toMatchObject({
      totalMinor: 50000,
      accepted: false,
      conflict: true,
    });
    const concurrent = await Promise.all(
      Array.from({ length: 5 }, () =>
        reviewOrderPricing(order.id, database, () => now),
      ),
    );
    expect(new Set(concurrent.map((review) => review!.revisionId)).size).toBe(
      1,
    );
    expect(await database.select().from(orderPricingRevisions)).toHaveLength(2);
  } finally {
    await blocker.query('ROLLBACK');
    blocker.release();
    await waiting.catch(() => undefined);
  }
});

it('invalidates equal-total promotion changes and blocks unavailable products without losing requested quantities', async () => {
  await createOrder(input());
  const [order] = await database.select().from(orders);
  const first = await reviewOrderPricing(order.id, database, () => now);
  await reviewOrderPricing(order.id, database, () => now, first!.revisionId!);
  await database.update(promotions).set({ version: 2, name: 'Nueva oferta' });
  const changed = await reviewOrderPricing(
    order.id,
    database,
    () => now,
    first!.revisionId!,
  );
  expect(changed).toMatchObject({
    totalMinor: 15000,
    conflict: true,
    accepted: false,
  });
  await database
    .update(products)
    .set({ active: false })
    .where(eq(products.id, productId));
  const unavailable = await reviewOrderPricing(
    order.id,
    database,
    () => now,
    changed!.revisionId!,
  );
  expect(unavailable).toMatchObject({
    totalMinor: 15000,
    canAccept: false,
    conflict: true,
    items: [{ quantity: 5, available: false }],
  });
});

it('keeps unresolved payment sessions nonpayable while showing current expired pricing', async () => {
  await createOrder(input());
  const [order] = await database.select().from(orders);
  const first = await reviewOrderPricing(order.id, database, () => now);
  await database
    .update(orders)
    .set({ paymentStatus: 'PENDING' })
    .where(eq(orders.id, order.id));
  now = new Date('2026-10-08T13:00:00Z');
  expect(
    await reviewOrderPricing(order.id, database, () => now, first!.revisionId!),
  ).toMatchObject({
    totalMinor: 50000,
    canAccept: false,
    conflict: true,
    accepted: false,
  });
});
