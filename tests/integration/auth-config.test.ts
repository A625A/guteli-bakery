import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET = 'test-auth-secret-must-be-at-least-32-bytes';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
});

vi.mock('server-only', () => ({}));

import { POST } from '@/app/api/auth/[...all]/route';
import { auth } from '@/server/auth/auth';
import { account, auditLogs, session, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'authentication integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

describe('Better Auth configuration', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await pool.end();
  });

  async function provisionOwner() {
    const context = await auth.$context;
    const provisionedUser = await context.internalAdapter.createUser(
      {
        email: 'owner@example.test',
        name: 'Guteli Owner',
        emailVerified: true,
        role: 'OWNER',
        active: true,
        mustChangePassword: true,
        setupCredentialExpiresAt: new Date(Date.now() + 60_000),
      },
      { method: 'admin' },
    );
    const password = 'owner-password-for-auth-integration';

    await context.internalAdapter.linkAccount({
      userId: provisionedUser.id,
      providerId: 'credential',
      issuer: 'local:credential',
      accountId: provisionedUser.id,
      password: await context.password.hash(password),
    });

    return { password, user: provisionedUser };
  }

  function authRequest(path: string, body: Record<string, string>) {
    return POST(
      new Request(`http://localhost:3000/api/auth/${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:3000',
        },
        body: JSON.stringify(body),
      }),
    );
  }

  it('migrates the generated Better Auth tables with the normal journal', async () => {
    const tables = await pool.query<{ table_name: string }>(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('user', 'session', 'account', 'verification', 'two_factor')
        ORDER BY table_name
      `,
    );
    const journal = await pool.query<{ count: string }>(
      'SELECT count(*) FROM drizzle.__drizzle_migrations',
    );

    expect(tables.rows.map(({ table_name }) => table_name)).toEqual([
      'account',
      'session',
      'two_factor',
      'user',
      'verification',
    ]);
    expect(Number(journal.rows[0]?.count)).toBeGreaterThanOrEqual(4);
  });

  it('rejects public sign-up through the Next.js handler', async () => {
    const response = await authRequest('sign-up/email', {
      name: 'Public visitor',
      email: 'visitor@example.test',
      password: 'password-with-enough-length',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: 'EMAIL_PASSWORD_SIGN_UP_DISABLED',
    });
  });

  it('returns the same generic response for an unknown email and wrong password', async () => {
    const { password } = await provisionOwner();
    const unknown = await authRequest('sign-in/email', {
      email: 'missing@example.test',
      password,
    });
    const wrongPassword = await authRequest('sign-in/email', {
      email: 'owner@example.test',
      password: 'not-the-owner-password',
    });

    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrongPassword.json());
  });

  it('provisions UUID owners and persists their login session in the database', async () => {
    const { password, user: provisionedUser } = await provisionOwner();
    const response = await authRequest('sign-in/email', {
      email: 'owner@example.test',
      password,
    });
    const [storedUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, provisionedUser.id));
    const storedSessions = await db
      .select()
      .from(session)
      .where(eq(session.userId, provisionedUser.id));
    const storedAccounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, provisionedUser.id));
    const [audit] = await db
      .insert(auditLogs)
      .values({
        actorId: provisionedUser.id,
        action: 'AUTH_UUID_PROOF',
        entityType: 'USER',
        entityId: provisionedUser.id,
        requestId: 'auth-config-test',
      })
      .returning();

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('better-auth');
    expect(provisionedUser.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(storedUser).toMatchObject({
      role: 'OWNER',
      active: true,
      mustChangePassword: true,
    });
    expect(storedUser?.setupCredentialExpiresAt).toBeInstanceOf(Date);
    expect(storedAccounts).toHaveLength(1);
    expect(storedSessions).toHaveLength(1);
    expect(audit.actorId).toBe(provisionedUser.id);
  });
});
