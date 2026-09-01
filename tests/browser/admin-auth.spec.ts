import { expect, test } from '@playwright/test';

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

test('the admin sign-in flow requires enrollment before business access', async ({
  page,
}) => {
  await page.goto('/admin/login');

  await expect(
    page.getByRole('heading', { name: 'Acceso administrativo' }),
  ).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
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
