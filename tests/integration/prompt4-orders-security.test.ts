import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET =
    'prompt4-auth-secret-must-be-at-least-32-bytes';
  process.env.BETTER_AUTH_URL = 'https://bakery.example';
});
vi.mock('server-only', () => ({}));

import { POST as verifyPayment } from '@/app/api/admin/orders/[id]/payment-verification/route';
import { createCheckoutReviewHandlers } from '@/app/api/checkout-review/route';
import { createCheckoutSessionHandlers } from '@/app/api/checkout-session/route';
import { createCheckoutSummaryHandler } from '@/app/api/checkout-summary/route';
import { createGetReceiptHandler } from '@/app/api/order-status/[receiptToken]/route';
import { db, pool } from '@/server/db/client';
import {
  categories,
  orders,
  orderPricingState,
  products,
} from '@/server/db/schema';
import { issueCheckoutCredential } from '@/server/orders/checkout-credential';
import { createOrder } from '@/server/orders/create-order';
import { getReceipt } from '@/server/orders/get-receipt';
import { reviewOrderPricing } from '@/server/orders/review-pricing';
import { acquireCatalogMutationLock } from '@/server/products/catalog-mutation-lock';
import { createHmacSubject } from '@/server/security/client-subject';

const origin = 'https://bakery.example';
const now = new Date('2026-11-09T12:00:00Z');
const settings = {
  receiptTokenSecret: 'prompt4-receipt-secret-at-least-32-bytes',
  rateLimitSecret: 'prompt4-rate-secret-at-least-32-bytes',
  trustedProxyHops: 0,
};
const reviewHandlers = () =>
  createCheckoutReviewHandlers({
    database: db,
    applicationOrigin: origin,
    now: () => now,
    secureCookies: true,
    getOrderSecuritySettings: () => settings,
  });
let cookie: string;
let publicId: string;
let receiptToken: string;
let orderId: string;
let revisionId: string;
let creationInput: Parameters<typeof createOrder>[0];

beforeEach(async () => {
  await pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
  );
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
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
      priceMinor: 1500,
    })
    .returning();
  const credential = issueCheckoutCredential(settings.receiptTokenSecret, now);
  cookie = `__Host-guteli-checkout=${credential.value}`;
  creationInput = {
    database: db,
    now,
    clock: () => now,
    requestId: 'prompt4-order',
    receiptTokenSecret: settings.receiptTokenSecret,
    idempotencyKey: credential.key,
    idempotencySubject: createHmacSubject(
      settings.receiptTokenSecret,
      'public-order-idempotency',
      'public-storefront',
    ),
    request: {
      customerName: 'Synthetic customer',
      phone: '55551234',
      fulfillment: 'pickup',
      paymentMethod: 'BANK_TRANSFER',
      requestedDate: '2099-12-31',
      items: [{ productId: product.id, quantity: 2 }],
    },
  };
  const created = await createOrder(creationInput);
  publicId = created.order.publicId;
  receiptToken = created.order.receiptToken;
  const [order] = await db.select().from(orders);
  orderId = order.id;
  revisionId = (await reviewOrderPricing(orderId, db, () => now))!.revisionId!;
});
afterAll(() => pool.end());

function reviewRequest(accept: boolean) {
  return new Request(`${origin}/api/checkout-review`, {
    method: accept ? 'POST' : 'GET',
    headers: { origin, cookie, 'content-type': 'application/json' },
    ...(accept ? { body: JSON.stringify({ publicId, revisionId }) } : {}),
  });
}

// The tail throws if consumed: a bounded consumer must cancel as soon as its
// byte budget is exceeded rather than wait for or buffer the entire body.
function oversizedRequest(path: string, text: string, extraHeaders = {}) {
  let pulledTail = false;
  let cancelled = false;
  let first = true;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (first) {
          first = false;
          controller.enqueue(new TextEncoder().encode(text));
        } else {
          pulledTail = true;
          controller.error(new Error('Body tail must not be consumed'));
        }
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...extraHeaders },
    body: stream,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  return { request, stream, outcome: () => ({ pulledTail, cancelled }) };
}

