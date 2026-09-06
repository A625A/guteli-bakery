import { join } from 'node:path';

import { base32 } from '@better-auth/utils/base32';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET = 'test-auth-secret-must-be-at-least-32-bytes';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.RATE_LIMIT_SECRET =
    'test-rate-limit-secret-must-be-at-least-32-bytes';
  process.env.TRUSTED_PROXY_HOPS = '1';
});

vi.mock('server-only', () => ({}));

import { PATCH as PATCH_QUOTE } from '@/app/api/admin/orders/[id]/delivery-quote/route';
import { GET as GET_ORDER } from '@/app/api/admin/orders/[id]/route';
import { PATCH as PATCH_STATUS } from '@/app/api/admin/orders/[id]/status/route';
import { GET as GET_ORDERS } from '@/app/api/admin/orders/route';
import { POST as AUTH_POST } from '@/app/api/auth/[...all]/route';
import { adminGetOrder } from '@/server/orders/admin-get-order';
import { adminListOrders } from '@/server/orders/admin-list-orders';
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';
import {
  auditLogs,
  categories,
  orderItems,
  orders,
  outboxEvents,
  products,
  session,
  user,
} from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'admin orders integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
let nextTestIpSuffix = 80;

class CookieJar {
  private readonly values = new Map<string, string>();
  readonly forwardedFor = `198.51.100.${nextTestIpSuffix++}`;

  absorb(response: Response) {
    for (const setCookie of response.headers.getSetCookie()) {
      const [pair = '', ...attributes] = setCookie.split(';');
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const expired = attributes.some(
        (attribute) => attribute.trim().toLowerCase() === 'max-age=0',
      );
      if (expired || value === '') this.values.delete(name);
      else this.values.set(name, value);
    }
  }

  headers(origin = 'http://localhost:3000') {
    return new Headers({
      cookie: [...this.values]
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
      origin,
      'x-request-id': '523e4567-e89b-42d3-a456-426614174000',
    });
  }

  cookie() {
    return this.headers().get('cookie') ?? '';
  }
}

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

async function authPost(
  path: string,
  body: Record<string, unknown>,
  jar: CookieJar,
) {
  const response = await AUTH_POST(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: jar.cookie(),
        origin: 'http://localhost:3000',
        'x-forwarded-for': jar.forwardedFor,
      },
      body: JSON.stringify(body),
    }),
  );
  jar.absorb(response);
  return response;
}

async function enrolledActor(role: 'OWNER' | 'ADMIN' = 'OWNER') {
  const suffix = nextTestIpSuffix.toString();
  const email = `orders-actor-${suffix}@example.test`;
  const setupPassword = `orders-setup-${suffix}-password-at-least-14`;
  const password = `orders-changed-${suffix}-password-at-least-14`;
  expect(
    await provisionOwner({ email, name: 'Operadora', password: setupPassword }),
  ).toBe('created');
  const jar = new CookieJar();
  expect(
    (await authPost('sign-in/email', { email, password: setupPassword }, jar))
      .status,
  ).toBe(200);
  expect(
    (
      await authPost(
        'change-password',
        { currentPassword: setupPassword, newPassword: password },
        jar,
      )
    ).status,
  ).toBe(200);
  const enabled = await authPost(
    'two-factor/enable',
    { method: 'totp', password },
    jar,
  );
  expect(enabled.status).toBe(200);
  const uri = (await enabled.json()) as { totpURI: string };
  const encoded = new URL(uri.totpURI).searchParams.get('secret');
  expect(encoded).toBeTruthy();
  const secret = new TextDecoder().decode(base32.decode(encoded!));
  const code = await auth.api.generateTOTP({ body: { secret } });
  expect((await authPost('two-factor/verify-totp', code, jar)).status).toBe(
    200,
  );
  const [actor] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  if (role === 'ADMIN') {
    await db.update(user).set({ role }).where(eq(user.id, actor.id));
  }
  return { id: actor.id, jar };
}

