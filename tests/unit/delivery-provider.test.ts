import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { searchAddresses } from '@/server/delivery/provider';
it('does not send an address without operator authorization and customer consent', async () => {
  const transport = vi.fn();
  expect(
    (
      await searchAddresses('Dirección ficticia', false, {
        enabled: true,
        key: 'test-only',
        transport,
      })
    ).status,
  ).toBe('unavailable');
  expect(
    (
      await searchAddresses('Dirección ficticia', true, {
        enabled: false,
        key: 'test-only',
        transport,
      })
    ).status,
  ).toBe('unavailable');
  expect(transport).not.toHaveBeenCalled();
});
it('sanitizes results, restricts country and preserves ambiguity without choosing a point', async () => {
  const transport = vi.fn().mockResolvedValue(
    Response.json({
      results: [
        {
          formatted: 'Lugar de prueba',
          lon: 1,
          lat: 1,
          country_code: 'gt',
          private: 'ignored',
        },
        { formatted: 'Otro país', lon: 1, lat: 1, country_code: 'mx' },
      ],
    }),
  );
  const result = await searchAddresses('Zona 10', true, {
    enabled: true,
    key: 'secret-server-only',
    transport,
  });
  expect(result).toEqual({
    status: 'ok',
    results: [{ label: 'Lugar de prueba', point: { lng: 1, lat: 1 } }],
  });
  const url = new URL(transport.mock.calls[0][0]);
  expect(url.origin).toBe('https://api.geoapify.com');
  expect(url.searchParams.get('filter')).toBe('countrycode:gt');
  expect(transport.mock.calls[0][1]).toMatchObject({
    redirect: 'error',
    cache: 'no-store',
  });
});
it.each(['timeout', 'quota', 'invalid', 'oversized'])(
  'provider %s falls back without raw errors',
  async (kind) => {
    const transport = vi.fn().mockImplementation(async () => {
      if (kind === 'timeout') throw new Error('secret-server-only address');
      if (kind === 'quota')
        return new Response('secret-server-only', { status: 429 });
      if (kind === 'oversized') return new Response('x'.repeat(70000));
      return new Response('broken');
    });
    expect(
      await searchAddresses('Zona 10', true, {
        enabled: true,
        key: 'secret-server-only',
        transport,
      }),
    ).toEqual({ status: 'unavailable', results: [] });
  },
);
