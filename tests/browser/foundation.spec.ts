import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', heading: 'Fundación frontend lista' },
  { path: '/menu/', heading: 'Menú' },
  { path: '/cart/', heading: 'Carrito' },
  { path: '/order/', heading: 'Pedido' },
  { path: '/contact/', heading: 'Contacto' },
] as const;

const navigationDestinations = [
  { name: 'Inicio', path: '/' },
  { name: 'Menú', path: '/menu/' },
  { name: 'Carrito, 0 productos', path: '/cart/' },
  { name: 'Pedido', path: '/order/' },
  { name: 'Contacto', path: '/contact/' },
] as const;

for (const route of routes) {
  test(`${route.path} renders the final Spanish site shell`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(route.path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-GT');
    await expect(
      page.getByRole('heading', { level: 1, name: route.heading }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Saltar al contenido' }),
    ).toBeAttached();
    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Güteli Bakery, inicio' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Carrito, 0 productos' }),
    ).toBeVisible();
    await expect(page.getByText('4256-9861')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(consoleErrors).toEqual([]);
  });
}

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`the skip link moves focus to main on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Saltar al contenido' }),
    ).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('main#main-content')).toBeFocused();
  });

  test(`the footer reaches the document bottom on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const footerBottom = await page
      .locator('footer')
      .evaluate((footer) =>
        Math.round(footer.getBoundingClientRect().bottom + window.scrollY),
      );
    const documentBottom = await page.evaluate(() =>
      Math.round(document.documentElement.scrollHeight),
    );

    expect(footerBottom).toBe(documentBottom);
  });
}

test('desktop navigation exposes the approved five destinations', async ({
  page,
}) => {
  await page.goto('/');

  const navigation = page.getByRole('navigation', {
    name: 'Navegación principal',
  });

  for (const destination of navigationDestinations) {
    await expect(
      navigation.getByRole('link', { name: destination.name }),
    ).toHaveAttribute('href', destination.path);
  }
});

test('mobile menu exposes the approved five destinations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.locator('summary', { hasText: 'Abrir menú' }).click();
  const navigation = page.getByRole('navigation', {
    name: 'Navegación principal',
  });

  for (const destination of navigationDestinations) {
    await expect(
      navigation.getByRole('link', { name: destination.name }),
    ).toHaveAttribute('href', destination.path);
  }
});

test('cart badge restores a safe saved quantity after hydration', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'guteli-cart-v1',
      '[{"productId":"pretzel-original","quantity":2}]',
    );
  });

  await page.goto('/');

  await expect(
    page.getByRole('link', { name: 'Carrito, 2 productos' }),
  ).toBeVisible();
});

test('the missing route keeps the final shell and a focusable main target', async ({
  page,
}) => {
  await page.goto('/ruta-inexistente/');

  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Güteli Bakery, inicio' }),
  ).toBeVisible();
  await expect(page.getByText('4256-9861')).toBeVisible();
});
