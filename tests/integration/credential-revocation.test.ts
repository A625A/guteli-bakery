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

import { session, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'credential revocation integration tests',
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

async function verifiedSignIn(
  enrolled: Awaited<ReturnType<typeof enrollOwner>>,
) {
  const jar = await challengeFor(enrolled);
  const generated = await auth.api.generateTOTP({
    body: { secret: enrolled.secret },
  });
  const completed = await authPost('two-factor/verify-totp', generated, jar);
  expect({
    status: completed.status,
    code: (await completed.clone().json()).code,
  }).toEqual({ status: 200, code: undefined });
  return jar;
}

const replacementPassword =
  'replacement-password-that-is-at-least-14-characters';

describe('credential and challenge revocation HTTP boundary', () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await pool.end();
  });

  it.each([undefined, false])(
    'revokes sibling verified sessions when the password-change flag is %s',
    async (flag) => {
      const enrolled = await enrollOwner();
      const sibling = await verifiedSignIn(enrolled);
      const response = await authPost(
        'change-password',
        {
          currentPassword: enrolled.password,
          newPassword: replacementPassword,
          ...(flag === undefined ? {} : { revokeOtherSessions: flag }),
        },
        enrolled.jar,
      );
      expect(response.status).toBe(200);
      await expect(
        getAdminSessionAccess(new Headers({ cookie: sibling.header() })),
      ).resolves.toMatchObject({ policy: 'UNAUTHENTICATED' });
    },
  );

  it('invalidates a pending password-authenticated MFA challenge when the password changes', async () => {
    const enrolled = await enrollOwner();
    const pending = await challengeFor(enrolled);
    expect(
      (
        await authPost(
          'change-password',
          {
            currentPassword: enrolled.password,
            newPassword: replacementPassword,
            revokeOtherSessions: true,
          },
          enrolled.jar,
        )
      ).status,
    ).toBe(200);
    const result = await authPost(
      'two-factor/verify-backup-code',
      { code: enrolled.backupCodes[0] },
      pending,
    );
    expect(result.status).toBe(401);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: pending.header() })),
    ).resolves.toMatchObject({ policy: 'UNAUTHENTICATED' });
  });

  it('invalidates pending MFA challenges when all sessions are revoked', async () => {
    const enrolled = await enrollOwner();
    const pending = await challengeFor(enrolled);
    expect((await authPost('revoke-sessions', {}, enrolled.jar)).status).toBe(
      200,
    );
    expect(
      (
        await authPost(
          'two-factor/verify-backup-code',
          { code: enrolled.backupCodes[0] },
          pending,
        )
      ).status,
    ).toBe(401);
    await expect(db.select().from(session)).resolves.toHaveLength(0);
  });

  it('invalidates the current pending MFA challenge when signing out', async () => {
    const enrolled = await enrollOwner();
    const pending = await challengeFor(enrolled);
    const copiedCookie = pending.header();
    expect((await authPost('sign-out', {}, pending)).status).toBe(200);
    const replay = new CookieJar();
    for (const pair of copiedCookie.split('; ')) {
      const index = pair.indexOf('=');
      replay.set(pair.slice(0, index), pair.slice(index + 1));
    }
    expect(
      (
        await authPost(
          'two-factor/verify-backup-code',
          { code: enrolled.backupCodes[0] },
          replay,
        )
      ).status,
    ).toBe(401);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: enrolled.jar.header() })),
    ).resolves.toMatchObject({ policy: 'ALLOWED' });
  });

  it('does not revoke siblings or pending challenges after an invalid password change', async () => {
    const enrolled = await enrollOwner();
    const pending = await challengeFor(enrolled);
    const result = await authPost(
      'change-password',
      {
        currentPassword: 'incorrect-password-at-least-14-characters',
        newPassword: replacementPassword,
      },
      enrolled.jar,
    );
    expect(result.status).toBe(400);
    expect(
      (
        await authPost(
          'two-factor/verify-backup-code',
          { code: enrolled.backupCodes[0] },
          pending,
        )
      ).status,
    ).toBe(200);
    await expect(
      getAdminSessionAccess(new Headers({ cookie: enrolled.jar.header() })),
    ).resolves.toMatchObject({ policy: 'ALLOWED' });
  });

  it('rejects issuance authenticated with an old password when revocation finishes during verification', async () => {
    const enrolled = await enrollOwner();
    const context = await auth.$context;
    const original = context.password.verify.bind(context.password);
    let entered!: () => void;
    let release!: () => void;
    const paused = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first = true;
    const spy = vi
      .spyOn(context.password, 'verify')
      .mockImplementation(async (input) => {
        const result = await original(input);
        if (first && input.password === enrolled.password) {
          first = false;
          entered();
          await resume;
        }
        return result;
      });
    const pending = new CookieJar();
    const issuing = authPost(
      'sign-in/email',
      { email: enrolled.email, password: enrolled.password },
      pending,
    );
    try {
      await paused;
      expect(
        (
          await authPost(
            'change-password',
            {
              currentPassword: enrolled.password,
              newPassword: replacementPassword,
            },
            enrolled.jar,
          )
        ).status,
      ).toBe(200);
    } finally {
      release();
    }
    try {
      expect((await issuing).status).toBe(401);
      await expect(
        getAdminSessionAccess(new Headers({ cookie: pending.header() })),
      ).resolves.toMatchObject({ policy: 'UNAUTHENTICATED' });
    } finally {
      spy.mockRestore();
    }
  });

  it('cannot restore a session when MFA completion overlaps logout-all', async () => {
    const enrolled = await enrollOwner();
    const pending = await challengeFor(enrolled);
    const context = await auth.$context;
    const original = context.internalAdapter.createSession.bind(
      context.internalAdapter,
    );
    let entered!: () => void;
    let release!: () => void;
    const paused = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = vi
      .spyOn(context.internalAdapter, 'createSession')
      .mockImplementation(async (...args) => {
        const created = await original(...args);
        entered();
        await resume;
        return created;
      });
    const completing = authPost(
      'two-factor/verify-backup-code',
      { code: enrolled.backupCodes[0] },
      pending,
    );
    try {
      await paused;
      expect((await authPost('revoke-sessions', {}, enrolled.jar)).status).toBe(
        200,
      );
    } finally {
      release();
    }
    try {
      expect((await completing).status).toBe(401);
      await expect(db.select().from(session)).resolves.toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });
});
