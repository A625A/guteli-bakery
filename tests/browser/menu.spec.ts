import { expect, test } from '@playwright/test';

test('keeps add controls unavailable until the persisted cart can hydrate', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/menu/');

  await expect(
    page.getByRole('button', {
      name: 'Agregar a la canasta: Originales de Pretzels',
    }),
  ).toBeDisabled();

  await context.close();
});

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
    page.getByRole('link', { name: 'Güteli Bakery, inicio' }),
  ).toBeVisible();
  await expect(page.locator('img[src*="guteli-brand-reference"]')).toHaveCount(
    0,
  );
  await expect(
    page.getByText('Ilustración editorial de panadería', { exact: true }),
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
  for (const note of [
    'Nuestro sello',
    'Para cualquier momento',
    'Hechos para compartir',
    'Bocados para la mesa',
  ]) {
    await expect(page.getByText(note, { exact: true })).toBeVisible();
  }
  await expect(
    page.getByText('Cantidad por confirmar', { exact: true }),
  ).toHaveCount(4);
  await expect(page.getByText('Bolsa de 5', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Bolsa de 15', { exact: true })).toHaveCount(1);

  const expectedPrices = [
    'Q60',
    'Q75',
    'Q75',
    'Q60',
    'Q75',
    'Q75',
    'Q55',
    'Q60',
  ];

  for (const [index, price] of expectedPrices.entries()) {
    await expect(
      page
        .getByTestId('product-card')
        .nth(index)
        .getByText(price, { exact: true }),
    ).toBeVisible();
  }

  await page.getByLabel('Cantidad de Originales, Pretzels').fill('2');
  await page
    .getByRole('button', {
      name: 'Agregar a la canasta: Originales de Pretzels',
    })
    .click();

  await expect(page.getByRole('status')).toContainText(
    'Listo en tu canasta: 2 bolsas agregadas',
  );
  await expect(
    page.getByRole('link', { name: 'Canasta, 2 productos' }),
  ).toBeVisible();
});

test('re-announces an identical repeated addition and updates the badge', async ({
  page,
}) => {
  await page.goto('/menu/');

  const addButton = page.getByRole('button', {
    name: 'Agregar a la canasta: Originales de Pretzels',
  });
  await addButton.click();
  const firstStatus = await page.getByRole('status').elementHandle();

  await expect(page.getByRole('status')).toContainText(
    'Listo en tu canasta: 1 bolsa agregada',
  );
  await addButton.click();

  expect(await firstStatus?.evaluate((node) => node.isConnected)).toBe(false);
  await expect(page.getByRole('status')).toContainText(
    'Listo en tu canasta: 1 bolsa agregada',
  );
  await expect(
    page.getByRole('link', { name: 'Canasta, 2 productos' }),
  ).toBeVisible();
});

test('reports only the effective addition and disables adding at 99', async ({
  page,
}) => {
  await page.goto('/menu/');

  const quantity = page.getByLabel('Cantidad de Originales, Pretzels');
  const addButton = page.getByRole('button', {
    name: 'Agregar a la canasta: Originales de Pretzels',
  });
  await quantity.fill('98');
  await addButton.click();
  await quantity.fill('2');
  await addButton.click();

  await expect(page.getByRole('status')).toContainText(
    'Listo en tu canasta: 1 bolsa agregada',
  );
  await expect(
    page.getByRole('link', { name: 'Canasta, 99 productos' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Máximo de 99 alcanzado para Originales de Pretzels',
    }),
  ).toBeDisabled();
  await expect(quantity).toBeDisabled();
  await expect(
    page.getByText('Máximo de 99 unidades para esta opción del menú.', {
      exact: true,
    }),
  ).toBeVisible();
});

test('all eight menu variants can be added with a keyboard', async ({
  page,
}) => {
  const addActions = [
    'Agregar a la canasta: Originales de Pretzels',
    'Agregar a la canasta: Queso y jalapeño de Pretzels',
    'Agregar a la canasta: Queso y pepperoni de Pretzels',
    'Agregar a la canasta: Originales de Bagels',
    'Agregar a la canasta: Queso y jalapeño de Bagels',
    'Agregar a la canasta: Queso y pepperoni de Bagels',
    'Agregar a la canasta: Burger buns de Burger buns',
    'Agregar a la canasta: Nuditos de Nuditos',
  ] as const;

  await page.goto('/menu/');
  await expect(
    page.getByRole('link', { name: 'Canasta, 0 productos' }),
  ).toBeVisible();

  for (const name of addActions) {
    const button = page.getByRole('button', { name });
    await expect(button).toHaveText('Agregar a la canasta');
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
  }

  await expect(
    page.getByRole('link', { name: 'Canasta, 8 productos' }),
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
    .getByRole('button', {
      name: 'Agregar a la canasta: Nuditos de Nuditos',
    })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Listo en tu canasta: 3 bolsas agregadas',
  );
  await page.locator('summary', { hasText: 'Abrir menú' }).click();
  await expect(
    page.getByRole('link', { name: 'Canasta, 3 productos' }),
  ).toBeVisible();
});