describe('byte-bounded order mutations', () => {
  it('cancels oversized payment evidence before reading its tail or authenticating', async () => {
    const input = oversizedRequest(
      `/api/admin/orders/${publicId}/payment-verification`,
      ' '.repeat(2049),
    );
    const response = await verifyPayment(input.request, {
      params: Promise.resolve({ id: publicId }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(input.outcome()).toEqual({ pulledTail: false, cancelled: true });
    expect(input.stream.locked).toBe(false);
  });
  it('counts actual UTF-8 bytes for payment evidence', async () => {
    const input = oversizedRequest(
      `/api/admin/orders/${publicId}/payment-verification`,
      'é'.repeat(1025),
    );
    const response = await verifyPayment(input.request, {
      params: Promise.resolve({ id: publicId }),
    });
    expect(response.status).toBe(400);
    expect(input.outcome()).toEqual({ pulledTail: false, cancelled: true });
    expect(input.stream.locked).toBe(false);
  });
  it.each([' '.repeat(257), 'é'.repeat(129)])(
    'cancels oversized checkout acceptance by bytes with an invalid proof',
    async (body) => {
      const input = oversizedRequest('/api/checkout-review', body, {
        'x-order-receipt': 'invalid',
      });
      const response = await reviewHandlers().POST(input.request);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
      expect(input.outcome()).toEqual({ pulledTail: false, cancelled: true });
      expect(input.stream.locked).toBe(false);
    },
  );
  it('preserves valid cookie acceptance and malformed-body validation', async () => {
    expect((await reviewHandlers().POST(reviewRequest(true))).status).toBe(200);
    const malformed = reviewRequest(true);
    expect(
      (await reviewHandlers().POST(new Request(malformed, { body: '{' })))
        .status,
    ).toBe(400);
    expect(
      (await db.select().from(orderPricingState))[0].acceptedRevisionId,
    ).toBe(revisionId);
  });
});

async function waitForOrderLock() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ waiting: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%orders%FOR UPDATE%') AS waiting`,
    );
    if (result.rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Public order query did not wait for the row lock');
}

async function revokeWhileWaiting<T>(operation: () => Promise<T>) {
  const blocker = await pool.connect();
  let pending: Promise<T> | undefined;
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [
      orderId,
    ]);
    pending = operation();
    await waitForOrderLock();
    await blocker.query('UPDATE orders SET anonymized_at = $1 WHERE id = $2', [
      now,
      orderId,
    ]);
    await blocker.query('COMMIT');
    return await pending;
  } finally {
    await blocker.query('ROLLBACK');
    blocker.release();
    await pending?.catch(() => undefined);
  }
}

