import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { base32 } from '@better-auth/utils/base32';
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
  process.env.RECEIPT_TOKEN_SECRET =
    'test-receipt-secret-must-be-at-least-32-bytes';
  process.env.TRUSTED_PROXY_HOPS = '1';
});

const pageTransport = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  redirect(destination: string): never {
    throw Object.assign(new Error('Test navigation redirect.'), {
      pageNavigationKind: 'redirect' as const,
      destination,
    });
  },
  notFound(): never {
    throw Object.assign(new Error('Test navigation not found.'), {
      pageNavigationKind: 'not-found' as const,
    });
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/headers')>()),
  headers: async () => pageTransport.requestHeaders,
}));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  redirect: pageTransport.redirect,
  notFound: pageTransport.notFound,
}));

import MissingAdminPage from '@/app/admin/[...missing]/page';
import AdminCategoriesPage from '@/app/admin/categories/page';
import ChangePasswordPage from '@/app/admin/change-password/page';
import EnrollMfaPage from '@/app/admin/enroll-mfa/page';
import AdminLoginPage from '@/app/admin/login/page';
import AdminOrderDetailPage from '@/app/admin/orders/[id]/page';
import AdminOrdersPage from '@/app/admin/orders/page';
import AdminPage from '@/app/admin/page';
import AdminProductPage from '@/app/admin/products/[id]/page';
import AdminProductsPage from '@/app/admin/products/page';
import AdminUsersPage from '@/app/admin/users/page';
import VerifyMfaPage from '@/app/admin/verify-mfa/page';

