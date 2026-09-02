import { expect, test } from '@playwright/test';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';

import { adminShellAuthFixture } from '../support/admin-auth-fixture';

test.describe.configure({ mode: 'serial' });

test('anonymous visitors are redirected to the private admin login', async ({
  page,
}) => {
  const response = await page.goto('/admin');

  await expect(
    page.getByRole('heading', { name: 'Acceso administrativo' }),
  ).toBeVisible();
  expect(response?.url()).toContain('/admin/login');
  expect(response?.headers()['cache-control']).toMatch(/no-store|no-cache/);
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  expect(response?.headers()['content-security-policy']).toMatch(
    /'nonce-[^']+' /,
  );
  await expect(page.getByRole('link', { name: 'Menú' })).toHaveCount(0);
});

test('verified admins receive the operational shell without storefront chrome', async ({
  page,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(adminShellAuthFixture.email);
  await page.getByLabel('Contraseña').fill(adminShellAuthFixture.setupPassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Cambia tu contraseña' }),
  ).toBeVisible();
  await page
    .getByLabel('Contraseña actual')
    .fill(adminShellAuthFixture.setupPassword);
  await page
    .getByLabel('Nueva contraseña')
    .fill(adminShellAuthFixture.password);
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();
  await page
    .getByLabel('Contraseña actual')
    .fill(adminShellAuthFixture.password);
  const enableResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/auth/two-factor/enable'),
  );
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  const enableResponse = await enableResponsePromise;
  expect(enableResponse.status()).toBe(200);
  const totpUri = await page.locator('output').textContent();
  expect(totpUri).toBeTruthy();
  const encodedSecret = new URL(totpUri!).searchParams.get('secret');
  expect(encodedSecret).toBeTruthy();
  const secret = new TextDecoder().decode(base32.decode(encodedSecret!));
  await page
    .getByLabel('Código de verificación')
    .fill(await createOTP(secret).totp());
  await page
    .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
    .check();
  await page.getByRole('button', { name: 'Verificar código' }).click();

  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Administración' });
  await expect(
    navigation.getByRole('link', { name: 'Dashboard' }),
  ).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Pedidos' })).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Productos' }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Categorías' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Menú' })).toHaveCount(0);
});

test('the storefront keeps its public layout and URL', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('banner').getByRole('link', { name: 'Menú', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Pretzels, bagels y panes por encargo' }),
  ).toBeAttached();
  expect(new URL(page.url()).pathname).toBe('/');
});
