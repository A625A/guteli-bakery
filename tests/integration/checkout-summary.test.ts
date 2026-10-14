import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createCheckoutSummaryHandler } from '@/app/api/checkout-summary/route';
import { categories, products, orders, promotions } from '@/server/db/schema';
import { createOrder } from '@/server/orders/create-order';
import { issueCheckoutCredential } from '@/server/orders/checkout-credential';
import { createHmacSubject } from '@/server/security/client-subject';
import { getReceipt } from '@/server/orders/get-receipt';
import { requireTestDatabaseUrl } from '@/test/database-url';
const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'summary tests',
  ),
});
const database = drizzle({ client: pool });
const settings = {
  receiptTokenSecret: 'test-summary-receipt-secret-at-least-32-bytes',
  rateLimitSecret: 'test-summary-rate-secret-at-least-32-bytes',
  trustedProxyHops: 0,
};
const origin = 'https://bakery.example';
let now = new Date('2026-10-12T12:00:00Z');
let productId: string;
let cookie: string;
let publicId: string;
let receiptToken: string;
const handler = () =>
  createCheckoutSummaryHandler({
    database,
    now: () => now,
    getOrderSecuritySettings: () => settings,
    applicationOrigin: origin,
    secureCookies: true,
  });
function request(
  body: unknown = { publicId },
  credential = cookie,
  suppliedOrigin = origin,
) {
  return new Request(`${origin}/api/checkout-summary`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: credential,
      origin: suppliedOrigin,
    },
    body: JSON.stringify(body),
  });
}
beforeEach(async () => {
  now = new Date('2026-10-12T12:00:00Z');
  await pool.query(
    'DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
  );
  await migrate(database, { migrationsFolder: join(process.cwd(), 'drizzle') });
  const [category] = await database
    .insert(categories)
    .values({ name: 'Panadería', slug: 'pan' })
    .returning();
  const [product] = await database
    .insert(products)
    .values({
      categoryId: category.id,
      name: 'Pan & Café',
      slug: 'pan',
      priceMinor: 10000,
      saleUnit: 'Bolsa de 5',
    })
    .returning();
  productId = product.id;
  const credential = issueCheckoutCredential(settings.receiptTokenSecret, now);
  cookie = `__Host-guteli-checkout=${credential.value}`;
  const created = await createOrder({
    database,
    now,
    clock: () => now,
    requestId: 'summary-test',
    receiptTokenSecret: settings.receiptTokenSecret,
    idempotencyKey: credential.key,
    idempotencySubject: createHmacSubject(
      settings.receiptTokenSecret,
      'public-order-idempotency',
      'public-storefront',
    ),
    request: {
      customerName: 'Ana private',
      phone: '55551234',
      fulfillment: 'delivery',
      deliveryLocation: 'Zona 1 private',
      requestedDate: '2026-10-20',
      notes: 'Sin nueces private',
      items: [{ productId, quantity: 5 }],
    },
  });
  publicId = created.order.publicId;
  receiptToken = created.order.receiptToken;
});
afterAll(() => pool.end());
it('returns private current details only to the matching checkout owner, never on the public receipt', async () => {
  const response = await handler()(request());
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(response.headers.get('x-robots-tag')).toContain('noindex');
  const { summary } = await response.json();
  expect(summary.message).toContain('Ana private');
  expect(summary.message).toContain('Total: por confirmar');
  expect(summary.message).toContain('Q500');
  expect(summary.message).not.toContain(receiptToken);
  expect(
    JSON.stringify(await getReceipt(receiptToken, database, () => now)),
  ).not.toContain('private');
});
it('rejects absent, tampered, cross-order and expired credentials without personal data', async () => {
  for (const [body, credential] of [
    [{ publicId }, ''],
    [{ publicId }, cookie + 'x'],
    [{ publicId: 'GUT-26-OTHER' }, cookie],
    [{ publicId, receiptToken }, cookie],
  ] as const) {
    const response = await handler()(request(body, credential));
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).not.toMatch(
      /Ana private|55551234|Zona 1 private|Sin nueces private/,
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  }
  now = new Date('2026-10-13T12:00:00Z');
  expect((await handler()(request())).status).toBe(404);
});
it('requires trusted Origin and rejects unexpected or oversized bodies', async () => {
  expect(
    (await handler()(request({ publicId }, cookie, 'https://attacker.example')))
      .status,
  ).toBe(403);
  expect(
    (await handler()(request({ publicId, paymentStatus: 'PAID' }))).status,
  ).toBe(400);
  expect((await handler()(request({ publicId: 'x'.repeat(600) }))).status).toBe(
    400,
  );
});
it('refreshes promotion expiry and delivery quotes before sharing and forces re-review', async () => {
  await database.insert(promotions).values({
    name: 'Oferta',
    scope: 'CATALOG',
    discountBps: 7000,
    startsAt: new Date('2026-10-12T06:00Z'),
    endsAt: new Date('2026-10-12T13:00Z'),
  });
  const first = await (await handler()(request())).json();
  expect(first.summary.message).toContain('Subtotal: Q150');
  expect(first.summary.message).toContain('70%');
  now = new Date('2026-10-12T13:00Z');
  const expired = await handler()(
    request({ publicId, expectedVersion: first.summary.version }),
  );
  expect(expired.status).toBe(409);
  const updated = await expired.json();
  expect(updated.summary.message).toContain('Subtotal: Q500');
  expect(updated.summary.message).not.toContain('70%');
  expect(
    (
      await handler()(
        request({ publicId, expectedVersion: updated.summary.version }),
      )
    ).status,
  ).toBe(200);
  const [order] = await database.select().from(orders);
  await database
    .update(orders)
    .set({ shippingMinor: 2500, totalMinor: 52500 })
    .where(eq(orders.id, order.id));
  const quoted = await handler()(
    request({ publicId, expectedVersion: updated.summary.version }),
  );
  expect(quoted.status).toBe(409);
  expect((await quoted.json()).summary.message).toContain('Total: Q525');
});
it('preserves frozen marked-paid prices but never promotes a marker into verified payment', async () => {
  await database.insert(promotions).values({
    name: 'Oferta',
    scope: 'CATALOG',
    discountBps: 7000,
    startsAt: new Date('2026-10-12T06:00Z'),
    endsAt: new Date('2026-10-12T13:00Z'),
  });
  await handler()(request());
  const [order] = await database.select().from(orders);
  await database
    .update(orders)
    .set({ paymentStatus: 'PAID', shippingMinor: 0, totalMinor: 15000 })
    .where(eq(orders.id, order.id));
  now = new Date('2026-10-12T14:00Z');
  await database
    .update(products)
    .set({ priceMinor: 20000 })
    .where(eq(products.id, productId));
  const { summary } = await (await handler()(request())).json();
  expect(summary.message).toContain('Total: Q150');
  expect(summary.message).toContain('sin verificación del proveedor');
  expect(summary.message).not.toContain('Pago verificado');
  expect((await database.select().from(orders))[0].paymentStatus).toBe('PAID');
});
it('treats pending payment as unverified and reprices it without changing payment state', async () => {
  const [order] = await database.select().from(orders);
  await database
    .update(orders)
    .set({ paymentStatus: 'PENDING' })
    .where(eq(orders.id, order.id));
  await database
    .update(products)
    .set({ priceMinor: 12000 })
    .where(eq(products.id, productId));
  const { summary } = await (await handler()(request())).json();
  expect(summary.message).toContain('Pago en proceso, todavía sin verificar');
  expect(summary.message).toContain('Subtotal: Q600');
  expect((await database.select().from(orders))[0].paymentStatus).toBe(
    'PENDING',
  );
});
it('rechecks checkout authorization after waiting for the catalog lock', async () => {
  let calls = 0;
  const gated = createCheckoutSummaryHandler({
    database,
    now: () => (++calls === 1 ? now : new Date('2026-10-13T12:00:00Z')),
    getOrderSecuritySettings: () => settings,
    applicationOrigin: origin,
    secureCookies: true,
  });
  const response = await gated(request());
  expect(response.status).toBe(404);
  expect(await response.text()).not.toContain('Ana private');
});
it('a changed customer detail forces review and anonymized orders expose no summary', async () => {
  const first = await (await handler()(request())).json();
  const [order] = await database.select().from(orders);
  await database
    .update(orders)
    .set({ notes: 'Otra indicación' })
    .where(eq(orders.id, order.id));
  const changed = await handler()(
    request({ publicId, expectedVersion: first.summary.version }),
  );
  expect(changed.status).toBe(409);
  expect((await changed.json()).summary.message).toContain('Otra indicación');
  await database
    .update(orders)
    .set({ anonymizedAt: now })
    .where(eq(orders.id, order.id));
  expect((await handler()(request())).status).toBe(404);
});