import {
  DELETE as DELETE_CATEGORY,
  GET as GET_CATEGORY,
  PATCH as PATCH_CATEGORY,
} from '@/app/api/admin/categories/[id]/route';
import {
  GET as GET_CATEGORIES,
  POST as POST_CATEGORY,
} from '@/app/api/admin/categories/route';
import { GET as GET_ADMIN_MEDIA } from '@/app/api/admin/media/[...key]/route';
import { PATCH as PATCH_DELIVERY_QUOTE } from '@/app/api/admin/orders/[id]/delivery-quote/route';
import { GET as GET_ORDER } from '@/app/api/admin/orders/[id]/route';
import { PATCH as PATCH_ORDER_STATUS } from '@/app/api/admin/orders/[id]/status/route';
import { GET as GET_ORDERS } from '@/app/api/admin/orders/route';
import { POST as POST_DUPLICATE } from '@/app/api/admin/products/[id]/duplicate/route';
import {
  DELETE as DELETE_PRODUCT,
  GET as GET_PRODUCT,
  PATCH as PATCH_PRODUCT,
} from '@/app/api/admin/products/[id]/route';
import {
  GET as GET_PRODUCTS,
  POST as POST_PRODUCT,
} from '@/app/api/admin/products/route';
import { POST as POST_UPLOAD } from '@/app/api/admin/uploads/route';
import { PATCH as PATCH_USER } from '@/app/api/admin/users/[id]/route';
import {
  GET as GET_USERS,
  POST as POST_USER,
} from '@/app/api/admin/users/route';
import { POST as AUTH_POST } from '@/app/api/auth/[...all]/route';
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';
import { session, user } from '@/server/db/schema';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'admin boundary matrix integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
const missingId = '00000000-0000-4000-8000-000000000404';
const missingPublicId = 'GUT-26-NOTFOUND';
let sequence = 0;

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

  cookie() {
    return [...this.values]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  headers(origin: string | null = 'http://localhost:3000') {
    const headers = new Headers({
      cookie: this.cookie(),
      'x-forwarded-for': `198.51.100.${150 + (sequence % 80)}`,
      'x-request-id': randomUUID(),
    });
    if (origin !== null) headers.set('origin', origin);
    return headers;
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
  const response = await AUTH_POST(
    new Request(`http://localhost:3000/api/auth/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: jar.cookie(),
        origin: 'http://localhost:3000',
        'x-forwarded-for': `198.51.100.${150 + (sequence % 80)}`,
      },
      body: JSON.stringify(body),
    }),
  );
  jar.absorb(response);
  return response;
}

async function enrolledOwner() {
  const suffix = `${Date.now()}-${sequence++}`;
  const email = `matrix-${suffix}@example.test`;
  const setupPassword = `setup-${suffix}-password-at-least-14`;
  const password = `changed-${suffix}-password-at-least-14`;
  expect(
    await provisionOwner({
      email,
      name: 'Matrix owner',
      password: setupPassword,
    }),
  ).toBe('created');
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
  const secretValue = new URL(
    ((await enabled.json()) as { totpURI: string }).totpURI,
  ).searchParams.get('secret');
  const secret = new TextDecoder().decode(base32.decode(secretValue!));
  const code = await auth.api.generateTOTP({ body: { secret } });
  expect((await authPost('two-factor/verify-totp', code, jar)).status).toBe(
    200,
  );
  const [identity] = await db
    .select({ userId: user.id, sessionId: session.id })
    .from(user)
    .innerJoin(session, eq(session.userId, user.id))
    .where(eq(user.email, email))
    .limit(1);
  expect(identity).toBeDefined();
  return { jar, userId: identity!.userId, sessionId: identity!.sessionId };
}

function jsonRequest(
  path: string,
  method: string,
  headers: Headers,
  body: object,
) {
  headers.set('content-type', 'application/json');
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

type MatrixRoute = Readonly<{
  name: string;
  mutation: boolean;
  allowedStatus: number;
  ownerOnly?: boolean;
  call: (headers: Headers) => Promise<Response>;
}>;

function expectAuthorizedStatus(
  status: number,
  expectedStatus: number,
  label: string,
) {
  expect(status, label).toBe(expectedStatus);
}

const categoryInput = {
  name: 'Matrix category',
  slug: 'matrix-category',
  active: true,
  sortOrder: 1,
};
const productInput = {
  categoryId: missingId,
  name: 'Matrix product',
  slug: 'matrix-product',
  description: '',
  saleUnit: null,
  sku: null,
  priceMinor: 100,
  stockQuantity: 5,
  active: true,
  featured: false,
  sortOrder: 1,
};

function routeMatrix(headersFor: () => Headers): MatrixRoute[] {
  const context = { params: Promise.resolve({ id: missingId }) };
  const orderContext = { params: Promise.resolve({ id: missingPublicId }) };
  return [
    {
      name: 'GET /api/admin/categories',
      mutation: false,
      allowedStatus: 200,
      call: () =>
        GET_CATEGORIES(
          new Request('http://localhost:3000/api/admin/categories', {
            headers: headersFor(),
          }),
        ),
    },
    {
      name: 'POST /api/admin/categories',
      mutation: true,
      allowedStatus: 201,
      call: () =>
        POST_CATEGORY(
          jsonRequest(
            '/api/admin/categories',
            'POST',
            headersFor(),
            categoryInput,
          ),
        ),
    },
    {
      name: 'GET /api/admin/categories/:id',
      mutation: false,
      allowedStatus: 404,
      call: () =>
        GET_CATEGORY(
          new Request(
            `http://localhost:3000/api/admin/categories/${missingId}`,
            {
              headers: headersFor(),
            },
          ),
          context,
        ),
    },
    {
      name: 'PATCH /api/admin/categories/:id',
      mutation: true,
      allowedStatus: 404,
      call: () =>
        PATCH_CATEGORY(
          jsonRequest(
            `/api/admin/categories/${missingId}`,
            'PATCH',
            headersFor(),
            { ...categoryInput, expectedVersion: 1 },
          ),
          context,
        ),
    },
    {
      name: 'DELETE /api/admin/categories/:id',
      mutation: true,
      allowedStatus: 404,
      call: () =>
        DELETE_CATEGORY(
          jsonRequest(
            `/api/admin/categories/${missingId}`,
            'DELETE',
            headersFor(),
            { expectedVersion: 1, confirmAffectedProducts: true },
          ),
          context,
        ),
    },
    {
      name: 'GET /api/admin/orders',
      mutation: false,
      allowedStatus: 200,
      call: () =>
        GET_ORDERS(
          new Request('http://localhost:3000/api/admin/orders', {
            headers: headersFor(),
          }),
        ),
    },
    {
      name: 'GET /api/admin/orders/:id',
      mutation: false,
      allowedStatus: 404,
      call: () =>
        GET_ORDER(
          new Request(
            `http://localhost:3000/api/admin/orders/${missingPublicId}`,
            {
              headers: headersFor(),
            },
          ),
          orderContext,
        ),
    },
    {
      name: 'PATCH /api/admin/orders/:id/delivery-quote',
      mutation: true,
      allowedStatus: 404,
      call: () =>
        PATCH_DELIVERY_QUOTE(
          jsonRequest(
            `/api/admin/orders/${missingPublicId}/delivery-quote`,
            'PATCH',
            headersFor(),
            { shippingMinor: 100, expectedVersion: 1 },
          ),
          orderContext,
        ),
    },
    {
      name: 'PATCH /api/admin/orders/:id/status',
      mutation: true,
      allowedStatus: 404,
      call: () =>
        PATCH_ORDER_STATUS(
          jsonRequest(
            `/api/admin/orders/${missingPublicId}/status`,
            'PATCH',
            headersFor(),
            { status: 'CONFIRMED', expectedVersion: 1 },
          ),
          orderContext,
        ),
    },
    {
      name: 'GET /api/admin/products',
      mutation: false,
      allowedStatus: 200,
      call: () =>
        GET_PRODUCTS(
          new Request('http://localhost:3000/api/admin/products', {
            headers: headersFor(),
          }),
        ),
    },
    {
      name: 'POST /api/admin/products',
      mutation: true,
      allowedStatus: 409,
      call: () =>
        POST_PRODUCT(
          jsonRequest(
            '/api/admin/products',
            'POST',
            headersFor(),
            productInput,
          ),
        ),
    },
    {
      name: 'GET /api/admin/products/:id',
      mutation: false,
      allowedStatus: 404,
      call: () =>
        GET_PRODUCT(
          new Request(`http://localhost:3000/api/admin/products/${missingId}`, {
            headers: headersFor(),
          }),
          context,
        ),
    },
    {
      name: 'PATCH /api/admin/products/:id',
      mutation: true,
      allowedStatus: 404,
      call: () =>
        PATCH_PRODUCT(
          jsonRequest(
            `/api/admin/products/${missingId}`,
            'PATCH',
            headersFor(),
            { ...productInput, expectedVersion: 1 },
          ),
          context,
        ),
    },
    {
      name: 'DELETE /api/admin/products/:id',
      mutation: true,
      allowedStatus: 404,
      call: () =>
        DELETE_PRODUCT(
          jsonRequest(
            `/api/admin/products/${missingId}`,
            'DELETE',
            headersFor(),
            { expectedVersion: 1 },
          ),
          context,
        ),
    },
    {
      name: 'POST /api/admin/products/:id/duplicate',
      mutation: true,
      allowedStatus: 404,
      call: () =>
        POST_DUPLICATE(
          jsonRequest(
            `/api/admin/products/${missingId}/duplicate`,
            'POST',
            headersFor(),
            {
              name: 'Matrix duplicate',
              slug: 'matrix-duplicate',
              expectedVersion: 1,
            },
          ),
          context,
        ),
    },
    {
      name: 'POST /api/admin/uploads',
      mutation: true,
      allowedStatus: 400,
      call: () => {
        const body = new FormData();
        body.set('productId', missingId);
        body.set('expectedVersion', '1');
        body.set(
          'file',
          new File([Uint8Array.from([1, 2, 3])], 'matrix.png', {
            type: 'image/png',
          }),
        );
        return POST_UPLOAD(
          new Request('http://localhost:3000/api/admin/uploads', {
            method: 'POST',
            headers: headersFor(),
            body,
          }),
        );
      },
    },
    {
      name: 'GET /api/admin/media/:key',
      mutation: false,
      allowedStatus: 404,
      call: () =>
        GET_ADMIN_MEDIA(
          new Request(
            'http://localhost:3000/api/admin/media/products/missing.webp',
            {
              headers: headersFor(),
            },
          ),
          { params: Promise.resolve({ key: ['products', 'missing.webp'] }) },
        ),
    },
    {
      name: 'GET /api/admin/users',
      mutation: false,
      allowedStatus: 200,
      ownerOnly: true,
      call: () =>
        GET_USERS(
          new Request('http://localhost:3000/api/admin/users', {
            headers: headersFor(),
          }),
        ),
    },
    {
      name: 'POST /api/admin/users',
      mutation: true,
      allowedStatus: 201,
      ownerOnly: true,
      call: () =>
        POST_USER(
          jsonRequest('/api/admin/users', 'POST', headersFor(), {
            kind: 'CREATE',
            email: 'matrix-created@example.test',
            name: 'Matrix admin',
            role: 'ADMIN',
          }),
        ),
    },
    {
      name: 'PATCH /api/admin/users/:id',
      mutation: true,
      allowedStatus: 404,
      ownerOnly: true,
      call: () =>
        PATCH_USER(
          jsonRequest(`/api/admin/users/${missingId}`, 'PATCH', headersFor(), {
            kind: 'SET_ACTIVE',
            userId: missingId,
            active: false,
          }),
          context,
        ),
    },
  ];
}

