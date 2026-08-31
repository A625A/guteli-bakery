import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET = 'test-auth-secret-must-be-at-least-32-bytes';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.RATE_LIMIT_SECRET =
    'test-rate-limit-secret-must-be-at-least-32-bytes';
  process.env.TRUSTED_PROXY_HOPS = '1';
});

vi.mock('server-only', () => ({}));

import { POST } from '@/app/api/auth/[...all]/route';
import { provisionOwner } from '@/server/auth/provision-owner';
import { account, rateLimitBuckets, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'owner provisioning integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

function signIn(email: string, password: string) {
  return POST(
    new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-for': '198.51.100.17',
      },
      body: JSON.stringify({ email, password }),
    }),
  );
}

describe('owner provisioning and credential protection', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates exactly one normalized OWNER with an official credential account', async () => {
    const input = {
      email: ' Owner@Example.Test ',
      name: 'Propietaria Güteli',
      password: 'a-password-that-is-at-least-14-characters',
    };

    await expect(provisionOwner(input)).resolves.toBe('created');
    await expect(
      provisionOwner({ ...input, email: 'owner@example.test' }),
    ).resolves.toBe('exists');

    const owners = await db.select().from(user);
    const credentials = await db.select().from(account);

    expect(owners).toHaveLength(1);
    expect(owners[0]).toMatchObject({
      email: 'owner@example.test',
      role: 'OWNER',
      active: true,
      mustChangePassword: false,
      setupCredentialExpiresAt: null,
    });
    expect(credentials).toHaveLength(1);
    expect(credentials[0]?.password).not.toBe(input.password);
  });

  it('does not turn a pre-existing non-owner into a second bootstrap owner', async () => {
    await db.insert(user).values({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'admin@example.test',
      name: 'Administradora',
      role: 'ADMIN',
      active: true,
    });

    await expect(
      provisionOwner({
        email: 'owner@example.test',
        name: 'Propietaria',
        password: 'a-password-that-is-at-least-14-characters',
      }),
    ).resolves.toBe('exists');
    await expect(db.select().from(user)).resolves.toHaveLength(1);
  });

  it('rejects inactive accounts with the same generic credential error', async () => {
    await provisionOwner({
      email: 'owner@example.test',
      name: 'Propietaria',
      password: 'a-password-that-is-at-least-14-characters',
    });
    await db
      .update(user)
      .set({ active: false })
      .where(eq(user.email, 'owner@example.test'));

    const inactive = await signIn(
      'owner@example.test',
      'a-password-that-is-at-least-14-characters',
    );
    const unknown = await signIn(
      'missing@example.test',
      'a-password-that-is-at-least-14-characters',
    );

    expect(inactive.status).toBe(401);
    expect(await inactive.json()).toEqual(await unknown.json());
  });

  it('throttles the sixth failed login by HMAC account/IP without storing raw identifiers', async () => {
    const email = 'owner@example.test';
    await provisionOwner({
      email,
      name: 'Propietaria',
      password: 'a-password-that-is-at-least-14-characters',
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await signIn(email, 'an-incorrect-password');
      expect(response.status).toBe(401);
    }

    const throttled = await signIn(email, 'an-incorrect-password');
    const buckets = await db.select().from(rateLimitBuckets);

    expect(throttled.status).toBe(429);
    expect(Number(throttled.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(buckets).toHaveLength(1);
    expect(JSON.stringify(buckets)).not.toContain(email);
    expect(JSON.stringify(buckets)).not.toContain('198.51.100.17');
  });
});
