import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { expect, test } from '@playwright/test';

import { adminAuthFixture } from '../support/admin-auth-fixture';

test.describe.configure({ mode: 'serial' });

test('an owner creates, edits, reorders, and deactivates a product with immediate public visibility', async ({
  page,
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
  const verifyResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/two-factor/verify-totp'),
  );
  await page.getByRole('button', { name: 'Verificar código' }).click();
  expect((await verifyResponse).status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Categorías' })
    .click();
  await page.getByLabel('Nombre de categoría').fill('Especiales navegador');
  await page.getByLabel('Slug de categoría').fill('especiales-navegador');
  await page.getByLabel('Orden de categoría').fill('50');
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  await expect(page.getByRole('status')).toHaveText('Categoría creada.');

  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Productos' })
    .click();
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await page.getByLabel('Nombre del producto').fill('Primero navegador');
  await page.getByLabel('Slug del producto').fill('primero-navegador');
  await page
    .getByLabel('Categoría')
    .selectOption({ label: 'Especiales navegador' });
  await page
    .getByLabel('Descripción')
    .fill('Producto creado desde administración.');
  await page.getByLabel('Unidad de venta').fill('unidad');
  await page.getByLabel('Precio en centavos').fill('2500');
  await page.getByLabel('Existencia').fill('10');
  await page.getByLabel('Orden del producto').fill('20');
  await page.getByRole('button', { name: 'Crear producto' }).click();
  await expect(page.getByRole('status')).toHaveText('Producto creado.');
  await expect(
    page.getByRole('row', { name: /Primero navegador/ }),
  ).toBeVisible();

  await page.getByLabel('Nombre del producto').fill('Segundo navegador');
  await page.getByLabel('Slug del producto').fill('segundo-navegador');
  await page
    .getByLabel('Categoría')
    .selectOption({ label: 'Especiales navegador' });
  await page
    .getByLabel('Descripción')
    .fill('Segundo producto para comprobar el orden.');
  await page.getByLabel('Unidad de venta').fill('unidad');
  await page.getByLabel('Precio en centavos').fill('3000');
  await page.getByLabel('Existencia').fill('10');
  await page.getByLabel('Orden del producto').fill('10');
  await page.getByRole('button', { name: 'Crear producto' }).click();
  await expect(page.getByRole('status')).toHaveText('Producto creado.');
  await expect(
    page.getByRole('row', { name: /Segundo navegador/ }),
  ).toBeVisible();

  await page.goto('/menu');
  await expect(
    page.getByRole('heading', { name: 'Primero navegador' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Segundo navegador' }),
  ).toBeVisible();
  const initialNames = await page.locator('.product-card h3').allTextContents();
  expect(initialNames.indexOf('Segundo navegador')).toBeLessThan(
    initialNames.indexOf('Primero navegador'),
  );

  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  const firstRow = page.getByRole('row', { name: /Primero navegador/ });
  await firstRow
    .getByRole('link', { name: 'Editar Primero navegador' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Editar Primero navegador' }),
  ).toBeVisible();
  await page
    .getByLabel('Nombre del producto')
    .fill('Primero navegador editado');
  await page.getByLabel('Precio en centavos').fill('2750');
  await page.getByLabel('Orden del producto').fill('0');
  const editResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      /\/api\/admin\/products\/[0-9a-f-]+$/.test(response.url()),
  );
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  expect((await editResponse).status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText('Producto actualizado.');

  await page.goto('/menu');
  await expect(
    page.getByRole('heading', { name: 'Primero navegador editado' }),
  ).toBeVisible();
  await expect(
    page.locator('.product-card').filter({
      has: page.getByRole('heading', { name: 'Primero navegador editado' }),
    }),
  ).toContainText('Q27.50');
  const reorderedNames = await page
    .locator('.product-card h3')
    .allTextContents();
  expect(reorderedNames.indexOf('Primero navegador editado')).toBeLessThan(
    reorderedNames.indexOf('Segundo navegador'),
  );

  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await page
    .getByRole('row', { name: /Primero navegador editado/ })
    .getByRole('link', { name: 'Editar Primero navegador editado' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Editar Primero navegador editado' }),
  ).toBeVisible();
  await expect(page.getByText('Este producto está disponible')).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar producto' }).click();
  await expect(page.getByRole('status')).toHaveText('Producto desactivado.');

  await page.goto('/menu');
  await expect(
    page.getByRole('heading', { name: 'Primero navegador editado' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Segundo navegador' }),
  ).toBeVisible();
});