type PageCallerState =
  | 'anonymous'
  | 'expired'
  | 'inactive'
  | 'forced-password-change'
  | 'pre-MFA'
  | 'ADMIN'
  | 'OWNER';

type PageOutcome = 'render' | 'not-found' | `redirect:${string}`;

type PageLoader = Readonly<{
  name: string;
  ownerOnly?: boolean;
  allowedOutcome: Extract<PageOutcome, 'render' | 'not-found'>;
  call: () => Promise<unknown>;
}>;

const operationalPages: readonly PageLoader[] = [
  {
    name: 'GET /admin',
    allowedOutcome: 'render',
    call: () => AdminPage(),
  },
  {
    name: 'GET /admin/orders',
    allowedOutcome: 'render',
    call: () => AdminOrdersPage({ searchParams: Promise.resolve({}) }),
  },
  {
    name: 'GET /admin/orders/:id',
    allowedOutcome: 'not-found',
    call: () =>
      AdminOrderDetailPage({
        params: Promise.resolve({ id: missingPublicId }),
      }),
  },
  {
    name: 'GET /admin/products',
    allowedOutcome: 'render',
    call: () => AdminProductsPage({ searchParams: Promise.resolve({}) }),
  },
  {
    name: 'GET /admin/products/:id',
    allowedOutcome: 'not-found',
    call: () =>
      AdminProductPage({ params: Promise.resolve({ id: missingId }) }),
  },
  {
    name: 'GET /admin/categories',
    allowedOutcome: 'render',
    call: () => AdminCategoriesPage({ searchParams: Promise.resolve({}) }),
  },
  {
    name: 'GET /admin/users',
    ownerOnly: true,
    allowedOutcome: 'render',
    call: () => AdminUsersPage({ searchParams: Promise.resolve({}) }),
  },
  {
    name: 'GET /admin/unknown',
    allowedOutcome: 'not-found',
    call: () => MissingAdminPage(),
  },
  {
    name: 'GET /admin/private.css',
    allowedOutcome: 'not-found',
    call: () => MissingAdminPage(),
  },
] as const;

