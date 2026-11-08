import { expect, test } from '@playwright/test';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';
import sharp from 'sharp';
import {
  adminCatalogAuthFixture,
  adminShellAuthFixture,
} from '../support/admin-auth-fixture';

for (const width of [1440, 390]) {
  test(`photograph lifecycle at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    const fixture =
      width === 1440 ? adminCatalogAuthFixture : adminShellAuthFixture;
    await page.goto('/admin/login');
    await page.getByLabel('Correo electrónico').fill(fixture.email);
    await page.getByLabel('Contraseña').fill(fixture.setupPassword);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByLabel('Contraseña actual').fill(fixture.setupPassword);
    await page.getByLabel('Nueva contraseña').fill(fixture.password);
    const passwordChangeResponse = page.waitForResponse((response) =>
      response.url().includes('/api/auth/change-password'),
    );
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
    expect((await passwordChangeResponse).status()).toBe(200);
    await expect(
      page.getByRole('heading', { name: 'Configura tu autenticador' }),
    ).toBeVisible();
    await page.getByLabel('Contraseña actual').fill(fixture.password);
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

    await page.goto('/admin/products');
    await page
      .getByRole('button', { name: 'Agregar producto', exact: true })
      .click();
    await page.getByLabel('Nombre del producto').fill(`Foto prueba ${width}`);
    await page.getByLabel('Precio en quetzales (Q)').fill('12.50');
    const file = {
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: await sharp({
        create: { width: 40, height: 30, channels: 3, background: '#d98b51' },
      })
        .png()
        .toBuffer(),
    };
    await expect(
      page.getByRole('button', { name: 'Agregar fotografía', exact: true }),
    ).toBeVisible();
    const chooserPromise = page.waitForEvent('filechooser');
    await page
      .getByRole('button', { name: 'Agregar fotografía', exact: true })
      .click();
    await (await chooserPromise).setFiles(file);
    const preview = page.getByAltText(
      'Vista previa de la fotografía seleccionada',
    );
    await expect(preview).toBeVisible();
    await page
      .getByRole('button', { name: 'Quitar fotografía seleccionada' })
      .click();
    await expect(preview).toHaveCount(0);
    await page.getByLabel('Imagen del producto').setInputFiles(file);
    // The first upload fails after product creation; retry must update the same product.
    await page.route('**/api/admin/uploads', (route) =>
      route.fulfill({
        status: 503,
        json: { error: { message: 'Falla de prueba.' } },
      }),
    );
    const createdResponse = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().endsWith('/api/admin/products'),
    );
    await page
      .getByRole('button', { name: 'Crear producto', exact: true })
      .click();
    const { product } = await (await createdResponse).json();
    await expect(page.getByRole('status')).toContainText(
      'Los datos del producto se guardaron',
    );
    await expect(preview).toBeVisible();
    await page.unroute('**/api/admin/uploads');
    await page
      .getByRole('button', { name: 'Guardar producto', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText('Producto actualizado.');
    await page.getByRole('button', { name: 'Cerrar editor' }).click();
    await page.goto(`/admin/products/${product.id}`);
    const current = page.getByAltText(
      `Fotografía actual de Foto prueba ${width}`,
    );
    await expect(current).toBeVisible();
    const firstSrc = await current.getAttribute('src');
    expect((await page.request.get(firstSrc!)).status()).toBe(200);
    const publicProduct = async () =>
      await (await page.request.get(`/api/products/${product.slug}`)).json();
    expect(JSON.stringify(await publicProduct())).toContain(
      firstSrc!.replace('/api/admin/media/', '/api/media/'),
    );
    await page.getByLabel('Imagen del producto').setInputFiles({
      name: 'bad.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
    await expect(page.getByRole('status')).toContainText('Usá una imagen JPEG');
    await expect(preview).toHaveCount(0);
    await page.getByLabel('Imagen del producto').setInputFiles(file);
    await page.route('**/api/admin/uploads', (route) =>
      route.fulfill({
        status: 503,
        json: { error: { message: 'Falla de prueba.' } },
      }),
    );
    await page
      .getByRole('button', { name: 'Guardar producto', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText(
      'no el cambio de fotografía',
    );
    await expect(current).toHaveAttribute('src', firstSrc!);
    expect((await page.request.get(firstSrc!)).status()).toBe(200);
    await page.unroute('**/api/admin/uploads');
    // A product validation failure must not upload or remove the old image.
    await page.route(`**/api/admin/products/${product.id}`, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({
            status: 409,
            json: { error: { message: 'Producto modificado en otra sesión.' } },
          })
        : route.continue(),
    );
    await page
      .getByRole('button', { name: 'Guardar producto', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText(
      'Producto modificado en otra sesión.',
    );
    await expect(preview).toBeVisible();
    expect((await page.request.get(firstSrc!)).status()).toBe(200);
    await page.unroute(`**/api/admin/products/${product.id}`);
    await page
      .getByRole('button', { name: 'Guardar producto', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText('Producto actualizado.');
    await page.reload();
    await expect(current).not.toHaveAttribute('src', firstSrc!);
    const secondSrc = await current.getAttribute('src');
    expect(JSON.stringify(await publicProduct())).toContain(
      secondSrc!.replace('/api/admin/media/', '/api/media/'),
    );
    const catalog = await page.context().newPage();
    await catalog.goto('/menu');
    const card = catalog
      .locator('.product-card')
      .filter({
        has: catalog.getByRole('heading', {
          name: `Foto prueba ${width}`,
          exact: true,
        }),
      });
    const catalogImage = card.locator('img');
    await expect(catalogImage).toBeVisible();
    await expect
      .poll(() =>
        catalogImage.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await catalog.close();
    await page
      .getByRole('button', { name: 'Quitar fotografía actual' })
      .click();
    await expect(
      page.getByText('Esta fotografía se quitará al guardar.', {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Conservar fotografía' }).click();
    await page
      .getByRole('button', { name: 'Quitar fotografía actual' })
      .click();
    await page.route(`**/api/admin/products/${product.id}`, (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({
            status: 503,
            json: { error: { message: 'Falla de prueba.' } },
          })
        : route.continue(),
    );
    await page
      .getByRole('button', { name: 'Guardar producto', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText(
      'no el cambio de fotografía',
    );
    expect((await page.request.get(secondSrc!)).status()).toBe(200);
    await page.unroute(`**/api/admin/products/${product.id}`);
    await page.screenshot({
      path: `artifacts/oracle-preparation/ticket-05/photo-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Guardar producto', exact: true })
      .click();
    await expect(page.getByRole('status')).toHaveText('Producto actualizado.');
    await page.reload();
    await expect(current).toHaveCount(0);
    expect(JSON.stringify(await publicProduct())).not.toContain(
      secondSrc!.replace('/api/admin/media/', '/api/media/'),
    );
    // Ordinary creation saves the photograph together with the product form.
    await page.goto('/admin/products');
    await page
      .getByRole('button', { name: 'Agregar producto', exact: true })
      .click();
    await page.getByLabel('Nombre del producto').fill(`Foto directa ${width}`);
    await page.getByLabel('Precio en quetzales (Q)').fill('10');
    await page.getByLabel('Imagen del producto').setInputFiles(file);
    await expect(preview).toBeVisible();
    await page.screenshot({
      path: `artifacts/oracle-preparation/ticket-05/preview-${width}.png`,
    });
    const directResponse = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().endsWith('/api/admin/products'),
    );
    await page
      .getByRole('button', { name: 'Crear producto', exact: true })
      .click();
    const direct = (await (await directResponse).json()).product;
    await expect(page.getByRole('status')).toHaveText('Producto creado.');
    await page.getByRole('button', { name: 'Cerrar editor' }).click();
    await page.goto(`/admin/products/${direct.id}`);
    await page.reload();
    await expect(
      page.getByAltText(`Fotografía actual de Foto directa ${width}`),
    ).toBeVisible();
    for (const path of [
      '/api/orders',
      '/api/checkout-session',
      '/api/checkout-review',
      '/api/checkout-summary',
    ]) {
      const blocked = await page.request.post(path, { data: {} });
      expect(blocked.status()).toBe(403);
      expect((await blocked.json()).error.code).toBe('COMMERCIAL_DEMO');
    }
  });
}
