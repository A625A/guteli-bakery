import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { requireTestDatabaseUrl } from '../../src/test/database-url';
import { adminAuthFixture } from '../support/admin-auth-fixture';

const order = {
  publicId: 'GUT-26-PRODHEAD',
  phone: '+50255550199',
  location: 'Ubicación sintética de producción',
  notes: 'Nota sintética privada',
};

test.beforeAll(async () => {
  const pool = new Pool({
    connectionString: requireTestDatabaseUrl(
      process.env.DATABASE_URL_TEST,
      'production runtime order fixture',
    ),
  });
  try {
    await pool.query(
      `INSERT INTO orders (
         public_id, customer_name, phone, fulfillment, requested_date,
         delivery_location, notes, subtotal_minor, shipping_minor,
         total_minor, receipt_token_hash
       ) VALUES ($1, $2, $3, 'DELIVERY', $4, $5, $6, 2500, NULL, NULL, $7)`,
      [
        order.publicId,
        'Cliente sintético',
        order.phone,
        '2026-09-20',
        order.location,
        order.notes,
        'f'.repeat(64),
      ],
    );
  } finally {
    await pool.end();
  }
});

test('production TLS preserves secure sessions, private HTML, Origin enforcement, and PII boundaries', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(adminAuthFixture.email);
  await page.getByLabel('Contraseña').fill(adminAuthFixture.setupPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page
    .getByLabel('Contraseña actual')
    .fill(adminAuthFixture.setupPassword);
  await page.getByLabel('Nueva contraseña').fill(adminAuthFixture.password);
  const passwordResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/change-password'),
  );
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  expect((await passwordResponse).status()).toBe(200);

  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();
  await page.getByLabel('Contraseña actual').fill(adminAuthFixture.password);
  const enableResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/two-factor/enable'),
  );
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  expect((await enableResponse).status()).toBe(200);
  const totpUri = await page.locator('output').textContent();
  const encoded = new URL(totpUri!).searchParams.get('secret');
  const secret = new TextDecoder().decode(base32.decode(encoded!));
  await page
    .getByLabel('Código de verificación')
    .fill(await createOTP(secret).totp());
  await page
    .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
    .check();
  const verifyResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/two-factor/verify-totp'),
  );
  await page.getByRole('button', { name: 'Verificar código' }).click();
  expect((await verifyResponse).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();

  const sessionCookie = (await context.cookies()).find((cookie) =>
    cookie.name.includes('session_token'),
  );
  expect(sessionCookie).toMatchObject({
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  });
  const remainingSeconds = sessionCookie!.expires - Date.now() / 1000;
  expect(remainingSeconds).toBeGreaterThan(7 * 60 * 60 + 50 * 60);
  expect(remainingSeconds).toBeLessThanOrEqual(8 * 60 * 60 + 60);

  const listResponse = await page.goto('/admin/orders');
  expect(listResponse?.status()).toBe(200);
  expect(listResponse?.headers()['cache-control']).toBe('private, no-store');
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
  const listHtml = await page.content();
  expect(listHtml).not.toContain(order.phone);
  expect(listHtml).not.toContain(order.location);
  expect(listHtml).not.toContain(order.notes);
  expect(listHtml).not.toContain(adminAuthFixture.setupPassword);
  expect(listHtml).not.toContain(adminAuthFixture.password);

  const detailResponse = await page.goto(`/admin/orders/${order.publicId}`);
  expect(detailResponse?.status()).toBe(200);
  expect(detailResponse?.headers()['cache-control']).toBe('private, no-store');
  await expect(
    page.getByRole('heading', { name: `Pedido ${order.publicId}` }),
  ).toBeVisible();
  await expect(page.getByText(order.phone)).toBeVisible();
  await expect(page.getByText(order.location)).toBeVisible();
  await expect(page.getByText(order.notes)).toBeVisible();

  const missingOrigin = await context.request.post('/api/admin/categories', {
    data: {
      name: 'Origin missing',
      slug: 'origin-missing',
      active: true,
      sortOrder: 1,
    },
  });
  expect(missingOrigin.status()).toBe(403);
  const forgedOrigin = await context.request.post('/api/admin/categories', {
    headers: { origin: 'https://forged.example' },
    data: {
      name: 'Origin forged',
      slug: 'origin-forged',
      active: true,
      sortOrder: 1,
    },
  });
  expect(forgedOrigin.status()).toBe(403);

  const unknownApi = await context.request.get('/api/admin/private.css');
  expect(unknownApi.status()).toBe(404);
  expect(unknownApi.headers()['cache-control']).toContain('private');
  expect(unknownApi.headers()['cache-control']).toContain('no-store');
  const unknownPage = await page.goto('/admin/private.css');
  expect(unknownPage?.status()).toBe(404);
  await expect(
    page.getByRole('heading', {
      name: 'Página administrativa no encontrada',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Administración' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Catálogo principal' }),
  ).toHaveCount(0);
});
