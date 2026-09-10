import { randomUUID } from 'node:crypto';

import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { adminAuthFixture } from '../support/admin-auth-fixture';
import { requireTestDatabaseUrl } from '../../src/test/database-url';

test.describe.configure({ mode: 'serial' });

async function seedOverflowCategories() {
  const pool = new Pool({
    connectionString: requireTestDatabaseUrl(
      process.env.DATABASE_URL_TEST,
      'admin catalog browser tests',
    ),
  });
  const target = {
    id: randomUUID(),
    name: 'Categoría paginada objetivo 104',
    slug: 'categoria-paginada-objetivo-104',
  };
  try {
    for (let index = 0; index < 105; index += 1) {
      const isTarget = index === 104;
      await pool.query(
        `INSERT INTO categories (id, name, slug, active, sort_order, version)
         VALUES ($1, $2, $3, true, $4, 1)`,
        [
          isTarget ? target.id : randomUUID(),
          isTarget
            ? target.name
            : `Categoría paginada ${index.toString().padStart(3, '0')}`,
          isTarget
            ? target.slug
            : `categoria-paginada-${index.toString().padStart(3, '0')}`,
          10_000 + index,
        ],
      );
    }
    return target;
  } finally {
    await pool.end();
  }
}

test('an owner creates, edits, reorders, and deactivates a product with immediate public visibility', async ({
  page,
}) => {
  test.setTimeout(120_000);
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
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Especiales navegador' });
  await page
    .getByLabel('Descripción')
    .fill('Producto creado desde administración.');
  await page.getByLabel('Unidad de venta').fill('unidad');
  await page.getByLabel('Precio en centavos').fill('2500');
  await page.getByLabel('Existencia').fill('10');
  await page.getByLabel('Orden del producto').fill('20');
  const firstCreateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/admin/products'),
  );
  await page.getByRole('button', { name: 'Crear producto' }).click();
  const firstCreated = (await (await firstCreateResponse).json()) as {
    product: { id: string };
  };
  await expect(page.getByRole('status')).toHaveText('Producto creado.');
  await expect(
    page.getByRole('row', { name: /Primero navegador/ }),
  ).toBeVisible();

  await page.getByLabel('Nombre del producto').fill('Segundo navegador');
  await page.getByLabel('Slug del producto').fill('segundo-navegador');
  await page
    .getByLabel('Categoría', { exact: true })
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

  await page.goto('/admin/categories');
  await expect(
    page.getByRole('heading', { name: 'Categorías', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Desactivar Especiales navegador' })
    .click();
  await expect(page.getByText('Categoría desactivada.')).toBeVisible();

  await page.goto(`/admin/products/${firstCreated.product.id}`);
  await expect(
    page.getByRole('heading', { name: 'Editar Primero navegador editado' }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Categoría', { exact: true }).locator('option:checked'),
  ).toHaveText('Especiales navegador (inactiva)');
  await expect(
    page.getByLabel('Categoría', { exact: true }).locator('option:checked'),
  ).toBeEnabled();
  await expect(page.getByText('Este producto está disponible')).toBeVisible();
  const deactivateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().endsWith(`/api/admin/products/${firstCreated.product.id}`),
  );
  await page.getByRole('button', { name: 'Desactivar producto' }).click();
  expect((await deactivateResponse).status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText('Producto desactivado.');
  await page
    .getByLabel('Nombre del producto')
    .fill('Primero navegador editado inactivo');
  const inactiveEditResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().endsWith(`/api/admin/products/${firstCreated.product.id}`),
  );
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  expect((await inactiveEditResponse).status()).toBe(200);
  await expect(page.getByRole('status')).toHaveText('Producto actualizado.');

  await page.goto('/menu');
  await expect(
    page.getByRole('heading', { name: 'Primero navegador editado inactivo' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Segundo navegador' }),
  ).toHaveCount(0);

  const overflowCategory = await seedOverflowCategories();
  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible();
  await page.getByLabel('Buscar categoría').fill(overflowCategory.name);
  const categorySearchResponse = page.waitForResponse((response) =>
    response.url().includes('/api/admin/categories?'),
  );
  await page.getByRole('button', { name: 'Buscar categorías' }).click();
  expect((await categorySearchResponse).status()).toBe(200);
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: overflowCategory.name });
  await page.getByLabel('Nombre del producto').fill('Producto categoría 105');
  await page.getByLabel('Slug del producto').fill('producto-categoria-105');
  await page.getByLabel('Descripción').fill('Seleccionado mediante búsqueda.');
  await page.getByLabel('Precio en centavos').fill('4200');
  await page.getByLabel('Orden del producto').fill('1');
  const overflowCreateResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/admin/products'),
  );
  await page.getByRole('button', { name: 'Crear producto' }).click();
  const overflowCreatedResponse = await overflowCreateResponse;
  expect(overflowCreatedResponse.status()).toBe(201);
  const overflowCreated = (await overflowCreatedResponse.json()) as {
    product: { id: string; categoryId: string };
  };
  expect(overflowCreated.product.categoryId).toBe(overflowCategory.id);
  await expect(page.getByRole('status')).toHaveText('Producto creado.');

  await page.goto(`/admin/products/${overflowCreated.product.id}`);
  await expect(
    page.getByRole('heading', { name: 'Editar Producto categoría 105' }),
  ).toBeVisible();
  await expect(page.getByLabel('Categoría', { exact: true })).toHaveValue(
    overflowCategory.id,
  );
  await page.getByLabel('Precio en centavos').fill('4300');
  const overflowEditResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response
        .url()
        .endsWith(`/api/admin/products/${overflowCreated.product.id}`),
  );
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  const overflowUpdatedResponse = await overflowEditResponse;
  expect(overflowUpdatedResponse.status()).toBe(200);
  const overflowUpdated = (await overflowUpdatedResponse.json()) as {
    product: { categoryId: string; priceMinor: number };
  };
  expect(overflowUpdated.product).toMatchObject({
    categoryId: overflowCategory.id,
    priceMinor: 4300,
  });
  await expect(page.getByLabel('Categoría', { exact: true })).toHaveValue(
    overflowCategory.id,
  );
});
