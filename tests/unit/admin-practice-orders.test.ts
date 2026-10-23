import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/db/client', () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error('Unexpected database access');
      },
    },
  ),
}));
vi.mock('@/server/auth/session', () => ({ getAdminSession: vi.fn() }));

import { getAdminSession } from '@/server/auth/session';
import { parseAdminOrderFilters } from '@/server/orders/admin-list-orders';
import { GET } from '@/app/api/admin/orders/[id]/route';
import { PATCH as status } from '@/app/api/admin/orders/[id]/status/route';
import { PATCH as delivery } from '@/app/api/admin/orders/[id]/delivery-quote/route';
import { PATCH as payment } from '@/app/api/admin/orders/[id]/payment-method/route';

// The five existing practice references, never inserted or modified by this test.
const references = [
  'PRUEBA-1-e1f48d6a',
  'PRUEBA-2-5ff3deb1',
  'PRUEBA-3-4b07c7bd',
  'PRUEBA-4-e84991ce',
  'PRUEBA-5-1d178766',
];
const routes = [
  { name: 'detail', handler: GET, body: undefined },
  {
    name: 'status',
    handler: status,
    body: { status: 'CONFIRMED', expectedVersion: 1 },
  },
  {
    name: 'delivery',
    handler: delivery,
    body: { shippingMinor: 0, expectedVersion: 1 },
  },
  {
    name: 'payment',
    handler: payment,
    body: { paymentMethod: 'BANK_TRANSFER', expectedVersion: 1 },
  },
];

beforeEach(() => {
  vi.mocked(getAdminSession).mockResolvedValue({
    policy: 'UNAUTHENTICATED',
  });
});

it('searches all five fixtures with their stored case and keeps commercial normalization', () => {
  for (const reference of references) {
    expect(
      parseAdminOrderFilters({ reference: ` ${reference.toUpperCase()} ` })
        .reference,
    ).toBe(reference);
  }
  expect(
    parseAdminOrderFilters({ reference: ' gut-26-abc12345 ' }).reference,
  ).toBe('GUT-26-ABC12345');
  for (const reference of [
    'PRUEBA-0-e1f48d6a',
    'PRUEBA-6-e1f48d6a',
    'PRUEBA-1-abcdefgh',
    'PRUEBA-1-e1f48d6a-extra',
    '%',
    '../orders',
  ]) {
    expect(() => parseAdminOrderFilters({ reference })).toThrow(RangeError);
  }
});

it.each(routes)(
  '$name accepts fixture syntax but still denies anonymous access without touching a database',
  async ({ handler, body }) => {
    for (const id of [...references, 'GUT-26-ABC12345']) {
      const response = await handler(
        new Request(`http://localhost:3000/api/admin/orders/${id}`, {
          method: body ? 'PATCH' : 'GET',
          headers: {
            origin: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
            'content-type': 'application/json',
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBe(401);
      expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
      expect(response.headers.get('cache-control')).toContain('no-store');
    }
  },
);

it.each(routes)(
  '$name rejects malformed fixture references',
  async ({ handler, body }) => {
    const id = 'PRUEBA-1-not-hex';
    const response = await handler(
      new Request(`http://localhost:3000/api/admin/orders/${id}`, {
        method: body ? 'PATCH' : 'GET',
        headers: { 'content-type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(400);
  },
);

it('still requires OWNER for assigning a payment method to a fixture', async () => {
  vi.mocked(getAdminSession).mockResolvedValue({
    policy: 'ALLOWED',
    principal: {
      role: 'ADMIN',
      userId: 'fixture-admin',
      sessionId: 'fixture-session',
      mfaVerifiedAt: new Date(),
    },
  } as Awaited<ReturnType<typeof getAdminSession>>);
  const id = references[0];
  const response = await payment(
    new Request(`http://localhost:3000/api/admin/orders/${id}/payment-method`, {
      method: 'PATCH',
      headers: {
        origin: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethod: 'BANK_TRANSFER',
        expectedVersion: 1,
      }),
    }),
    { params: Promise.resolve({ id }) },
  );
  expect(response.status).toBe(403);
  expect((await response.json()).error.code).toBe('FORBIDDEN');
});
