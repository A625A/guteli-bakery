import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createPostOrderHandler } from '@/app/api/orders/route';
import { categories, products } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'order API integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

const now = new Date('2026-08-29T12:00:00.000Z');
const rateLimitSecret = 'rate-limit-secret-with-at-least-32-bytes';
const receiptTokenSecret = 'receipt-token-secret-with-at-least-32-bytes';
const categoryId = '00000000-0000-4000-8000-000000000101';
const productId = '00000000-0000-4000-8000-000000000001';

function securitySettings(
  overrides: Partial<{ trustedProxyHops: number }> = {},
) {
  return {
    rateLimitSecret,
    receiptTokenSecret,
    trustedProxyHops: overrides.trustedProxyHops ?? 0,
  };
}

function createHandler(
  overrides: Partial<Parameters<typeof createPostOrderHandler>[0]> = {},
) {
  return createPostOrderHandler({
    database: db,
    now: () => now,
    getOrderSecuritySettings: () => securitySettings(),
    getDirectClientAddress: () => '203.0.113.42',
    ...overrides,
  });
}

function requestBody(
  overrides: Partial<{
    customerName: string;
    phone: string;
    fulfillment: 'pickup' | 'delivery';
    requestedDate: string;
    deliveryLocation: string;
    items: Array<{ productId: string; quantity: number }>;
  }> = {},
) {
  const fulfillment = overrides.fulfillment ?? 'pickup';
  return {
    customerName: overrides.customerName ?? 'María López',
    phone: overrides.phone ?? '+502 5555-5555',
    fulfillment,
    requestedDate: overrides.requestedDate ?? '2026-08-31',
    ...(fulfillment === 'delivery'
      ? { deliveryLocation: overrides.deliveryLocation ?? 'Zona 10' }
      : {}),
    items: overrides.items ?? [{ productId, quantity: 2 }],
  };
}

