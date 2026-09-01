import { join } from 'node:path';

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
import { eq } from 'drizzle-orm';

import { rateLimitBuckets, session, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'admin authentication lifecycle integration tests',
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

async function completeTotpSignIn(
  enrolled: Awaited<ReturnType<typeof enrollOwner>>,
  forwardedFor = '198.51.100.17',
) {
  const jar = new CookieJar();
  const firstFactor = await authPost(
    'sign-in/email',
    { email: enrolled.email, password: enrolled.password },
    jar,
    forwardedFor,
  );
  expect(firstFactor.status).toBe(200);
  expect(await firstFactor.json()).toMatchObject({ twoFactorRedirect: true });
  const generated = await auth.api.generateTOTP({
    body: { secret: enrolled.secret },
  });
  expect(
    (await authPost('two-factor/verify-totp', generated, jar, forwardedFor))
      .status,
  ).toBe(200);
  return jar;
}

describe('real Better Auth admin lifecycle', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('preserves the exact login subject through the signed TOTP challenge and clears it only on success', async () => {
    const enrolled = await enrollOwner();
    expect((await authPost('sign-out', {}, enrolled.jar)).status).toBe(200);

    const challenge = new CookieJar();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect(
        (
          await authPost(
            'sign-in/email',
            { email: enrolled.email, password: 'wrong-password' },
            challenge,
            '198.51.100.17',
          )
        ).status,
      ).toBe(401);
    }
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: enrolled.email, password: 'wrong-password' },
          new CookieJar(),
          '203.0.113.22',
        )
      ).status,
    ).toBe(401);

    const firstFactor = await authPost(
      'sign-in/email',
      { email: enrolled.email, password: enrolled.password },
      challenge,
      '198.51.100.17',
    );
    expect(firstFactor.status).toBe(200);
    expect(await firstFactor.json()).toMatchObject({ twoFactorRedirect: true });
    const subjectCookie = firstFactor.headers
      .getSetCookie()
      .find((value) => value.startsWith('better-auth.admin_login_subject='));
    expect(subjectCookie).toContain('HttpOnly');
    expect(subjectCookie).not.toContain(enrolled.email);
    expect(subjectCookie).not.toContain('198.51.100.17');
    const signedSubject = decodeURIComponent(
      subjectCookie?.split(';', 1)[0]?.split('=', 2)[1] ?? '',
    );
    expect(signedSubject).toContain('.');
    expect(signedSubject).not.toMatch(/^[a-f0-9]{64}$/);
    expect(
      (await db.select().from(rateLimitBuckets)).reduce(
        (total, bucket) => total + bucket.count,
        0,
      ),
    ).toBe(3);

    const generated = await auth.api.generateTOTP({
      body: { secret: enrolled.secret },
    });
    const invalidCode = `${generated.code.slice(0, -1)}${
      (Number(generated.code.at(-1)) + 1) % 10
    }`;
    expect(
      (
        await authPost(
          'two-factor/verify-totp',
          { code: invalidCode },
          challenge,
          '198.51.100.17',
        )
      ).status,
    ).toBe(401);
    expect(
      (await db.select().from(rateLimitBuckets)).reduce(
        (total, bucket) => total + bucket.count,
        0,
      ),
    ).toBe(3);

    const completed = await authPost(
      'two-factor/verify-totp',
      generated,
      challenge,
      '198.51.100.17',
    );
    expect(completed.status).toBe(200);
    expect(
      completed.headers
        .getSetCookie()
        .find((value) => value.startsWith('better-auth.admin_login_subject=')),
    ).toContain('Max-Age=0');

    const remainingBuckets = await db.select().from(rateLimitBuckets);
    expect(remainingBuckets).toHaveLength(1);
    expect(remainingBuckets[0]?.count).toBe(1);
    const [verifiedSession] = await db.select().from(session);
    expect(verifiedSession?.mfaVerifiedAt).toBeInstanceOf(Date);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: challenge.header() })),
    ).resolves.toMatchObject({ policy: 'ALLOWED' });
  });

  it('accepts each backup code once and clears the matching subject only after success', async () => {
    const enrolled = await enrollOwner();
    expect((await authPost('sign-out', {}, enrolled.jar)).status).toBe(200);

    const firstChallenge = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: enrolled.email, password: 'wrong-password' },
          firstChallenge,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: enrolled.email, password: enrolled.password },
          firstChallenge,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await authPost(
          'two-factor/verify-backup-code',
          { code: enrolled.backupCodes[0] },
          firstChallenge,
        )
      ).status,
    ).toBe(200);
    await expect(db.select().from(rateLimitBuckets)).resolves.toHaveLength(0);

    expect((await authPost('sign-out', {}, firstChallenge)).status).toBe(200);
    const secondChallenge = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: enrolled.email, password: enrolled.password },
          secondChallenge,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await authPost(
          'two-factor/verify-backup-code',
          { code: enrolled.backupCodes[0] },
          secondChallenge,
        )
      ).status,
    ).toBe(401);
    await expect(db.select().from(rateLimitBuckets)).resolves.toHaveLength(0);
  });

  it('keeps current-session logout separate from logout-all', async () => {
    const enrolled = await enrollOwner();
    const secondSession = await completeTotpSignIn(enrolled, '203.0.113.22');
    await expect(db.select().from(session)).resolves.toHaveLength(2);

    expect((await authPost('sign-out', {}, enrolled.jar)).status).toBe(200);
    await expect(db.select().from(session)).resolves.toHaveLength(1);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: secondSession.header() })),
    ).resolves.toMatchObject({ policy: 'ALLOWED' });

    expect((await authPost('revoke-sessions', {}, secondSession)).status).toBe(
      200,
    );
    expect((await authPost('sign-out', {}, secondSession)).status).toBe(200);
    await expect(db.select().from(session)).resolves.toHaveLength(0);
  });

  it('revokes a sibling pre-MFA session when enrollment completes', async () => {
    const email = 'owner@example.test';
    const setupPassword = 'setup-password-that-is-at-least-14-characters';
    const password = 'changed-password-that-is-at-least-14-characters';
    await provisionOwner({
      email,
      name: 'Propietaria',
      password: setupPassword,
    });

    const enrolling = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email, password: setupPassword },
          enrolling,
        )
      ).status,
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
          enrolling,
        )
      ).status,
    ).toBe(200);

    const sibling = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email, password },
          sibling,
          '203.0.113.22',
        )
      ).status,
    ).toBe(200);
    await expect(db.select().from(session)).resolves.toHaveLength(2);

    const enable = await authPost(
      'two-factor/enable',
      { method: 'totp', password },
      enrolling,
    );
    expect(enable.status).toBe(200);
    const enrollment = (await enable.json()) as { totpURI: string };
    const encodedSecret = new URL(enrollment.totpURI).searchParams.get(
      'secret',
    );
    expect(encodedSecret).toBeTruthy();
    const secret = new TextDecoder().decode(base32.decode(encodedSecret!));
    const generated = await auth.api.generateTOTP({ body: { secret } });
    expect(
      (await authPost('two-factor/verify-totp', generated, enrolling)).status,
    ).toBe(200);

    await expect(db.select().from(session)).resolves.toHaveLength(1);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: sibling.header() })),
    ).resolves.toEqual({ policy: 'UNAUTHENTICATED' });
    await expect(
      getAdminSessionAccess(new Headers({ cookie: enrolling.header() })),
    ).resolves.toMatchObject({ policy: 'ALLOWED' });
  });

  it('revokes inactive and setup-expired existing sessions at the reusable boundary', async () => {
    const enrolled = await enrollOwner();
    await db.update(user).set({ active: false });
    await expect(
      getAdminSessionAccess(new Headers({ cookie: enrolled.jar.header() })),
    ).resolves.toEqual({ policy: 'MFA_REQUIRED' });
    await expect(db.select().from(session)).resolves.toHaveLength(0);

    await resetDatabase();
    const setupPassword = 'setup-password-that-is-at-least-14-characters';
    await provisionOwner({
      email: 'owner@example.test',
      name: 'Propietaria',
      password: setupPassword,
    });
    const setupJar = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: 'owner@example.test', password: setupPassword },
          setupJar,
        )
      ).status,
    ).toBe(200);
    await db
      .update(user)
      .set({ setupCredentialExpiresAt: new Date(Date.now() - 1) })
      .where(eq(user.email, 'owner@example.test'));
    await expect(
      getAdminSessionAccess(new Headers({ cookie: setupJar.header() })),
    ).resolves.toEqual({ policy: 'SETUP_CREDENTIAL_EXPIRED' });
    await expect(db.select().from(session)).resolves.toHaveLength(0);
  });

  it.each([
    ['inactive', { active: false }],
    [
      'setup-expired',
      {
        mustChangePassword: true,
        setupCredentialExpiresAt: new Date(0),
      },
    ],
  ] as const)(
    'rejects and revokes a %s account changed during a signed MFA challenge',
    async (_label, update) => {
      const enrolled = await enrollOwner();
      expect((await authPost('sign-out', {}, enrolled.jar)).status).toBe(200);
      const challenge = new CookieJar();
      expect(
        (
          await authPost(
            'sign-in/email',
            { email: enrolled.email, password: enrolled.password },
            challenge,
          )
        ).status,
      ).toBe(200);
      await db.update(user).set(update);
      const generated = await auth.api.generateTOTP({
        body: { secret: enrolled.secret },
      });

      const completed = await authPost(
        'two-factor/verify-totp',
        generated,
        challenge,
      );

      expect(completed.status).toBe(401);
      expect(await completed.json()).toMatchObject({
        code: 'INVALID_EMAIL_OR_PASSWORD',
      });
      await expect(db.select().from(session)).resolves.toHaveLength(0);
    },
  );
});
