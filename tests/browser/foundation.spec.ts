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

const footerNavigationDestinations = [
  { name: 'Inicio', path: '/' },
  { name: 'Menú', path: '/menu/' },
  { name: 'Carrito', path: '/cart/' },
  { name: 'Pedido', path: '/order/' },
  { name: 'Contacto', path: '/contact/' },
] as const;

const footerWhatsAppUrl =
  'https://wa.me/50242569861?text=Hola%2C%20quisiera%20informaci%C3%B3n%20sobre%20los%20productos%20de%20G%C3%BCteli%20Bakery.';

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

test('footer exposes navigation and factual request guidance', async ({
  page,
}) => {
  await page.goto('/');

  const footer = page.getByRole('contentinfo');
  const navigation = footer.getByRole('navigation', {
    name: 'Navegación del pie de página',
  });

  for (const destination of footerNavigationDestinations) {
    await expect(
      navigation.getByRole('link', { name: destination.name, exact: true }),
    ).toHaveAttribute('href', destination.path);
  }

  await expect(
    footer.getByText('Pedidos con 2 días de anticipación.', { exact: true }),
  ).toBeVisible();
  await expect(
    footer.getByText('Costo de envío por confirmar según ubicación', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    footer.getByText('El pedido queda sujeto a confirmación por WhatsApp', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    footer.getByRole('link', {
      name: 'Consultar por WhatsApp al 4256-9861',
    }),
  ).toHaveAttribute('href', footerWhatsAppUrl);
});

test('footer links provide 44 pixel touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const targets = await page.getByRole('contentinfo').getByRole('link').all();
  expect(targets.length).toBeGreaterThan(0);

  for (const target of targets) {
    const box = await target.boundingBox();

    expect(box).not.toBeNull();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(
      44,
    );
  }
});
