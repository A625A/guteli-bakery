import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('offline real layers, guarded human review, local export and reopening', async ({
  page,
}) => {
  const external: string[] = [];
  await page.route(/^https:\/\//, (r) => {
    external.push(r.request().url());
    return r.abort();
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Hasta dónde entregamos' }),
  ).toBeVisible();
  await expect(page.locator('#error')).toBeHidden();
  await expect(page.locator('.area-button')).toHaveCount(16);
  await expect(page.locator('#count')).toContainText('0 / 16');
  await expect(page.locator('.leaflet-overlay-pane path')).not.toHaveCount(0);
  await page
    .getByRole('button', { name: /Zona 10 · Ciudad de Guatemala/ })
    .click();
  await expect(page.locator('#area-name')).toHaveText(
    'Zona 10 · Ciudad de Guatemala',
  );
  await expect(page.locator('#metadata')).toContainText('Q35');
  await expect(page.locator('#metadata a')).toHaveAttribute(
    'href',
    'https://www.openstreetmap.org/relation/13733477',
  );
  await expect(page.locator('#approve')).toBeDisabled();
  await page.getByLabel('Persona que revisa').fill('Revisor de prueba');
  for (const c of await page.locator('[data-check]').all()) await c.check();
  await page
    .getByLabel('Observaciones y correcciones')
    .fill('Solo prueba automatizada; no es aprobación de Peter.');
  await page.locator('#approve').click();
  await expect(page.locator('#area-status')).toHaveText(
    'Aprobada en esta revisión',
  );
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.productionEnabled).toBe(false);
  expect(
    exported.areas.filter((a: { status: string }) => a.status === 'approved'),
  ).toHaveLength(1);
  expect(
    exported.areas.find((a: { id: string }) => a.id === 'osm-13733477')
      .sourceVersion,
  ).toBeGreaterThan(0);
  await page
    .getByLabel('Observaciones y correcciones')
    .fill('El límite requiere corrección.');
  await expect(page.locator('#area-status')).toHaveText(
    'Propuesta · por revisar',
  );
  await page.getByRole('button', { name: /Sausalito Q10/ }).click();
  await expect(page.locator('#area-status')).toHaveText(
    'Pendiente de delimitación',
  );
  await expect(page.locator('#approve')).toBeDisabled();
  await page.getByRole('button', { name: 'Ver km35 / km36' }).click();
  await page
    .getByLabel('Observación sobre un punto público')
    .fill('Prueba de referencia pendiente');
  await page.getByRole('button', { name: 'Marcar ajuste en el mapa' }).click();
  await page.locator('#map').click({ position: { x: 150, y: 150 } });
  await expect(page.locator('#point-status')).toContainText('1 observación');
  await page.getByRole('button', { name: 'Ver todas', exact: true }).click();
  await page.screenshot({
    path: 'test-results/delivery-review/mapa-revision.png',
    fullPage: true,
  });
  expect(external).toEqual([]);
  await page.reload();
  await expect(page.locator('#count')).toContainText('0 / 16');
});
test('bad geometry, missing data and unsafe file requests fail closed', async ({
  page,
  request,
}) => {
  expect((await request.get('/.env')).status()).toBe(404);
  expect((await request.get('/data/../../package.json')).status()).toBe(404);
  expect((await request.post('/', { data: { approved: true } })).status()).toBe(
    501,
  );
  expect(
    (
      await request.get('/', { headers: { origin: 'https://foreign.test' } })
    ).status(),
  ).toBe(403);
  const r = await request.get('/');
  expect(r.headers()['content-security-policy']).toContain(
    "connect-src 'self'",
  );
  await page.route('**/data/areas.geojson', (r) =>
    r.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [999, 14] },
          },
        ],
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#export')).toBeDisabled();
  await page.unroute('**/data/areas.geojson');
  await page.route('**/data/manifest.json', (r) => r.fulfill({ status: 503 }));
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#approve')).toBeDisabled();
});
