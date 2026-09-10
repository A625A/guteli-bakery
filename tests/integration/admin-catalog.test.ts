import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { base32 } from '@better-auth/utils/base32';
import { eq, sql } from 'drizzle-orm';
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
  process.env.UPLOADS_ROOT = '/tmp/guteli-admin-catalog-test-uploads';
});

vi.mock('server-only', () => ({}));

import { POST as AUTH_POST } from '@/app/api/auth/[...all]/route';
import {
  DELETE as DELETE_CATEGORY,
  GET as GET_CATEGORY,
  PATCH as PATCH_CATEGORY,
} from '@/app/api/admin/categories/[id]/route';
import {
  GET as GET_CATEGORIES,
  POST as POST_CATEGORY,
} from '@/app/api/admin/categories/route';
import {
  DELETE as DELETE_PRODUCT,
  GET as GET_PRODUCT,
  PATCH as PATCH_PRODUCT,
} from '@/app/api/admin/products/[id]/route';
import { POST as POST_DUPLICATE } from '@/app/api/admin/products/[id]/duplicate/route';
import {
  GET as GET_PRODUCTS,
  POST as POST_PRODUCT,
} from '@/app/api/admin/products/route';
import { GET as GET_PUBLIC_PRODUCTS } from '@/app/api/products/route';
import { createOrderRequestSchema } from '@/domain/order-contract';
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';
import {
  auditLogs,
  orderItems,
  orders,
  productImages,
  products,
  session,
  user,
} from '@/server/db/schema';
import { createOrder } from '@/server/orders/create-order';
import {
  adminGetProduct,
  adminListProducts,
  updateAdminProduct,
} from '@/server/products/admin-products';
import {
  adminGetCategory,
  adminListCategories,
} from '@/server/products/admin-categories';
import { requireTestDatabaseUrl } from '@/test/database-url';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'admin catalog integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
let actorNumber = 30;

class CookieJar {
  private readonly values = new Map<string, string>();
  readonly forwardedFor = `198.51.100.${actorNumber++}`;

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
      'x-forwarded-for': this.forwardedFor,
      'x-request-id': '623e4567-e89b-42d3-a456-426614174000',
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

async function enrolledActor(role: 'OWNER' | 'ADMIN' = 'OWNER') {
  const suffix = String(actorNumber++);
  const email = `catalog-${role.toLowerCase()}-${suffix}@example.test`;
  const setupPassword = `catalog-setup-${suffix}-password-at-least-14`;
  const password = `catalog-changed-${suffix}-password-at-least-14`;
  expect(
    await provisionOwner({
      email,
      name: 'Gestora catálogo',
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
        { currentPassword: setupPassword, newPassword: password },
        jar,
      )
    ).status,
  ).toBe(200);
  const enabled = await authPost(
    'two-factor/enable',
    { method: 'totp', password },
    jar,
  );
  const uri = (await enabled.json()) as { totpURI: string };
  const encoded = new URL(uri.totpURI).searchParams.get('secret');
  expect(encoded).toBeTruthy();
  const secret = new TextDecoder().decode(base32.decode(encoded!));
  const code = await auth.api.generateTOTP({ body: { secret } });
  expect((await authPost('two-factor/verify-totp', code, jar)).status).toBe(
    200,
  );
  const [actor] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));
  if (role === 'ADMIN') {
    await db.update(user).set({ role }).where(eq(user.id, actor.id));
  }
  return { id: actor.id, jar };
}

function jsonRequest(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  jar: CookieJar,
  body: Record<string, unknown>,
  origin = 'http://localhost:3000',
) {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...Object.fromEntries(jar.headers(origin)),
    },
    body: JSON.stringify(body),
  });
}

function productInput(
  categoryId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    categoryId,
    name: 'Pan de prueba',
    slug: 'pan-de-prueba',
    description: 'Descripción visible',
    saleUnit: 'unidad',
    sku: null,
    priceMinor: 1599,
    stockQuantity: 8,
    active: true,
    featured: false,
    sortOrder: 10,
    ...overrides,
  };
}

