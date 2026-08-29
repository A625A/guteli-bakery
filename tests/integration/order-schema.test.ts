import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  auditLogs,
  categories,
  idempotencyRecords,
  orderItems,
  orders,
  outboxEvents,
  products,
  rateLimitBuckets,
} from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'order schema integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

describe('order schema', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('persists a pickup order and its operational records with safe defaults', async () => {
    const [category] = await db
      .insert(categories)
      .values({ name: 'Pretzels', slug: 'pretzels' })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        categoryId: category.id,
        name: 'Pretzel Original',
        slug: 'pretzel-original',
        priceMinor: 6000,
      })
      .returning();
    const [order] = await db
      .insert(orders)
      .values({
        publicId: 'GUT-26-AB12CD34',
        customerName: 'María López',
        phone: '+50255555555',
        fulfillment: 'PICKUP',
        requestedDate: '2026-08-30',
        subtotalMinor: 12000,
        shippingMinor: 0,
        totalMinor: 12000,
        receiptTokenHash: 'a'.repeat(64),
      })
      .returning();

    expect(order).toMatchObject({
      fulfillment: 'PICKUP',
      orderStatus: 'RECEIVED',
      paymentStatus: 'UNPAID',
      shippingMinor: 0,
      totalMinor: 12000,
      anonymizedAt: null,
    });
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.updatedAt).toBeInstanceOf(Date);

    const [item] = await db
      .insert(orderItems)
      .values({
        orderId: order.id,
        sourceProductId: product.id,
        productName: 'Pretzel Original',
        categoryLabel: 'Pretzels',
        saleUnit: product.saleUnit,
        unitPriceMinor: 6000,
        quantity: 2,
        lineTotalMinor: 12000,
      })
      .returning();

    expect(item).toMatchObject({
      orderId: order.id,
      sourceProductId: product.id,
      productName: 'Pretzel Original',
      categoryLabel: 'Pretzels',
      saleUnit: null,
      unitPriceMinor: 6000,
      quantity: 2,
      lineTotalMinor: 12000,
    });

    const [idempotency] = await db
      .insert(idempotencyRecords)
      .values({
        operation: 'CREATE_ORDER',
        subject: 'hmac-phone-subject',
        key: 'b'.repeat(36),
        requestHash: 'c'.repeat(64),
        orderId: order.id,
        expiresAt: new Date('2026-08-31T00:00:00.000Z'),
      })
      .returning();
    const [rateLimit] = await db
      .insert(rateLimitBuckets)
      .values({
        policy: 'ORDER_ATTEMPT',
        subject: 'hmac-ip-subject',
        windowStartedAt: new Date('2026-08-29T12:00:00.000Z'),
        count: 1,
      })
      .returning();
    const [outbox] = await db
      .insert(outboxEvents)
      .values({
        eventType: 'OWNER_ORDER_CREATED',
        payload: { orderId: order.id, requestId: 'req_opaque' },
      })
      .returning();
    const [audit] = await db
      .insert(auditLogs)
      .values({
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: order.id,
        requestId: 'req_opaque',
        metadata: { source: 'public-order-api' },
      })
      .returning();

    expect(idempotency.orderId).toBe(order.id);
    expect(rateLimit.count).toBe(1);
    expect(outbox).toMatchObject({ state: 'PENDING', attempts: 0 });
    expect(outbox.nextAttemptAt).toBeInstanceOf(Date);
    expect(audit.actorId).toBeNull();

    const outboxStates = await db
      .insert(outboxEvents)
      .values([
        {
          eventType: 'OWNER_ORDER_CREATED',
          payload: { orderId: order.id, requestId: 'req_blocked' },
          state: 'BLOCKED',
        },
        {
          eventType: 'OWNER_ORDER_CREATED',
          payload: { orderId: order.id, requestId: 'req_sent' },
          state: 'SENT',
        },
        {
          eventType: 'OWNER_ORDER_CREATED',
          payload: { orderId: order.id, requestId: 'req_failed' },
          state: 'FAILED',
        },
      ])
      .returning({ state: outboxEvents.state });

    expect(outboxStates.map(({ state }) => state)).toEqual([
      'BLOCKED',
      'SENT',
      'FAILED',
    ]);

    await expect(
      db.insert(idempotencyRecords).values({
        operation: 'CREATE_ORDER',
        subject: 'hmac-phone-subject',
        key: 'b'.repeat(36),
        requestHash: 'd'.repeat(64),
        orderId: order.id,
        expiresAt: new Date('2026-08-31T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-UNIQUE01',
        customerName: 'Otra persona',
        phone: '+50255555554',
        fulfillment: 'PICKUP',
        requestedDate: '2026-08-30',
        subtotalMinor: 1,
        shippingMinor: 0,
        totalMinor: 1,
        receiptTokenHash: 'a'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-AB12CD34',
        customerName: 'Otra persona',
        phone: '+50255555554',
        fulfillment: 'PICKUP',
        requestedDate: '2026-08-30',
        subtotalMinor: 1,
        shippingMinor: 0,
        totalMinor: 1,
        receiptTokenHash: 'i'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });

    await expect(
      db.insert(rateLimitBuckets).values({
        policy: 'ORDER_ATTEMPT',
        subject: 'hmac-ip-subject',
        windowStartedAt: new Date('2026-08-29T12:00:00.000Z'),
        count: 2,
      }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });

    await expect(
      // Historical snapshots must prevent a physical source-product deletion.
      db.delete(products).where(eq(products.id, product.id)),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
  });

  it('rejects invalid order totals, snapshot math, and operational counters', async () => {
    const [unquotedDelivery] = await db
      .insert(orders)
      .values({
        publicId: 'GUT-26-DELIVERY0',
        customerName: 'Ana Ruiz',
        phone: '+50255555550',
        fulfillment: 'DELIVERY',
        requestedDate: '2026-08-30',
        deliveryLocation: 'Zona 1',
        subtotalMinor: 6000,
        receiptTokenHash: 'h'.repeat(64),
      })
      .returning();

    expect(unquotedDelivery).toMatchObject({
      fulfillment: 'DELIVERY',
      shippingMinor: null,
      totalMinor: null,
    });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-DELIVERY2',
        customerName: 'Ana Ruiz',
        phone: '+50255555549',
        fulfillment: 'DELIVERY',
        requestedDate: '2026-08-30',
        deliveryLocation: '',
        subtotalMinor: 6000,
        receiptTokenHash: 'j'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-DELIVERY3',
        customerName: 'Ana Ruiz',
        phone: '+50255555548',
        fulfillment: 'DELIVERY',
        requestedDate: '2026-08-30',
        deliveryLocation: '   ',
        subtotalMinor: 6000,
        receiptTokenHash: 'k'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-DELIVERY1',
        customerName: 'Ana Ruiz',
        phone: '+50255555553',
        fulfillment: 'DELIVERY',
        requestedDate: '2026-08-30',
        deliveryLocation: 'Zona 1',
        subtotalMinor: 6000,
        shippingMinor: null,
        totalMinor: 7000,
        receiptTokenHash: 'e'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-DELIVERY4',
        customerName: 'Ana Ruiz',
        phone: '+50255555547',
        fulfillment: 'DELIVERY',
        requestedDate: '2026-08-30',
        deliveryLocation: 'Zona 1',
        subtotalMinor: 6000,
        shippingMinor: 1000,
        totalMinor: null,
        receiptTokenHash: 'l'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-PICKUPLOC',
        customerName: 'Ana Ruiz',
        phone: '+50255555546',
        fulfillment: 'PICKUP',
        requestedDate: '2026-08-30',
        deliveryLocation: 'Zona 1',
        subtotalMinor: 6000,
        shippingMinor: 0,
        totalMinor: 6000,
        receiptTokenHash: 'm'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(orders).values({
        publicId: 'GUT-26-NEGATIVE1',
        customerName: 'Ana Ruiz',
        phone: '+50255555552',
        fulfillment: 'PICKUP',
        requestedDate: '2026-08-30',
        subtotalMinor: -1,
        shippingMinor: 0,
        totalMinor: -1,
        receiptTokenHash: 'f'.repeat(64),
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    const [order] = await db
      .insert(orders)
      .values({
        publicId: 'GUT-26-SNAPSHOT1',
        customerName: 'Ana Ruiz',
        phone: '+50255555551',
        fulfillment: 'PICKUP',
        requestedDate: '2026-08-30',
        subtotalMinor: 1,
        shippingMinor: 0,
        totalMinor: 1,
        receiptTokenHash: 'g'.repeat(64),
      })
      .returning();
    const [category] = await db
      .insert(categories)
      .values({ name: 'Rollos', slug: 'rollos' })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        categoryId: category.id,
        name: 'Rollo',
        slug: 'rollo',
        priceMinor: 1,
      })
      .returning();

    await expect(
      db.insert(orderItems).values({
        orderId: order.id,
        sourceProductId: product.id,
        productName: 'Rollo',
        categoryLabel: 'Rollos',
        saleUnit: 'Unidad',
        unitPriceMinor: 1,
        quantity: 0,
        lineTotalMinor: 0,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(orderItems).values({
        orderId: order.id,
        sourceProductId: product.id,
        productName: 'Rollo',
        categoryLabel: 'Rollos',
        saleUnit: 'Unidad',
        unitPriceMinor: 2,
        quantity: 2,
        lineTotalMinor: 3,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });

    await expect(
      db.insert(rateLimitBuckets).values({
        policy: 'ORDER_ATTEMPT',
        subject: 'hmac-ip-negative',
        windowStartedAt: new Date('2026-08-29T12:00:00.000Z'),
        count: -1,
      }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
  });
});
