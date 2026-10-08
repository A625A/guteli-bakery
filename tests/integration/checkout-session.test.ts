import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createCheckoutSessionHandlers } from '@/app/api/checkout-session/route';
import { createPostOrderHandler } from '@/app/api/orders/route';
import { categories, products } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'checkout session tests',
  ),
});
const database = drizzle({ client: pool });
const now = new Date('2026-10-08T12:00:00Z');
const settings = {
  rateLimitSecret: 'test-rate-limit-secret-at-least-32-bytes',
  receiptTokenSecret: 'test-receipt-token-secret-at-least-32-bytes',
  trustedProxyHops: 0,
};
const origin = 'https://bakery.example';
const productId = '00000000-0000-4000-8000-000000000001';
const handlers = () =>
  createCheckoutSessionHandlers({
    database,
    now: () => now,
    getOrderSecuritySettings: () => settings,
    applicationOrigin: origin,
    secureCookies: true,
  });
function request(method: string, cookie = '') {
  return new Request(`${origin}/api/checkout-session`, {
    method,
    headers: { origin, cookie },
  });
}

describe('customer checkout recovery', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await pool.query('CREATE SCHEMA public');
    await migrate(database, {
      migrationsFolder: join(process.cwd(), 'drizzle'),
    });
    const [category] = await database
      .insert(categories)
      .values({ name: 'Pretzels', slug: 'pretzels' })
      .returning();
    await database.insert(products).values({
      id: productId,
      categoryId: category.id,
      name: 'Original',
      slug: 'original',
      priceMinor: 6000,
    });
  });
  afterAll(async () => {
    vi.useRealTimers();
    await pool.end();
  });

  it('recovers the same unpaid order after a lost submission response without customer PII', async () => {
    const prepared = await handlers().POST(request('POST'));
    expect(prepared.status).toBe(200);
    const setCookie = prepared.headers.get('set-cookie')!;
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toMatch(/SameSite=lax/i);
    const cookie = setCookie.split(';')[0];
    const { idempotencyKey } = await prepared.json();
    const submit = createPostOrderHandler({
      database,
      now: () => now,
      getOrderSecuritySettings: () => settings,
      getDirectClientAddress: () => '203.0.113.21',
    });
    const saved = await submit(
      new Request(`${origin}/api/orders`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey,
          cookie,
        },
        body: JSON.stringify({
          customerName: 'Ana private',
          phone: '55551234',
          fulfillment: 'pickup',
          requestedDate: '2026-10-12',
          notes: 'Private note',
          items: [{ productId, quantity: 2 }],
        }),
      }),
    );
    expect(saved.status).toBe(201);
    const savedBody = await saved.json();
    const recovered = await handlers().GET(request('GET', cookie));
    expect(recovered.status).toBe(200);
    expect(recovered.headers.get('cache-control')).toBe('private, no-store');
    const body = await recovered.json();
    expect(body.order).toEqual(savedBody.order);
    expect(body.order).toMatchObject({
      paymentStatus: 'UNPAID',
      subtotalMinor: 12000,
      totalMinor: 12000,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /Ana private|55551234|Private note/,
    );
    const retry = await handlers().POST(request('POST', cookie));
    expect(await retry.json()).toMatchObject({
      idempotencyKey,
      order: savedBody.order,
    });
    expect(await (await handlers().GET(request('GET'))).json()).toEqual({
      order: null,
    });
    const newRequest = request('POST', cookie);
    newRequest.headers.set('x-checkout-action', 'new');
    // A stale panel must not replace a different order's recovery credential.
    newRequest.headers.set('x-checkout-order', 'GUT-26-STALE');
    const stale = await handlers().POST(newRequest);
    expect(stale.status).toBe(409);
    expect(stale.headers.get('set-cookie')).toBeNull();
    newRequest.headers.set('x-checkout-order', savedBody.order.publicId);
    const started = await handlers().POST(newRequest);
    const next = await started.json();
    expect(next.order).toBeNull();
    expect(next.idempotencyKey).not.toBe(idempotencyKey);
    expect(started.headers.get('set-cookie')).toContain('HttpOnly');
  });
  it('requires trusted Origin before preparing or replacing a recovery credential', async () => {
    for (const supplied of ['', 'https://hostile.example']) {
      const input = request('POST');
      input.headers.set('origin', supplied);
      const denied = await handlers().POST(input);
      expect(denied.status).toBe(403);
      expect(denied.headers.get('set-cookie')).toBeNull();
    }
  });

  it('never accepts forged, duplicate or expired credentials as recovery authority', async () => {
    const prepared = await handlers().POST(request('POST'));
    const cookie = prepared.headers.get('set-cookie')!.split(';')[0];
    const separator = cookie.lastIndexOf('.');
    const forged = cookie.slice(0, separator + 1) + 'a'.repeat(43);
    for (const value of [forged, `${cookie}; ${cookie}`]) {
      expect(
        await (await handlers().GET(request('GET', value))).json(),
      ).toEqual({ order: null });
      // A rejected credential cannot retain the original idempotency identity.
      const replacement = await handlers().POST(request('POST', value));
      expect(replacement.headers.get('set-cookie')).not.toContain(cookie);
      expect(replacement.headers.get('set-cookie')).toContain('HttpOnly');
    }
    const expired = createCheckoutSessionHandlers({
      database,
      now: () => new Date(now.getTime() + 86400000),
      getOrderSecuritySettings: () => settings,
      applicationOrigin: origin,
      secureCookies: true,
    });
    const afterExpiry = await expired.POST(request('POST', cookie));
    const renewed = await afterExpiry.json();
    expect(renewed.order).toBeNull();
    expect(afterExpiry.headers.get('set-cookie')).not.toContain(cookie);
  });

  it('does not discard an unresolved checkout on an explicit new-order action', async () => {
    const prepared = await handlers().POST(request('POST'));
    const cookie = prepared.headers.get('set-cookie')!.split(';')[0];
    const input = request('POST', cookie);
    input.headers.set('x-checkout-action', 'new');
    const rejected = await handlers().POST(input);
    expect(rejected.status).toBe(409);
    expect(rejected.headers.get('set-cookie')).toBeNull();
  });
});