function productsRequest(jar?: CookieJar, query = '') {
  return GET_PRODUCTS(
    new Request(`http://localhost:3000/api/admin/products${query}`, {
      headers: jar?.headers(),
    }),
  );
}

function categoriesRequest(jar?: CookieJar, query = '') {
  return GET_CATEGORIES(
    new Request(`http://localhost:3000/api/admin/categories${query}`, {
      headers: jar?.headers(),
    }),
  );
}

async function createCategory(jar: CookieJar, slug = 'panes-prueba') {
  const response = await POST_CATEGORY(
    jsonRequest('http://localhost:3000/api/admin/categories', 'POST', jar, {
      name: 'Panes prueba',
      slug,
      active: true,
      sortOrder: 5,
    }),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as {
    category: { id: string; version: number; active: boolean };
  };
}

async function createProduct(
  jar: CookieJar,
  categoryId: string,
  overrides: Record<string, unknown> = {},
) {
  const response = await POST_PRODUCT(
    jsonRequest(
      'http://localhost:3000/api/admin/products',
      'POST',
      jar,
      productInput(categoryId, overrides),
    ),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as {
    product: { id: string; slug: string; version: number; active: boolean };
  };
}

async function waitForProductLock() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ waiting: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity
        WHERE datname = current_database()
          AND wait_event_type = 'Lock'
          AND query ILIKE '%products%FOR UPDATE%'
      ) AS waiting
    `);
    if (result.rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Product mutation did not wait for the row lock.');
}

async function waitForCatalogMutationDatabaseLock() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ waiting: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock'
          AND (
            query ILIKE '%UPDATE%products%'
            OR query ILIKE '%categories%FOR UPDATE%'
          )
      ) AS waiting
    `);
    if (result.rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Product mutation did not wait for the category lock.');
}

function expectExactKeys(value: unknown, expected: readonly string[]) {
  expect(value).toBeTypeOf('object');
  expect(value).not.toBeNull();
  expect(Object.keys(value as Record<string, unknown>).sort()).toEqual(
    [...expected].sort(),
  );
}

const categoryDtoKeys = [
  'id',
  'name',
  'slug',
  'active',
  'sortOrder',
  'version',
  'productCount',
] as const;

const productDtoKeys = [
  'id',
  'categoryId',
  'categoryName',
  'name',
  'slug',
  'description',
  'saleUnit',
  'sku',
  'priceMinor',
  'stockQuantity',
  'active',
  'featured',
  'sortOrder',
  'version',
  'deletedAt',
  'images',
] as const;

