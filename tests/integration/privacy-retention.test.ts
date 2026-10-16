import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  orders,
  orderItems,
  categories,
  products,
  idempotencyRecords,
  outboxEvents,
  auditLogs,
  operationalChecks,
  whatsappSuppressions,
} from '@/server/db/schema';
import { planRetentionBatch } from '@/server/privacy/retention';
import { recordWorkerSignal } from '@/server/operations/worker-signal';
import { requireTestDatabaseUrl } from '@/test/database-url';
const url = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'privacy fixture tests',
);
if (
  process.env.NODE_ENV !== 'test' ||
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
)
  throw new Error('Fixture-only local database required.');
const pool = new Pool({ connectionString: url });
const database = drizzle({ client: pool });
const now = new Date('2026-10-15T12:00:00Z');
beforeEach(async () => {
  const identity = await pool.query('select current_database() as name');
  if (identity.rows[0].name !== 'guteli_test') throw new Error('Fixture-only');
  await pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
  );
  await migrate(database, { migrationsFolder: join(process.cwd(), 'drizzle') });
});
afterAll(async () => {
  await pool.end();
});

async function seed(paymentStatus: 'UNPAID' | 'PAID' = 'UNPAID') {
  const [category] = await database
    .insert(categories)
    .values({ name: 'Ficticio', slug: randomUUID() })
    .returning();
  const [product] = await database
    .insert(products)
    .values({
      categoryId: category.id,
      name: 'Producto ficticio',
      slug: randomUUID(),
      priceMinor: 500,
    })
    .returning();
  const [order] = await database
    .insert(orders)
    .values({
      publicId: randomUUID().slice(0, 30),
      customerName: 'CANARY_NOMBRE',
      phone: '55551234',
      fulfillment: 'DELIVERY',
      deliveryLocation: 'CANARY_DIRECCION',
      notes: 'CANARY_NOTAS',
      paymentInstructionsDraft: 'CANARY_BANCO',
      requestedDate: '2020-01-01',
      subtotalMinor: 500,
      shippingMinor: 100,
      totalMinor: 600,
      orderStatus: 'COMPLETED',
      terminalAt: new Date('2020-01-01Z'),
      paymentStatus,
      receiptTokenHash: randomUUID().replaceAll('-', '').repeat(2),
    })
    .returning();
  await database.insert(orderItems).values({
    orderId: order.id,
    sourceProductId: product.id,
    productName: 'Producto ficticio',
    categoryLabel: 'Ficticio',
    unitPriceMinor: 500,
    quantity: 1,
    lineTotalMinor: 500,
  });
  await database.insert(idempotencyRecords).values({
    operation: 'ORDER_CREATE',
    subject: 'fixture',
    key: randomUUID(),
    requestHash: 'f'.repeat(64),
    orderId: order.id,
    expiresAt: new Date('2020-01-01Z'),
  });
  await database.insert(outboxEvents).values({
    eventType: 'CUSTOMER_ORDER_CREATED',
    dedupeKey: randomUUID(),
    state: 'SENT',
    deliveryStatus: 'DELIVERED',
    recipient: '50255551234',
    payload: { orderId: order.id, requestId: randomUUID() },
  });
  await database.insert(auditLogs).values({
    action: 'ORDER_COMPLETED',
    entityType: 'ORDER',
    entityId: order.id,
    requestId: randomUUID(),
  });
  return order;
}

/** Fixture-only experiment: deliberately absent from src/, scripts/ and HTTP routes. */
async function applyFixtureBatch(dryRun: boolean) {
  if (
    process.env.NODE_ENV !== 'test' ||
    !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
  )
    throw new Error('Fixture-only');
  return database.transaction(async (tx) => {
    const identity = await tx.execute(sql`select current_database() as name`);
    if (identity.rows[0].name !== 'guteli_test')
      throw new Error('Fixture-only');
    const rows = await tx
      .select()
      .from(orders)
      .orderBy(orders.id)
      .limit(100)
      .for('update');
    const plan = planRetentionBatch(
      rows.map((row) => ({
        ...row,
        legalHold: false,
        financialEvidenceRequired: false,
        notificationPending: false,
      })),
      now,
    );
    if (dryRun) return plan;
    for (const decision of plan.filter((row) => row.decision === 'candidate')) {
      // Explicit fixture metadata only. Real legal holds/financial evidence are not modeled yet.
      await tx
        .update(orders)
        .set({
          customerName: 'Cliente anonimizado',
          phone: '',
          deliveryLocation: 'Dirección anonimizada',
          notes: null,
          paymentInstructionsDraft: null,
          anonymizedAt: now,
          version: sql`${orders.version}+1`,
        })
        .where(and(eq(orders.id, decision.id), isNull(orders.anonymizedAt)));
      await tx
        .update(outboxEvents)
        .set({ recipient: null })
        .where(sql`${outboxEvents.payload}->>'orderId' = ${decision.id}`);
    }
    return plan;
  });
}
it('simulates without writes, anonymizes fixtures once and preserves financial/dedupe/audit rows', async () => {
  const original = await seed();
  const paid = await seed('PAID');
  await database
    .insert(whatsappSuppressions)
    .values({ destination: '50255551234', revokedAt: now });
  const before = await database.select().from(orders);
  const financialLines = await database.select().from(orderItems);
  const dedupe = await database.select().from(idempotencyRecords);
  const audit = await database.select().from(auditLogs);
  const suppression = await database.select().from(whatsappSuppressions);
  await applyFixtureBatch(true);
  expect(await database.select().from(orders)).toEqual(before);
  await applyFixtureBatch(false);
  const [after] = await database
    .select()
    .from(orders)
    .where(eq(orders.id, original.id));
  expect(after).toMatchObject({
    customerName: 'Cliente anonimizado',
    phone: '',
    notes: null,
    paymentInstructionsDraft: null,
    subtotalMinor: 500,
    shippingMinor: 100,
    totalMinor: 600,
    anonymizedAt: now,
    receiptTokenHash: original.receiptTokenHash,
  });
  expect(
    (await database.select().from(orders).where(eq(orders.id, paid.id)))[0],
  ).toEqual(paid);
  const applied = await database.select().from(orders);
  await applyFixtureBatch(false);
  expect(await database.select().from(orders)).toEqual(applied);
  expect(await database.select().from(orderItems)).toEqual(financialLines);
  expect(await database.select().from(idempotencyRecords)).toEqual(dedupe);
  expect(await database.select().from(outboxEvents)).toHaveLength(2);
  expect(await database.select().from(auditLogs)).toEqual(audit);
  expect(await database.select().from(whatsappSuppressions)).toEqual(
    suppression,
  );
});
it('records a bounded worker signal without accepting customer identifiers', async () => {
  expect(await recordWorkerSignal(database, 'ok', now)).toBe(true);
  expect(
    await recordWorkerSignal(
      database,
      'failed',
      new Date(now.getTime() - 1000),
    ),
  ).toBe(true);
  expect(await database.select().from(operationalChecks)).toEqual([
    { component: 'whatsapp_worker', status: 'ok', checkedAt: now },
  ]);
  await expect(
    database
      .insert(operationalChecks)
      .values({ component: 'CANARY_PHONE', status: 'ok', checkedAt: now }),
  ).rejects.toThrow();
  expect(await database.select().from(operationalChecks)).toHaveLength(1);
});
