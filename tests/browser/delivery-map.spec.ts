import { expect, test, type Page } from '@playwright/test';
const productId = '00000000-0000-4000-8000-000000000001';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);
async function open(page: Page) {
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'guteli-cart-v2',
        JSON.stringify([{ productId: id, quantity: 2 }]),
      ),
    productId,
  );
  await page.goto('/cart/');
  await page.getByLabel('Envío', { exact: true }).check();
  await page.getByLabel('Ubicación o dirección').fill('Dirección ficticia');
}
async function search(page: Page) {
  await page.getByLabel(/Quiero usar el mapa/).check();
  await page
    .getByRole('button', { name: 'Buscar dirección en el mapa' })
    .click();
}
async function fakeSearch(page: Page) {
  await page.route('**/api/delivery/search', (r) =>
    r.fulfill({
      json: {
        status: 'ok',
        results: [
          { label: 'Prueba A', point: { lng: 1, lat: 1 } },
          { label: 'Prueba B', point: { lng: 5, lat: 1 } },
        ],
      },
    }),
  );
}
test('map choice, movement, price invalidation and signed payload preserve the cart', async ({
  page,
}) => {
  const external: string[] = [];
  await page.route(/^https:\/\//, (r) => {
    external.push(r.request().url());
    return r.abort();
  });
  await fakeSearch(page);
  await page.route('**/api/delivery/tiles/**', (r) =>
    r.fulfill({ contentType: 'image/png', body: png }),
  );
  await page.route('**/api/delivery/quote', (r) =>
    r.fulfill({
      json: {
        quote: {
          kind: 'automatic',
          shippingMinor: r.request().postDataJSON().point.lng > 3 ? 3500 : 1000,
          token: 'a'.repeat(80) + '.' + 'b'.repeat(43),
          expiresAt: new Date(Date.now() + 600000).toISOString(),
        },
      },
    }),
  );
  await open(page);
  await search(page);
  await page.getByRole('button', { name: 'Prueba A', exact: true }).click();
  await expect(page.locator('.leaflet-marker-icon')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar esta ubicación' }).click();
  await expect(page.getByText('Envío: Q10', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Total estimado: Q130', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Prueba B', exact: true }).click();
  await expect(page.getByText('Envío: Q10', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Marcador: 1.000000, 5.000000/)).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar esta ubicación' }).click();
  await expect(page.getByText('Envío: Q35', { exact: true })).toBeVisible();
  const marker = page.locator('.leaflet-marker-icon');
  // Center the map below the sticky navigation before a real pointer drag.
  await page
    .locator('.delivery-map')
    .evaluate((el) =>
      el.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
  const box = (await marker.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 70, box.y + 30, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByText('Envío: Q35', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirmar esta ubicación' }).click();
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/orders', async (r) => {
    body = r.request().postDataJSON();
    await r.fulfill({
      status: 409,
      json: { error: { code: 'DELIVERY_QUOTE_STALE', message: 'test' } },
    });
  });
  await page.getByLabel('Nombre completo').fill('Cliente ficticio');
  await page.getByLabel('Teléfono').fill('55555555');
  const date = page.getByLabel('Fecha solicitada');
  await date.fill((await date.getAttribute('min'))!);
  await page
    .getByRole('button', { name: 'Enviar pedido', exact: true })
    .click();
  await expect(page.locator('.order-submit-error')).toBeVisible();
  expect(body).toHaveProperty('deliveryQuote');
  expect(body).toHaveProperty('deliveryPoint');
  expect(body).not.toHaveProperty('shippingMinor');
  expect(body).not.toHaveProperty('totalMinor');
  await expect(page.getByLabel('Ubicación o dirección')).toHaveValue(
    'Dirección ficticia',
  );
  expect(
    await page.evaluate(() => localStorage.getItem('guteli-cart-v2')),
  ).toContain(productId);
  expect(external).toEqual([]);
});
test('disabled provider and failed tiles retain text-only manual checkout', async ({
  page,
}) => {
  await open(page);
  await search(page);
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /Mapa o búsqueda no disponible/ }),
  ).toBeVisible();
  await fakeSearch(page);
  await page.route('**/api/delivery/tiles/**', (r) =>
    r.fulfill({ status: 503 }),
  );
  await page
    .getByRole('button', { name: 'Buscar dirección en el mapa' })
    .click();
  await page.getByRole('button', { name: 'Prueba A', exact: true }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /cartografía no está disponible/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Confirmar esta ubicación' }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Continuar con cotización manual' })
    .click();
  await expect(page.getByLabel('Ubicación o dirección')).toHaveValue(
    'Dirección ficticia',
  );
  await expect(
    page.getByText('Envío por confirmar. Total final pendiente.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('guteli-cart-v2')),
  ).toContain(productId);
});
test('address edits discard an in-flight lookup and consent', async ({
  page,
}) => {
  let release!: () => void;
  let started!: () => void;
  const begun = new Promise<void>((r) => {
    started = r;
  });
  const ready = new Promise<void>((r) => {
    release = r;
  });
  await page.route('**/api/delivery/search', async (r) => {
    started();
    await ready;
    await r.fulfill({
      json: {
        status: 'ok',
        results: [{ label: 'Respuesta obsoleta', point: { lng: 1, lat: 1 } }],
      },
    });
  });
  await open(page);
  await search(page);
  await begun;
  await page
    .getByLabel('Ubicación o dirección')
    .fill('Otra dirección ficticia');
  release();
  await expect(page.getByLabel(/Quiero usar el mapa/)).not.toBeChecked();
  await expect(
    page.getByRole('button', { name: 'Respuesta obsoleta' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Enviar pedido', exact: true }),
  ).toBeEnabled();
});
