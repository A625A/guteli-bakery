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
import {
  AuthorizationError,
  requireAdmin,
  requireOwner,
} from '@/server/auth/authorize';
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';
import { requireRecentReauthentication } from '@/server/auth/reauth';
import { getAdminDashboard } from '@/server/admin/dashboard';
import { orders, outboxEvents, session, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';
import { eq } from 'drizzle-orm';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'admin authorization integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });

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

  headers() {
    return new Headers({
      cookie: [...this.values]
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
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

async function authPost(
  path: string,
  body: Record<string, unknown>,
  jar: CookieJar,
) {
  const response = await POST(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: jar.cookie(),
        origin: 'http://localhost:3000',
        'x-forwarded-for': '198.51.100.72',
      },
      body: JSON.stringify(body),
    }),
  );
  jar.absorb(response);
  return response;
}

async function enrollOwner() {
  const email = 'authorization-owner@example.test';
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
  const code = await auth.api.generateTOTP({ body: { secret } });
  expect((await authPost('two-factor/verify-totp', code, jar)).status).toBe(
    200,
  );

  return jar;
}

describe('authoritative admin authorization DAL', () => {
  beforeEach(resetDatabase);
  afterAll(() => pool.end());

  it('denies no session, expired sessions, inactive users, and missing MFA', async () => {
    await expect(requireAdmin(new Headers())).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    let jar = await enrollOwner();
    const active = await requireAdmin(jar.headers());
    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(session.id, active.sessionId));
    await expect(requireAdmin(jar.headers())).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    await resetDatabase();
    jar = await enrollOwner();
    const inactive = await requireAdmin(jar.headers());
    await db
      .update(user)
      .set({ active: false })
      .where(eq(user.id, inactive.userId));
    await expect(requireAdmin(jar.headers())).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    await resetDatabase();
    jar = await enrollOwner();
    const incomplete = await requireAdmin(jar.headers());
    await db
      .update(session)
      .set({ mfaVerifiedAt: null })
      .where(eq(session.id, incomplete.sessionId));
    await expect(requireAdmin(jar.headers())).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('reloads the current role and enforces owner-only operations', async () => {
    const jar = await enrollOwner();
    const owner = await requireOwner(jar.headers());
    expect(owner.role).toBe('OWNER');

    await db
      .update(user)
      .set({ role: 'ADMIN' })
      .where(eq(user.id, owner.userId));
    await expect(requireOwner(jar.headers())).rejects.toEqual(
      new AuthorizationError('FORBIDDEN'),
    );
    await expect(requireAdmin(jar.headers())).resolves.toMatchObject({
      role: 'ADMIN',
    });
  });

  it('uses the MFA completion marker for the exact reauthentication window', async () => {
    const jar = await enrollOwner();
    const actor = await requireAdmin(jar.headers());
    await db
      .update(session)
      .set({ mfaVerifiedAt: new Date(Date.now() - 600_001) })
      .where(eq(session.id, actor.sessionId));

    await expect(
      requireRecentReauthentication(600, jar.headers()),
    ).rejects.toMatchObject({ code: 'REAUTHENTICATION_REQUIRED' });
  });

  it('returns only minimized aggregate and recent-order dashboard fields', async () => {
    const jar = await enrollOwner();
    const [{ id: orderId }] = await db
      .insert(orders)
      .values({
        publicId: 'GT-PRIVATE-DASHBOARD',
        customerName: 'Nombre privado',
        phone: '+50255550000',
        fulfillment: 'DELIVERY',
        requestedDate: '2026-09-15',
        deliveryLocation: 'Ubicación privada',
        notes: 'Nota privada',
        subtotalMinor: 10_000,
        shippingMinor: null,
        totalMinor: null,
        receiptTokenHash: 'a'.repeat(64),
      })
      .returning({ id: orders.id });
    await db.insert(outboxEvents).values({
      eventType: 'OWNER_ORDER_CREATED',
      payload: { orderId, requestId: 'dashboard-request' },
      state: 'PENDING',
    });
    await db.insert(outboxEvents).values({
      eventType: 'UNRELATED_PENDING_WORK',
      payload: { orderId, requestId: 'unrelated-request' },
      state: 'PENDING',
    });

    const dashboard = await getAdminDashboard(jar.headers());
    expect(dashboard.orderCounts).toMatchObject({ RECEIVED: 1 });
    expect(dashboard.pendingNotificationCount).toBe(1);
    expect(dashboard.recentOrders).toEqual([
      expect.objectContaining({
        publicId: 'GT-PRIVATE-DASHBOARD',
        orderStatus: 'RECEIVED',
        fulfillment: 'DELIVERY',
      }),
    ]);
    const serialized = JSON.stringify(dashboard);
    expect(serialized).not.toContain('+50255550000');
    expect(serialized).not.toContain('Ubicación privada');
    expect(serialized).not.toContain('Nombre privado');
    expect(serialized).not.toContain('Nota privada');
  });
});