async function orderFixture(values: Partial<typeof orders.$inferInsert> = {}) {
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  let [product] = await db.select().from(products).limit(1);
  if (!product) {
    const [category] = await db
      .insert(categories)
      .values({ name: 'Pedidos', slug: `pedidos-${suffix.toLowerCase()}` })
      .returning();
    [product] = await db
      .insert(products)
      .values({
        categoryId: category.id,
        name: 'Pretzel de prueba',
        slug: `pretzel-${suffix.toLowerCase()}`,
        priceMinor: 1250,
        stockQuantity: 7,
      })
      .returning();
  }
  const fulfillment = values.fulfillment ?? 'DELIVERY';
  const subtotalMinor = values.subtotalMinor ?? 2500;
  const [order] = await db
    .insert(orders)
    .values({
      publicId: `GUT-26-${suffix}`,
      customerName: 'Ana Operaciones',
      phone: '+50255550001',
      fulfillment,
      requestedDate: '2026-09-10',
      deliveryLocation:
        fulfillment === 'DELIVERY' ? 'Zona 10, Ciudad de Guatemala' : null,
      notes: 'Tocar el timbre azul',
      subtotalMinor,
      shippingMinor: fulfillment === 'PICKUP' ? 0 : null,
      totalMinor: fulfillment === 'PICKUP' ? subtotalMinor : null,
      receiptTokenHash: suffix.padEnd(64, 'a').slice(0, 64),
      ...values,
    })
    .returning();
  await db.insert(orderItems).values({
    orderId: order.id,
    sourceProductId: product.id,
    productName: 'Snapshot inmutable',
    categoryLabel: 'Categoría histórica',
    saleUnit: 'unidad',
    unitPriceMinor: 1250,
    quantity: 2,
    lineTotalMinor: 2500,
  });
  await db.insert(outboxEvents).values({
    eventType: 'OWNER_ORDER_CREATED',
    payload: { orderId: order.id, requestId: 'fixture-request' },
    state: 'PENDING',
  });
  return order;
}

async function waitForOrderMutationLock() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ waiting: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND wait_event_type = 'Lock'
          AND query ILIKE '%orders%FOR UPDATE%'
      ) AS waiting
    `);
    if (result.rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Order mutation did not wait for the row lock.');
}

function listRequest(jar?: CookieJar, query = '') {
  return GET_ORDERS(
    new Request(`http://localhost:3000/api/admin/orders${query}`, {
      headers: jar?.headers(),
    }),
  );
}

function detailRequest(publicId: string, jar?: CookieJar, query = '') {
  return GET_ORDER(
    new Request(`http://localhost:3000/api/admin/orders/${publicId}${query}`, {
      headers: jar?.headers(),
    }),
    { params: Promise.resolve({ id: publicId }) },
  );
}

function mutationRequest(
  kind: 'status' | 'delivery-quote',
  publicId: string,
  jar: CookieJar,
  body: Record<string, unknown>,
  origin = 'http://localhost:3000',
) {
  const request = new Request(
    `http://localhost:3000/api/admin/orders/${publicId}/${kind}`,
    {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...Object.fromEntries(jar.headers(origin)),
      },
      body: JSON.stringify(body),
    },
  );
  const context = { params: Promise.resolve({ id: publicId }) };
  return kind === 'status'
    ? PATCH_STATUS(request, context)
    : PATCH_QUOTE(request, context);
}

