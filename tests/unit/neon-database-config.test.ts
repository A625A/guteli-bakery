import { expect, it } from 'vitest';
import {
  databasePoolOptions,
  migrationDatabaseUrl,
} from '@/server/config/database';

it('bounds each warm Netlify pool and allows Neon cold starts', () => {
  const options = databasePoolOptions({
    DEPLOYMENT_PLATFORM: 'netlify',
    DATABASE_URL:
      'postgresql://user:secret@ep-example-pooler.us-east-1.aws.neon.tech/guteli?sslmode=verify-full',
  });
  expect(options.max).toBeLessThanOrEqual(3);
  expect(options.connectionTimeoutMillis).toBeGreaterThanOrEqual(10000);
  expect(options.allowExitOnIdle).toBe(true);
  expect(options.idleTimeoutMillis).toBeGreaterThan(0);
});
it('requires an explicitly direct Neon migration URL and preserves local migration usage', () => {
  const pooled =
    'postgresql://user:secret@ep-example-pooler.us-east-1.aws.neon.tech/guteli?sslmode=verify-full';
  const direct = pooled.replace('-pooler', '');
  expect(
    migrationDatabaseUrl({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct,
    }),
  ).toBe(direct);
  expect(() => migrationDatabaseUrl({ DATABASE_URL: pooled })).toThrow();
  expect(() =>
    migrationDatabaseUrl({ DATABASE_URL_UNPOOLED: pooled }),
  ).toThrow();
  const local = 'postgresql://guteli@127.0.0.1:55471/guteli_test';
  expect(migrationDatabaseUrl({ DATABASE_URL: local })).toBe(local);
});
