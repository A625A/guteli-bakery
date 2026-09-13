import { createHash, randomUUID } from 'node:crypto';
import { link, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { base32 } from '@better-auth/utils/base32';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import sharp from 'sharp';
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

vi.mock('server-only', () => ({}));

import { DELETE as DELETE_PRODUCT_IMAGE } from '@/app/api/admin/products/[id]/route';
import { GET as GET_ADMIN_MEDIA } from '@/app/api/admin/media/[...key]/route';
import { POST as POST_UPLOAD } from '@/app/api/admin/uploads/route';
import { GET as GET_MEDIA } from '@/app/api/media/[...key]/route';
import { POST as AUTH_POST } from '@/app/api/auth/[...all]/route';
import { auth } from '@/server/auth/auth';
import { provisionOwner } from '@/server/auth/provision-owner';
import {
  categories,
  imageCleanupJobs,
  productImages,
  products,
  session,
  user,
} from '@/server/db/schema';
import { LocalObjectStorage } from '@/server/storage/local-storage';
import type { ObjectStorage } from '@/server/storage';
import {
  addProductImage,
  cleanupRemovedProductImages,
  retryPendingImageCleanup,
} from '@/server/products/add-product-image';
import { requireTestDatabaseUrl } from '@/test/database-url';
import { seedCatalog } from '../../scripts/seed';

const databaseUrl = requireTestDatabaseUrl(
  process.env.DATABASE_URL_TEST,
  'admin image integration tests',
);
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool });
let uploadsRoot: string;
const uploadRoots: string[] = [];
let sequence = 0;
const CATALOG_MUTATION_LOCK = 4_728_519_206;

class CookieJar {
  private readonly values = new Map<string, string>();
  readonly forwardedFor = `198.51.100.${120 + sequence++}`;

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

