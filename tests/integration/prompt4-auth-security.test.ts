import { join } from 'node:path';
import { createHmac, randomUUID } from 'node:crypto';

import { base32 } from '@better-auth/utils/base32';
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
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';

import { session, twoFactor, user, verification } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'adversarial authentication integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

class CookieJar {
  private readonly values = new Map<string, string>();

  absorb(response: Response) {
    for (const setCookie of response.headers.getSetCookie()) {
      const [pair = '', ...attributes] = setCookie.split(';');
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const expired = attributes.some(
        (attribute) => attribute.trim().toLowerCase() === 'max-age=0',
      );
      if (expired || value === '') this.values.delete(name);
      else this.values.set(name, value);
    }
  }

  set(name: string, value: string) {
    this.values.set(name, value);
  }

  header() {
    return [...this.values]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

async function authPost(
  path: string,
  body: Record<string, unknown>,
  jar: CookieJar,
  forwardedFor = '198.51.100.17',
) {
  const response = await POST(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: jar.header(),
        origin: 'http://localhost:3000',
        'x-forwarded-for': forwardedFor,
      },
      body: JSON.stringify(body),
    }),
  );
  jar.absorb(response);
  return response;
}

async function enrollOwner() {
  const email = 'owner@example.test';
  const setupPassword = 'setup-password-that-is-at-least-14-characters';
  const password = 'changed-password-that-is-at-least-14-characters';
  await provisionOwner({ email, name: 'Propietaria', password: setupPassword });

  const jar = new CookieJar();
  expect(
    (await authPost('sign-in/email', { email, password: setupPassword }, jar))
      .status,
  ).toBe(200);
  expect(
    (
      await authPost(
        'change-password',
        {
          currentPassword: setupPassword,
          newPassword: password,
          revokeOtherSessions: true,
        },
        jar,
      )
    ).status,
  ).toBe(200);
  await expect(
    db
      .select({ mustChangePassword: user.mustChangePassword })
      .from(user)
      .then((rows) => rows[0]),
  ).resolves.toEqual({ mustChangePassword: false });

  const enable = await authPost(
    'two-factor/enable',
    { method: 'totp', password },
    jar,
  );
  expect(enable.status).toBe(200);
  const enrollment = (await enable.json()) as {
    backupCodes: string[];
    totpURI: string;
  };
  const encodedSecret = new URL(enrollment.totpURI).searchParams.get('secret');
  expect(encodedSecret).toBeTruthy();
  const secret = new TextDecoder().decode(base32.decode(encodedSecret!));
  const generated = await auth.api.generateTOTP({ body: { secret } });
  const verification = await authPost('two-factor/verify-totp', generated, jar);
  expect({
    body: await verification.clone().json(),
    status: verification.status,
  }).toMatchObject({ status: 200 });

  return { backupCodes: enrollment.backupCodes, email, jar, password, secret };
}

async function challengeFor(enrolled: Awaited<ReturnType<typeof enrollOwner>>) {
  const jar = new CookieJar();
  const response = await authPost(
    'sign-in/email',
    {
      email: enrolled.email,
      password: enrolled.password,
    },
    jar,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ twoFactorRedirect: true });
  return jar;
}

