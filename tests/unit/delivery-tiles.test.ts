import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/server/delivery/http', () => ({ deliveryRateLimit: vi.fn() }));
import { deliveryRateLimit } from '@/server/delivery/http';
import { GET } from '@/app/api/delivery/tiles/[z]/[x]/[y]/route';
const fetcher = vi.fn();
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function enable() {
  vi.stubEnv('COMMERCIAL_ORDERS_ENABLED', 'true');
  vi.stubEnv('DELIVERY_MAPS_ENABLED', 'true');
  vi.stubEnv('DELIVERY_PROVIDER_APPROVED', 'true');
  vi.stubEnv('GEOAPIFY_MAPS_KEY', 'server-private-key');
  vi.stubGlobal('fetch', fetcher);
  vi.mocked(deliveryRateLimit).mockResolvedValue(true);
}
function tile(z = '2', x = '1', y = '1', site = 'same-origin') {
  return GET(
    new Request(
      'https://bakery.test/api/delivery/tiles/' + [z, x, y].join('/'),
      { headers: { 'sec-fetch-site': site } },
    ),
    { params: Promise.resolve({ z, x, y }) },
  );
}
it('requires owner permission, same origin, valid XYZ, and budget before external I/O', async () => {
  enable();
  vi.stubEnv('DELIVERY_PROVIDER_APPROVED', 'false');
  expect((await tile()).status).toBe(503);
  vi.stubEnv('DELIVERY_PROVIDER_APPROVED', 'true');
  expect((await tile('2', '1', '1', 'cross-site')).status).toBe(403);
  expect((await tile('20')).status).toBe(400);
  expect((await tile('2', '4')).status).toBe(400);
  expect((await tile('2', '../')).status).toBe(400);
  vi.mocked(deliveryRateLimit).mockResolvedValue(false);
  expect((await tile()).status).toBe(429);
  expect(fetcher).not.toHaveBeenCalled();
});
it('proxies only a bounded PNG from the fixed provider without disclosing the key', async () => {
  enable();
  fetcher.mockResolvedValueOnce(
    new Response(new Uint8Array([1, 2, 3]), {
      headers: { 'content-type': 'image/png' },
    }),
  );
  const result = await tile();
  expect(result.status).toBe(200);
  expect(result.headers.get('cache-control')).toContain('no-store');
  const [url, options] = fetcher.mock.calls[0];
  expect(url.origin).toBe('https://maps.geoapify.com');
  expect(url.pathname).toBe('/v1/tile/osm-carto/2/1/1.png');
  expect(url.searchParams.get('apiKey')).toBe('server-private-key');
  expect(options).toMatchObject({ redirect: 'error', cache: 'no-store' });
  expect(await result.text()).not.toContain('server-private-key');
});
it('fails safely on provider errors, wrong content, timeout and oversized tiles', async () => {
  enable();
  for (const response of [
    new Response('private', { status: 429 }),
    new Response('<script>private</script>', {
      headers: { 'content-type': 'text/html' },
    }),
    new Response(new Uint8Array(512 * 1024 + 1), {
      headers: { 'content-type': 'image/png' },
    }),
  ]) {
    fetcher.mockResolvedValueOnce(response);
    const result = await tile();
    expect(result.status).toBe(503);
    expect(await result.text()).toBe('');
  }
  fetcher.mockRejectedValueOnce(new Error('private timeout'));
  expect((await tile()).status).toBe(503);
});
