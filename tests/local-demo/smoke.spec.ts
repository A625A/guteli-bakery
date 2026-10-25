import { expect, test, type Page } from '@playwright/test';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { readFile, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { join } from 'node:path';
const demoRoot = process.env.GUTELI_LOCAL_DEMO_ROOT!;
import {
  adminCatalogAuthFixture as owner,
  adminShellAuthFixture as admin,
} from '../support/admin-auth-fixture';

// Only the new demo cluster. No reset, no existing browser suites or real accounts.
test.beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL_TEST ?? 'file:///');
  expect([url.hostname, url.port, url.pathname]).toEqual([
    '127.0.0.1',
    '55461',
    '/guteli_test',
  ]);
  expect(process.env.COMMERCIAL_ORDERS_ENABLED).toBe('false');
});

async function login(page: Page, fixture: typeof owner | typeof admin) {
  const statePath = `${demoRoot}/mfa-${fixture === owner ? 'owner' : 'admin'}.json`;
  const saved = JSON.parse(await readFile(statePath, 'utf8').catch(() => '{}'));
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(fixture.email);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(saved.changed ? fixture.password : fixture.setupPassword);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  if (!saved.changed) {
    await page.getByLabel('Contraseña actual').fill(fixture.setupPassword);
    await page.getByLabel('Nueva contraseña').fill(fixture.password);
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
    await expect(
      page.getByRole('heading', { name: 'Configura tu autenticador' }),
    ).toBeVisible();
    saved.changed = true;
    await writeFile(statePath, JSON.stringify(saved), { mode: 0o600 });
  }
  if (!saved.secret) {
    // Password alone must not authorize catalog access.
    expect((await page.request.get('/api/admin/products')).status()).toBe(401);
    await page.getByLabel('Contraseña actual').fill(fixture.password);
    await page.getByRole('button', { name: 'Configurar autenticador' }).click();
    const uri = await page.locator('output').textContent();
    saved.secret = new TextDecoder().decode(
      base32.decode(new URL(uri!).searchParams.get('secret')!),
    );
    await writeFile(statePath, JSON.stringify(saved), { mode: 0o600 });
    await page
      .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
      .check();
  } else {
    await expect(
      page.getByRole('heading', { name: 'Verifica tu autenticador' }),
    ).toBeVisible();
  }
  const code = await createOTP(saved.secret).totp();
  if (saved.lastCode === code) {
    await expect
      .poll(() => createOTP(saved.secret).totp(), { timeout: 32000 })
      .not.toBe(code);
  }
  saved.lastCode = await createOTP(saved.secret).totp();
  await page.getByLabel('Código de verificación').fill(saved.lastCode);
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();
  await writeFile(statePath, JSON.stringify(saved), { mode: 0o600 });
}

test('catálogo, fotos y carrito en escritorio y móvil; bloqueos comerciales', async ({
  page,
  request,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(
      page.getByRole('note', { name: 'Modo demostración' }),
    ).toBeVisible();
    await page.goto('/menu');
    const photos = page.locator('.product-card img');
    expect(await photos.count()).toBeGreaterThanOrEqual(9);
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          photo.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
    await page
      .getByRole('button', {
        name: 'Agregar Originales de Pretzels',
        exact: true,
      })
      .click();
    await page.goto('/cart');
    const quantity = page.getByLabel(
      'Cantidad de Originales, Pretzels en el carrito',
    );
    await quantity.fill('2');
    await expect(page.getByText('Subtotal estimado: Q120')).toBeVisible();
    await page.reload();
    await expect(quantity).toHaveValue('2');
    await expect(page.getByLabel('Nombre completo')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Enviar pedido', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Pagar en línea — Próximamente' }),
    ).toBeDisabled();
    await page.screenshot({
      path: `${demoRoot}/cart-${width}.png`,
      fullPage: true,
    });
    await page.evaluate(() => localStorage.clear());
  }
  for (const route of [
    '/api/orders',
    '/api/checkout-session',
    '/api/checkout-review',
    '/api/checkout-summary',
  ]) {
    const response = await request.post(route, {
      data: { customerName: 'PRUEBA' },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe('COMMERCIAL_DEMO');
  }
  expect((await request.get('/api/admin/products')).status()).toBe(401);
});

