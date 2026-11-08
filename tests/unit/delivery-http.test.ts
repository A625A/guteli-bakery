import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createDeliveryHandlers } from '@/server/delivery/http';
import { createDeliveryService } from '@/server/delivery/service';
import { GET as tile } from '@/app/api/delivery/tiles/[z]/[x]/[y]/route';
import { coverage } from '../support/delivery/coverage';
const origin = 'https://bakery.test';
const request = (body: unknown, headers = {}) =>
  new Request(origin + '/api/delivery/quote', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllEnvs());
it('DEMO closes quote, search and tiles before body/provider/database', async () => {
  vi.stubEnv('COMMERCIAL_ORDERS_ENABLED', 'false');
  const rateLimit = vi.fn();
  const search = vi.fn();
  const h = createDeliveryHandlers({ rateLimit, search });
  for (const handler of [h.quote, h.search])
    expect((await handler(request({}))).status).toBe(403);
  expect(
    (
      await tile(new Request(origin), {
        params: Promise.resolve({ z: '1', x: '0', y: '0' }),
      })
    ).status,
  ).toBe(403);
  expect(rateLimit).not.toHaveBeenCalled();
  expect(search).not.toHaveBeenCalled();
});
it('server quotes reject client prices, foreign origins, oversized input and rate limits', async () => {
  vi.stubEnv('COMMERCIAL_ORDERS_ENABLED', 'true');
  const rateLimit = vi.fn().mockResolvedValue(true);
  const h = createDeliveryHandlers({
    origin,
    rateLimit,
    service: createDeliveryService({
      coverage: coverage(),
      enabled: true,
      secret: 'test-secret-'.repeat(4),
    }),
  });
  const input = {
    fulfillment: 'delivery',
    address: 'Synthetic',
    point: { lng: 1, lat: 1 },
    confirmed: true,
  };
  const response = await h.quote(request(input));
  expect(response.status).toBe(200);
  expect((await response.json()).quote.shippingMinor).toBe(1000);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect((await h.quote(request({ ...input, shippingMinor: 0 }))).status).toBe(
    400,
  );
  expect(
    (await h.quote(request(input, { origin: 'https://foreign.test' }))).status,
  ).toBe(403);
  expect(
    (await h.quote(request({ ...input, address: 'x'.repeat(5000) }))).status,
  ).toBe(400);
  rateLimit.mockResolvedValue(false);
  expect((await h.quote(request(input))).status).toBe(429);
});
it('provider error response is safe and manual fallback does not need geocoding', async () => {
  vi.stubEnv('COMMERCIAL_ORDERS_ENABLED', 'true');
  const h = createDeliveryHandlers({
    origin,
    rateLimit: async () => true,
    search: async () => {
      throw new Error('secret-coordinates');
    },
  });
  const response = await h.search(
    request({ address: 'Synthetic', consent: true }),
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret-coordinates');
  const manual = await h.quote(
    request({ fulfillment: 'delivery', address: 'Synthetic' }),
  );
  expect((await manual.json()).quote.shippingMinor).toBeNull();
});
