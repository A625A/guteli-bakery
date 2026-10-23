import { expect, test } from '@playwright/test';
for (const width of [390, 1440]) {
  test(`catálogo y carrito demo sin datos personales a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto('/');
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(
      page.getByRole('note', { name: 'Modo demostración' }),
    ).toContainText('Los pedidos y cobros todavía no están habilitados');
    await expect(
      page.getByRole('heading', { name: 'Cómo hacer un pedido' }),
    ).toHaveCount(0);
    await page.goto('/menu/');
    await page
      .getByRole('button', {
        name: 'Agregar Originales de Pretzels',
        exact: true,
      })
      .click();
    await page.goto('/cart/');
    const quantity = page.getByLabel(
      'Cantidad de Originales, Pretzels en el carrito',
    );
    await expect(quantity).toHaveValue('1');
    await quantity.fill('2');
    await expect(page.getByText('Subtotal estimado: Q120')).toBeVisible();
    await expect(page.getByLabel('Nombre completo')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Enviar pedido', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Pagar en línea — Próximamente' }),
    ).toBeDisabled();
    await page.screenshot({
      path: `artifacts/oracle-preparation/demo-cart-${width}.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(quantity).toHaveValue('2');
    await expect(page.getByText('Subtotal estimado: Q120')).toBeVisible();
  });
}
test('rechaza APIs públicas directas y mantiene administración protegida', async ({
  request,
}) => {
  for (const route of [
    '/api/orders',
    '/api/checkout-session',
    '/api/checkout-review',
    '/api/checkout-summary',
  ]) {
    const response = await request.post(route, {
      data: { customerName: 'PRUEBA', phone: 'NO-TELEFONO' },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe('COMMERCIAL_DEMO');
    expect(response.headers()['set-cookie']).toBeUndefined();
    expect(response.headers()['cache-control']).toContain('no-store');
  }
  expect((await request.get('/api/admin/products')).status()).toBe(401);
  expect((await request.get('/readyz')).status()).toBe(200);
  expect((await request.get('/readyz')).headers()['cache-control']).toContain(
    'no-store',
  );
  expect(await (await request.get('/readyz')).json()).toEqual({ status: 'ok' });
});
