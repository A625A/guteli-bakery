import { expect, test } from '@playwright/test';
import '../production/admin-runtime.spec';
import '../oracle-browser/photos.spec';

test('schema, durable media and public demo routes are ready without activating commerce', async ({
  page,
  request,
}) => {
  expect((await request.get('/readyz')).status()).toBe(200);
  expect((await request.get('/health')).status()).toBe(200);
  await page.goto('/menu');
  await expect(page.locator('.product-card').first()).toBeVisible();
  await expect(page.getByText('No pudimos completar la consulta.')).toHaveCount(
    0,
  );
  for (const path of [
    '/api/orders',
    '/api/delivery/search',
    '/api/delivery/quote',
  ]) {
    expect((await request.post(path, { data: {} })).status()).toBe(403);
  }
  expect((await request.get('/api/delivery/tiles/10/1/1')).status()).toBe(403);
  expect((await request.get('/api/admin/products')).status()).toBe(401);
});
