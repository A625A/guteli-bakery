import { expect, test } from '@playwright/test';

const requestId = '63f2debf-7d45-4d6b-a78f-43ff8d64fe98';
const mediaCache = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const catalogCache = 'no-store';

test('public catalog returns ten minimal DTO products and nine safe media objects', async ({
  request,
}) => {
  const response = await request.get('/api/products', {
    headers: { 'x-request-id': requestId },
    maxRedirects: 0,
  });
  const body = await response.json();
  expect(response.status()).toBe(200);
  expect(response.headers()['x-request-id']).toBe(requestId);
  expect(response.headers()['cache-control']).toBe(catalogCache);
  const products = body.categories.flatMap(
    (category: { products: unknown[] }) => category.products,
  );
  for (const category of body.categories) {
    expect(Object.keys(category).sort()).toEqual([
      'id',
      'name',
      'products',
      'slug',
    ]);
  }
  expect(products).toHaveLength(10);
  for (const product of products) {
    expect(Object.keys(product).sort()).toEqual([
      'category',
      'id',
      'imageUrl',
      'name',
      'priceMinor',
      'saleUnit',
      'slug',
      'stockAvailable',
    ]);
    expect(JSON.stringify(product)).not.toMatch(
      /storageKey|deletedAt|UPLOADS_ROOT|\/Users\/|\/app\//,
    );
    expect(Object.keys(product.category).sort()).toEqual([
      'id',
      'name',
      'slug',
    ]);
  }
  const mediaUrls = products
    .map((product: { imageUrl: string | null }) => product.imageUrl)
    .filter((url: string | null): url is string => url !== null);
  expect(mediaUrls).toHaveLength(9);
  for (const mediaUrl of mediaUrls) {
    const media = await request.get(mediaUrl);
    expect(media.status()).toBe(200);
    expect(media.headers()['content-type']).toBe('image/webp');
    expect(media.headers()['x-content-type-options']).toBe('nosniff');
    expect(media.headers()['cache-control']).toBe(mediaCache);
    expect((await media.body()).byteLength).toBeGreaterThan(0);
  }
});

test('public routes return request-aware safe errors and reject traversal/hidden media', async ({
  request,
}) => {
  const missing = await request.get('/api/products/not-a-real-product', {
    headers: { 'x-request-id': requestId },
  });
  expect(missing.status()).toBe(404);
  expect(missing.headers()['x-request-id']).toBe(requestId);
  expect(missing.headers()['cache-control']).toBe(catalogCache);
  expect(await missing.json()).toEqual({
    error: {
      code: 'PRODUCT_NOT_FOUND',
      message: 'Producto no encontrado.',
      requestId,
    },
  });

  const traversal = await request.get(
    '/api/media/catalog/v1/%2e%2e%2fsecret.webp',
    {
      maxRedirects: 0,
    },
  );
  expect(traversal.status()).toBe(404);
  expect(JSON.stringify(await traversal.json())).not.toMatch(
    /storageKey|deletedAt|UPLOADS_ROOT|\/Users\/|\/app\//,
  );

  const missingMedia = await request.get('/api/media/catalog/v1/missing.webp');
  expect(missingMedia.status()).toBe(404);
  expect(await missingMedia.json()).toMatchObject({
    error: { code: 'MEDIA_NOT_FOUND', message: 'Imagen no encontrada.' },
  });
});
