import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { requireTestDatabaseUrl } from '../../src/test/database-url';
import { adminAuthFixture } from '../support/admin-auth-fixture';

test.describe.configure({ mode: 'serial' });

const publicId = 'GUT-26-BROWSER1';

test.beforeAll(async () => {
  const databaseUrl = requireTestDatabaseUrl(
    process.env.DATABASE_URL_TEST,
    'admin orders browser tests',
  );
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const product = await pool.query<{ id: string }>(
      'SELECT id FROM products ORDER BY id LIMIT 1',
    );
    const order = await pool.query<{ id: string }>(
      `INSERT INTO orders (
        public_id, customer_name, phone, fulfillment, requested_date,
        delivery_location, notes, subtotal_minor, receipt_token_hash
      ) VALUES ($1, $2, $3, 'DELIVERY', $4, $5, $6, 7500, $7)
      RETURNING id`,
      [
        publicId,
        'María Browser',
        '+50255558888',
        '2026-09-20',
        'Zona 14, portón blanco',
        'Llamar al llegar',
        'b'.repeat(64),
      ],
    );
    await pool.query(
      `INSERT INTO order_items (
        order_id, source_product_id, product_name, category_label,
        sale_unit, unit_price_minor, quantity, line_total_minor
      ) VALUES ($1, $2, 'Pretzel histórico', 'Snapshot', 'unidad', 2500, 3, 7500)`,
      [order.rows[0]!.id, product.rows[0]!.id],
    );
  } finally {
    await pool.end();
  }
});

test('an owner sees operational detail, quotes delivery, and advances an order with accessible feedback', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(adminAuthFixture.email);
  await page.getByLabel('Contraseña').fill(adminAuthFixture.setupPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cambia tu contraseña' }),
  ).toBeVisible();
  await page
    .getByLabel('Contraseña actual')
    .fill(adminAuthFixture.setupPassword);
  await page.getByLabel('Nueva contraseña').fill(adminAuthFixture.password);
  const passwordChangeResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/change-password'),
  );
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  expect((await passwordChangeResponse).status()).toBe(200);
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
  await page.getByRole('button', { name: 'Verificar código' }).click();

  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Pedidos' })
    .click();
  const row = page.getByRole('row', { name: new RegExp(publicId) });
  await expect(row).toBeVisible();
  await expect(row).not.toContainText('+50255558888');
  await row.getByRole('link', { name: `Ver ${publicId}` }).click();
  await expect(
    page.getByRole('heading', { name: `Pedido ${publicId}` }),
  ).toBeVisible();
  await expect(page.getByText('+50255558888')).toBeVisible();
  await expect(page.getByText('Zona 14, portón blanco')).toBeVisible();

  await page.getByLabel('Envío (centavos)').fill('500');
  await page.getByRole('button', { name: 'Guardar cotización' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Cotización guardada. Total Q80.00.',
  );
  await page.getByLabel('Nuevo estado').selectOption('CONFIRMED');
  await page.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Estado actualizado a Confirmado.' }),
  ).toHaveText('Estado actualizado a Confirmado.');
});
