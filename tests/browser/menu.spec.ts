import { expect, test, type Locator } from '@playwright/test';

function relativeLuminance(color: string) {
  const channels = color
    .match(/\d+(?:\.\d+)?/g)
    ?.slice(0, 3)
    .map(Number);

  if (!channels || channels.length !== 3) {
    throw new Error(`Unsupported CSS color: ${color}`);
  }

  const [red, green, blue] = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

async function getContrastRatio(foreground: Locator, background: Locator) {
  const foregroundColor = await foreground.evaluate(
    (element) => getComputedStyle(element).color,
  );
  const backgroundColor = await background.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const lighter = Math.max(
    relativeLuminance(foregroundColor),
    relativeLuminance(backgroundColor),
  );
  const darker = Math.min(
    relativeLuminance(foregroundColor),
    relativeLuminance(backgroundColor),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

test('keeps add controls unavailable until the persisted cart can hydrate', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/menu/');

  await expect(
    page.getByRole('button', { name: 'Agregar Originales de Pretzels' }),
  ).toBeDisabled();

  await context.close();
});

test('homepage presents the banner-led factual ordering path', async ({
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
  await expect(
    page.getByRole('img', {
      name: 'Güteli Bakery: pretzels, bagels y panes por encargo',
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver el menú' })).toHaveAttribute(
    'href',
    '/menu/',
  );
  await expect(
    page.getByRole('link', { name: 'Preparar mi pedido' }),
  ).toHaveAttribute('href', '/cart/');

  await expect(
    page.getByRole('region', { name: 'Precios del menú' }),
  ).toHaveCount(0);
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

test('ordering guide uses decorative bakery symbols instead of visible step numbers', async ({
  page,
}) => {
  await page.goto('/');

  const guide = page.getByRole('list', { name: 'Cómo hacer un pedido' });
  const icons = guide.locator('.ordering-guide__icon');

  await expect(icons).toHaveCount(3);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
  }

  for (const number of ['01', '02', '03']) {
    await expect(guide.getByText(number, { exact: true })).toHaveCount(0);
  }
});

test('phone handset is centered inside its ordering-guide speech bubble', async ({
  page,
}) => {
  await page.goto('/');

  const geometry = await page
    .locator('.ordering-guide__icon')
    .nth(2)
    .locator('svg')
    .evaluate((svg) => {
      const [bubble, phone] = svg.querySelectorAll('path');
      const bubbleBox = bubble.getBBox();
      const phoneBox = phone.getBBox();

      return {
        centerDifference: {
          x:
            phoneBox.x +
            phoneBox.width / 2 -
            (bubbleBox.x + bubbleBox.width / 2),
          y:
            phoneBox.y +
            phoneBox.height / 2 -
            (bubbleBox.y + bubbleBox.height / 2),
        },
        minimumInset: Math.min(
          phoneBox.x - bubbleBox.x,
          phoneBox.y - bubbleBox.y,
          bubbleBox.x + bubbleBox.width - (phoneBox.x + phoneBox.width),
          bubbleBox.y + bubbleBox.height - (phoneBox.y + phoneBox.height),
        ),
      };
    });

  expect(Math.abs(geometry.centerDifference.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.centerDifference.y)).toBeLessThanOrEqual(1);
  expect(geometry.minimumInset).toBeGreaterThanOrEqual(4);
});

test('shows all confirmed products and adds a selected quantity', async ({
  page,
}) => {
  await page.goto('/menu/');
  await expect(
    page.getByRole('heading', { name: 'Nuestros productos' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Productos disponibles' }),
  ).toBeAttached();
  await expect(page.getByTestId('product-card')).toHaveCount(10);
  await expect(
    page.getByText('Cantidad por confirmar', { exact: true }),
  ).toHaveCount(4);
  await expect(page.getByText('Bolsa de 5', { exact: true })).toHaveCount(5);
  await expect(page.getByText('Bolsa de 15', { exact: true })).toHaveCount(1);

  const expectedPrices = [
    'Q60',
    'Q75',
    'Q75',
    'Q75',
    'Q60',
    'Q75',
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
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();

  await expect(page.getByRole('status')).toContainText('2 bolsas agregadas');
  await expect(
    page.getByRole('link', { name: 'Carrito, 2 productos' }),
  ).toBeVisible();
});

test('filters the product grid with clear pressed state and keyboard access', async ({
  page,
}) => {
  await page.goto('/menu/');

  const filters = page.getByRole('group', { name: 'Filtrar productos' });
  const allFilter = filters.getByRole('button', { name: 'Todos' });
  const pretzelFilter = filters.getByRole('button', { name: 'Pretzels' });
  const bagelFilter = filters.getByRole('button', { name: 'Bagels' });
  const breadFilter = filters.getByRole('button', { name: 'Panes' });

  await expect(allFilter).toHaveAttribute('aria-pressed', 'true');
  await pretzelFilter.focus();
  await page.keyboard.press('Enter');
  await expect(pretzelFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('product-card')).toHaveCount(4);
  await expect(page.locator('.menu-results')).toHaveText(
    'Pretzels: 4 productos',
  );

  await bagelFilter.click();
  await expect(page.getByTestId('product-card')).toHaveCount(4);
  await expect(page.locator('.menu-results')).toHaveText('Bagels: 4 productos');

  await breadFilter.click();
  await expect(page.getByTestId('product-card')).toHaveCount(2);
  await expect(
    page.getByRole('heading', { level: 3, name: 'Burger buns' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 3, name: 'Nuditos' }),
  ).toBeVisible();

  await allFilter.click();
  await expect(page.getByTestId('product-card')).toHaveCount(10);
  await expect(allFilter).toHaveAttribute('aria-pressed', 'true');
});

test('uses a four-card product row on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/menu/');

  const cards = page.getByTestId('product-card');
  const firstRow = await Promise.all(
    [0, 1, 2, 3].map((index) => cards.nth(index).boundingBox()),
  );

  for (const box of firstRow) {
    expect(box).not.toBeNull();
    expect(Math.abs((box?.y ?? 0) - (firstRow[0]?.y ?? 0))).toBeLessThanOrEqual(
      1,
    );
  }
});

test('uses the supplied product photographs in the menu and cart', async ({
  page,
}) => {
  await page.goto('/menu/');

  const productPhotos = page.locator('.product-card__photo');
  await expect(productPhotos).toHaveCount(9);
  await expect(productPhotos.nth(0)).toHaveAttribute('loading', 'eager');
  await expect(productPhotos.nth(1)).toHaveAttribute('loading', 'eager');
  await expect(productPhotos.nth(2)).toHaveAttribute('loading', 'lazy');
  await expect(
    page.getByRole('img', { name: 'Originales de Pretzels' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Tomate y albahaca de Bagels' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Nuditos: ilustración de categoría, no fotografía de producto',
    }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();
  await page
    .getByRole('button', { name: 'Agregar Tomate y albahaca de Bagels' })
    .click();
  await page.getByRole('link', { name: 'Carrito, 2 productos' }).click();

  const cartPhotos = page.locator('.cart-line__photo');
  await expect(cartPhotos).toHaveCount(2);
  await expect(cartPhotos.nth(0)).toHaveAttribute('alt', '');
  await expect(cartPhotos.nth(1)).toHaveAttribute('alt', '');
  await expect(cartPhotos.nth(0)).toHaveAttribute('loading', 'eager');
  await expect(cartPhotos.nth(1)).toHaveAttribute('loading', 'eager');
  await expect
    .poll(() =>
      page
        .locator('.cart-line__photo')
        .evaluateAll((images: HTMLImageElement[]) =>
          images.every((image) => image.naturalWidth > 0),
        ),
    )
    .toBe(true);

  await page.goto('/menu/');
  await page
    .getByRole('button', { name: 'Agregar Nuditos de Nuditos' })
    .click();
  await page.getByRole('link', { name: 'Carrito, 3 productos' }).click();
  await expect(
    page.getByRole('img', {
      name: 'Nuditos: ilustración de categoría, no fotografía de producto',
    }),
  ).toHaveCount(0);
});

test('small caramel labels retain readable contrast on cream surfaces', async ({
  page,
}) => {
  await page.goto('/menu/');

  const productCard = page.getByTestId('product-card').first();
  await expect(productCard).toBeVisible();
  expect(
    await getContrastRatio(
      productCard.locator('.product-card__category'),
      productCard,
    ),
  ).toBeGreaterThanOrEqual(4.5);

  const activeFilter = page
    .getByRole('group', { name: 'Filtrar productos' })
    .getByRole('button', { name: 'Todos' });
  expect(
    await getContrastRatio(activeFilter, activeFilter),
  ).toBeGreaterThanOrEqual(4.5);

  await page.evaluate(() => {
    window.localStorage.setItem(
      'guteli-cart-v1',
      '[{"productId":"pretzel-original","quantity":1}]',
    );
  });
  await page.goto('/cart/');

  const cartLine = page.getByTestId('cart-line-pretzel-original');
  await expect(cartLine).toBeVisible();
  expect(
    await getContrastRatio(
      cartLine.locator('.cart-line__identity p'),
      cartLine,
    ),
  ).toBeGreaterThanOrEqual(4.5);
});

test('re-announces an identical repeated addition and updates the badge', async ({
  page,
}) => {
  await page.goto('/menu/');

  const addButton = page.getByRole('button', {
    name: 'Agregar Originales de Pretzels',
  });
  await addButton.click();
  const firstStatus = await page.getByRole('status').elementHandle();

  await expect(page.getByRole('status')).toContainText('1 bolsa agregada');
  await addButton.click();

  expect(await firstStatus?.evaluate((node) => node.isConnected)).toBe(false);
  await expect(page.getByRole('status')).toContainText('1 bolsa agregada');
  await expect(
    page.getByRole('link', { name: 'Carrito, 2 productos' }),
  ).toBeVisible();
});

test('reports only the effective addition and disables adding at 99', async ({
  page,
}) => {
  await page.goto('/menu/');

  const quantity = page.getByLabel('Cantidad de Originales, Pretzels');
  const addButton = page.getByRole('button', {
    name: 'Agregar Originales de Pretzels',
  });
  await quantity.fill('98');
  await addButton.click();
  await quantity.fill('2');
  await addButton.click();

  await expect(page.getByRole('status')).toContainText('1 bolsa agregada');
  await expect(
    page.getByRole('link', { name: 'Carrito, 99 productos' }),
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

test('all ten menu variants can be added with a keyboard', async ({ page }) => {
  const addActions = [
    'Agregar Originales de Pretzels',
    'Agregar Queso y jalapeño de Pretzels',
    'Agregar Queso y pepperoni de Pretzels',
    'Agregar Tomate y albahaca de Pretzels',
    'Agregar Originales de Bagels',
    'Agregar Queso y jalapeño de Bagels',
    'Agregar Queso y pepperoni de Bagels',
    'Agregar Tomate y albahaca de Bagels',
    'Agregar Burger buns de Burger buns',
    'Agregar Nuditos de Nuditos',
  ] as const;

  await page.goto('/menu/');
  await expect(
    page.getByRole('link', { name: 'Carrito, 0 productos' }),
  ).toBeVisible();

  for (const name of addActions) {
    const button = page.getByRole('button', { name });
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
  }

  await expect(
    page.getByRole('link', { name: 'Carrito, 10 productos' }),
  ).toBeVisible();
});

test('menu controls remain usable without horizontal overflow on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/menu/');

  await expect(page.getByTestId('product-card')).toHaveCount(10);
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

  for (const filter of await page
    .getByRole('group', { name: 'Filtrar productos' })
    .getByRole('button')
    .all()) {
    const box = await filter.boundingBox();

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