describe('adversarial authentication HTTP boundary', () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await pool.end();
  });

  it.each(['two-factor/verify-totp', 'two-factor/verify-backup-code'])(
    'rejects remembered-device requests at %s before consuming the challenge or factor',
    async (path) => {
      const enrolled = await enrollOwner();
      const challenge = await challengeFor(enrolled);
      const code = path.endsWith('verify-totp')
        ? (await auth.api.generateTOTP({ body: { secret: enrolled.secret } }))
            .code
        : enrolled.backupCodes[0];
      const rejected = await authPost(
        path,
        { code, trustDevice: true },
        challenge,
      );
      expect(rejected.status).toBe(403);
      expect(await rejected.json()).toMatchObject({
        code: 'AUTH_OPERATION_NOT_ALLOWED',
      });
      expect(
        (await db.select().from(verification)).some((row) =>
          row.identifier.startsWith('trust-device-'),
        ),
      ).toBe(false);
      expect((await authPost(path, { code }, challenge)).status).toBe(200);
      await expect(
        getAdminSessionAccess(new Headers({ cookie: challenge.header() })),
      ).resolves.toMatchObject({ policy: 'ALLOWED' });
    },
  );

  it('requires a fresh challenge even when a valid legacy trust cookie is presented', async () => {
    const enrolled = await enrollOwner();
    const [storedUser] = await db.select().from(user);
    const identifier = `trust-device-${randomUUID()}`;
    await db.insert(verification).values({
      identifier,
      value: storedUser.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const secret = process.env.BETTER_AUTH_SECRET!;
    const token = createHmac('sha256', secret)
      .update(`${storedUser.id}!${identifier}`)
      .digest('base64url');
    const value = `${token}!${identifier}`;
    const signedCookie = encodeURIComponent(
      `${value}.${createHmac('sha256', secret).update(value).digest('base64')}`,
    );
    const jar = new CookieJar();
    const cookie = (await auth.$context).createAuthCookie('trust_device');
    jar.set(cookie.name, signedCookie);
    const response = await authPost(
      'sign-in/email',
      {
        email: enrolled.email,
        password: enrolled.password,
      },
      jar,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ twoFactorRedirect: true });
    expect(
      response.headers
        .getSetCookie()
        .some(
          (value) =>
            value.startsWith(`${cookie.name}=`) && value.includes('Max-Age=0'),
        ),
    ).toBe(true);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: jar.header() })),
    ).resolves.toMatchObject({ policy: 'UNAUTHENTICATED' });
    const generated = await auth.api.generateTOTP({
      body: { secret: enrolled.secret },
    });
    expect(
      (await authPost('two-factor/verify-totp', generated, jar)).status,
    ).toBe(200);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: jar.header() })),
    ).resolves.toMatchObject({ policy: 'ALLOWED' });
  });

  it('does not allow raw session input to refresh the server-owned MFA timestamp', async () => {
    const enrolled = await enrollOwner();
    const [before] = await db.select().from(session);
    const response = await authPost(
      'update-session',
      { mfaVerifiedAt: new Date(Date.now() + 600_000).toISOString() },
      enrolled.jar,
    );
    expect(response.status).toBe(400);
    const [after] = await db.select().from(session);
    expect(after.mfaVerifiedAt).toEqual(before.mfaVerifiedAt);
  });

  it('does not allow raw user input to change authorization or MFA policy fields', async () => {
    const enrolled = await enrollOwner();
    await db.update(user).set({ role: 'ADMIN' });
    const [before] = await db.select().from(user);
    for (const [body, status] of [
      [{ role: 'OWNER' }, 400],
      [{ active: false }, 200],
      [{ twoFactorEnabled: false }, 200],
      [{ mustChangePassword: true }, 400],
      [{ setupCredentialExpiresAt: new Date(0).toISOString() }, 400],
    ] as const) {
      const response = await authPost(
        'update-user',
        { name: 'Permitted name change', ...body },
        enrolled.jar,
      );
      expect(response.status).toBe(status);
      const [unchanged] = await db.select().from(user);
      expect(unchanged).toMatchObject({
        role: 'ADMIN',
        active: true,
        twoFactorEnabled: true,
        mustChangePassword: false,
        setupCredentialExpiresAt: null,
      });
    }
    const [after] = await db.select().from(user);
    expect(after).toMatchObject({
      name: 'Permitted name change',
      role: 'ADMIN',
      active: true,
      twoFactorEnabled: true,
      mustChangePassword: false,
      setupCredentialExpiresAt: null,
    });
    expect(after.id).toBe(before.id);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: enrolled.jar.header() })),
    ).resolves.toMatchObject({
      policy: 'ALLOWED',
      principal: { role: 'ADMIN' },
    });
  });

  it('allows at most one successful HTTP login when two challenges concurrently use the same backup code', async () => {
    const enrolled = await enrollOwner();
    const first = await challengeFor(enrolled);
    const second = await challengeFor(enrolled);
    const responses = await Promise.all(
      [first, second].map((jar) =>
        authPost(
          'two-factor/verify-backup-code',
          {
            code: enrolled.backupCodes[0],
          },
          jar,
        ),
      ),
    );
    expect(
      responses.filter((response) => response.status === 200),
    ).toHaveLength(1);
    const access = await Promise.all(
      [first, second].map((jar) =>
        getAdminSessionAccess(new Headers({ cookie: jar.header() })),
      ),
    );
    expect(access.filter((result) => result.policy === 'ALLOWED')).toHaveLength(
      1,
    );
  });

  it('keeps account MFA lockout across newly issued challenges and blocks backup-code fallback', async () => {
    const enrolled = await enrollOwner();
    const generated = await auth.api.generateTOTP({
      body: { secret: enrolled.secret },
    });
    const invalid = `${generated.code.slice(0, -1)}${(Number(generated.code.at(-1)) + 1) % 10}`;
    for (let round = 0; round < 2; round++) {
      const challenge = await challengeFor(enrolled);
      for (let attempt = 0; attempt < 5; attempt++) {
        expect(
          (
            await authPost(
              'two-factor/verify-totp',
              { code: invalid },
              challenge,
            )
          ).status,
        ).toBe(401);
      }
    }
    const [factor] = await db.select().from(twoFactor);
    expect(factor.failedVerificationCount).toBeGreaterThanOrEqual(10);
    expect(factor.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    const fresh = await challengeFor(enrolled);
    const blocked = await authPost(
      'two-factor/verify-backup-code',
      { code: enrolled.backupCodes[0] },
      fresh,
    );
    expect(blocked.status).toBe(429);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: fresh.header() })),
    ).resolves.toMatchObject({ policy: 'UNAUTHENTICATED' });
  });
});
