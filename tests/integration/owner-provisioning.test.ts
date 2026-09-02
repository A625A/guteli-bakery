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
import { getAdminSessionAccess } from '@/server/auth/admin-page-access';
import { provisionOwner } from '@/server/auth/provision-owner';
import {
  account,
  rateLimitBuckets,
  session,
  twoFactor,
  user,
} from '@/server/db/schema';
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

function signIn(
  email: string,
  password: string,
  forwardedFor = '198.51.100.17',
) {
  return POST(
    new Request('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
        'x-forwarded-for': forwardedFor,
      },
      body: JSON.stringify({ email, password }),
    }),
  );
}

function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';', 1)[0])
    .join('; ');
}

function enableMfa(cookie: string, password: string) {
  return POST(
    new Request('http://localhost:3000/api/auth/two-factor/enable', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        origin: 'http://localhost:3000',
        'x-forwarded-for': '198.51.100.17',
      },
      body: JSON.stringify({ method: 'totp', password }),
    }),
  );
}

function changePassword(cookie: string, currentPassword: string) {
  return POST(
    new Request('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        origin: 'http://localhost:3000',
        'x-forwarded-for': '198.51.100.17',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword: 'a-new-password-that-is-at-least-14-characters',
        revokeOtherSessions: true,
      }),
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
      mustChangePassword: true,
    });
    expect(owners[0]?.setupCredentialExpiresAt).toBeInstanceOf(Date);
    expect(owners[0]?.setupCredentialExpiresAt?.getTime()).toBeGreaterThan(
      Date.now(),
    );
    expect(credentials).toHaveLength(1);
    expect(credentials[0]).toMatchObject({
      accountId: owners[0]?.id,
      issuer: 'local:credential',
      providerId: 'credential',
      userId: owners[0]?.id,
    });
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

  it('allows exactly one concurrent bootstrap owner creation', async () => {
    const input = {
      email: 'owner@example.test',
      name: 'Propietaria',
      password: 'a-password-that-is-at-least-14-characters',
    };

    const results = await Promise.all(
      Array.from({ length: 6 }, () => provisionOwner(input)),
    );

    expect(results.filter((result) => result === 'created')).toHaveLength(1);
    expect(results.filter((result) => result === 'exists')).toHaveLength(5);
    await expect(db.select().from(user)).resolves.toHaveLength(1);
    await expect(db.select().from(account)).resolves.toHaveLength(1);
  });

  it('rolls back both rows when credential creation fails late without compensating delete', async () => {
    await pool.query(`
      CREATE FUNCTION fail_credential_insert() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced late credential failure';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_credential_insert
      BEFORE INSERT ON account
      FOR EACH ROW EXECUTE FUNCTION fail_credential_insert();

      CREATE FUNCTION forbid_user_compensation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'compensating delete is forbidden';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER forbid_user_compensation
      BEFORE DELETE ON "user"
      FOR EACH ROW EXECUTE FUNCTION forbid_user_compensation();
    `);

    await expect(
      provisionOwner({
        email: 'owner@example.test',
        name: 'Propietaria',
        password: 'a-password-that-is-at-least-14-characters',
      }),
    ).rejects.toThrow();

    await expect(db.select().from(user)).resolves.toHaveLength(0);
    await expect(db.select().from(account)).resolves.toHaveLength(0);
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
    expect(
      (await db.select().from(rateLimitBuckets)).reduce(
        (total, bucket) => total + bucket.count,
        0,
      ),
    ).toBe(1);
    const unknown = await signIn(
      'missing@example.test',
      'a-password-that-is-at-least-14-characters',
    );

    expect(inactive.status).toBe(401);
    expect(await inactive.json()).toEqual(await unknown.json());
  });

  it('rejects direct MFA enrollment until the setup password is changed', async () => {
    const password = 'a-password-that-is-at-least-14-characters';
    await provisionOwner({
      email: 'owner@example.test',
      name: 'Propietaria',
      password,
    });
    await db
      .update(user)
      .set({
        mustChangePassword: true,
        setupCredentialExpiresAt: new Date(Date.now() + 60_000),
      })
      .where(eq(user.email, 'owner@example.test'));
    const firstFactor = await signIn('owner@example.test', password);

    const enrollment = await enableMfa(cookieHeader(firstFactor), password);

    expect(enrollment.status).toBe(403);
    await expect(db.select().from(twoFactor)).resolves.toHaveLength(0);
  });

  it('counts a setup-expired generic credential rejection', async () => {
    const password = 'a-password-that-is-at-least-14-characters';
    await provisionOwner({
      email: 'owner@example.test',
      name: 'Propietaria',
      password,
    });
    await db
      .update(user)
      .set({ setupCredentialExpiresAt: new Date(Date.now() - 1) })
      .where(eq(user.email, 'owner@example.test'));

    const expired = await signIn('owner@example.test', password);
    const buckets = await db.select().from(rateLimitBuckets);

    expect(expired.status).toBe(401);
    expect(await expired.json()).toMatchObject({
      code: 'INVALID_EMAIL_OR_PASSWORD',
    });
    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(1);
  });

  it('rejects and revokes a setup-expired existing session on password change', async () => {
    const password = 'a-password-that-is-at-least-14-characters';
    await provisionOwner({
      email: 'owner@example.test',
      name: 'Propietaria',
      password,
    });
    const firstFactor = await signIn('owner@example.test', password);
    await db
      .update(user)
      .set({ setupCredentialExpiresAt: new Date(Date.now() - 1) })
      .where(eq(user.email, 'owner@example.test'));

    const changed = await changePassword(cookieHeader(firstFactor), password);

    expect(changed.status).toBe(401);
    expect(await changed.json()).toMatchObject({
      code: 'INVALID_EMAIL_OR_PASSWORD',
    });
    await expect(db.select().from(session)).resolves.toHaveLength(0);
  });

  it('rejects and revokes an inactive existing session on an auth route', async () => {
    const password = 'a-password-that-is-at-least-14-characters';
    await provisionOwner({
      email: 'owner@example.test',
      name: 'Propietaria',
      password,
    });
    const firstFactor = await signIn('owner@example.test', password);
    await db
      .update(user)
      .set({ active: false })
      .where(eq(user.email, 'owner@example.test'));

    const enrollment = await enableMfa(cookieHeader(firstFactor), password);

    expect(enrollment.status).toBe(401);
    expect(await enrollment.json()).toMatchObject({
      code: 'INVALID_EMAIL_OR_PASSWORD',
    });
    await expect(db.select().from(session)).resolves.toHaveLength(0);
    await expect(db.select().from(twoFactor)).resolves.toHaveLength(0);
  });

  it('does not promote another pre-MFA session when one session enrolls', async () => {
    const password = 'a-password-that-is-at-least-14-characters';
    await provisionOwner({
      email: 'owner@example.test',
      name: 'Propietaria',
      password,
    });
    const firstFactor = await signIn('owner@example.test', password);
    await db
      .update(user)
      .set({
        mustChangePassword: false,
        setupCredentialExpiresAt: null,
        twoFactorEnabled: true,
      })
      .where(eq(user.email, 'owner@example.test'));

    const access = await getAdminSessionAccess(
      new Headers({ cookie: cookieHeader(firstFactor) }),
    );

    expect(access).toEqual({ policy: 'UNAUTHENTICATED' });
    await expect(db.select().from(session)).resolves.toHaveLength(0);
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
    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(5);
    expect(new Set(buckets.map((bucket) => bucket.subject)).size).toBe(1);
    expect(
      buckets.every((bucket) => /^[a-f0-9]{64}$/.test(bucket.subject)),
    ).toBe(true);
    expect(JSON.stringify(buckets)).not.toContain(email);
    expect(JSON.stringify(buckets)).not.toContain('198.51.100.17');
  });

  it('prevents failed-login bursts across fixed clock boundaries', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-09-01T00:14:59.000Z'));
      await provisionOwner({
        email: 'owner@example.test',
        name: 'Propietaria',
        password: 'a-password-that-is-at-least-14-characters',
      });

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await signIn(
          'owner@example.test',
          'an-incorrect-password',
        );
        expect(response.status).toBe(401);
      }

      vi.setSystemTime(new Date('2026-09-01T00:15:01.000Z'));
      const throttled = await signIn(
        'owner@example.test',
        'an-incorrect-password',
      );

      expect(throttled.status).toBe(429);
      expect(Number(throttled.headers.get('retry-after'))).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cannot split a limiter bucket with spoofed leftward proxy addresses', async () => {
    const email = 'owner@example.test';
    await provisionOwner({
      email,
      name: 'Propietaria',
      password: 'a-password-that-is-at-least-14-characters',
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await signIn(
        email,
        'an-incorrect-password',
        `192.0.2.${attempt + 1}, 198.51.100.17`,
      );
      expect(response.status).toBe(401);
    }
    const throttled = await signIn(
      email,
      'an-incorrect-password',
      '203.0.113.200, 198.51.100.17',
    );
    const buckets = await db.select().from(rateLimitBuckets);

    expect(throttled.status).toBe(429);
    expect(new Set(buckets.map((bucket) => bucket.subject)).size).toBe(1);
    expect(buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(5);
  });
});