  headers(origin = 'http://localhost:3000') {
    return new Headers({
      cookie: this.cookie(),
      origin,
      'x-forwarded-for': this.forwardedFor,
      'x-request-id': randomUUID(),
    });
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

async function enrolledOwner() {
  const suffix = `${Date.now()}-${sequence++}`;
  const email = `images-${suffix}@example.test`;
  const setupPassword = `setup-${suffix}-password-at-least-14`;
  const password = `changed-${suffix}-password-at-least-14`;
  expect(
    await provisionOwner({
      email,
      name: 'Image owner',
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
  return jar;
}

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  await pool.query('CREATE SCHEMA public');
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
}

async function waitForCatalogMutationToBlock() {
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
      [CATALOG_MUTATION_LOCK],
    );
    if (result.rows[0]?.waiting) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Image mutation did not wait for the catalog lock.');
}

async function productFixture(slug = `image-product-${sequence++}`) {
  const [category] = await db
    .insert(categories)
    .values({ name: `Images ${slug}`, slug: `category-${slug}`, active: true })
    .returning();
  const [product] = await db
    .insert(products)
    .values({
      categoryId: category.id,
      name: `Product ${slug}`,
      slug,
      priceMinor: 1200,
    })
    .returning();
  return product;
}

async function pngFixture() {
  return sharp({
    create: { width: 40, height: 30, channels: 3, background: '#d98b51' },
  })
    .withMetadata({ exif: { IFD0: { Artist: 'private-location-data' } } })
    .png()
    .toBuffer();
}

function uploadRequest(
  jar: CookieJar | null,
  productId: string,
  expectedVersion: number,
  bytes: Buffer,
  options: Readonly<{
    origin?: string;
    filename?: string;
    mimeType?: string;
  }> = {},
) {
  const form = new FormData();
  form.set('productId', productId);
  form.set('expectedVersion', String(expectedVersion));
  form.set(
    'file',
    new File(
      [Uint8Array.from(bytes)],
      options.filename ?? 'camera-private-name.png',
      {
        type: options.mimeType ?? 'image/png',
      },
    ),
  );
  const headers =
    jar?.headers(options.origin) ??
    new Headers({ origin: options.origin ?? 'http://localhost:3000' });
  return new Request('http://localhost:3000/api/admin/uploads', {
    method: 'POST',
    headers,
    body: form,
  });
}

function removeRequest(
  jar: CookieJar,
  productId: string,
  imageId: string,
  expectedVersion: number,
) {
  return DELETE_PRODUCT_IMAGE(
    new Request(`http://localhost:3000/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: {
        ...Object.fromEntries(jar.headers()),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ imageId, expectedVersion }),
    }),
    { params: Promise.resolve({ id: productId }) },
  );
}

beforeEach(async () => {
  await resetDatabase();
  uploadsRoot = await mkdtemp(join(tmpdir(), 'guteli-admin-images-'));
  uploadRoots.push(uploadsRoot);
  process.env.UPLOADS_ROOT = uploadsRoot;
});

afterAll(async () => {
  await pool.end();
  await Promise.all(
    uploadRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('secure admin product images', () => {
  it('stores a randomized metadata-free WebP and transactionally replaces the active image', async () => {
    const jar = await enrolledOwner();
    const product = await productFixture();
    const bytes = await pngFixture();

    const firstResponse = await POST_UPLOAD(
      uploadRequest(jar, product.id, 1, bytes),
    );
    expect(firstResponse.status).toBe(201);
    const first = (await firstResponse.json()) as {
      product: {
        version: number;
        images: readonly { id: string; storageKey: string }[];
      };
    };
    expect(first.product.version).toBe(2);
    expect(first.product.images).toHaveLength(1);
    expect(first.product.images[0].storageKey).toMatch(
      /^products\/[0-9a-f]{8}-[0-9a-f-]{27}\.webp$/,
    );
    expect(first.product.images[0].storageKey).not.toContain(
      'camera-private-name',
    );
    const stored = await new LocalObjectStorage(uploadsRoot).read(
      first.product.images[0].storageKey,
    );
    const storedMetadata = await sharp(stored!).metadata();
    expect(storedMetadata).toMatchObject({
      format: 'webp',
      width: 40,
      height: 30,
    });
    expect(storedMetadata.exif).toBeUndefined();

    const secondResponse = await POST_UPLOAD(
      uploadRequest(jar, product.id, 2, bytes),
    );
    expect(secondResponse.status).toBe(201);
    const second = (await secondResponse.json()) as typeof first;
    expect(second.product.version).toBe(3);
    expect(second.product.images[0].storageKey).not.toBe(
      first.product.images[0].storageKey,
    );
    expect(
      await new LocalObjectStorage(uploadsRoot).read(
        first.product.images[0].storageKey,
      ),
    ).toBeNull();
    const active = await db
      .select()
      .from(productImages)
      .where(
        and(
          eq(productImages.productId, product.id),
          isNull(productImages.removedAt),
        ),
      );
    expect(active).toHaveLength(1);
  });

  it('rejects unauthenticated, cross-origin, spoofed, and rate-limited upload attempts safely', async () => {
    const product = await productFixture();
    const bytes = await pngFixture();
    expect(
      (await POST_UPLOAD(uploadRequest(null, product.id, 1, bytes))).status,
    ).toBe(401);
    const jar = await enrolledOwner();
    expect(
      (
        await POST_UPLOAD(
          uploadRequest(jar, product.id, 1, bytes, {
            origin: 'https://evil.example',
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST_UPLOAD(
          uploadRequest(jar, product.id, 1, bytes, {
            filename: 'spoof.jpg',
            mimeType: 'image/jpeg',
          }),
        )
      ).status,
    ).toBe(400);

    let response!: Response;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      response = await POST_UPLOAD(
        new Request('http://localhost:3000/api/admin/uploads', {
          method: 'POST',
          headers: jar.headers(),
          body: 'invalid multipart',
        }),
      );
    }
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toMatch(/^\d+$/);
    expect(await readdir(uploadsRoot)).toEqual([]);
  });

  it('deletes only a newly-created object when metadata insertion or version validation fails', async () => {
    const jar = await enrolledOwner();
    const product = await productFixture();
    const bytes = await pngFixture();
    await pool.query(`
      CREATE FUNCTION reject_image_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'PRODUCT_IMAGE_ADDED' THEN RAISE EXCEPTION 'forced image audit failure'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_image_audit BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION reject_image_audit();
    `);
    expect(
      (await POST_UPLOAD(uploadRequest(jar, product.id, 1, bytes))).status,
    ).toBe(500);
    expect(await readdir(uploadsRoot)).toEqual([]);
    expect(await db.select().from(productImages)).toHaveLength(0);
    const [unchanged] = await db
      .select({ version: products.version })
      .from(products);
    expect(unchanged.version).toBe(1);
    await pool.query('DROP TRIGGER reject_image_audit ON audit_logs');
    await pool.query('DROP FUNCTION reject_image_audit()');

    expect(
      (await POST_UPLOAD(uploadRequest(jar, product.id, 99, bytes))).status,
    ).toBe(409);
    expect(await readdir(uploadsRoot)).toEqual([]);
  });

  it('durably records and retries compensation when metadata and object deletion both fail', async () => {
    const jar = await enrolledOwner();
    const product = await productFixture();
    const baseStorage = new LocalObjectStorage(uploadsRoot);
    let deleteAttempts = 0;
    let createdKey = '';
    let failDelete = true;
    const storage: ObjectStorage = {
      putIfMissing: async (key, body) => {
        createdKey = key;
        return baseStorage.putIfMissing(key, body);
      },
      read: (key) => baseStorage.read(key),
      delete: async (key) => {
        deleteAttempts += 1;
        if (failDelete) throw new Error('forced object deletion failure');
        return baseStorage.delete(key);
      },
      publicUrl: (key) => baseStorage.publicUrl(key),
    };
    await pool.query(`
      CREATE FUNCTION reject_image_audit_and_compensate() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'PRODUCT_IMAGE_ADDED' THEN RAISE EXCEPTION 'forced image audit failure'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_image_audit_and_compensate BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION reject_image_audit_and_compensate();
    `);

    try {
      await expect(
        addProductImage({
          productId: product.id,
          expectedVersion: 1,
          image: {
            body: await sharp(await pngFixture())
              .webp()
              .toBuffer(),
            mimeType: 'image/webp',
            width: 40,
            height: 30,
          },
          requestHeaders: jar.headers(),
          requestId: randomUUID(),
          storage,
        }),
      ).rejects.toThrow();
    } finally {
      await pool.query(
        'DROP TRIGGER reject_image_audit_and_compensate ON audit_logs',
      );
      await pool.query('DROP FUNCTION reject_image_audit_and_compensate()');
    }

    expect(deleteAttempts).toBe(1);
    expect(await db.select().from(productImages)).toHaveLength(0);
    const [job] = await db.select().from(imageCleanupJobs);
    expect(job).toMatchObject({
      storageKey: createdKey,
      cleanupAttempts: 1,
      lastCleanupErrorCode: 'OBJECT_DELETE_FAILED',
    });
    expect(await baseStorage.read(createdKey)).not.toBeNull();

    failDelete = false;
    await retryPendingImageCleanup(storage, 1);
    expect(deleteAttempts).toBe(2);
    expect(await db.select().from(imageCleanupJobs)).toHaveLength(0);
    expect(await baseStorage.read(createdKey)).toBeNull();
  });

  it('drops a compensation retry without deleting an object that became actively referenced', async () => {
    const product = await productFixture();
    const baseStorage = new LocalObjectStorage(uploadsRoot);
    const storageKey = `products/${randomUUID()}.webp`;
    await baseStorage.putIfMissing(storageKey, Buffer.from('shared'));
    await db.insert(productImages).values({
      productId: product.id,
      storageKey,
      mimeType: 'image/webp',
      width: 40,
      height: 30,
    });
    await db.insert(imageCleanupJobs).values({ storageKey });
    const guardedStorage: ObjectStorage = {
      putIfMissing: (key, body) => baseStorage.putIfMissing(key, body),
      read: (key) => baseStorage.read(key),
      delete: async () => {
        throw new Error('active shared object must not be deleted');
      },
      publicUrl: (key) => baseStorage.publicUrl(key),
    };

    await retryPendingImageCleanup(guardedStorage, 1);

    expect(await db.select().from(imageCleanupJobs)).toHaveLength(0);
    expect(await baseStorage.read(storageKey)).toEqual(Buffer.from('shared'));
  });

  it('soft-removes metadata before cleanup and retains durable pending state when deletion fails', async () => {
    const jar = await enrolledOwner();
    const product = await productFixture();
    const createdResponse = await POST_UPLOAD(
      uploadRequest(jar, product.id, 1, await pngFixture()),
    );
    const created = (await createdResponse.json()) as {
      product: {
        version: number;
        images: readonly { id: string; storageKey: string }[];
      };
    };
    const image = created.product.images[0];
    const target = join(
      uploadsRoot,
      createHash('sha256').update(image.storageKey).digest('hex'),
    );
    await link(target, join(uploadsRoot, 'intentional-hardlink'));

    const removedResponse = await removeRequest(
      jar,
      product.id,
      image.id,
      created.product.version,
    );
    expect(removedResponse.status).toBe(200);
    expect((await removedResponse.json()) as object).toMatchObject({
      product: { version: 3, images: [] },
    });
    const [removed] = await db
      .select()
      .from(productImages)
      .where(eq(productImages.id, image.id));
    expect(removed).toMatchObject({ cleanupPending: true, cleanupAttempts: 1 });
    expect(removed.removedAt).toBeInstanceOf(Date);
    const media = await GET_MEDIA(
      new Request(`http://localhost:3000/api/media/${image.storageKey}`),
      { params: Promise.resolve({ key: image.storageKey.split('/') }) },
    );
    expect(media.status).toBe(404);
  });

  it('serves unremoved images through the protected preview regardless of catalog activity', async () => {
    const jar = await enrolledOwner();
    const product = await productFixture();
    const createdResponse = await POST_UPLOAD(
      uploadRequest(jar, product.id, 1, await pngFixture()),
    );
    const created = (await createdResponse.json()) as {
      product: {
        images: readonly { id: string; storageKey: string }[];
      };
    };
    const image = created.product.images[0];
    const preview = (headers: Headers) =>
      GET_ADMIN_MEDIA(
        new Request(
          `http://localhost:3000/api/admin/media/${image.storageKey}`,
          { headers },
        ),
        { params: Promise.resolve({ key: image.storageKey.split('/') }) },
      );

    const response = await preview(jar.headers());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');

    await db
      .update(products)
      .set({ active: false })
      .where(eq(products.id, product.id));
    await db
      .update(categories)
      .set({ active: false })
      .where(eq(categories.id, product.categoryId));
    expect(
      (
        await GET_MEDIA(
          new Request(`http://localhost:3000/api/media/${image.storageKey}`),
          { params: Promise.resolve({ key: image.storageKey.split('/') }) },
        )
      ).status,
    ).toBe(404);
    expect((await preview(jar.headers())).status).toBe(200);

    await db.update(user).set({ role: 'ADMIN' });
    expect((await preview(jar.headers())).status).toBe(200);
    await db
      .update(productImages)
      .set({ removedAt: new Date() })
      .where(eq(productImages.id, image.id));
    expect((await preview(jar.headers())).status).toBe(404);
    await db
      .update(productImages)
      .set({ removedAt: null })
      .where(eq(productImages.id, image.id));
    await db.update(session).set({ mfaVerifiedAt: null });
    expect((await preview(jar.headers())).status).toBe(401);
    await db.update(session).set({ mfaVerifiedAt: new Date() });
    await db.update(user).set({ active: false });
    expect((await preview(jar.headers())).status).toBe(401);
    expect((await preview(new Headers())).status).toBe(401);
  });

  it('never deletes an object that still has another active image reference', async () => {
    const jar = await enrolledOwner();
    const firstProduct = await productFixture();
    const secondProduct = await productFixture();
    const createdResponse = await POST_UPLOAD(
      uploadRequest(jar, firstProduct.id, 1, await pngFixture()),
    );
    const created = (await createdResponse.json()) as {
      product: {
        version: number;
        images: readonly { id: string; storageKey: string }[];
      };
    };
    const image = created.product.images[0];
    await db.insert(productImages).values({
      productId: secondProduct.id,
      storageKey: image.storageKey,
      mimeType: 'image/webp',
      width: 40,
      height: 30,
    });

    expect(
      (await removeRequest(jar, firstProduct.id, image.id, 2)).status,
    ).toBe(200);
    expect(
      await new LocalObjectStorage(uploadsRoot).read(image.storageKey),
    ).not.toBeNull();
    const [removed] = await db
      .select()
      .from(productImages)
      .where(eq(productImages.id, image.id));
    expect(removed).toMatchObject({
      cleanupPending: false,
      cleanupAttempts: 0,
    });
  });

  it('serializes seeded image reactivation with cleanup through the catalog lock', async () => {
    const baseStorage = new LocalObjectStorage(uploadsRoot);
    await seedCatalog(databaseUrl, baseStorage);
    const imageId = '00000000-0000-4000-8000-000000001001';
    const [image] = await db
      .update(productImages)
      .set({ removedAt: new Date(), cleanupPending: true })
      .where(eq(productImages.id, imageId))
      .returning({
        id: productImages.id,
        storageKey: productImages.storageKey,
      });
    let notifyDeleteStarted!: () => void;
    const deleteStarted = new Promise<void>((resolve) => {
      notifyDeleteStarted = resolve;
    });
    let releaseDelete!: () => void;
    const deleteReleased = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    let targetPutStarted = false;
    const cleanupStorage: ObjectStorage = {
      putIfMissing: (key, body) => baseStorage.putIfMissing(key, body),
      read: (key) => baseStorage.read(key),
      delete: async (key) => {
        if (key === image.storageKey) {
          notifyDeleteStarted();
          await deleteReleased;
        }
        return baseStorage.delete(key);
      },
      publicUrl: (key) => baseStorage.publicUrl(key),
    };
    const seedStorage: ObjectStorage = {
      putIfMissing: async (key, body) => {
        if (key === image.storageKey) targetPutStarted = true;
        return baseStorage.putIfMissing(key, body);
      },
      read: (key) => baseStorage.read(key),
      delete: (key) => baseStorage.delete(key),
      publicUrl: (key) => baseStorage.publicUrl(key),
    };
    const cleanup = cleanupRemovedProductImages([image], cleanupStorage);
    await deleteStarted;
    const seeding = seedCatalog(databaseUrl, seedStorage);

    try {
      await waitForCatalogMutationToBlock();
      expect(targetPutStarted).toBe(false);
    } finally {
      releaseDelete();
      await Promise.all([cleanup, seeding]);
    }

    const [reactivated] = await db
      .select({ removedAt: productImages.removedAt })
      .from(productImages)
      .where(eq(productImages.id, imageId));
    expect(reactivated.removedAt).toBeNull();
    expect(await baseStorage.read(image.storageKey)).not.toBeNull();
  }, 15_000);

  it('never compensates an existing object when every randomized key collides', async () => {
    const jar = await enrolledOwner();
    const product = await productFixture();
    let putAttempts = 0;
    let deleteAttempts = 0;
    const collisionStorage: ObjectStorage = {
      putIfMissing: async () => {
        putAttempts += 1;
        return false;
      },
      read: async () => Buffer.from('existing-shared-object'),
      delete: async () => {
        deleteAttempts += 1;
        return true;
      },
      publicUrl: (key) => `/api/media/${key}`,
    };

    await expect(
      addProductImage({
        productId: product.id,
        expectedVersion: 1,
        image: {
          body: await sharp(await pngFixture())
            .webp()
            .toBuffer(),
          mimeType: 'image/webp',
          width: 40,
          height: 30,
        },
        requestHeaders: jar.headers(),
        requestId: randomUUID(),
        storage: collisionStorage,
      }),
    ).rejects.toMatchObject({ code: 'IMAGE_STORAGE_UNAVAILABLE' });
    expect(putAttempts).toBe(3);
    expect(deleteAttempts).toBe(0);
    expect(await db.select().from(productImages)).toHaveLength(0);
  });

  it('rechecks live admin authorization after waiting for the catalog lock', async () => {
    const jar = await enrolledOwner();
    const product = await productFixture();
    const blocker = await pool.connect();
    await blocker.query('BEGIN');
    await blocker.query('SELECT pg_advisory_xact_lock($1::bigint)', [
      CATALOG_MUTATION_LOCK,
    ]);
    const mutation = POST_UPLOAD(
      uploadRequest(jar, product.id, 1, await pngFixture()),
    );
    try {
      await waitForCatalogMutationToBlock();
      await pool.query('UPDATE session SET mfa_verified_at = NULL');
      await blocker.query('COMMIT');
      const response = await mutation;
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        error: { code: 'FORBIDDEN' },
      });
      expect(await readdir(uploadsRoot)).toEqual([]);
      expect(await db.select().from(productImages)).toHaveLength(0);
    } catch (error) {
      await blocker.query('ROLLBACK').catch(() => undefined);
      await mutation.catch(() => undefined);
      throw error;
    } finally {
      blocker.release();
    }
  });
});
