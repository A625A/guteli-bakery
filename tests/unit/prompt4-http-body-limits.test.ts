import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const handlers = vi.hoisted(() => ({
  post: vi.fn(async (request: Request) =>
    Response.json({
      text: await request.text(),
      contentType: request.headers.get('content-type'),
    }),
  ),
}));
vi.mock('@/server/auth/auth', () => ({
  auth: {
    $context: Promise.resolve({
      authCookies: { sessionToken: { name: 'guteli-session' } },
    }),
  },
}));
vi.mock('@/server/db/client', () => ({ db: {}, pool: {} }));
vi.mock('better-auth/next-js', () => ({
  toNextJsHandler: () => ({ POST: handlers.post, GET: vi.fn() }),
}));
import { POST as authPost } from '@/app/api/auth/[...all]/route';
import { readBoundedJson } from '@/server/http/read-bounded-json';
import { promotionInputSchema } from '@/server/products/promotion-contract';

const routes = [
  ['users/route', 'POST'],
  ['users/[id]/route', 'PATCH'],
  ['categories/route', 'POST'],
  ['categories/[id]/route', 'PATCH'],
  ['categories/[id]/route', 'DELETE'],
  ['products/route', 'POST'],
  ['products/[id]/route', 'PATCH'],
  ['products/[id]/route', 'DELETE'],
  ['products/[id]/duplicate/route', 'POST'],
  ['promotions/route', 'POST'],
  ['promotions/[id]/route', 'PATCH'],
  ['orders/[id]/status/route', 'PATCH'],
  ['orders/[id]/delivery-quote/route', 'PATCH'],
  ['orders/[id]/payment-method/route', 'PATCH'],
] as const;
function oversizedRequest(url: string, method: string, bytes: number) {
  let pulls = 0;
  const cancelled = vi.fn();
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (pulls++ === 0) controller.enqueue(new Uint8Array(bytes).fill(32));
        else controller.error(new Error('Unbounded request tail consumed'));
      },
      cancel: cancelled,
    },
    { highWaterMark: 0 },
  );
  const request = new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: stream,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  return { request, cancelled, pulls: () => pulls };
}
const loaders: Record<string, () => Promise<Record<string, unknown>>> = {
  'users/route': () => import('@/app/api/admin/users/route'),
  'users/[id]/route': () => import('@/app/api/admin/users/[id]/route'),
  'categories/route': () => import('@/app/api/admin/categories/route'),
  'categories/[id]/route': () =>
    import('@/app/api/admin/categories/[id]/route'),
  'products/route': () => import('@/app/api/admin/products/route'),
  'products/[id]/route': () => import('@/app/api/admin/products/[id]/route'),
  'products/[id]/duplicate/route': () =>
    import('@/app/api/admin/products/[id]/duplicate/route'),
  'promotions/route': () => import('@/app/api/admin/promotions/route'),
  'promotions/[id]/route': () =>
    import('@/app/api/admin/promotions/[id]/route'),
  'orders/[id]/status/route': () =>
    import('@/app/api/admin/orders/[id]/status/route'),
  'orders/[id]/delivery-quote/route': () =>
    import('@/app/api/admin/orders/[id]/delivery-quote/route'),
  'orders/[id]/payment-method/route': () =>
    import('@/app/api/admin/orders/[id]/payment-method/route'),
};
beforeEach(() => {
  handlers.post.mockClear();
});
describe('administrative request byte budgets', () => {
  it.each(routes)(
    '%s %s cancels an oversized anonymous body before reading its tail',
    async (path, method) => {
      const routeModule = await loaders[path]();
      const input = oversizedRequest(
        `http://localhost:3000/api/admin/${path}`,
        method,
        64 * 1024 + 1,
      );
      const id = path.startsWith('orders/')
        ? 'GUT-26-AUDIT123'
        : '00000000-0000-4000-8000-000000000001';
      const handler = routeModule[method] as (
        request: Request,
        context: { params: Promise<{ id: string }> },
      ) => Promise<Response>;
      const response = await handler(input.request, {
        params: Promise.resolve({ id }),
      });
      expect(response.status).toBe(400);
      expect(input.cancelled).toHaveBeenCalledOnce();
      expect(input.pulls()).toBe(1);
    },
  );
  it('preserves the full supported 500-product promotion payload', async () => {
    const body = {
      name: 'Oferta de catálogo',
      scope: 'SELECTED',
      productIds: Array.from(
        { length: 500 },
        (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      ),
      discountPercent: 15,
      startsAtLocal: '2099-01-01T00:00',
      endsAtLocal: '2099-01-02T00:00',
      enabled: true,
    };
    expect(promotionInputSchema.safeParse(body).success).toBe(true);
    const value = await readBoundedJson(
      new Request('http://localhost:3000/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      64 * 1024,
    );
    expect(value).toEqual(body);
  });
});
describe('authentication request byte budget', () => {
  it('rejects oversized anonymous sign-in without entering the auth parser', async () => {
    const input = oversizedRequest(
      'http://localhost:3000/api/auth/sign-in/email',
      'POST',
      16 * 1024 + 1,
    );
    const response = await authPost(input.request);
    expect(response.status).toBe(413);
    expect(input.cancelled).toHaveBeenCalledOnce();
    expect(input.pulls()).toBe(1);
    expect(handlers.post).not.toHaveBeenCalled();
  });
  it.each(['application/json', 'application/x-www-form-urlencoded'])(
    'preserves supported %s request bytes and headers',
    async (contentType) => {
      const text =
        contentType === 'application/json'
          ? '{"email":"owner@example.test","password":"synthetic-only"}'
          : 'email=owner%40example.test&password=synthetic-only';
      const response = await authPost(
        new Request('http://localhost:3000/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'content-type': contentType },
          body: text,
        }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ text, contentType });
    },
  );
  it.each([undefined, null, '', new Uint8Array(0)])(
    'preserves empty auth operations (%s)',
    async (body) => {
      expect(
        (
          await authPost(
            new Request('http://localhost:3000/api/auth/sign-out', {
              method: 'POST',
              body,
            }),
          )
        ).status,
      ).toBe(200);
    },
  );
});
