import { randomBytes } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { validateProductionRuntime } from '@/server/config/production-runtime';
import { getTrustedClientAddress } from '@/server/security/client-subject';

afterEach(() => vi.unstubAllEnvs());
function environment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DEPLOYMENT_PLATFORM: 'netlify',
    STORAGE_PROVIDER: 'netlify-blobs',
    DATABASE_URL:
      'postgresql://guteli:AbC123defG456hijkL789@ep-test-pooler.us-east-1.aws.neon.tech/guteli?sslmode=verify-full',
    BETTER_AUTH_URL: 'https://guteli.netlify.app',
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    RATE_LIMIT_SECRET: randomBytes(32).toString('hex'),
    RECEIPT_TOKEN_SECRET: randomBytes(32).toString('hex'),
    COMMERCIAL_ORDERS_ENABLED: 'false',
    NEXT_PUBLIC_DEMO_MODE: 'true',
    PAYMENTS_ENABLED: 'false',
    WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
    DELIVERY_MAPS_ENABLED: 'false',
    DELIVERY_PROVIDER_APPROVED: 'false',
    DELIVERY_COVERAGE_ENABLED: 'false',
  };
}
it('accepts pooled TLS Neon and durable storage without a local directory or XFF hop count', () => {
  expect(validateProductionRuntime(environment())).toMatchObject({
    origin: 'https://guteli.netlify.app',
    uploadsRoot: null,
  });
});
it('rejects unsafe Netlify configuration without exposing credentials', () => {
  for (const patch of [
    { STORAGE_PROVIDER: 'local' },
    { DATABASE_URL: environment().DATABASE_URL!.replace('-pooler', '') },
    {
      DATABASE_URL: environment().DATABASE_URL!.replace(
        'verify-full',
        'disable',
      ),
    },
    { COMMERCIAL_ORDERS_ENABLED: 'true' },
    { NEXT_PUBLIC_DEMO_MODE: 'false' },
    { DELIVERY_MAPS_ENABLED: 'true' },
    { DELIVERY_PROVIDER_APPROVED: 'true' },
    { DELIVERY_COVERAGE_ENABLED: 'true' },
  ])
    expect(() =>
      validateProductionRuntime({ ...environment(), ...patch }),
    ).toThrow('Invalid production runtime configuration');
});
it('uses only the Netlify ingress address, ignoring spoofed XFF', () => {
  vi.stubEnv('DEPLOYMENT_PLATFORM', 'netlify');
  const request = new Request('https://guteli.netlify.app', {
    headers: {
      'x-nf-client-connection-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.4',
    },
  });
  expect(
    getTrustedClientAddress(request, {
      trustedProxyHops: 1,
      directAddress: null,
    }),
  ).toBe('203.0.113.9');
});
it('fails closed on absent or malformed Netlify ingress instead of falling back to XFF', () => {
  vi.stubEnv('DEPLOYMENT_PLATFORM', 'netlify');
  for (const address of ['', 'bad', '203.0.113.9, 198.51.100.4']) {
    expect(() =>
      getTrustedClientAddress(
        new Request('https://guteli.netlify.app', {
          headers: {
            'x-nf-client-connection-ip': address,
            'x-forwarded-for': '198.51.100.4',
          },
        }),
        { trustedProxyHops: 1, directAddress: null },
      ),
    ).toThrow();
  }
});