describe('public anonymization revocation', () => {
  it.each(['GET', 'POST'] as const)(
    'does not recover an anonymized order through checkout-session %s',
    async (method) => {
      await db
        .update(orders)
        .set({ anonymizedAt: now })
        .where(eq(orders.id, orderId));
      const handlers = createCheckoutSessionHandlers({
        database: db,
        applicationOrigin: origin,
        now: () => now,
        secureCookies: true,
        getOrderSecuritySettings: () => settings,
      });
      const response = await handlers[method](
        new Request(`${origin}/api/checkout-session`, {
          method,
          headers: { origin, cookie },
        }),
      );
      expect(response.status).toBe(200);
      expect((await response.json()).order).toBeNull();
    },
  );
  it.each(['GET', 'POST'] as const)(
    'rechecks checkout-session %s revocation after an order lock wait',
    async (method) => {
      const handlers = createCheckoutSessionHandlers({
        database: db,
        applicationOrigin: origin,
        now: () => now,
        secureCookies: true,
        getOrderSecuritySettings: () => settings,
      });
      const response = await revokeWhileWaiting(() =>
        handlers[method](
          new Request(`${origin}/api/checkout-session`, {
            method,
            headers: { origin, cookie },
          }),
        ),
      );
      expect(response.status).toBe(200);
      expect((await response.json()).order).toBeNull();
    },
  );
  it('rejects idempotent replay of an anonymized order without recreating or repricing it', async () => {
    await db
      .update(orders)
      .set({ anonymizedAt: now })
      .where(eq(orders.id, orderId));
    await db.update(products).set({ priceMinor: 2500 });
    const before = await db.select().from(orders);
    await expect(createOrder(creationInput)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
    });
    expect(await db.select().from(orders)).toEqual(before);
  });
  it('rechecks idempotent replay revocation after an order lock wait', async () => {
    const outcome = await revokeWhileWaiting(() =>
      createOrder(creationInput).then(
        () => ({ code: 'REPLAY_SUCCEEDED' }),
        (error: unknown) => error,
      ),
    );
    expect(outcome).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(await db.select().from(orders)).toHaveLength(1);
  });
  it.each([
    ['review', 'x'],
    ['review', 'A'.repeat(43)],
    ['summary', 'x'],
    ['summary', 'A'.repeat(43)],
  ])(
    'rejects invalid %s proof before waiting for the catalog lock (%s)',
    async (kind, proof) => {
      let release = () => {};
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      let announce = () => {};
      const acquired = new Promise<void>((resolve) => {
        announce = resolve;
      });
      const holding = db.transaction(async (tx) => {
        await acquireCatalogMutationLock(tx);
        announce();
        await released;
      });
      let pending: Promise<Response> | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([holding, acquired]);
        const headers = {
          origin,
          'content-type': 'application/json',
          'x-order-receipt': proof,
          'x-order-reference': publicId,
        };
        pending =
          kind === 'review'
            ? reviewHandlers().GET(
                new Request(`${origin}/api/checkout-review`, { headers }),
              )
            : createCheckoutSummaryHandler({
                database: db,
                now: () => now,
                applicationOrigin: origin,
                secureCookies: true,
                getOrderSecuritySettings: () => settings,
              })(
                new Request(`${origin}/api/checkout-summary`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ publicId }),
                }),
              );
        const result = await Promise.race([
          pending,
          new Promise<'blocked'>((resolve) => {
            timer = setTimeout(() => resolve('blocked'), 1500);
          }),
        ]);
        expect(result).not.toBe('blocked');
        expect((result as Response).status).toBe(404);
      } finally {
        clearTimeout(timer);
        release();
        await holding;
        await pending;
      }
    },
  );
  it('rejects an unknown receipt without waiting for the global catalog lock', async () => {
    let releaseGate = () => {};
    const waitForRelease = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    let announceAcquired = () => {};
    const acquired = new Promise<void>((resolve) => {
      announceAcquired = resolve;
    });
    const holding = db.transaction(async (transaction) => {
      await acquireCatalogMutationLock(transaction);
      announceAcquired();
      await waitForRelease;
    });
    let pending: ReturnType<typeof getReceipt> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([acquired, holding]);
      pending = getReceipt('A'.repeat(43), db, () => now);
      const result = await Promise.race([
        pending,
        new Promise<'blocked'>((resolve) => {
          timer = setTimeout(() => resolve('blocked'), 1500);
        }),
      ]);
      expect(result).toBeNull();
    } finally {
      clearTimeout(timer);
      releaseGate();
      await holding;
      await pending;
    }
  });
  it('rejects the receipt URL once the order is anonymized', async () => {
    await db
      .update(orders)
      .set({ anonymizedAt: now })
      .where(eq(orders.id, orderId));
    const response = await createGetReceiptHandler({ database: db })(
      new Request(`${origin}/api/order-status/${receiptToken}`),
      { params: Promise.resolve({ receiptToken }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: 'ORDER_NOT_FOUND' },
    });
  });
  it.each([false, true])(
    'rejects anonymized cookie review/accept (accept=%s)',
    async (accept) => {
      await db
        .update(orders)
        .set({ anonymizedAt: now })
        .where(eq(orders.id, orderId));
      const handler = accept ? reviewHandlers().POST : reviewHandlers().GET;
      expect((await handler(reviewRequest(accept))).status).toBe(404);
      expect(
        (await db.select().from(orderPricingState))[0].acceptedRevisionId,
      ).toBeNull();
    },
  );
  it('rechecks receipt revocation after waiting for an order lock', async () => {
    expect(
      await revokeWhileWaiting(() => getReceipt(receiptToken, db, () => now)),
    ).toBeNull();
  });
  it.each([false, true])(
    'rechecks cookie revocation after an order lock wait (accept=%s)',
    async (accept) => {
      const handler = accept ? reviewHandlers().POST : reviewHandlers().GET;
      const response = await revokeWhileWaiting(() =>
        handler(reviewRequest(accept)),
      );
      expect(response.status).toBe(404);
      expect(
        (await db.select().from(orderPricingState))[0].acceptedRevisionId,
      ).toBeNull();
    },
  );
  it('keeps internal financial review available for an anonymized order', async () => {
    await db
      .update(orders)
      .set({ anonymizedAt: now })
      .where(eq(orders.id, orderId));
    expect(await reviewOrderPricing(orderId, db, () => now)).toMatchObject({
      publicId,
      subtotalMinor: 3000,
      paymentStatus: 'UNPAID',
    });
  });
});
