import { join } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { betterAuth } from 'better-auth';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET =
    'isolated-auth-test-secret-at-least-32-bytes';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.RATE_LIMIT_SECRET = 'isolated-rate-test-secret-at-least-32-bytes';
  process.env.TRUSTED_PROXY_HOPS = '1';
});
vi.mock('server-only', () => ({}));

import { POST } from '@/app/api/auth/[...all]/route';
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';
import { requireTestDatabaseUrl } from '@/test/database-url';

const pool = new Pool({
  connectionString: requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'shared authentication throttle tests',
  ),
});
const db = drizzle({ client: pool });

function login(email: string, address = '198.51.100.60') {
  return POST(
    new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-for': address,
      },
      body: JSON.stringify({
        email,
        password: 'wrong-password-for-regression-test',
      }),
    }),
  );
}

describe('distributed authentication throttles', () => {
  beforeEach(async () => {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await pool.query('CREATE SCHEMA public');
    await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
  });
  afterAll(() => pool.end());

  it('reserves the five-attempt password budget before concurrent verification', async () => {
    const email = 'concurrent-owner@example.test';
    await provisionOwner({
      email,
      name: 'Synthetic owner',
      password: 'synthetic-setup-password-long-enough',
    });
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => login(email)),
    );
    expect(responses.filter(({ status }) => status === 401)).toHaveLength(5);
    expect(responses.filter(({ status }) => status === 429)).toHaveLength(3);
    for (const response of responses.filter(({ status }) => status === 429)) {
      expect(
        Number(
          response.headers.get('retry-after') ??
            response.headers.get('x-retry-after'),
        ),
      ).toBeGreaterThan(0);
    }
  });

  it('limits one account when attempts rotate through trusted source addresses', async () => {
    const email = 'sprayed-owner@example.test';
    for (let index = 0; index < 20; index++) {
      expect((await login(email, `198.51.100.${index + 1}`)).status).toBe(401);
    }
    expect((await login(email, '203.0.113.80')).status).toBe(429);
  }, 30_000);

  it('uses shared atomic storage for library endpoint budgets, including across independent consumers', async () => {
    const storage = auth.options.rateLimit?.customStorage;
    expect(storage).toBeDefined();
    if (!storage) return;
    const key = 'synthetic-isolated-budget';
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        storage.consume(key, { window: 60, max: 5 }),
      ),
    );
    expect(results.filter(({ allowed }) => allowed)).toHaveLength(5);
    const rows = await pool.query(
      "SELECT subject, count FROM rate_limit_buckets WHERE policy = 'ADMIN_AUTH_ENDPOINT'",
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].subject).not.toContain(key);
    expect(rows.rows[0].count).toBe(5);
  });

  it('shares the production IP limit between independent Better Auth instances during password spraying', async () => {
    const instances = [0, 1].map(() =>
      betterAuth({
        ...auth.options,
        rateLimit: { ...auth.options.rateLimit, enabled: true },
      }),
    );
    for (let index = 0; index < 4; index++) {
      const response = await instances[index % 2].handler(
        new Request('http://localhost:3000/api/auth/sign-in/email', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
            'x-forwarded-for': '192.0.2.90',
          },
          body: JSON.stringify({
            email: `spray-${index}@example.test`,
            password: 'wrong-synthetic-password',
          }),
        }),
      );
      expect(response.status).toBe(index < 3 ? 401 : 429);
    }
  });

  it('prunes expired abandoned authentication subjects without removing active budgets', async () => {
    await pool.query(`INSERT INTO rate_limit_buckets (policy, subject, window_started_at, count, updated_at)
      VALUES ('ADMIN_LOGIN_ACCOUNT_IP', 'expired-synthetic-subject', now() - interval '25 hours', 5, now() - interval '25 hours'),
             ('ADMIN_LOGIN_ACCOUNT_IP', 'active-synthetic-subject', now(), 5, now())`);
    expect((await login('housekeeping@example.test')).status).toBe(401);
    const rows = await pool.query(
      "SELECT subject FROM rate_limit_buckets WHERE subject IN ('expired-synthetic-subject', 'active-synthetic-subject')",
    );
    expect(rows.rows).toEqual([{ subject: 'active-synthetic-subject' }]);
  });
});
