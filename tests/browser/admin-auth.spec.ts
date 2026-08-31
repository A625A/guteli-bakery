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

test('the enrollment UI protects recovery codes until enrollment begins', async ({
  page,
}) => {
  await page.goto('/admin/enroll-mfa');

  await expect(
    page.getByRole('heading', { name: 'Configura tu autenticador' }),
  ).toBeVisible();
  await expect(page.getByLabel('Contraseña actual')).toBeVisible();
  await expect(page.getByText('Códigos de recuperación')).toHaveCount(0);
});