describe('protected catalog administration', () => {
  beforeEach(resetDatabase);
  afterAll(() => pool.end());

  it('authorizes every list/detail use case for OWNER and ADMIN and protects private responses', async () => {
    await expect(adminListProducts(new Headers())).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(adminListCategories(new Headers())).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    await expect(
      adminGetCategory('00000000-0000-4000-8000-000000000099', new Headers()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect((await productsRequest()).status).toBe(401);
    expect((await categoriesRequest()).status).toBe(401);

    const owner = await enrolledActor();
    const category = await createCategory(owner.jar);
    const product = await createProduct(owner.jar, category.category.id);
    await db.update(user).set({ role: 'ADMIN' }).where(eq(user.id, owner.id));
    const admin = owner;
    await expect(
      adminGetCategory(category.category.id, admin.jar.headers()),
    ).resolves.toMatchObject({
      id: category.category.id,
      productCount: 1,
      version: 1,
    });
    expect(
      (
        await GET_CATEGORY(
          new Request(
            `http://localhost:3000/api/admin/categories/${category.category.id}`,
            { headers: admin.jar.headers() },
          ),
          { params: Promise.resolve({ id: category.category.id }) },
        )
      ).status,
    ).toBe(200);
    await expect(
      adminGetProduct(product.product.id, admin.jar.headers()),
    ).resolves.toMatchObject({ id: product.product.id, version: 1 });
    const response = await productsRequest(admin.jar);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('enforces strict fields, integer money/stock, UUIDs, slug uniqueness, and hard pagination limits', async () => {
    const actor = await enrolledActor();
    const category = await createCategory(actor.jar);
    for (const body of [
      productInput(category.category.id, { surprise: true }),
      productInput(category.category.id, { priceMinor: 15.5 }),
      productInput(category.category.id, { stockQuantity: -1 }),
      productInput('not-a-uuid'),
      productInput(category.category.id, { slug: 'No válido' }),
    ]) {
      const response = await POST_PRODUCT(
        jsonRequest(
          'http://localhost:3000/api/admin/products',
          'POST',
          actor.jar,
          body,
        ),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    }

    await createProduct(actor.jar, category.category.id);
    const duplicate = await POST_PRODUCT(
      jsonRequest(
        'http://localhost:3000/api/admin/products',
        'POST',
        actor.jar,
        productInput(category.category.id),
      ),
    );
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      error: { code: 'PRODUCT_SLUG_EXISTS' },
    });
    for (const response of [
      await productsRequest(actor.jar, '?pageSize=101'),
      await productsRequest(actor.jar, '?page=0'),
      await productsRequest(actor.jar, '?page=1&page=2'),
      await categoriesRequest(actor.jar, '?extra=true'),
    ]) {
      expect(response.status).toBe(400);
    }
    const valid = await productsRequest(actor.jar, '?page=1&pageSize=100');
    expect(valid.status).toBe(200);
    expect(await valid.json()).toMatchObject({
      page: 1,
      pageSize: 100,
      total: 1,
    });
    const searchedCategories = await categoriesRequest(
      actor.jar,
      '?page=1&pageSize=1&search=panes-prueba',
    );
    expect(searchedCategories.status).toBe(200);
    expect(await searchedCategories.json()).toMatchObject({
      categories: [{ slug: 'panes-prueba' }],
      page: 1,
      pageSize: 1,
      total: 1,
    });
    expect(
      (
        await categoriesRequest(
          actor.jar,
          `?search=${encodeURIComponent('a'.repeat(161))}`,
        )
      ).status,
    ).toBe(400);
  });

  it('rejects public products in inactive categories and duplicates approved fields without images', async () => {
    const actor = await enrolledActor();
    const category = await createCategory(actor.jar);
    const source = await createProduct(actor.jar, category.category.id, {
      sku: 'PAN-01',
      featured: true,
      stockQuantity: null,
    });
    await db.insert(productImages).values({
      productId: source.product.id,
      storageKey: 'catalog/test/source.webp',
      mimeType: 'image/webp',
      width: 100,
      height: 100,
    });
    const duplicatedResponse = await POST_DUPLICATE(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${source.product.id}/duplicate`,
        'POST',
        actor.jar,
        {
          name: 'Pan de prueba copia',
          slug: 'pan-de-prueba-copia',
          expectedVersion: source.product.version,
        },
      ),
      { params: Promise.resolve({ id: source.product.id }) },
    );
    expect(duplicatedResponse.status).toBe(201);
    const duplicated = (await duplicatedResponse.json()) as {
      product: {
        id: string;
        active: boolean;
        sku: string | null;
        stockQuantity: number | null;
      };
    };
    expect(duplicated.product).toMatchObject({
      active: false,
      sku: 'PAN-01',
      stockQuantity: null,
    });
    expect(duplicated.product.id).not.toBe(source.product.id);
    expect(
      await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, duplicated.product.id)),
    ).toHaveLength(0);

    const categoryPatch = await PATCH_CATEGORY(
      jsonRequest(
        `http://localhost:3000/api/admin/categories/${category.category.id}`,
        'PATCH',
        actor.jar,
        {
          name: 'Panes prueba',
          slug: 'panes-prueba',
          active: false,
          sortOrder: 5,
          expectedVersion: category.category.version,
          confirmAffectedProducts: true,
        },
      ),
      { params: Promise.resolve({ id: category.category.id }) },
    );
    expect(categoryPatch.status).toBe(200);
    const rejected = await POST_PRODUCT(
      jsonRequest(
        'http://localhost:3000/api/admin/products',
        'POST',
        actor.jar,
        productInput(category.category.id, { slug: 'no-publicar' }),
      ),
    );
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({
      error: { code: 'INACTIVE_CATEGORY' },
    });
  });

  it('uses optimistic versions atomically and checkout invalidates a stale stock edit', async () => {
    const actor = await enrolledActor();
    const category = await createCategory(actor.jar);
    const created = await createProduct(actor.jar, category.category.id, {
      slug: 'stock-versionado',
      stockQuantity: 4,
      priceMinor: 1000,
    });
    const request = createOrderRequestSchema.parse({
      customerName: 'Ana López',
      phone: '+502 5555-5555',
      fulfillment: 'pickup',
      requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000)
        .toISOString()
        .slice(0, 10),
      items: [{ productId: created.product.id, quantity: 1 }],
    });
    await createOrder({
      request,
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
      idempotencySubject: 'catalog-version-regression',
      requestId: 'catalog-order-request',
      receiptTokenSecret: 'receipt-token-secret-with-at-least-32-bytes',
      now: new Date('2026-09-06T12:00:00.000Z'),
      database: db,
      createOrderId: () => '00000000-0000-4000-8000-000000000201',
      createPublicId: () => 'GUT-26-CATALOG1',
    });
    const [afterCheckout] = await db
      .select({
        stockQuantity: products.stockQuantity,
        version: products.version,
      })
      .from(products)
      .where(eq(products.id, created.product.id));
    expect(afterCheckout).toEqual({ stockQuantity: 3, version: 2 });

    const auditCountBefore = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(auditLogs);
    await expect(
      updateAdminProduct(
        created.product.id,
        {
          ...productInput(category.category.id, {
            slug: 'stock-versionado',
            stockQuantity: 9,
          }),
          expectedVersion: 1,
        },
        actor.jar.headers(),
        'stale-admin-edit',
      ),
    ).rejects.toMatchObject({ code: 'STALE_PRODUCT' });
    const [unchanged] = await db
      .select({
        stockQuantity: products.stockQuantity,
        version: products.version,
      })
      .from(products)
      .where(eq(products.id, created.product.id));
    expect(unchanged).toEqual({ stockQuantity: 3, version: 2 });
    const auditCountAfter = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(auditLogs);
    expect(auditCountAfter).toEqual(auditCountBefore);
  });

  it('soft-deletes products, preserves historical snapshots, and deactivates categories without cascade deletion', async () => {
    const actor = await enrolledActor();
    const category = await createCategory(actor.jar);
    const created = await createProduct(actor.jar, category.category.id);
    const [order] = await db
      .insert(orders)
      .values({
        publicId: 'GUT-26-HISTORY1',
        customerName: 'Cliente histórico',
        phone: '+50255550000',
        fulfillment: 'PICKUP',
        requestedDate: '2026-09-20',
        subtotalMinor: 1599,
        shippingMinor: 0,
        totalMinor: 1599,
        receiptTokenHash: createHash('sha256').update('history').digest('hex'),
      })
      .returning();
    await db.insert(orderItems).values({
      orderId: order.id,
      sourceProductId: created.product.id,
      productName: 'Nombre histórico',
      categoryLabel: 'Categoría histórica',
      saleUnit: 'unidad',
      unitPriceMinor: 1599,
      quantity: 1,
      lineTotalMinor: 1599,
    });

    const removed = await DELETE_PRODUCT(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${created.product.id}`,
        'DELETE',
        actor.jar,
        { expectedVersion: created.product.version },
      ),
      { params: Promise.resolve({ id: created.product.id }) },
    );
    expect(removed.status).toBe(200);
    const [stored] = await db
      .select()
      .from(products)
      .where(eq(products.id, created.product.id));
    expect(stored).toMatchObject({ active: false, version: 2 });
    expect(stored.deletedAt).toBeInstanceOf(Date);
    const [snapshot] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    expect(snapshot).toMatchObject({
      productName: 'Nombre histórico',
      categoryLabel: 'Categoría histórica',
      unitPriceMinor: 1599,
    });

    const categoryDelete = await DELETE_CATEGORY(
      jsonRequest(
        `http://localhost:3000/api/admin/categories/${category.category.id}`,
        'DELETE',
        actor.jar,
        {
          expectedVersion: category.category.version,
          confirmAffectedProducts: true,
        },
      ),
      { params: Promise.resolve({ id: category.category.id }) },
    );
    expect(categoryDelete.status).toBe(200);
    expect(
      await db
        .select()
        .from(products)
        .where(eq(products.id, created.product.id)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id)),
    ).toHaveLength(1);
  });

  it('serves public catalog requests no-store and reflects mutations on the next request', async () => {
    const actor = await enrolledActor();
    const category = await createCategory(actor.jar, 'inmediata');
    const before = await GET_PUBLIC_PRODUCTS(
      new Request('http://localhost:3000/api/products'),
    );
    expect(before.status).toBe(200);
    expect(before.headers.get('cache-control')).toBe('no-store');
    expect(JSON.stringify(await before.json())).not.toContain(
      'cambio-inmediato',
    );

    const created = await createProduct(actor.jar, category.category.id, {
      name: 'Cambio inmediato',
      slug: 'cambio-inmediato',
      stockQuantity: null,
    });
    const afterCreate = await GET_PUBLIC_PRODUCTS(
      new Request('http://localhost:3000/api/products'),
    );
    expect(JSON.stringify(await afterCreate.json())).toContain(
      'cambio-inmediato',
    );

    const afterPatch = await PATCH_PRODUCT(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${created.product.id}`,
        'PATCH',
        actor.jar,
        {
          ...productInput(category.category.id, {
            name: 'Cambio renombrado',
            slug: 'cambio-inmediato',
            stockQuantity: null,
            active: false,
          }),
          expectedVersion: created.product.version,
        },
      ),
      { params: Promise.resolve({ id: created.product.id }) },
    );
    expect(afterPatch.status).toBe(200);
    const afterDeactivate = await GET_PUBLIC_PRODUCTS(
      new Request('http://localhost:3000/api/products'),
    );
    expect(JSON.stringify(await afterDeactivate.json())).not.toContain(
      'cambio-inmediato',
    );
  });

  it('rechecks destructive reauthentication after a blocked product lock', async () => {
    const actor = await enrolledActor();
    const category = await createCategory(actor.jar);
    const created = await createProduct(actor.jar, category.category.id, {
      slug: 'bloqueado',
      stockQuantity: null,
    });
    const blocker = await pool.connect();
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [
      created.product.id,
    ]);
    const mutation = DELETE_PRODUCT(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${created.product.id}`,
        'DELETE',
        actor.jar,
        { expectedVersion: created.product.version },
      ),
      { params: Promise.resolve({ id: created.product.id }) },
    );
    try {
      await waitForProductLock();
      await db
        .update(session)
        .set({ mfaVerifiedAt: new Date(Date.now() - 11 * 60 * 1_000) })
        .where(eq(session.userId, actor.id));
      await blocker.query('COMMIT');
      const response = await mutation;
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        error: { code: 'REAUTHENTICATION_REQUIRED' },
      });
      const [unchanged] = await db
        .select()
        .from(products)
        .where(eq(products.id, created.product.id));
      expect(unchanged.deletedAt).toBeNull();
    } finally {
      await blocker.query('ROLLBACK').catch(() => undefined);
      blocker.release();
      await mutation.catch(() => undefined);
    }
  });

  it('locks the destination category before rechecking a deactivating move', async () => {
    const actor = await enrolledActor();
    const sourceCategory = await createCategory(actor.jar, 'origen-bloqueo');
    const destinationCategory = await createCategory(
      actor.jar,
      'destino-bloqueo',
    );
    const created = await createProduct(actor.jar, sourceCategory.category.id, {
      slug: 'mover-desactivado',
    });
    const blocker = await pool.connect();
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM categories WHERE id = $1 FOR UPDATE', [
      destinationCategory.category.id,
    ]);
    const mutation = PATCH_PRODUCT(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${created.product.id}`,
        'PATCH',
        actor.jar,
        {
          ...productInput(destinationCategory.category.id, {
            slug: 'mover-desactivado',
            active: false,
          }),
          expectedVersion: created.product.version,
        },
      ),
      { params: Promise.resolve({ id: created.product.id }) },
    );
    try {
      await waitForCatalogMutationDatabaseLock();
      await db
        .update(session)
        .set({ mfaVerifiedAt: new Date(Date.now() - 11 * 60 * 1_000) })
        .where(eq(session.userId, actor.id));
      await blocker.query('COMMIT');
      const response = await mutation;
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        error: { code: 'REAUTHENTICATION_REQUIRED' },
      });
      const [unchanged] = await db
        .select({
          categoryId: products.categoryId,
          active: products.active,
          version: products.version,
        })
        .from(products)
        .where(eq(products.id, created.product.id));
      expect(unchanged).toEqual({
        categoryId: sourceCategory.category.id,
        active: true,
        version: 1,
      });
    } finally {
      await blocker.query('ROLLBACK').catch(() => undefined);
      blocker.release();
      await mutation.catch(() => undefined);
    }
  });

  it('returns only the exact public DTO keys from every catalog mutation', async () => {
    const actor = await enrolledActor();
    const categoryResponse = await POST_CATEGORY(
      jsonRequest(
        'http://localhost:3000/api/admin/categories',
        'POST',
        actor.jar,
        {
          name: 'DTO exacto',
          slug: 'dto-exacto',
          active: true,
          sortOrder: 8,
        },
      ),
    );
    const categoryPayload = (await categoryResponse.json()) as {
      category: Record<string, unknown> & { id: string; version: number };
    };
    expectExactKeys(categoryPayload, ['category']);
    expectExactKeys(categoryPayload.category, categoryDtoKeys);

    const createdResponse = await POST_PRODUCT(
      jsonRequest(
        'http://localhost:3000/api/admin/products',
        'POST',
        actor.jar,
        productInput(categoryPayload.category.id, { slug: 'dto-producto' }),
      ),
    );
    const createdPayload = (await createdResponse.json()) as {
      product: Record<string, unknown> & { id: string; version: number };
    };
    expectExactKeys(createdPayload, ['product']);
    expectExactKeys(createdPayload.product, productDtoKeys);

    const updatedResponse = await PATCH_PRODUCT(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${createdPayload.product.id}`,
        'PATCH',
        actor.jar,
        {
          ...productInput(categoryPayload.category.id, {
            name: 'DTO producto actualizado',
            slug: 'dto-producto',
          }),
          expectedVersion: createdPayload.product.version,
        },
      ),
      { params: Promise.resolve({ id: createdPayload.product.id }) },
    );
    const updatedPayload = (await updatedResponse.json()) as {
      product: Record<string, unknown> & { version: number };
    };
    expectExactKeys(updatedPayload, ['product']);
    expectExactKeys(updatedPayload.product, productDtoKeys);

    const duplicateResponse = await POST_DUPLICATE(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${createdPayload.product.id}/duplicate`,
        'POST',
        actor.jar,
        {
          name: 'DTO copia',
          slug: 'dto-copia',
          expectedVersion: updatedPayload.product.version,
        },
      ),
      { params: Promise.resolve({ id: createdPayload.product.id }) },
    );
    const duplicatePayload = (await duplicateResponse.json()) as {
      product: Record<string, unknown> & { id: string; version: number };
    };
    expectExactKeys(duplicatePayload, ['product']);
    expectExactKeys(duplicatePayload.product, productDtoKeys);

    const removedResponse = await DELETE_PRODUCT(
      jsonRequest(
        `http://localhost:3000/api/admin/products/${duplicatePayload.product.id}`,
        'DELETE',
        actor.jar,
        { expectedVersion: duplicatePayload.product.version },
      ),
      { params: Promise.resolve({ id: duplicatePayload.product.id }) },
    );
    const removedPayload = (await removedResponse.json()) as {
      product: Record<string, unknown>;
    };
    expectExactKeys(removedPayload, ['product']);
    expectExactKeys(removedPayload.product, productDtoKeys);

    const updatedCategoryResponse = await PATCH_CATEGORY(
      jsonRequest(
        `http://localhost:3000/api/admin/categories/${categoryPayload.category.id}`,
        'PATCH',
        actor.jar,
        {
          name: 'DTO exacto actualizado',
          slug: 'dto-exacto',
          active: true,
          sortOrder: 9,
          expectedVersion: categoryPayload.category.version,
        },
      ),
      { params: Promise.resolve({ id: categoryPayload.category.id }) },
    );
    const updatedCategoryPayload = (await updatedCategoryResponse.json()) as {
      category: Record<string, unknown> & { version: number };
    };
    expectExactKeys(updatedCategoryPayload, ['category']);
    expectExactKeys(updatedCategoryPayload.category, categoryDtoKeys);

    const deactivatedCategoryResponse = await DELETE_CATEGORY(
      jsonRequest(
        `http://localhost:3000/api/admin/categories/${categoryPayload.category.id}`,
        'DELETE',
        actor.jar,
        {
          expectedVersion: updatedCategoryPayload.category.version,
          confirmAffectedProducts: true,
        },
      ),
      { params: Promise.resolve({ id: categoryPayload.category.id }) },
    );
    const deactivatedCategoryPayload =
      (await deactivatedCategoryResponse.json()) as {
        category: Record<string, unknown>;
      };
    expectExactKeys(deactivatedCategoryPayload, ['category']);
    expectExactKeys(deactivatedCategoryPayload.category, categoryDtoKeys);
  });

  it('validates detail paths, missing entities, mutation origins, and category confirmation', async () => {
    const actor = await enrolledActor();
    const category = await createCategory(actor.jar);
    expect(
      (
        await GET_PRODUCT(
          new Request('http://localhost:3000/api/admin/products/not-a-uuid', {
            headers: actor.jar.headers(),
          }),
          { params: Promise.resolve({ id: 'not-a-uuid' }) },
        )
      ).status,
    ).toBe(400);
    const missingId = '00000000-0000-4000-8000-000000000099';
    expect(
      (
        await GET_PRODUCT(
          new Request(`http://localhost:3000/api/admin/products/${missingId}`, {
            headers: actor.jar.headers(),
          }),
          { params: Promise.resolve({ id: missingId }) },
        )
      ).status,
    ).toBe(404);
    const invalidOrigin = await POST_PRODUCT(
      jsonRequest(
        'http://localhost:3000/api/admin/products',
        'POST',
        actor.jar,
        productInput(category.category.id),
        'https://evil.example',
      ),
    );
    expect(invalidOrigin.status).toBe(403);
    const unconfirmed = await DELETE_CATEGORY(
      jsonRequest(
        `http://localhost:3000/api/admin/categories/${category.category.id}`,
        'DELETE',
        actor.jar,
        {
          expectedVersion: category.category.version,
          confirmAffectedProducts: false,
        },
      ),
      { params: Promise.resolve({ id: category.category.id }) },
    );
    expect(unconfirmed.status).toBe(400);
  });
});
