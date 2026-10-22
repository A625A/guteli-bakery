import { afterEach, describe, expect, it, vi } from 'vitest';
import { commercialOrdersEnabled } from '@/server/config/commerce';
vi.mock('server-only', () => ({}));
import { POST as order } from '@/app/api/orders/route';
import {
  GET as sessionGet,
  POST as sessionPost,
} from '@/app/api/checkout-session/route';
import {
  GET as reviewGet,
  POST as reviewPost,
} from '@/app/api/checkout-review/route';
import { POST as summary } from '@/app/api/checkout-summary/route';
afterEach(() => vi.unstubAllEnvs());
describe('commercial demo server boundary', () => {
  it.each([undefined, '', 'false', 'TRUE', '1', 'yes'])(
    'fails closed for %s',
    (value) => {
      expect(
        commercialOrdersEnabled({ COMMERCIAL_ORDERS_ENABLED: value }),
      ).toBe(false);
    },
  );
  it('requires exact explicit opt-in', () =>
    expect(commercialOrdersEnabled({ COMMERCIAL_ORDERS_ENABLED: 'true' })).toBe(
      true,
    ));
  it.each([order, sessionGet, sessionPost, reviewGet, reviewPost, summary])(
    'rejects direct requests before configuration, body parsing or DB access',
    async (handler) => {
      vi.stubEnv('COMMERCIAL_ORDERS_ENABLED', 'false');
      vi.stubEnv('DATABASE_URL', 'invalid');
      const response = await handler(
        new Request('https://demo.invalid/api/orders', {
          method: 'POST',
          body: 'invalid-json',
        }),
      );
      expect(response.status).toBe(403);
      expect(response.headers.get('cache-control')).toContain('no-store');
      expect(response.headers.get('set-cookie')).toBeNull();
      expect((await response.json()).error.code).toBe('COMMERCIAL_DEMO');
    },
  );
});