const authPages = [
  { name: 'GET /admin/login', call: () => AdminLoginPage() },
  {
    name: 'GET /admin/change-password',
    call: () => ChangePasswordPage(),
  },
  { name: 'GET /admin/enroll-mfa', call: () => EnrollMfaPage() },
  { name: 'GET /admin/verify-mfa', call: () => VerifyMfaPage() },
] as const;

async function pageHeadersFor(state: PageCallerState) {
  if (state === 'anonymous') return new Headers();
  const caller = await enrolledOwner();
  switch (state) {
    case 'expired':
      await db
        .update(session)
        .set({ expiresAt: new Date(Date.now() - 1) })
        .where(eq(session.id, caller.sessionId));
      break;
    case 'inactive':
      await db
        .update(user)
        .set({ active: false })
        .where(eq(user.id, caller.userId));
      break;
    case 'forced-password-change':
      await db
        .update(user)
        .set({ mustChangePassword: true })
        .where(eq(user.id, caller.userId));
      break;
    case 'pre-MFA':
      await db
        .update(user)
        .set({ twoFactorEnabled: false })
        .where(eq(user.id, caller.userId));
      await db
        .update(session)
        .set({ mfaVerifiedAt: null })
        .where(eq(session.id, caller.sessionId));
      break;
    case 'ADMIN':
    case 'OWNER':
      await db
        .update(user)
        .set({ role: state })
        .where(eq(user.id, caller.userId));
      break;
  }
  return caller.jar.headers();
}

async function observePage(call: () => Promise<unknown>): Promise<PageOutcome> {
  try {
    await call();
    return 'render';
  } catch (error) {
    if (
      error instanceof Error &&
      'pageNavigationKind' in error &&
      error.pageNavigationKind === 'not-found'
    ) {
      return 'not-found';
    }
    if (
      error instanceof Error &&
      'pageNavigationKind' in error &&
      error.pageNavigationKind === 'redirect' &&
      'destination' in error &&
      typeof error.destination === 'string'
    ) {
      return `redirect:${error.destination}`;
    }
    throw error;
  }
}

function operationalPageExpectation(
  state: PageCallerState,
  page: PageLoader,
): PageOutcome {
  switch (state) {
    case 'anonymous':
    case 'expired':
    case 'inactive':
      return 'redirect:/admin/login';
    case 'forced-password-change':
      return 'redirect:/admin/change-password';
    case 'pre-MFA':
      return 'redirect:/admin/enroll-mfa';
    case 'ADMIN':
      return page.ownerOnly ? 'not-found' : page.allowedOutcome;
    case 'OWNER':
      return page.allowedOutcome;
  }
}

