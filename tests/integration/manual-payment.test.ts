import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET = 'test-auth-secret-must-be-at-least-32-bytes';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
});
vi.mock('server-only', () => ({}));
vi.mock('@/server/auth/authorize', async (original) => {
  const actual = await original<typeof import('@/server/auth/authorize')>();
  return { ...actual, requireOwner: vi.fn() };
});
import { requireOwner, AuthorizationError } from '@/server/auth/authorize';
import { db, pool } from '@/server/db/client';
import {
  user,
  session,
  categories,
  products,
  orders,
  orderPaymentEvents,
  orderPricingState,
  auditLogs,
} from '@/server/db/schema';
import { createOrder } from '@/server/orders/create-order';
import { reviewOrderPricing } from '@/server/orders/review-pricing';
import { recordManualPayment } from '@/server/orders/verify-payment';
import { assignPaymentMethod } from '@/server/orders/assign-payment-method';
import { getMinimumOrderDate } from '@/lib/date';

const headers = new Headers({ origin: 'http://localhost:3000' });
let actorId: string;
let sessionId: string;
let publicId: string;
let orderId: string;
let input: Parameters<typeof recordManualPayment>[1];
beforeEach(async () => {
  await pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
  );
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
  actorId = randomUUID();
  sessionId = randomUUID();
  await db.insert(user).values({
    id: actorId,
    name: 'Owner',
    email: 'owner@example.test',
    role: 'OWNER',
  });
  await db.insert(session).values({
    id: sessionId,
    token: randomUUID(),
    userId: actorId,
    expiresAt: new Date(Date.now() + 600000),
    mfaVerifiedAt: new Date(),
  });
  vi.mocked(requireOwner).mockResolvedValue({
    userId: actorId,
    sessionId,
    role: 'OWNER',
    mfaVerifiedAt: new Date(),
  } as Awaited<ReturnType<typeof requireOwner>>);
  const [category] = await db
    .insert(categories)
    .values({ name: 'Pan', slug: 'pan' })
    .returning();
  const [product] = await db
    .insert(products)
    .values({
      categoryId: category.id,
      name: 'Pan',
      slug: 'pan',
      priceMinor: 1000,
    })
    .returning();
  const created = await createOrder({
    database: db,
    now: new Date(),
    requestId: 'payment-test',
    idempotencyKey: randomUUID(),
    idempotencySubject: 'test',
    receiptTokenSecret: 'payment-receipt-secret-at-least-32-bytes',
    request: {
      customerName: 'Cliente',
      phone: '55551234',
      fulfillment: 'pickup',
      paymentMethod: 'BANK_TRANSFER',
      requestedDate: '2099-12-31',
      items: [{ productId: product.id, quantity: 2 }],
    },
  });
  publicId = created.order.publicId;
  const [order] = await db.select().from(orders);
  orderId = order.id;
  const review = await reviewOrderPricing(order.id, db);
  await reviewOrderPricing(order.id, db, undefined, review!.revisionId!);
  await db
    .update(orders)
    .set({ orderStatus: 'CONFIRMED' })
    .where(eq(orders.id, orderId));
  const [current] = await db.select().from(orders);
  input = {
    kind: 'VERIFIED',
    amountMinor: 2000,
    currency: 'GTQ',
    paymentMethod: 'BANK_TRANSFER',
    expectedVersion: current.version,
    revisionId: review!.revisionId!,
    idempotencyKey: randomUUID(),
    confirmation: true,
    evidence: 'BANK_FUNDS_RECEIVED',
    note: 'Referencia interna 123',
  };
});
afterAll(() => pool.end());
describe('authoritative manual payment events', () => {
  it('records bank receipt atomically with evidence, actor, audit, immutable amount and idempotent replay', async () => {
    const result = await recordManualPayment(publicId, input, headers, 'test');
    expect(result.paymentStatus).toBe('PAID');
    expect((await db.select().from(orderPaymentEvents))[0]).toMatchObject({
      orderId,
      actorId,
      amountMinor: 2000,
      currency: 'GTQ',
      paymentMethod: 'BANK_TRANSFER',
      previousStatus: 'UNPAID',
      newStatus: 'PAID',
    });
    expect(
      await recordManualPayment(publicId, input, headers, 'retry'),
    ).toEqual(result);
    expect(await db.select().from(orderPaymentEvents)).toHaveLength(1);
    expect(
      await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'ORDER_PAYMENT_VERIFIED')),
    ).toHaveLength(1);
    await expect(
      recordManualPayment(
        publicId,
        { ...input, amountMinor: 1 },
        headers,
        'retry',
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_IDEMPOTENCY_CONFLICT' });
  });
  it.each([
    ['amount', { amountMinor: 1900 }, 'PAYMENT_AMOUNT_MISMATCH'],
    ['revision', { revisionId: randomUUID() }, 'PAYMENT_ACCEPTANCE_REQUIRED'],
    [
      'method',
      { paymentMethod: 'CASH_PICKUP', evidence: 'CASH_COLLECTED' },
      'INVALID_PAYMENT_METHOD',
    ],
    ['version', { expectedVersion: 99 }, 'STALE_ORDER'],
    ['screenshot', { evidence: 'SCREENSHOT' }, 'VALIDATION_ERROR'],
    ['confirmation', { confirmation: false }, 'VALIDATION_ERROR'],
    ['currency', { currency: 'USD' }, 'VALIDATION_ERROR'],
  ])('rejects incorrect %s without a paid marker', async (_, patch, code) => {
    await expect(
      recordManualPayment(
        publicId,
        { ...input, ...patch } as typeof input,
        headers,
        'test',
      ),
    ).rejects.toMatchObject({ code });
    expect(await db.select().from(orderPaymentEvents)).toHaveLength(0);
    expect((await db.select().from(orders))[0].paymentStatus).toBe('UNPAID');
  });
  it('rejects unauthorized, demoted and stale MFA owners and untrusted origins', async () => {
    vi.mocked(requireOwner).mockRejectedValueOnce(
      new AuthorizationError('UNAUTHENTICATED'),
    );
    await expect(
      recordManualPayment(publicId, input, headers, 'test'),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await db.update(user).set({ role: 'ADMIN' }).where(eq(user.id, actorId));
    await expect(
      recordManualPayment(publicId, input, headers, 'test'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await db.update(user).set({ role: 'OWNER' }).where(eq(user.id, actorId));
    await db
      .update(session)
      .set({ mfaVerifiedAt: new Date(Date.now() - 700000) });
    await expect(
      recordManualPayment(publicId, input, headers, 'test'),
    ).rejects.toMatchObject({ code: 'REAUTHENTICATION_REQUIRED' });
    await expect(
      recordManualPayment(
        publicId,
        input,
        new Headers({ origin: 'https://evil.test' }),
        'test',
      ),
    ).rejects.toMatchObject({ code: 'INVALID_ORIGIN' });
  });
  it('requires renewed customer acceptance after a method change', async () => {
    await assignPaymentMethod(
      publicId,
      {
        paymentMethod: 'CASH_PICKUP',
        instructionsDraft: '',
        expectedVersion: input.expectedVersion,
      },
      headers,
      'method',
    );
    expect(
      (await db.select().from(orderPricingState))[0].acceptedRevisionId,
    ).toBeNull();
    const review = await reviewOrderPricing(orderId, db);
    expect(review!.accepted).toBe(false);
    expect(review!.revisionId).not.toBe(input.revisionId);
  });
  it('only verifies cash at collection and with the matching fulfillment', async () => {
    await db.update(orders).set({ paymentMethod: 'CASH_PICKUP' });
    let review = await reviewOrderPricing(orderId, db);
    await reviewOrderPricing(orderId, db, undefined, review!.revisionId!);
    const cashInput = {
      ...input,
      paymentMethod: 'CASH_PICKUP' as const,
      evidence: 'CASH_COLLECTED' as const,
      revisionId: review!.revisionId!,
    };
    await expect(
      recordManualPayment(publicId, cashInput, headers, 'test'),
    ).rejects.toMatchObject({ code: 'CASH_COLLECTION_REQUIRED' });
    await db.update(orders).set({ orderStatus: 'READY' });
    expect(
      (await recordManualPayment(publicId, cashInput, headers, 'test'))
        .paymentStatus,
    ).toBe('PAID');
    review = await reviewOrderPricing(orderId, db);
    expect(review!.paymentVerified).toBe(true);
  });
  it('serializes competing verifications to a single event', async () => {
    const results = await Promise.allSettled([
      recordManualPayment(publicId, input, headers, 'a'),
      recordManualPayment(
        publicId,
        { ...input, idempotencyKey: randomUUID() },
        headers,
        'b',
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.select().from(orderPaymentEvents)).toHaveLength(1);
  });
  it('rolls back the paid status and event when the late audit fails', async () => {
    await pool.query(`CREATE FUNCTION reject_payment_audit() RETURNS trigger AS $$ BEGIN IF NEW.action = 'ORDER_PAYMENT_VERIFIED' THEN RAISE EXCEPTION 'forced audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_payment_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_payment_audit();`);
    await expect(
      recordManualPayment(publicId, input, headers, 'failure'),
    ).rejects.toThrow();
    expect((await db.select().from(orders))[0]).toMatchObject({
      paymentStatus: 'UNPAID',
      version: input.expectedVersion,
    });
    expect(await db.select().from(orderPaymentEvents)).toHaveLength(0);
  });
  it('keeps payment evidence append-only even for a direct SQL writer', async () => {
    await recordManualPayment(publicId, input, headers, 'test');
    await expect(
      pool.query('UPDATE order_payment_events SET amount_minor = 1'),
    ).rejects.toThrow('append-only');
    await expect(
      pool.query('DELETE FROM order_payment_events'),
    ).rejects.toThrow('append-only');
    expect((await db.select().from(orderPaymentEvents))[0].amountMinor).toBe(
      2000,
    );
  });
  it('records the exact customer acknowledgment once and invalidates a stale method revision', async () => {
    await reviewOrderPricing(orderId, db, undefined, input.revisionId);
    expect(
      await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'ORDER_CUSTOMER_TOTAL_ACCEPTED')),
    ).toHaveLength(1);
    await assignPaymentMethod(
      publicId,
      {
        paymentMethod: 'CASH_PICKUP',
        instructionsDraft: '',
        expectedVersion: input.expectedVersion,
      },
      headers,
      'method',
    );
    expect(
      await reviewOrderPricing(orderId, db, undefined, input.revisionId),
    ).toMatchObject({ conflict: true, accepted: false });
    const review = await reviewOrderPricing(orderId, db);
    await reviewOrderPricing(orderId, db, undefined, review!.revisionId!);
    const acknowledgments = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'ORDER_CUSTOMER_TOTAL_ACCEPTED'));
    expect(acknowledgments).toHaveLength(2);
    expect(acknowledgments[1].metadata).toMatchObject({
      paymentMethod: 'CASH_PICKUP',
      revisionId: review!.revisionId,
    });
  });
  it('rejects cancelled verification and records refunds separately only after actual full return', async () => {
    await db
      .update(orders)
      .set({ orderStatus: 'CANCELLED', terminalAt: new Date() });
    await expect(
      recordManualPayment(publicId, input, headers, 'test'),
    ).rejects.toMatchObject({ code: 'TERMINAL_ORDER' });
    await db.update(orders).set({ orderStatus: 'CONFIRMED', terminalAt: null });
    const paid = await recordManualPayment(publicId, input, headers, 'test');
    await db
      .update(orders)
      .set({ orderStatus: 'CANCELLED', terminalAt: new Date() });
    expect((await db.select().from(orders))[0].paymentStatus).toBe('PAID');
    const refund = {
      ...input,
      kind: 'REFUNDED' as const,
      expectedVersion: paid.version,
      idempotencyKey: randomUUID(),
      evidence: 'REFUND_RETURNED' as const,
    };
    const returned = await recordManualPayment(
      publicId,
      refund,
      headers,
      'refund',
    );
    expect(returned.paymentStatus).toBe('REFUNDED');
    // A delayed retry acknowledges the original event without projecting an old
    // PAID status over the order's already recorded refund.
    expect(
      await recordManualPayment(publicId, input, headers, 'late-payment-retry'),
    ).toMatchObject({ paymentStatus: 'REFUNDED', version: returned.version });
    expect(await db.select().from(orderPaymentEvents)).toHaveLength(2);
  });
  it('invalidates acceptance when catalog totals change before collection', async () => {
    await db.update(products).set({ priceMinor: 1200 });
    await expect(
      recordManualPayment(publicId, input, headers, 'test'),
    ).rejects.toMatchObject({ code: 'PAYMENT_ACCEPTANCE_REQUIRED' });
    expect((await db.select().from(orders))[0].paymentStatus).toBe('UNPAID');
  });
  it.each(['CASH_PICKUP', 'CASH_DELIVERY'] as const)(
    'preserves %s acknowledgment on collection day',
    async (paymentMethod) => {
      const delivery = paymentMethod === 'CASH_DELIVERY';
      await db.update(orders).set({
        paymentMethod,
        fulfillment: delivery ? 'DELIVERY' : 'PICKUP',
        deliveryLocation: delivery ? 'Zona 1' : null,
        shippingMinor: 0,
        totalMinor: 2000,
        requestedDate: getMinimumOrderDate(new Date(), 0),
        orderStatus: delivery ? 'OUT_FOR_DELIVERY' : 'READY',
      });
      const earlier = () => new Date(Date.now() - 4 * 86400000);
      const review = await reviewOrderPricing(orderId, db, earlier);
      await reviewOrderPricing(orderId, db, earlier, review!.revisionId!);
      expect((await reviewOrderPricing(orderId, db))!.accepted).toBe(true);
      expect(
        (
          await recordManualPayment(
            publicId,
            {
              ...input,
              paymentMethod,
              evidence: 'CASH_COLLECTED',
              revisionId: review!.revisionId!,
            },
            headers,
            'collection',
          )
        ).paymentStatus,
      ).toBe('PAID');
    },
  );
});