function postOrder(
  handler: ReturnType<typeof createPostOrderHandler>,
  body: unknown = requestBody(),
  overrides: Partial<{
    contentType: string;
    key: string;
    headers: HeadersInit;
  }> = {},
) {
  return handler(
    new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: {
        'content-type': overrides.contentType ?? 'application/json',
        'idempotency-key':
          overrides.key ?? '11111111-1111-4111-8111-111111111111',
        ...overrides.headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

async function insertProduct(
  overrides: Partial<{ active: boolean; stockQuantity: number | null }> = {},
) {
  await db.insert(categories).values({
    id: categoryId,
    name: 'Pretzels',
    slug: 'pretzels',
  });
  await db.insert(products).values({
    id: productId,
    categoryId,
    name: 'Pretzel Original',
    slug: 'pretzel-original',
    priceMinor: 7500,
    active: overrides.active ?? true,
    stockQuantity: overrides.stockQuantity ?? null,
  });
}

describe('POST /api/orders', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    await resetDatabase();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await pool.end();
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'not-a-uuid'],
  ])(
    'rejects a %s idempotency key with a safe no-store envelope',
    async (_, key) => {
      const response = await postOrder(createHandler(), requestBody(), {
        headers: key === undefined ? { 'idempotency-key': '' } : undefined,
        ...(key === undefined ? { key: '' } : { key }),
      });

      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
      expect(await response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    },
  );

  it('rejects malformed JSON and non-JSON content without reflecting the raw body', async () => {
    const handler = createHandler();
    const malformed = await postOrder(
      handler,
      '{"customerName":"María López"',
      {
        key: '11111111-1111-4111-8111-111111111111',
      },
    );
    const nonJson = await postOrder(handler, 'María López +502 5555-5555', {
      contentType: 'text/plain',
      key: '22222222-2222-4222-8222-222222222222',
    });

    expect(malformed.status).toBe(400);
    expect(nonJson.status).toBe(400);
    expect(JSON.stringify(await malformed.json())).not.toContain('María López');
    expect(JSON.stringify(await nonJson.json())).not.toContain(
      '+502 5555-5555',
    );
  });

  it('rejects unknown authoritative fields and reports only safe field errors', async () => {
    const response = await postOrder(createHandler(), {
      ...requestBody(),
      totalMinor: 1,
      receiptToken: 'secret-receipt-token',
    });
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody).toMatchObject({
      error: { code: 'VALIDATION_ERROR', fieldErrors: expect.any(Object) },
    });
    expect(JSON.stringify(responseBody)).not.toContain('secret-receipt-token');
  });

  it('rejects a body that exceeds the streaming byte limit despite a lying content length', async () => {
    const response = await postOrder(
      createHandler(),
      JSON.stringify({ padding: 'x'.repeat(16 * 1024) }),
      {
        key: '11111111-1111-4111-8111-111111111111',
        headers: { 'content-length': '1' },
      },
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('fails closed when no direct address source exists and ignores spoofed forwarding at zero trusted hops', async () => {
    await insertProduct();
    const noDirectSource = await postOrder(
      createHandler({ getDirectClientAddress: () => null }),
      requestBody(),
      { headers: { 'x-forwarded-for': '198.51.100.9' } },
    );
    const handler = createHandler({
      getDirectClientAddress: () => '203.0.113.42',
    });
    const accepted = await postOrder(handler, requestBody(), {
      headers: { 'x-forwarded-for': '198.51.100.9' },
    });

    expect(noDirectSource.status).toBe(503);
    expect(await noDirectSource.json()).toMatchObject({
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
    expect(accepted.status).toBe(201);
  });

  it('fails closed for an insufficient trusted proxy chain', async () => {
    const response = await postOrder(
      createHandler({
        getDirectClientAddress: () => null,
        getOrderSecuritySettings: () =>
          securitySettings({ trustedProxyHops: 1 }),
      }),
      requestBody(),
      { headers: { 'x-forwarded-for': '198.51.100.9' } },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: 'SERVICE_UNAVAILABLE' },
    });
  });

  it('enforces the atomic IP attempt limit with exact retry seconds', async () => {
    const handler = createHandler();
    const responses = await Promise.all(
      Array.from({ length: 11 }, (_, index) =>
        postOrder(handler, '{', {
          key: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        }),
      ),
    );
    const limited = responses.filter(({ status }) => status === 429);

    expect(responses.filter(({ status }) => status === 400)).toHaveLength(10);
    expect(limited).toHaveLength(1);
    expect(limited[0].headers.get('retry-after')).toBe('900');
    expect(await limited[0].json()).toMatchObject({
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('creates once and replays across different direct client addresses', async () => {
    await insertProduct();
    const first = await postOrder(
      createHandler({ getDirectClientAddress: () => '203.0.113.42' }),
    );
    const replay = await postOrder(
      createHandler({ getDirectClientAddress: () => '2001:DB8::4' }),
    );

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(await first.clone().json());
  });

  it('maps idempotency conflicts, unavailable products, and internal failures safely', async () => {
    await insertProduct();
    const handler = createHandler();
    await postOrder(handler);
    const conflict = await postOrder(
      handler,
      requestBody({ phone: '+502 4444-4444' }),
    );
    const unavailable = await postOrder(
      createHandler(),
      requestBody({
        items: [
          { productId: '00000000-0000-4000-8000-000000000099', quantity: 1 },
        ],
      }),
      { key: '22222222-2222-4222-8222-222222222222' },
    );
    const internal = await postOrder(
      createHandler({
        getOrderSecuritySettings: () => ({
          ...securitySettings(),
          receiptTokenSecret: 'too-short',
        }),
      }),
      requestBody({ customerName: 'María Privada', phone: '+502 5555-9999' }),
      { key: '33333333-3333-4333-8333-333333333333' },
    );

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: { code: 'IDEMPOTENCY_CONFLICT' },
    });
    expect(unavailable.status).toBe(409);
    expect(await unavailable.json()).toMatchObject({
      error: { code: 'PRODUCT_UNAVAILABLE' },
    });
    expect(internal.status).toBe(500);
    expect(JSON.stringify(await internal.json())).not.toContain(
      'María Privada',
    );
  });

  it('counts only newly successful phone orders and does not consume the bucket on replay', async () => {
    await insertProduct();
    const handler = createHandler();
    const successfulKeys = Array.from(
      { length: 5 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    );

    for (const key of successfulKeys) {
      const response = await postOrder(handler, requestBody(), { key });
      expect(response.status).toBe(201);
    }
    const replay = await postOrder(handler, requestBody(), {
      key: successfulKeys[0],
    });
    const limited = await postOrder(handler, requestBody(), {
      key: '00000000-0000-4000-8000-000000000099',
    });

    expect(replay.status).toBe(200);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('1800');
  });

  it('atomically caps concurrent successful orders by normalized phone subject', async () => {
    await insertProduct();
    const handler = createHandler();
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        postOrder(handler, requestBody(), {
          key: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        }),
      ),
    );

    expect(responses.filter(({ status }) => status === 201)).toHaveLength(5);
    expect(responses.filter(({ status }) => status === 429)).toHaveLength(1);
  });

  it('rolls back the successful-phone bucket when a late order write fails', async () => {
    await insertProduct();
    const handler = createHandler();
    await pool.query(`
      CREATE FUNCTION fail_order_api_audit() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'test audit failure';
      END;
      $$;
      CREATE TRIGGER fail_order_api_audit
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_order_api_audit();
    `);

    const failed = await postOrder(handler, requestBody(), {
      key: '00000000-0000-4000-8000-000000000001',
    });
    await pool.query('DROP TRIGGER fail_order_api_audit ON audit_logs');
    await pool.query('DROP FUNCTION fail_order_api_audit()');

    expect(failed.status).toBe(500);
    for (let index = 2; index <= 6; index += 1) {
      const response = await postOrder(handler, requestBody(), {
        key: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      });
      expect(response.status).toBe(201);
    }
    const limited = await postOrder(handler, requestBody(), {
      key: '00000000-0000-4000-8000-000000000007',
    });

    expect(limited.status).toBe(429);
  });
});
