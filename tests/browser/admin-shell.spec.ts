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

  await page.goto('/admin/not-a-real-page');
  expect(new URL(page.url()).pathname).toBe('/admin/login');
  await expect(
    page.getByRole('heading', { name: 'Acceso administrativo' }),
  ).toBeVisible();
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
  await expect(
    page.getByRole('heading', { name: 'Estado de la tienda', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Pendiente del Ticket 11.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(/Última consulta correcta:/)).toBeVisible();
  const firstConfirmed = await page
    .getByRole('region', { name: 'Actualización del panel' })
    .locator('time')
    .getAttribute('datetime');
  await page.getByRole('button', { name: 'Actualizar panel' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Actualización del panel' })
      .locator('time'),
  ).not.toHaveAttribute('datetime', firstConfirmed!);
  await expect(
    page.getByRole('button', { name: 'Actualizar panel' }),
  ).toBeEnabled();
  const navigation = page.getByRole('navigation', { name: 'Administración' });
  await expect(navigation.getByRole('link', { name: 'Resumen' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Pedidos' })).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Productos' }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Categorías' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Menú' })).toHaveCount(0);

  const refreshPanel = page.getByRole('region', {
    name: 'Actualización del panel',
  });
  const lastConfirmed = await refreshPanel
    .locator('time')
    .getAttribute('datetime');
  const refreshRequest = (url: URL) =>
    /^\/admin\/?$/.test(url.pathname) && url.searchParams.has('_rsc');
  let blockedRefreshes = 0;
  let releaseRefresh!: () => void;
  const delayedRefresh = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await page.route(refreshRequest, async (route) => {
    blockedRefreshes += 1;
    await delayedRefresh;
    return route.continue();
  });
  await refreshPanel.getByRole('button', { name: 'Actualizar panel' }).click();
  await expect.poll(() => blockedRefreshes).toBeGreaterThan(0);
  await expect(refreshPanel.getByRole('status')).toContainText(
    'No se ha confirmado',
    { timeout: 15000 },
  );
  await expect(refreshPanel.locator('time')).toHaveAttribute(
    'datetime',
    lastConfirmed!,
  );
  releaseRefresh();
  await expect(refreshPanel.locator('time')).not.toHaveAttribute(
    'datetime',
    lastConfirmed!,
  );
  await page.unroute(refreshRequest);
  // A failed RSC request falls back to a full navigation in this Next version.
  // That fallback can legitimately confirm a fresh server result.
  const beforeFallback = await refreshPanel
    .locator('time')
    .getAttribute('datetime');
  await page.route(refreshRequest, (route) => route.abort('failed'));
  await refreshPanel.getByRole('button', { name: 'Actualizar panel' }).click();
  await expect(refreshPanel.locator('time')).not.toHaveAttribute(
    'datetime',
    beforeFallback!,
  );
  await page.unroute(refreshRequest);

  const ordersResponse = await page.goto('/admin/orders');
  expect(ordersResponse?.headers()['cache-control']).toBe(
    'no-cache, must-revalidate',
  );
  expect(ordersResponse?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(ordersResponse?.headers()['referrer-policy']).toBe('no-referrer');
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Administración' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Menú' })).toHaveCount(0);
  await expect(
    page.getByRole('heading', {
      name: 'Pretzels, bagels y panes por encargo',
    }),
  ).toHaveCount(0);

  const unknownResponse = await page.goto('/admin/not-a-real-page');
  expect(unknownResponse?.headers()['cache-control']).toMatch(
    /no-store|no-cache/,
  );
  expect(unknownResponse?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(unknownResponse?.headers()['referrer-policy']).toBe('no-referrer');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Página administrativa no encontrada',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Administración' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Menú' })).toHaveCount(0);
  await expect(
    page.getByRole('heading', {
      name: 'Pretzels, bagels y panes por encargo',
    }),
  ).toHaveCount(0);
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
