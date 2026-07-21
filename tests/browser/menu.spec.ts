import { expect, test } from '@playwright/test';

test('homepage presents the factual ordering path and canonical price previews', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Pretzels, bagels y panes por encargo',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Logotipo original de Güteli Bakery' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver el menú' })).toHaveAttribute(
    'href',
    '/menu/',
  );
  await expect(
    page.getByRole('link', { name: 'Preparar mi pedido' }),
  ).toHaveAttribute('href', '/order/');

  const previews = page.getByRole('region', { name: 'Precios del menú' });
  await expect(previews.getByText('Q55', { exact: true })).toBeVisible();
  await expect(previews.getByText('Q60', { exact: true })).toHaveCount(3);
  await expect(
    page
      .getByRole('list', { name: 'Cómo hacer un pedido' })
      .getByRole('listitem'),
  ).toHaveCount(3);
  await expect(
    page.getByText('Haz tu pedido con 2 días de anticipación.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('complementary', { name: 'Antes de pedir' })
      .getByText('El pedido queda sujeto a confirmación por WhatsApp', {
        exact: true,
      }),
  ).toBeVisible();
});

test('shows all confirmed products and adds a selected quantity', async ({
  page,
}) => {
  await page.goto('/menu/');
  await expect(
    page.getByRole('heading', { name: 'Nuestro menú' }),
  ).toBeVisible();
  await expect(page.getByTestId('product-card')).toHaveCount(8);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Pretzels' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Bagels' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Burger buns' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Nuditos' }),
  ).toBeVisible();
  await expect(
    page.getByText('Cantidad por confirmar', { exact: true }),
  ).toHaveCount(4);

  await page.getByLabel('Cantidad de Originales, Pretzels').fill('2');
  await page
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();

  await expect(page.getByRole('status')).toContainText('2 bolsas agregadas');
  await expect(
    page.getByRole('link', { name: 'Carrito, 2 productos' }),
  ).toBeVisible();
});

test('all eight menu variants can be added with a keyboard', async ({
  page,
}) => {
  const addActions = [
    'Agregar Originales de Pretzels',
    'Agregar Queso y jalapeño de Pretzels',
    'Agregar Queso y pepperoni de Pretzels',
    'Agregar Originales de Bagels',
    'Agregar Queso y jalapeño de Bagels',
    'Agregar Queso y pepperoni de Bagels',
    'Agregar Burger buns de Burger buns',
    'Agregar Nuditos de Nuditos',
  ] as const;

  await page.goto('/menu/');

  for (const name of addActions) {
    const button = page.getByRole('button', { name });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
  }

  await expect(
    page.getByRole('link', { name: 'Carrito, 8 productos' }),
  ).toBeVisible();
});

test('menu controls remain usable without horizontal overflow on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/menu/');

  await expect(page.getByTestId('product-card')).toHaveCount(8);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  for (const control of await page
    .getByTestId('product-card')
    .locator('input, button')
    .all()) {
    const box = await control.boundingBox();

    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await page.getByLabel('Cantidad de Nuditos, Nuditos').fill('3');
  await page
    .getByRole('button', { name: 'Agregar Nuditos de Nuditos' })
    .click();
  await expect(page.getByRole('status')).toContainText('3 bolsas agregadas');
  await page.locator('summary', { hasText: 'Abrir menú' }).click();
  await expect(
    page.getByRole('link', { name: 'Carrito, 3 productos' }),
  ).toBeVisible();
});
