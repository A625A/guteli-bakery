import { createHash } from 'node:crypto';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { requireTestDatabaseUrl } from '../../src/test/database-url';
import { adminOrdersAuthFixture } from '../support/admin-auth-fixture';

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
        createHash('sha256').update('r'.repeat(43)).digest('hex'),
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
  await page
    .getByLabel('Correo electrónico')
    .fill(adminOrdersAuthFixture.email);
  await page
    .getByLabel('Contraseña')
    .fill(adminOrdersAuthFixture.setupPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cambia tu contraseña' }),
  ).toBeVisible();
  await page
    .getByLabel('Contraseña actual')
    .fill(adminOrdersAuthFixture.setupPassword);
  await page
    .getByLabel('Nueva contraseña')
    .fill(adminOrdersAuthFixture.password);
  const passwordChangeResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/change-password'),
  );
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  expect((await passwordChangeResponse).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();
  await page
    .getByLabel('Contraseña actual')
    .fill(adminOrdersAuthFixture.password);
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
  await expect(
    page.getByRole('columnheader', { name: 'Fecha solicitada' }),
  ).toBeVisible();
  await expect(
    page.getByRole('columnheader', { name: 'Subtotal' }),
  ).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Pago' })).toBeVisible();
  await expect(row).toContainText('2026-09-20');
  await expect(row).toContainText('Q180.00');
  await expect(row).toContainText('Pendiente de pago');
  await expect(row).toContainText('Pedido recibido');
  await expect(row).not.toContainText('RECEIVED');
  await expect(row).not.toContainText('+50255558888');
  await expect(row).not.toContainText('Zona 14, portón blanco');
  await expect(row).not.toContainText('Llamar al llegar');
  await expect(row.getByRole('button')).toHaveCount(0);
  await row.getByRole('link', { name: `Ver ${publicId}` }).click();
  await expect(
    page.getByRole('heading', { name: `Pedido ${publicId}` }),
  ).toBeVisible();
  await expect(page.getByText('+50255558888')).toBeVisible();
  await expect(page.getByText('Zona 14, portón blanco')).toBeVisible();

  await page.getByLabel('Envío en quetzales (Q)').fill('5.00');
  await page.getByRole('button', { name: 'Guardar cotización' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Cotización guardada. Total Q185.00.',
  );
  await page.getByLabel('Nuevo estado').selectOption('CONFIRMED');
  await page.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Estado actualizado a Confirmado.' }),
  ).toHaveText('Estado actualizado a Confirmado.');
  const history = page.getByRole('region', { name: 'Historial de estado' });
  await expect(history).toContainText('Pedido recibido → Pedido confirmado');
  await expect(history).not.toContainText('CONFIRMED');

  await test.step('owner assigns a method and customer sees it without a paid claim or private draft', async () => {
    await page
      .getByLabel('Método de pago del pedido')
      .selectOption('BANK_TRANSFER');
    await page
      .getByLabel('Borrador privado de instrucciones')
      .fill('BORRADOR PRIVADO FICTICIO');
    await page
      .getByRole('button', { name: 'Guardar método', exact: true })
      .click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Método guardado' }),
    ).toContainText('No se ha registrado ni verificado ningún cobro');
    await expect(
      page.getByText('Pago: Pendiente de pago', { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Método de pago del pedido')).toHaveValue(
      'BANK_TRANSFER',
    );
    await page.getByLabel('Método de pago del pedido').focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByLabel('Borrador privado de instrucciones'),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Guardar método' }),
    ).toBeFocused();
    const customer = await page.context().newPage();
    await customer.setViewportSize({ width: 390, height: 844 });
    await customer.goto('/order/confirmation/' + 'r'.repeat(43));
    await expect(
      customer
        .getByRole('main')
        .getByText('Transferencia bancaria', { exact: true }),
    ).toBeVisible();
    await expect(
      customer
        .getByRole('main')
        .getByText('Pendiente de pago', { exact: true }),
    ).toBeVisible();
    await expect(customer.locator('body')).not.toContainText(
      'BORRADOR PRIVADO',
    );
    expect(
      await customer.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await customer.screenshot({
      path: test.info().outputPath('ticket13-cliente-movil.png'),
      fullPage: true,
    });
    await customer.close();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const label of [
      'Método de pago del pedido',
      'Envío en quetzales (Q)',
    ]) {
      const bounds = await page.getByLabel(label).boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      (await page.getByRole('button', { name: 'Guardar método' }).boundingBox())
        ?.height,
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath('ticket13-dueno-movil.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 320, height: 640 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  await test.step('owner manages a nonstacking promotion and the storefront shows both prices', async () => {
    await page.getByRole('link', { name: 'Promociones', exact: true }).click();
    const form = page.getByRole('form', { name: 'Nueva promoción' });
    await form.getByLabel('Nombre de la promoción').fill('Oferta de prueba');
    await form.getByLabel('Descuento (%)').fill('70');
    await form
      .getByLabel('Inicio (hora de Guatemala)')
      .fill('2026-01-01T00:00');
    await form.getByLabel('Fin (hora de Guatemala)').fill('2099-01-01T00:00');
    await form.getByLabel('Alcance').selectOption('CATALOG');
    await form.getByRole('button', { name: 'Guardar promoción' }).click();
    await expect(form.getByRole('status')).toContainText('Promoción guardada');
    try {
      await page.goto('/menu/');
      const card = page
        .getByTestId('product-card')
        .filter({
          has: page.getByRole('heading', { name: 'Originales', exact: true }),
        })
        .first();
      await expect(card.getByText('Oferta de prueba · 70%')).toBeVisible();
      await expect(card.locator('del')).toHaveText('Q60');
      await expect(card.getByText('Q18', { exact: true })).toBeVisible();
    } finally {
      await page.goto('/admin/promotions');
      const edit = page.getByRole('form', { name: 'Editar Oferta de prueba' });
      await edit.getByLabel('Promoción habilitada').uncheck();
      await edit.getByRole('button', { name: 'Guardar promoción' }).click();
      await expect(edit.getByRole('status')).toContainText(
        'Promoción guardada',
      );
    }
    await page.goto(`/admin/orders/${publicId}`);
  });

  await test.step('paid pricing stays immutable after catalog changes', async () => {
    // Synthetic persisted payment status: no provider call or payment is made.
    const pool = new Pool({
      connectionString: requireTestDatabaseUrl(
        process.env.DATABASE_URL_TEST,
        'paid pricing browser fixture',
      ),
    });
    const originalPrices = await pool.query<{
      id: string;
      price_minor: number;
    }>(
      'SELECT products.id, products.price_minor FROM products WHERE id IN (SELECT source_product_id FROM order_items JOIN orders ON orders.id = order_items.order_id WHERE orders.public_id = $1)',
      [publicId],
    );
    try {
      await pool.query(
        "UPDATE orders SET payment_status = 'PAID' WHERE public_id = $1",
        [publicId],
      );
      await pool.query(
        'UPDATE products SET price_minor = 50000 WHERE id IN (SELECT source_product_id FROM order_items JOIN orders ON orders.id = order_items.order_id WHERE orders.public_id = $1)',
        [publicId],
      );
      await page.reload();
      await expect(
        page.getByRole('button', { name: 'Guardar cotización' }),
      ).toHaveCount(0);
      await expect(
        page.getByText('Subtotal: Q180.00', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('Total: Q185.00', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('3 × Pretzel histórico (Snapshot) — Q180.00'),
      ).toBeVisible();
    } finally {
      for (const row of originalPrices.rows) {
        await pool.query('UPDATE products SET price_minor = $1 WHERE id = $2', [
          row.price_minor,
          row.id,
        ]);
      }
      await pool.end();
    }
  });
});
