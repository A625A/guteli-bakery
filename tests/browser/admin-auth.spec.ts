import { expect, test } from '@playwright/test';
import { base32 } from '@better-auth/utils/base32';
import { createOTP } from '@better-auth/utils/otp';

import { adminAuthFixture } from '../support/admin-auth-fixture';

test.describe.configure({ mode: 'serial' });

test('the protected Spanish admin login does not reveal whether an account exists', async ({
  page,
}) => {
  await page.goto('/admin/login');

  await page.getByLabel('Correo electrónico').fill('missing@example.test');
  await page.getByLabel('Contraseña').fill('incorrect-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(
    page.getByText('Correo o contraseña incorrectos.', { exact: true }),
  ).toBeVisible();
});

test('the real admin lifecycle requires password change, TOTP, and explicit logout', async ({
  page,
}) => {
  test.setTimeout(60_000);
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
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();

  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();
  await page.getByLabel('Contraseña actual').fill(adminAuthFixture.password);
  await page.getByRole('button', { name: 'Configurar autenticador' }).click();
  const totpUri = await page.locator('output').textContent();
  expect(totpUri).toBeTruthy();
  expect(page.url()).not.toContain('secret=');
  const encodedSecret = new URL(totpUri!).searchParams.get('secret');
  expect(encodedSecret).toBeTruthy();
  const secret = new TextDecoder().decode(base32.decode(encodedSecret!));
  const validCode = await createOTP(secret).totp();
  const invalidCode = `${validCode.slice(0, -1)}${(Number(validCode.at(-1)) + 1) % 10}`;

  await page.getByLabel('Código de verificación').fill(invalidCode);
  await page
    .getByLabel('Guardé los códigos de recuperación en un lugar seguro.')
    .check();
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(
    page.getByText('El código de verificación no es válido.', { exact: true }),
  ).toBeVisible();

  await page.getByLabel('Código de verificación').fill(validCode);
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Cerrar esta sesión' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Cerrar todas las sesiones' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar esta sesión' }).click();
  await expect(
    page.getByRole('heading', { name: 'Acceso administrativo' }),
  ).toBeVisible();

  await page.getByLabel('Correo electrónico').fill(adminAuthFixture.email);
  await page.getByLabel('Contraseña').fill(adminAuthFixture.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Verifica tu autenticador' }),
  ).toBeVisible();
  await expect
    .poll(() => createOTP(secret).totp(), { timeout: 31_000 })
    .not.toBe(validCode);
  await page
    .getByLabel('Código de verificación')
    .fill(await createOTP(secret).totp());
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(
    page.getByRole('heading', { name: 'Panel administrativo' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar todas las sesiones' }).click();
  await expect(
    page.getByRole('heading', { name: 'Acceso administrativo' }),
  ).toBeVisible();
});

test('unauthenticated users cannot open MFA enrollment', async ({ page }) => {
  await page.goto('/admin/enroll-mfa');

  await expect(
    page.getByRole('heading', { name: 'Acceso administrativo' }),
  ).toBeVisible();
  await expect(page.getByLabel('Contraseña actual')).toHaveCount(0);
});

test('the MFA challenge is distinct from TOTP enrollment', async ({ page }) => {
  await page.goto('/admin/verify-mfa');

  await expect(
    page.getByRole('heading', { name: 'Verifica tu autenticador' }),
  ).toBeVisible();
  await expect(page.getByLabel('Código de verificación')).toBeVisible();
  await expect(page.getByLabel('Código de recuperación')).toBeVisible();
  await expect(page.getByLabel('Contraseña actual')).toHaveCount(0);
});
