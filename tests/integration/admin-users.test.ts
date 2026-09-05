import { join } from 'node:path';

import { base32 } from '@better-auth/utils/base32';
import { and, eq, sql } from 'drizzle-orm';
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

import { POST as AUTH_POST } from '@/app/api/auth/[...all]/route';
import {
  GET as GET_USERS,
  POST as POST_USERS,
} from '@/app/api/admin/users/route';
import { PATCH as PATCH_USER } from '@/app/api/admin/users/[id]/route';
import {
  AdminUserError,
  createAdminUser,
  listAdminUsers,
} from '@/server/auth/admin-users';
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';
import { auditLogs, session, twoFactor, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'admin users integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
const totpSecrets = new WeakMap<CookieJar, string>();
const ADMIN_USER_MUTATION_LOCK = 4_728_519_114;
let nextTestIpSuffix = 10;

class CookieJar {
  private readonly values = new Map<string, string>();
  readonly forwardedFor = `198.51.100.${nextTestIpSuffix++}`;

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

  headers(origin = 'http://localhost:3000') {
    return new Headers({
      cookie: [...this.values]
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
      origin,
    });
  }

  cookie() {
    return this.headers().get('cookie') ?? '';
  }
}

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

async function waitForAdminMutationToBlock() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ waiting: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM pg_locks
        WHERE locktype = 'advisory'
          AND granted = false
          AND classid = (($1::bigint >> 32) & 4294967295)::oid
          AND objid = ($1::bigint & 4294967295)::oid
      ) AS waiting
    `,
      [ADMIN_USER_MUTATION_LOCK],
    );
    if (result.rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Admin mutation did not wait for the advisory lock.');
}

async function releaseAdminMutationAfter(
  boundary: Date,
  startMutation: () => Promise<Response>,
) {
  const blocker = await pool.connect();
  await blocker.query('BEGIN');
  await blocker.query('SELECT pg_advisory_xact_lock($1::bigint)', [
    ADMIN_USER_MUTATION_LOCK,
  ]);
  const mutation = startMutation();
  try {
    await waitForAdminMutationToBlock();
    const remaining = boundary.getTime() - Date.now() + 50;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    await blocker.query('COMMIT');
    return await mutation;
  } catch (error) {
    await blocker.query('ROLLBACK');
    await mutation.catch(() => undefined);
    throw error;
  } finally {
    blocker.release();
  }
}

async function authPost(
  path: string,
  body: Record<string, unknown>,
  jar: CookieJar,
) {
  const response = await AUTH_POST(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: jar.cookie(),
        origin: 'http://localhost:3000',
        'x-forwarded-for': jar.forwardedFor,
      },
      body: JSON.stringify(body),
    }),
  );
  jar.absorb(response);
  return response;
}

async function finishEnrollment(
  email: string,
  setupPassword: string,
  password: string,
) {
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
  const enabled = await authPost(
    'two-factor/enable',
    { method: 'totp', password },
    jar,
  );
  expect(enabled.status).toBe(200);
  const enrollment = (await enabled.json()) as { totpURI: string };
  const encodedSecret = new URL(enrollment.totpURI).searchParams.get('secret');
  expect(encodedSecret).toBeTruthy();
  const secret = new TextDecoder().decode(base32.decode(encodedSecret!));
  totpSecrets.set(jar, secret);
  const code = await auth.api.generateTOTP({ body: { secret } });
  expect((await authPost('two-factor/verify-totp', code, jar)).status).toBe(
    200,
  );
  return jar;
}

async function enrolledOwner(suffix = 'primary') {
  const email = `owner-${suffix}@example.test`;
  const setupPassword = `setup-${suffix}-password-at-least-14-characters`;
  const password = `changed-${suffix}-password-at-least-14-characters`;
  expect(
    await provisionOwner({
      email,
      name: 'Propietaria',
      password: setupPassword,
    }),
  ).toBe('created');
  return {
    email,
    jar: await finishEnrollment(email, setupPassword, password),
    password,
  };
}

function usersRequest(
  method: 'GET' | 'POST',
  jar: CookieJar,
  body?: Record<string, unknown>,
  query = '',
  origin = 'http://localhost:3000',
) {
  const request = new Request(`http://localhost:3000/api/admin/users${query}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      cookie: jar.cookie(),
      origin,
      'x-request-id': '123e4567-e89b-42d3-a456-426614174000',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return method === 'GET' ? GET_USERS(request) : POST_USERS(request);
}

