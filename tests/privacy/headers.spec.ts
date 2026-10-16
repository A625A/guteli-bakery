import { expect, test } from '@playwright/test';

test('private HTML, API errors and redirects cannot be cached or indexed', async ({
  page,
  request,
}) => {
  for (const path of [
    '/admin/login/',
    '/order/confirmation/CANARY_RECEIPT_SECRET/',
    '/cart/',
  ]) {
    const response = await page.goto(path);
    expect(response?.headers()['cache-control']).toContain('no-store');
    expect(response?.headers()['referrer-policy']).toBe('no-referrer');
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
  }
  for (const path of [
    '/api/order-status/CANARY_RECEIPT_SECRET',
    '/api/checkout-review',
    '/api/admin/orders',
  ]) {
    const response = await request.get(path);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(response.headers()['referrer-policy']).toBe('no-referrer');
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    expect(await response.text()).not.toContain('CANARY_RECEIPT_SECRET');
  }
  await page.goto('/privacidad/');
  await expect(
    page.getByRole('heading', { name: 'Privacidad de tus datos', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('no hay eliminación automática', { exact: false }),
  ).toBeVisible();
});
