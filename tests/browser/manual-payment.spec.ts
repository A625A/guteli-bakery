import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { expect, test, type Page } from '@playwright/test';
import { manualPaymentAuthFixture as owner } from '../support/admin-auth-fixture';

test('checkout offers compatible payment methods and requires a new cash choice after fulfillment changes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'guteli-cart-v2',
      JSON.stringify([
        { productId: '00000000-0000-4000-8000-000000000001', quantity: 1 },
      ]),
    );
  });
  await page.goto('/cart/');
  const pickupCash = page.getByLabel('Efectivo al recoger', { exact: true });
  const deliveryCash = page.getByLabel('Efectivo contra entrega', {
    exact: true,
  });
  const transfer = page.getByLabel('Transferencia bancaria', { exact: true });
  await expect(pickupCash).toBeVisible();
  await expect(deliveryCash).toHaveCount(0);
  await pickupCash.check();
  await page.getByLabel('Envío', { exact: true }).check();
  await expect(pickupCash).toHaveCount(0);
  await expect(deliveryCash).toBeVisible();
  await expect(deliveryCash).not.toBeChecked();
  await expect(transfer).not.toBeChecked();
  await page
    .getByRole('button', { name: 'Enviar pedido', exact: true })
    .click();
  await expect(page.locator('#payment-method-error')).toBeVisible();
  await deliveryCash.check();
  await page.getByLabel('Recogida', { exact: true }).check();
  await expect(deliveryCash).toHaveCount(0);
  await expect(pickupCash).not.toBeChecked();
  await transfer.check();
  await page.getByLabel('Envío', { exact: true }).check();
  await expect(transfer).toBeChecked();
  await page.getByLabel('Recogida', { exact: true }).check();
  await expect(transfer).toBeChecked();
});

async function enrollOwner(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(owner.email);
  await page.getByLabel('Contraseña').fill(owner.setupPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cambia tu contraseña' }),
  ).toBeVisible();
  await page.getByLabel('Contraseña actual').fill(owner.setupPassword);
  await page.getByLabel('Nueva contraseña').fill(owner.password);
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();
  await page.getByLabel('Contraseña actual').fill(owner.password);
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  await expect(page.locator('output')).not.toBeEmpty();
  const uri = new URL((await page.locator('output').textContent())!);
  const secret = new TextDecoder().decode(
    base32.decode(uri.searchParams.get('secret')!),
  );
  await page
    .getByLabel('Código de verificación')
    .fill(await createOTP(secret).totp());
  await page
    .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
    .check();
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Administración' }),
  ).toBeVisible();
}

test('owner verifies real funds after customer acceptance and records a completed refund after cancellation', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const customer = await context.newPage();
  await customer.setViewportSize({ width: 390, height: 844 });
  await customer.addInitScript(() => {
    localStorage.setItem(
      'guteli-cart-v2',
      JSON.stringify([
        { productId: '00000000-0000-4000-8000-000000000001', quantity: 2 },
      ]),
    );
  });
  await customer.goto('/cart/');
  await customer
    .getByLabel('Nombre completo')
    .fill('Cliente de prueba de cobro');
  await customer.getByLabel('Teléfono').fill('55552345');
  await customer.getByLabel('Transferencia bancaria', { exact: true }).check();
  const date = customer.getByLabel('Fecha solicitada');
  await date.fill((await date.getAttribute('min'))!);
  await customer
    .getByRole('button', { name: 'Enviar pedido', exact: true })
    .click();
  await expect(customer).toHaveURL(/\/order\/confirmation\//);
  const publicId = (await customer
    .locator('.order-confirmation__public-id')
    .textContent())!.trim();
  const accept = customer.getByRole('button', {
    name: /^Acepto el total de Q120/,
  });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(
    customer.getByRole('status').filter({ hasText: 'Total aceptado: Q120' }),
  ).toBeVisible();

  await enrollOwner(page);
  await page.goto(`/admin/orders/${publicId}`);
  await expect(
    page.getByRole('heading', { name: `Pedido ${publicId}` }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Marcar pago como recibido',
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByLabel('Nuevo estado').selectOption('CONFIRMED');
  await page.getByRole('button', { name: 'Actualizar estado' }).click();
  const verification = page.getByRole('region', {
    name: 'Marcar pago como recibido',
    exact: true,
  });
  await expect(verification).toBeVisible();
  const record = verification.getByRole('button', {
    name: 'Marcar pago como recibido',
    exact: true,
  });
  await expect(record).toBeDisabled();
  await verification.getByLabel('Importe recibido en Q').fill('119.99');
  await verification
    .getByLabel('Confirmo que verifiqué los fondos recibidos en el banco.')
    .check();
  await record.click();
  await expect(verification.getByRole('status')).toHaveText(
    'El importe debe coincidir exactamente con el total aceptado.',
  );
  await verification.getByLabel('Importe recibido en Q').fill('120');
  const verified = page.waitForResponse(
    (response) =>
      response.url().includes('/payment-verification') &&
      response.request().method() === 'POST',
  );
  await record.click();
  expect((await verified).status()).toBe(200);
  await expect(
    page.getByText('Pago: Pago recibido y verificado por el dueño', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Historial de cobros y devoluciones' }),
  ).toContainText('GTQ');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Nuevo estado').selectOption('CANCELLED');
  await page.getByRole('button', { name: 'Actualizar estado' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Coordina la devolución' }),
  ).toBeVisible();
  const refund = page.getByRole('region', {
    name: 'Registrar devolución realizada',
    exact: true,
  });
  await refund.getByLabel('Importe devuelto en Q').fill('120');
  await refund
    .getByLabel('Confirmo que devolví el importe completo al cliente.')
    .check();
  const refunded = page.waitForResponse(
    (response) =>
      response.url().includes('/payment-verification') &&
      response.request().method() === 'POST',
  );
  await refund
    .getByRole('button', { name: 'Registrar reembolso realizado' })
    .click();
  expect((await refunded).status()).toBe(200);
  await expect(
    page.getByText('Pago: Reembolso realizado y registrado por el dueño', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Coordina la devolución' }),
  ).toHaveCount(0);
  expect(
    await customer.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await customer.reload();
  await expect(
    customer
      .getByRole('main')
      .getByText('Reembolso realizado y registrado por el dueño', {
        exact: true,
      }),
  ).toBeVisible();
  await customer.close();
});