function authPageExpectation(
  state: PageCallerState,
  pageName: (typeof authPages)[number]['name'],
): PageOutcome {
  if (state === 'ADMIN' || state === 'OWNER') return 'redirect:/admin';
  if (state === 'forced-password-change') {
    return pageName === 'GET /admin/change-password'
      ? 'render'
      : 'redirect:/admin/change-password';
  }
  if (state === 'pre-MFA') {
    return pageName === 'GET /admin/enroll-mfa'
      ? 'render'
      : 'redirect:/admin/enroll-mfa';
  }
  return pageName === 'GET /admin/login' || pageName === 'GET /admin/verify-mfa'
    ? 'render'
    : 'redirect:/admin/login';
}

describe('complete admin route authorization matrix', () => {
  beforeEach(resetDatabase);
  afterAll(() => pool.end());

  it('fails closed when an allowed-role route returns a server error', () => {
    expect(() => expectAuthorizedStatus(500, 200, 'synthetic route')).toThrow();
  });

  it('denies every method to anonymous, expired, inactive, forced-password-change, and pre-MFA callers and admits the intended active roles', async () => {
    const deniedStates = [
      'anonymous',
      'expired',
      'inactive',
      'forced-password-change',
      'pre-MFA',
    ] as const;
    for (const state of deniedStates) {
      await resetDatabase();
      const caller = state === 'anonymous' ? null : await enrolledOwner();
      const jar = caller?.jar;
      if (state === 'expired') {
        await db
          .update(session)
          .set({ expiresAt: new Date(Date.now() - 1) })
          .where(eq(session.id, caller!.sessionId));
      } else if (state === 'inactive') {
        await db
          .update(user)
          .set({ active: false })
          .where(eq(user.id, caller!.userId));
      } else if (state === 'forced-password-change') {
        await db
          .update(user)
          .set({ mustChangePassword: true })
          .where(eq(user.id, caller!.userId));
      } else if (state === 'pre-MFA') {
        await db
          .update(session)
          .set({ mfaVerifiedAt: null })
          .where(eq(session.id, caller!.sessionId));
      }
      for (const route of routeMatrix(
        () =>
          jar?.headers() ?? new Headers({ origin: 'http://localhost:3000' }),
      )) {
        expect(
          (await route.call(new Headers())).status,
          `${state}: ${route.name}`,
        ).toBe(401);
      }
    }

    for (const role of ['ADMIN', 'OWNER'] as const) {
      await resetDatabase();
      const caller = await enrolledOwner();
      const { jar } = caller;
      await db.update(user).set({ role }).where(eq(user.id, caller.userId));
      for (const route of routeMatrix(() => jar.headers())) {
        const status = (await route.call(jar.headers())).status;
        if (role === 'ADMIN' && route.ownerOnly) {
          expect(status, `${role}: ${route.name}`).toBe(403);
        } else {
          expectAuthorizedStatus(
            status,
            route.allowedStatus,
            `${role}: ${route.name}`,
          );
        }
      }
    }
  }, 120_000);

  it('rejects missing and forged Origin on every cookie-authenticated mutation', async () => {
    for (const origin of [null, 'https://forged.example'] as const) {
      await resetDatabase();
      const { jar } = await enrolledOwner();
      for (const route of routeMatrix(() => jar.headers(origin)).filter(
        ({ mutation }) => mutation,
      )) {
        expect((await route.call(jar.headers(origin))).status, route.name).toBe(
          403,
        );
      }
    }
  }, 60_000);

  it('runs every admin page loader against the complete real session-state matrix', async () => {
    const states: readonly PageCallerState[] = [
      'anonymous',
      'expired',
      'inactive',
      'forced-password-change',
      'pre-MFA',
      'ADMIN',
      'OWNER',
    ];
    for (const state of states) {
      for (const page of [...operationalPages, ...authPages]) {
        await resetDatabase();
        pageTransport.requestHeaders = await pageHeadersFor(state);
        const expected = operationalPages.includes(page as PageLoader)
          ? operationalPageExpectation(state, page as PageLoader)
          : authPageExpectation(
              state,
              page.name as (typeof authPages)[number]['name'],
            );
        expect(await observePage(page.call), `${state}: ${page.name}`).toBe(
          expected,
        );
      }
    }
  }, 180_000);
});
