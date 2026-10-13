import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { validateProductionRuntime } from '@/server/config/production-runtime';

function environment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: `postgresql://store:${randomBytes(32).toString('hex')}@database:5432/guteli`,
    BETTER_AUTH_URL: 'https://store.example.com',
    BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
    RATE_LIMIT_SECRET: randomBytes(32).toString('hex'),
    RECEIPT_TOKEN_SECRET: randomBytes(32).toString('hex'),
    UPLOADS_ROOT: '/var/lib/guteli/uploads',
    TRUSTED_PROXY_HOPS: '1',
    PAYMENTS_ENABLED: 'false',
    WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
  };
}
it('accepts explicit isolated production settings without returning secret values', () => {
  const env = environment();
  const result = validateProductionRuntime(env);
  expect(result).toEqual({
    origin: 'https://store.example.com',
    uploadsRoot: '/var/lib/guteli/uploads',
    trustedProxyHops: 1,
    paymentsEnabled: false,
    notificationsEnabled: false,
  });
  expect(JSON.stringify(result)).not.toContain(env.BETTER_AUTH_SECRET);
});
it('rejects local defaults, placeholders and shared secrets without exposing them', () => {
  const env = environment();
  for (const patch of [
    { BETTER_AUTH_SECRET: 'build-only-auth-secret-must-be-at-least-32-bytes' },
    { RATE_LIMIT_SECRET: env.RECEIPT_TOKEN_SECRET },
    { DATABASE_URL: 'postgresql://guteli:guteli@database:5432/guteli' },
    { BETTER_AUTH_SECRET: 'x'.repeat(64) },
    { RECEIPT_TOKEN_SECRET: undefined },
  ]) {
    const supplied = { ...env, ...patch };
    expect(() => validateProductionRuntime(supplied)).toThrow(
      'Invalid production runtime configuration',
    );
    try {
      validateProductionRuntime(supplied);
    } catch (error) {
      expect(String(error)).not.toContain(env.DATABASE_URL);
    }
  }
});
it('requires a canonical public HTTPS origin and explicit storage/proxy settings', () => {
  const env = environment();
  for (const patch of [
    { BETTER_AUTH_URL: 'http://store.example.com' },
    { BETTER_AUTH_URL: 'https://localhost' },
    { BETTER_AUTH_URL: 'https://store.example.com/admin' },
    { BETTER_AUTH_URL: 'https://user:password@store.example.com' },
    { UPLOADS_ROOT: 'uploads_data' },
    { UPLOADS_ROOT: undefined },
    { TRUSTED_PROXY_HOPS: undefined },
    { TRUSTED_PROXY_HOPS: '11' },
  ])
    expect(() => validateProductionRuntime({ ...env, ...patch })).toThrow(
      'Invalid production runtime configuration',
    );
});
it('refuses missing, misspelled or enabled integration flags in the pre-payment release', () => {
  const env = environment();
  for (const patch of [
    { PAYMENTS_ENABLED: 'true' },
    { PAYMENTS_ENABLED: 'TRUE' },
    { PAYMENTS_ENABLED: undefined },
    { WHATSAPP_NOTIFICATIONS_ENABLED: 'true' },
    { WHATSAPP_NOTIFICATIONS_ENABLED: 'flase' },
  ])
    expect(() => validateProductionRuntime({ ...env, ...patch })).toThrow(
      'Invalid production runtime configuration',
    );
});

it('runs the operator preflight without printing credentials and exits nonzero for unsafe settings', () => {
  const valid = environment();
  const cases: Array<[NodeJS.ProcessEnv, number]> = [
    [valid, 0],
    [
      { ...valid, RECEIPT_TOKEN_SECRET: 'do-not-print-this-placeholder-value' },
      1,
    ],
  ];
  for (const [env, expected] of cases) {
    const run = spawnSync(
      process.execPath,
      [
        '--conditions=react-server',
        '--import',
        'tsx',
        'scripts/check-production-runtime.ts',
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, ...env },
        encoding: 'utf8',
        timeout: 10000,
      },
    );
    expect(run.status).toBe(expected);
    const output = run.stdout + run.stderr;
    expect(output).not.toContain(env.DATABASE_URL);
    expect(output).not.toContain(env.RECEIPT_TOKEN_SECRET);
    expect(output).toContain(
      expected === 0
        ? 'Web store configuration preflight passed'
        : 'Invalid production runtime configuration',
    );
  }
});