function patchUser(
  id: string,
  jar: CookieJar,
  body: Record<string, unknown>,
  origin = 'http://localhost:3000',
) {
  return PATCH_USER(
    new Request(`http://localhost:3000/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: jar.cookie(),
        origin,
        'x-request-id': '223e4567-e89b-42d3-a456-426614174000',
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function createThroughRoute(
  jar: CookieJar,
  email = 'new-admin@example.test',
) {
  const response = await usersRequest('POST', jar, {
    kind: 'CREATE',
    email,
    name: 'Administradora nueva',
    role: 'ADMIN',
  });
  expect(response.status).toBe(201);
  return (await response.json()) as {
    user: { id: string; email: string; role: 'ADMIN' };
    setupCredential: string;
    setupCredentialExpiresAt: string;
  };
}

describe('owner-only administrator management', () => {
  beforeEach(resetDatabase);
  afterAll(() => pool.end());

  it('denies anonymous and ADMIN callers and revalidates inactive, pre-MFA, stale, and Origin state', async () => {
    const anonymous = await GET_USERS(
      new Request('http://localhost:3000/api/admin/users'),
    );
    expect(anonymous.status).toBe(401);
    expect(await anonymous.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });

    const owner = await enrolledOwner();
    const created = await createThroughRoute(
      owner.jar,
      'plain-admin@example.test',
    );
    const adminJar = await finishEnrollment(
      created.user.email,
      created.setupCredential,
      'plain-admin-replacement-password-at-least-14',
    );
    const adminDenied = await usersRequest('GET', adminJar);
    expect(adminDenied.status).toBe(403);
    expect(await adminDenied.json()).toMatchObject({
      error: { code: 'FORBIDDEN' },
    });

    const invalidOrigin = await usersRequest(
      'POST',
      owner.jar,
      {
        kind: 'CREATE',
        email: 'origin@example.test',
        name: 'Origin',
        role: 'ADMIN',
      },
      '',
      'https://evil.example',
    );
    expect(invalidOrigin.status).toBe(403);
    expect(await invalidOrigin.json()).toMatchObject({
      error: { code: 'INVALID_ORIGIN' },
    });

    const [ownerRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, owner.email));
    await db
      .update(session)
      .set({ mfaVerifiedAt: new Date(Date.now() - 600_001) })
      .where(eq(session.userId, ownerRow.id));
    const stale = await usersRequest('POST', owner.jar, {
      kind: 'CREATE',
      email: 'stale@example.test',
      name: 'Stale',
      role: 'ADMIN',
    });
    expect(stale.status).toBe(401);
    expect(await stale.json()).toMatchObject({
      error: { code: 'REAUTHENTICATION_REQUIRED' },
    });

    await db
      .update(session)
      .set({ mfaVerifiedAt: null })
      .where(eq(session.userId, ownerRow.id));
    const preMfa = await usersRequest('GET', owner.jar);
    expect(preMfa.status).toBe(401);
    expect(await preMfa.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });

    await db
      .update(user)
      .set({ active: false })
      .where(eq(user.id, ownerRow.id));
    const inactive = await usersRequest('GET', owner.jar);
    expect(inactive.status).toBe(401);
  });

  it('creates only ADMIN users, normalizes email, rejects authority fields and duplicates, and never lists secrets', async () => {
    const owner = await enrolledOwner();
    const created = await createThroughRoute(
      owner.jar,
      '  NEW-ADMIN@EXAMPLE.TEST  ',
    );
    expect(created.user).toMatchObject({
      email: 'new-admin@example.test',
      role: 'ADMIN',
    });
    expect(created.setupCredential.length).toBeGreaterThanOrEqual(14);
    expect(
      new Date(created.setupCredentialExpiresAt).getTime() - Date.now(),
    ).toBeGreaterThan(23 * 60 * 60 * 1_000);

    const duplicate = await usersRequest('POST', owner.jar, {
      kind: 'CREATE',
      email: 'new-admin@example.test',
      name: 'Duplicada',
      role: 'ADMIN',
    });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      error: { code: 'ADMIN_EMAIL_EXISTS' },
    });

    for (const body of [
      {
        kind: 'CREATE',
        email: 'owner-injection@example.test',
        name: 'Injection',
        role: 'OWNER',
      },
      {
        kind: 'CREATE',
        email: 'password-injection@example.test',
        name: 'Injection',
        role: 'ADMIN',
        password: 'client-password-must-not-be-accepted',
      },
      {
        kind: 'CREATE',
        email: 'actor-injection@example.test',
        name: 'Injection',
        role: 'ADMIN',
        actorId: crypto.randomUUID(),
      },
    ]) {
      const invalid = await usersRequest('POST', owner.jar, body);
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    }

    await expect(
      createAdminUser(
        {
          kind: 'CREATE',
          email: 'weak-generated@example.test',
          name: 'Weak generated',
          role: 'ADMIN',
        },
        owner.jar.headers(),
        crypto.randomUUID(),
        { generateSetupCredential: () => 'weak' },
      ),
    ).rejects.toEqual(new AdminUserError('WEAK_SETUP_CREDENTIAL'));

    const listed = await usersRequest('GET', owner.jar);
    expect(listed.status).toBe(200);
    expect(listed.headers.get('cache-control')).toBe('private, no-store');
    const payload = await listed.json();
    expect(payload.page).toBe(1);
    expect(payload.pageSize).toBe(25);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(created.setupCredential);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('backup');
    expect(serialized).not.toContain('session');
  });

  it('strictly validates bounded pagination and orders users deterministically', async () => {
    const owner = await enrolledOwner();
    await createThroughRoute(owner.jar, 'b@example.test');
    await createThroughRoute(owner.jar, 'a@example.test');

    for (const query of [
      '?page=0',
      '?page=1.5',
      '?pageSize=101',
      '?pageSize=0',
      '?page=1&page=2',
      '?unknown=1',
      '?page=9007199254740992',
      '?page=9007199254740991&pageSize=2',
    ]) {
      const invalid = await usersRequest('GET', owner.jar, undefined, query);
      expect(invalid.status).toBe(400);
      expect(invalid.headers.get('cache-control')).toBe('private, no-store');
    }

    const response = await usersRequest(
      'GET',
      owner.jar,
      undefined,
      '?page=1&pageSize=2',
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.total).toBe(3);
    expect(
      result.users.map((candidate: { email: string }) => candidate.email),
    ).toEqual(['a@example.test', 'b@example.test']);

    await expect(
      listAdminUsers(owner.jar.headers(), {
        page: Number.MAX_SAFE_INTEGER,
        pageSize: 2,
      }),
    ).rejects.toThrow(RangeError);
  });

  it('denies a mutation whose owner session expires while waiting for the real global lock without writing state or audit', async () => {
    const owner = await enrolledOwner('lock-session-expiry');
    const [ownerRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, owner.email));
    const expiryBoundary = new Date(Date.now() + 1_500);
    await db
      .update(session)
      .set({ expiresAt: expiryBoundary })
      .where(eq(session.userId, ownerRow.id));

    const response = await releaseAdminMutationAfter(expiryBoundary, () =>
      usersRequest('POST', owner.jar, {
        kind: 'CREATE',
        email: 'expired-during-lock@example.test',
        name: 'Expired during lock',
        role: 'ADMIN',
      }),
    );

    expect(response.status).toBe(403);
    expect(
      await db
        .select()
        .from(user)
        .where(eq(user.email, 'expired-during-lock@example.test')),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'ADMIN_USER_CREATED')),
    ).toHaveLength(0);
  }, 15_000);

  it('denies a mutation whose MFA freshness crosses ten minutes while waiting for the real global lock without writing state or audit', async () => {
    const owner = await enrolledOwner('lock-mfa-expiry');
    const [ownerRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, owner.email));
    const mfaVerifiedAt = new Date(Date.now() - 598_500);
    const freshnessBoundary = new Date(mfaVerifiedAt.getTime() + 600_000);
    await db
      .update(session)
      .set({ mfaVerifiedAt })
      .where(eq(session.userId, ownerRow.id));

    const response = await releaseAdminMutationAfter(freshnessBoundary, () =>
      usersRequest('POST', owner.jar, {
        kind: 'CREATE',
        email: 'stale-during-lock@example.test',
        name: 'Stale during lock',
        role: 'ADMIN',
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: 'REAUTHENTICATION_REQUIRED' },
    });
    expect(
      await db
        .select()
        .from(user)
        .where(eq(user.email, 'stale-during-lock@example.test')),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, 'ADMIN_USER_CREATED')),
    ).toHaveLength(0);
  }, 15_000);

  it('returns a private validation error for malformed JSON and mismatched target IDs', async () => {
    const owner = await enrolledOwner();
    const malformed = await POST_USERS(
      new Request('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: owner.jar.cookie(),
          origin: 'http://localhost:3000',
        },
        body: '{',
      }),
    );
    expect(malformed.status).toBe(400);
    expect(malformed.headers.get('cache-control')).toBe('private, no-store');
    expect(await malformed.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });

    const created = await createThroughRoute(
      owner.jar,
      'path-check@example.test',
    );
    const mismatched = await patchUser(created.user.id, owner.jar, {
      kind: 'SET_ACTIVE',
      userId: crypto.randomUUID(),
      active: false,
    });
    expect(mismatched.status).toBe(400);
    expect(await mismatched.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('makes the credential expire after 24 hours and uses the existing replacement and TOTP enrollment flow', async () => {
    const owner = await enrolledOwner();
    const created = await createThroughRoute(
      owner.jar,
      'lifecycle@example.test',
    );

    const jar = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: created.user.email, password: created.setupCredential },
          jar,
        )
      ).status,
    ).toBe(200);
    const signedIn = await auth.api.getSession({ headers: jar.headers() });
    expect(signedIn?.user.mustChangePassword).toBe(true);

    const replacement = 'replacement-password-at-least-14-characters';
    expect(
      (
        await authPost(
          'change-password',
          {
            currentPassword: created.setupCredential,
            newPassword: replacement,
            revokeOtherSessions: true,
          },
          jar,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await db
          .select({ mustChangePassword: user.mustChangePassword })
          .from(user)
          .where(eq(user.id, created.user.id))
      )[0],
    ).toEqual({ mustChangePassword: false });

    const enabled = await authPost(
      'two-factor/enable',
      { method: 'totp', password: replacement },
      jar,
    );
    expect(enabled.status).toBe(200);
    expect(
      await db
        .select()
        .from(twoFactor)
        .where(eq(twoFactor.userId, created.user.id)),
    ).toHaveLength(1);

    await db.delete(session).where(eq(session.userId, created.user.id));
    await db
      .update(user)
      .set({
        mustChangePassword: true,
        setupCredentialExpiresAt: new Date(Date.now() - 1),
      })
      .where(eq(user.id, created.user.id));
    const expired = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: created.user.email, password: replacement },
          expired,
        )
      ).status,
    ).toBe(401);
  });

  it('protects self-disable and last-owner invariants, revokes sessions, and writes safe audits', async () => {
    const owner = await enrolledOwner();
    const [ownerRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, owner.email));

    const selfDisable = await patchUser(ownerRow.id, owner.jar, {
      kind: 'SET_ACTIVE',
      userId: ownerRow.id,
      active: false,
    });
    expect(selfDisable.status).toBe(409);
    expect(await selfDisable.json()).toMatchObject({
      error: { code: 'SELF_DISABLE_FORBIDDEN' },
    });

    const selfDemote = await patchUser(ownerRow.id, owner.jar, {
      kind: 'SET_ROLE',
      userId: ownerRow.id,
      role: 'ADMIN',
    });
    expect(selfDemote.status).toBe(409);
    expect(await selfDemote.json()).toMatchObject({
      error: { code: 'LAST_ACTIVE_OWNER' },
    });

    const created = await createThroughRoute(owner.jar, 'target@example.test');
    const targetJar = await finishEnrollment(
      created.user.email,
      created.setupCredential,
      'target-replacement-password-at-least-14',
    );
    expect(targetJar.cookie()).not.toBe('');

    const promoted = await patchUser(created.user.id, owner.jar, {
      kind: 'SET_ROLE',
      userId: created.user.id,
      role: 'OWNER',
    });
    expect(promoted.status).toBe(200);
    expect(
      await db
        .select()
        .from(session)
        .where(eq(session.userId, created.user.id)),
    ).toHaveLength(0);

    await db.insert(session).values({
      token: crypto.randomUUID(),
      userId: created.user.id,
      expiresAt: new Date(Date.now() + 60_000),
      mfaVerifiedAt: new Date(),
    });
    const disabled = await patchUser(created.user.id, owner.jar, {
      kind: 'SET_ACTIVE',
      userId: created.user.id,
      active: false,
    });
    expect(disabled.status).toBe(200);
    expect(
      await db
        .select()
        .from(session)
        .where(eq(session.userId, created.user.id)),
    ).toHaveLength(0);

    const enabled = await patchUser(created.user.id, owner.jar, {
      kind: 'SET_ACTIVE',
      userId: created.user.id,
      active: true,
    });
    expect(enabled.status).toBe(200);
    expect(
      await db
        .select()
        .from(session)
        .where(eq(session.userId, created.user.id)),
    ).toHaveLength(0);

    const audits = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, created.user.id));
    expect(audits.map((audit) => audit.action)).toEqual([
      'ADMIN_USER_CREATED',
      'ADMIN_USER_ROLE_CHANGED',
      'ADMIN_USER_ACTIVE_CHANGED',
      'ADMIN_USER_ACTIVE_CHANGED',
    ]);
    expect(
      audits.every(
        (audit) =>
          audit.actorId === ownerRow.id &&
          audit.entityType === 'ADMIN_USER' &&
          audit.requestId.length > 0,
      ),
    ).toBe(true);
    const auditJson = JSON.stringify(audits);
    expect(auditJson).not.toContain('target@example.test');
    expect(auditJson).not.toContain(created.setupCredential);
    expect(auditJson).not.toContain('password');
    expect(auditJson).not.toContain('secret');
    expect(auditJson).not.toContain('backup');
  });

  it('rolls back state and session revocation when a late audit write fails', async () => {
    const owner = await enrolledOwner();
    const created = await createThroughRoute(
      owner.jar,
      'rollback@example.test',
    );
    await db.insert(session).values({
      token: crypto.randomUUID(),
      userId: created.user.id,
      expiresAt: new Date(Date.now() + 60_000),
      mfaVerifiedAt: new Date(),
    });
    await pool.query(`
      CREATE FUNCTION fail_admin_user_audit() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.action = 'ADMIN_USER_ACTIVE_CHANGED' THEN
          RAISE EXCEPTION 'test audit failure';
        END IF;
        RETURN NEW;
      END $$
    `);
    await pool.query(`
      CREATE TRIGGER fail_admin_user_audit
      BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION fail_admin_user_audit()
    `);

    const response = await patchUser(created.user.id, owner.jar, {
      kind: 'SET_ACTIVE',
      userId: created.user.id,
      active: false,
    });
    expect(response.status).toBe(500);
    expect(
      (
        await db
          .select({ active: user.active })
          .from(user)
          .where(eq(user.id, created.user.id))
      )[0],
    ).toEqual({ active: true });
    expect(
      await db
        .select()
        .from(session)
        .where(eq(session.userId, created.user.id)),
    ).toHaveLength(1);
  });

  it('preserves one active owner under concurrent cross-demotions', async () => {
    const first = await enrolledOwner('concurrent-first');
    const created = await createThroughRoute(
      first.jar,
      'concurrent-second@example.test',
    );
    const secondJar = await finishEnrollment(
      created.user.email,
      created.setupCredential,
      'concurrent-second-replacement-at-least-14',
    );
    expect(
      (
        await patchUser(created.user.id, first.jar, {
          kind: 'SET_ROLE',
          userId: created.user.id,
          role: 'OWNER',
        })
      ).status,
    ).toBe(200);

    // Promotion revokes the target session, so establish a fresh MFA session.
    const replacement = 'concurrent-second-replacement-at-least-14';
    const verifiedSecond = new CookieJar();
    expect(
      (
        await authPost(
          'sign-in/email',
          { email: created.user.email, password: replacement },
          verifiedSecond,
        )
      ).status,
    ).toBe(200);
    const challengeCode = await auth.api.generateTOTP({
      body: { secret: totpSecrets.get(secondJar)! },
    });
    expect(
      (await authPost('two-factor/verify-totp', challengeCode, verifiedSecond))
        .status,
    ).toBe(200);
    expect(secondJar.cookie()).not.toBe('');

    const [firstRow] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, first.email));
    const results = await Promise.all([
      patchUser(created.user.id, first.jar, {
        kind: 'SET_ROLE',
        userId: created.user.id,
        role: 'ADMIN',
      }),
      patchUser(firstRow.id, verifiedSecond, {
        kind: 'SET_ROLE',
        userId: firstRow.id,
        role: 'ADMIN',
      }),
    ]);
    expect(results.filter((response) => response.status === 200)).toHaveLength(
      1,
    );
    expect(
      results.some(
        (response) =>
          response.status === 409 ||
          response.status === 403 ||
          response.status === 401,
      ),
    ).toBe(true);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(and(eq(user.role, 'OWNER'), eq(user.active, true)));
    expect(count).toBe(1);
  });
});