test('OWNER: MFA, creación/edición/fotos, promoción y pedido PRUEBA persistentes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, owner);
  expect((await page.request.get('/api/admin/users')).status()).toBe(200);
  const name = `PRUEBA demo ${Date.now()}`;
  await page.goto('/admin/products');
  await page
    .getByRole('button', { name: 'Agregar producto', exact: true })
    .click();
  await page.getByLabel('Nombre del producto').fill(name);
  await page.getByLabel('Precio en quetzales (Q)').fill('12.50');
  await page
    .getByLabel('Imagen del producto')
    .setInputFiles('public/images/products/pretzel-original.webp');
  await expect(
    page.getByAltText('Vista previa de la fotografía seleccionada'),
  ).toBeVisible();
  const created = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      r.url().endsWith('/api/admin/products'),
  );
  await page
    .getByRole('button', { name: 'Crear producto', exact: true })
    .click();
  const response = await created;
  expect(response.status()).toBe(201);
  const { product } = await response.json();
  await expect(page.getByRole('status')).toHaveText('Producto creado.');
  await page.getByRole('button', { name: 'Cerrar editor' }).click();
  await page.goto(`/admin/products/${product.id}`);
  const photo = page.getByAltText(`Fotografía actual de ${name}`);
  const firstSrc = await photo.getAttribute('src');
  await page.getByLabel('Precio en quetzales (Q)').fill('15');
  await page
    .getByLabel('Imagen del producto')
    .setInputFiles('public/images/products/pretzel-jalapeno.webp');
  await page
    .getByRole('button', { name: 'Guardar producto', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText('Producto actualizado.');
  await page.reload();
  await expect(page.getByLabel('Precio en quetzales (Q)')).toHaveValue('15.00');
  await expect(photo).not.toHaveAttribute('src', firstSrc!);
  await page.getByRole('button', { name: 'Quitar fotografía actual' }).click();
  await page
    .getByRole('button', { name: 'Guardar producto', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText('Producto actualizado.');
  await page.reload();
  await expect(photo).toHaveCount(0);
  await page
    .getByLabel('Imagen del producto')
    .setInputFiles('public/images/products/pretzel-original.webp');
  await page
    .getByRole('button', { name: 'Guardar producto', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText('Producto actualizado.');
  await page.goto('/menu');
  const card = page
    .locator('.product-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(card).toContainText('Q15');
  await expect
    .poll(() =>
      card
        .locator('img')
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);

  await page.goto('/admin/promotions');
  await page
    .getByRole('button', { name: 'Agregar promoción', exact: true })
    .click();
  const form = page.getByRole('dialog').getByRole('form');
  await form.getByLabel('Nombre de la promoción').fill(name);
  await form.getByLabel('Descuento (%)').fill('10');
  await form.getByLabel('Inicio (hora de Guatemala)').fill('2020-01-01T00:00');
  await form.getByLabel('Fin (hora de Guatemala)').fill('2099-01-01T00:00');
  await form.getByLabel('Alcance').selectOption('CATALOG');
  await form.getByRole('button', { name: 'Guardar promoción' }).click();
  await expect(form.getByRole('status')).toContainText('Promoción guardada');
  await page.getByRole('button', { name: 'Cerrar editor' }).click();
  await page.goto('/menu');
  await expect(card).toContainText(`${name} · 10%`);
  await expect(card).toContainText('Q13.50');
  await page.goto('/admin/promotions');
  await page
    .getByRole('button', { name: `Editar ${name}`, exact: true })
    .click();
  await page.getByLabel('Promoción habilitada').uncheck();
  await page.getByRole('button', { name: 'Guardar promoción' }).click();
  await expect(page.getByRole('status')).toContainText('Promoción guardada');
  await page.getByRole('button', { name: 'Cerrar editor' }).click();

  const manifest = JSON.parse(
    await readFile(join(demoRoot, 'practice-manifest.json'), 'utf8'),
  );
  const reference = manifest.records[0].publicId;
  await page.goto('/admin/orders');
  await page
    .getByLabel('Referencia exacta del pedido')
    .fill(reference.toUpperCase());
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await page
    .getByRole('link', { name: `Ver ${reference}`, exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: `Pedido ${reference}` }),
  ).toBeVisible();
  await expect(
    page.getByText('PRUEBA-SIN-TELEFONO', { exact: true }),
  ).toBeVisible();
  if (
    await page
      .getByLabel('Nuevo estado')
      .locator('option[value=CONFIRMED]')
      .count()
  ) {
    await page.getByLabel('Nuevo estado').selectOption('CONFIRMED');
    await page.getByRole('button', { name: 'Actualizar estado' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Estado actualizado' }),
    ).toContainText('Confirmado');
  }
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Historial de estado' }),
  ).toContainText('Pedido recibido → Pedido confirmado');
  await page.screenshot({
    path: join(demoRoot, 'owner-practice.png'),
    fullPage: true,
  });
  await page.goto('/admin');
  await page.getByText('Mi cuenta', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar esta sesión' }).click();
  await login(page, owner); // Real second login must challenge MFA again.
});

test('ADMIN: MFA, catálogo móvil y restricción OWNER', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await login(page, admin);
  expect((await page.request.get('/api/admin/products')).status()).toBe(200);
  expect((await page.request.get('/api/admin/users')).status()).toBe(403);
  await page.goto('/admin/products');
  await expect(
    page.getByRole('heading', { name: 'Productos', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: join(demoRoot, 'admin-mobile.png'),
    fullPage: true,
  });
  await page.goto('/admin');
  await page.getByText('Mi cuenta', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar esta sesión' }).click();
  await login(page, admin);
});

test('persistencia final: solo cinco PRUEBA impagos, sin eventos ni entrega WhatsApp', async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_TEST });
  try {
    const orders = await pool.query(
      'SELECT public_id, phone, payment_status FROM orders',
    );
    expect(orders.rows).toHaveLength(5);
    for (const order of orders.rows) {
      expect(order.public_id).toMatch(/^PRUEBA-[1-5]-[0-9a-f]{8}$/);
      expect(order.phone).toBe('PRUEBA-SIN-TELEFONO');
      expect(order.payment_status).toBe('UNPAID');
    }
    expect(
      (await pool.query('SELECT count(*)::int AS total FROM outbox_events'))
        .rows[0].total,
    ).toBe(0);
    expect(
      (
        await pool.query(
          'SELECT count(*)::int AS total FROM whatsapp_delivery_receipts',
        )
      ).rows[0].total,
    ).toBe(0);
  } finally {
    await pool.end();
  }
});