describe('protected admin order operations', () => {
  beforeEach(resetDatabase);
  afterAll(() => pool.end());

  it('authorizes reads inside each use case for OWNER and ADMIN and denies anonymous access', async () => {
    const order = await orderFixture();
    await expect(adminListOrders(new Headers())).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      adminGetOrder(order.publicId, new Headers()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect((await listRequest()).status).toBe(401);

    const actor = await enrolledActor('ADMIN');
    expect((await listRequest(actor.jar)).status).toBe(200);
    expect((await detailRequest(order.publicId, actor.jar)).status).toBe(200);
  });

  it('returns bounded deterministic pagination and strict validated filters without list PII', async () => {
    const actor = await enrolledActor();
    for (let index = 0; index < 27; index += 1) {
      await orderFixture({
        publicId: `GUT-26-PAGE${index.toString().padStart(4, '0')}`,
        createdAt: new Date(
          `2026-09-${String((index % 9) + 1).padStart(2, '0')}T12:00:00.000Z`,
        ),
        requestedDate: index % 2 === 0 ? '2026-09-10' : '2026-09-11',
        fulfillment: index % 2 === 0 ? 'DELIVERY' : 'PICKUP',
        deliveryLocation: index % 2 === 0 ? 'Zona 10' : null,
        shippingMinor: index % 2 === 0 ? null : 0,
        totalMinor: index % 2 === 0 ? null : 2500,
        orderStatus: index % 3 === 0 ? 'CONFIRMED' : 'RECEIVED',
      });
    }

    const first = await listRequest(actor.jar, '?page=1&pageSize=25');
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('private, no-store');
    expect(first.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(first.headers.get('referrer-policy')).toBe('no-referrer');
    const payload = (await first.json()) as {
      orders: Record<string, unknown>[];
      total: number;
      pageSize: number;
    };
    expect(payload).toMatchObject({ total: 27, pageSize: 25 });
    expect(payload.orders).toHaveLength(25);
    expect(payload.orders[0]).toMatchObject({
      publicId: 'GUT-26-PAGE0026',
      customerName: 'Ana Operaciones',
      quoteState: 'PENDING',
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /55550001|Zona 10|Tocar el timbre|receipt/i,
    );

    const unfilteredForm = await listRequest(
      actor.jar,
      '?status=&fulfillment=&date=',
    );
    expect(unfilteredForm.status).toBe(200);

    const filtered = await listRequest(
      actor.jar,
      '?status=CONFIRMED&fulfillment=DELIVERY&date=2026-09-10&pageSize=100',
    );
    expect(filtered.status).toBe(200);
    const filteredPayload = (await filtered.json()) as {
      orders: {
        orderStatus: string;
        fulfillment: string;
        requestedDate: string;
      }[];
    };
    expect(filteredPayload.orders.length).toBeGreaterThan(0);
    expect(filteredPayload.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderStatus: 'CONFIRMED',
          fulfillment: 'DELIVERY',
          requestedDate: '2026-09-10',
        }),
      ]),
    );

    for (const query of [
      '?pageSize=101',
      '?page=0',
      '?status=PAID',
      '?fulfillment=SHIP',
      '?date=2026-02-30',
      '?actorId=forbidden',
      '?page=1&page=2',
    ]) {
      const response = await listRequest(actor.jar, query);
      expect(response.status, query).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    }
  });

  it('exposes operational PII and immutable snapshots only on authenticated detail', async () => {
    const actor = await enrolledActor();
    const order = await orderFixture();
    const response = await detailRequest(order.publicId, actor.jar);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.order).toMatchObject({
      publicId: order.publicId,
      customerName: 'Ana Operaciones',
      phone: '+50255550001',
      deliveryLocation: 'Zona 10, Ciudad de Guatemala',
      notes: 'Tocar el timbre azul',
      items: [
        {
          productName: 'Snapshot inmutable',
          categoryLabel: 'Categoría histórica',
          unitPriceMinor: 1250,
          quantity: 2,
          lineTotalMinor: 2500,
        },
      ],
      notifications: [expect.objectContaining({ state: 'PENDING' })],
    });
    expect(JSON.stringify(payload)).not.toMatch(/receiptToken|receipt_token/i);
    expect(
      (await detailRequest(order.publicId, actor.jar, '?extra=1')).status,
    ).toBe(400);
  });

  it('enforces fulfillment-aware transition edges, terminal timestamps, strict bodies, and Origin', async () => {
    const actor = await enrolledActor();
    const pickup = await orderFixture({ fulfillment: 'PICKUP' });
    const delivery = await orderFixture();

    let response = await mutationRequest('status', pickup.publicId, actor.jar, {
      status: 'CONFIRMED',
      expectedVersion: 1,
    });
    expect(response.status).toBe(200);
    response = await mutationRequest('status', pickup.publicId, actor.jar, {
      status: 'PREPARING',
      expectedVersion: 2,
    });
    expect(response.status).toBe(200);
    response = await mutationRequest('status', pickup.publicId, actor.jar, {
      status: 'READY',
      expectedVersion: 3,
    });
    expect(response.status).toBe(200);
    const pickupDelivery = await mutationRequest(
      'status',
      pickup.publicId,
      actor.jar,
      { status: 'OUT_FOR_DELIVERY', expectedVersion: 4 },
    );
    expect(pickupDelivery.status).toBe(409);
    expect(await pickupDelivery.json()).toMatchObject({
      error: { code: 'INVALID_STATUS_TRANSITION' },
    });
    response = await mutationRequest('status', pickup.publicId, actor.jar, {
      status: 'COMPLETED',
      expectedVersion: 4,
    });
    expect(response.status).toBe(200);
    const [completed] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, pickup.id));
    expect(completed).toMatchObject({
      orderStatus: 'COMPLETED',
      version: 5,
    });
    expect(completed.terminalAt).toBeInstanceOf(Date);

    const skipped = await mutationRequest(
      'status',
      delivery.publicId,
      actor.jar,
      { status: 'READY', expectedVersion: 1 },
    );
    expect(skipped.status).toBe(409);
    const badOrigin = await mutationRequest(
      'status',
      delivery.publicId,
      actor.jar,
      { status: 'CONFIRMED', expectedVersion: 1 },
      'https://evil.example',
    );
    expect(badOrigin.status).toBe(403);
    expect(await badOrigin.json()).toMatchObject({
      error: { code: 'INVALID_ORIGIN' },
    });
    const injected = await mutationRequest(
      'status',
      delivery.publicId,
      actor.jar,
      {
        status: 'CONFIRMED',
        expectedVersion: 1,
        paymentStatus: 'PAID',
      },
    );
    expect(injected.status).toBe(400);
  });

  it('requires fresh MFA for cancellation after RECEIVED, never restocks, and records a safe audit', async () => {
    const actor = await enrolledActor();
    const order = await orderFixture({ orderStatus: 'CONFIRMED' });
    const [product] = await db.select().from(products).limit(1);
    await db
      .update(products)
      .set({ stockQuantity: 4 })
      .where(eq(products.id, product.id));
    await db
      .update(session)
      .set({ mfaVerifiedAt: new Date(Date.now() - 600_001) })
      .where(eq(session.userId, actor.id));

    const staleMfa = await mutationRequest(
      'status',
      order.publicId,
      actor.jar,
      { status: 'CANCELLED', expectedVersion: 1 },
    );
    expect(staleMfa.status).toBe(401);
    expect(await staleMfa.json()).toMatchObject({
      error: { code: 'REAUTHENTICATION_REQUIRED' },
    });
    await db
      .update(session)
      .set({ mfaVerifiedAt: new Date() })
      .where(eq(session.userId, actor.id));
    const cancelled = await mutationRequest(
      'status',
      order.publicId,
      actor.jar,
      { status: 'CANCELLED', expectedVersion: 1 },
    );
    expect(cancelled.status).toBe(200);
    const [storedProduct] = await db
      .select({ stockQuantity: products.stockQuantity })
      .from(products)
      .where(eq(products.id, product.id));
    expect(storedProduct.stockQuantity).toBe(4);

    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityId, order.id),
          eq(auditLogs.action, 'ORDER_STATUS_CHANGED'),
        ),
      );
    expect(audit).toMatchObject({
      actorId: actor.id,
      entityType: 'ORDER',
      entityId: order.id,
      requestId: '523e4567-e89b-42d3-a456-426614174000',
      metadata: {
        before: { orderStatus: 'CONFIRMED' },
        after: { orderStatus: 'CANCELLED' },
      },
    });
    expect(JSON.stringify(audit.metadata)).not.toMatch(
      /Ana Operaciones|55550001|Zona 10|Tocar el timbre/i,
    );
  });

  it('rechecks MFA freshness with the current time after winning the order lock', async () => {
    const actor = await enrolledActor();
    const order = await orderFixture({ orderStatus: 'CONFIRMED' });
    const blocker = await pool.connect();
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [
      order.id,
    ]);
    await db
      .update(session)
      .set({ mfaVerifiedAt: new Date(Date.now() - 599_900) })
      .where(eq(session.userId, actor.id));
    const mutation = mutationRequest('status', order.publicId, actor.jar, {
      status: 'CANCELLED',
      expectedVersion: 1,
    });
    try {
      await waitForOrderMutationLock();
      await new Promise((resolve) => setTimeout(resolve, 150));
      await blocker.query('COMMIT');
      const response = await mutation;
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        error: { code: 'REAUTHENTICATION_REQUIRED' },
      });
      const [stored] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(stored).toMatchObject({ orderStatus: 'CONFIRMED', version: 1 });
    } catch (error) {
      await blocker.query('ROLLBACK');
      await mutation.catch(() => undefined);
      throw error;
    } finally {
      blocker.release();
    }
  });

  it('quotes only nonterminal delivery orders with exact checked math and one version increment', async () => {
    const actor = await enrolledActor();
    const delivery = await orderFixture({ subtotalMinor: 2_147_483_000 });
    const quoted = await mutationRequest(
      'delivery-quote',
      delivery.publicId,
      actor.jar,
      { shippingMinor: 647, expectedVersion: 1 },
    );
    expect(quoted.status).toBe(200);
    expect(await quoted.json()).toMatchObject({
      order: {
        shippingMinor: 647,
        totalMinor: 2_147_483_647,
        version: 2,
      },
    });

    const pickup = await orderFixture({ fulfillment: 'PICKUP' });
    const pickupQuote = await mutationRequest(
      'delivery-quote',
      pickup.publicId,
      actor.jar,
      { shippingMinor: 10, expectedVersion: 1 },
    );
    expect(pickupQuote.status).toBe(409);
    expect(await pickupQuote.json()).toMatchObject({
      error: { code: 'PICKUP_QUOTE_FORBIDDEN' },
    });
    const overflow = await mutationRequest(
      'delivery-quote',
      delivery.publicId,
      actor.jar,
      { shippingMinor: 648, expectedVersion: 2 },
    );
    expect(overflow.status).toBe(400);
    expect(await overflow.json()).toMatchObject({
      error: { code: 'DELIVERY_QUOTE_OVERFLOW' },
    });
    const terminal = await orderFixture({
      orderStatus: 'CANCELLED',
      terminalAt: new Date(),
    });
    const terminalQuote = await mutationRequest(
      'delivery-quote',
      terminal.publicId,
      actor.jar,
      { shippingMinor: 100, expectedVersion: 1 },
    );
    expect(terminalQuote.status).toBe(409);
    expect(await terminalQuote.json()).toMatchObject({
      error: { code: 'TERMINAL_ORDER' },
    });
  });

  it('rejects a simultaneous stale writer without side effects', async () => {
    const actor = await enrolledActor();
    const order = await orderFixture();
    const responses = await Promise.all([
      mutationRequest('delivery-quote', order.publicId, actor.jar, {
        shippingMinor: 300,
        expectedVersion: 1,
      }),
      mutationRequest('delivery-quote', order.publicId, actor.jar, {
        shippingMinor: 500,
        expectedVersion: 1,
      }),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const stale = responses.find(({ status }) => status === 409)!;
    expect(await stale.json()).toMatchObject({
      error: { code: 'STALE_ORDER' },
    });
    const [stored] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, order.id));
    expect(stored.version).toBe(2);
    expect([300, 500]).toContain(stored.shippingMinor);
    const orderAudits = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, order.id));
    expect(orderAudits).toHaveLength(1);
  });

  it('rolls back the mutation when the late audit insert fails', async () => {
    const actor = await enrolledActor();
    const order = await orderFixture();
    await pool.query(`
      CREATE FUNCTION reject_order_quote_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'ORDER_DELIVERY_QUOTED' THEN
          RAISE EXCEPTION 'forced late audit failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_order_quote_audit
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION reject_order_quote_audit();
    `);
    const response = await mutationRequest(
      'delivery-quote',
      order.publicId,
      actor.jar,
      { shippingMinor: 450, expectedVersion: 1 },
    );
    expect(response.status).toBe(500);
    const [stored] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, order.id));
    expect(stored).toMatchObject({
      shippingMinor: null,
      totalMinor: null,
      version: 1,
    });
  });
});
