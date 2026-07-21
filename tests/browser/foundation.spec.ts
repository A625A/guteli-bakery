import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', heading: 'Pretzels, bagels y panes por encargo' },
  { path: '/menu/', heading: 'Nuestro menú' },
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
    const officialLogos = page.getByRole('img', { name: 'Güteli Bakery' });
    await expect(officialLogos).toHaveCount(2);
    await expect(officialLogos.first()).toHaveAttribute(
      'src',
      /\/brand\/guteli-logo-original\.jpeg$/,
    );
    const logoMetrics = await officialLogos.first().evaluate((image) => {
      const element = image as HTMLImageElement;
      const box = element.getBoundingClientRect();
      return {
        naturalHeight: element.naturalHeight,
        naturalWidth: element.naturalWidth,
        ratio: box.width / box.height,
      };
    });
    expect(logoMetrics).toMatchObject({
      naturalHeight: 240,
      naturalWidth: 864,
    });
    expect(logoMetrics.ratio).toBeCloseTo(864 / 240, 1);
    await expect(
      page.getByRole('link', { name: 'Carrito, 0 productos' }),
    ).toBeVisible();
    await expect(
      page.getByRole('contentinfo').getByText('4256-9861'),
    ).toBeVisible();
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

test('default portfolio mode is identified and exposes no WhatsApp destination', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('note', { name: 'Modo demostración' }),
  ).toContainText('Sitio de demostración');
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);

  await page.goto('/contact/');
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(
    page
      .getByRole('main')
      .getByText('Las solicitudes no se envían desde esta demostración.', {
        exact: true,
      }),
  ).toBeVisible();
});

test('homepage uses the approved graphic-only editorial treatment', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('Referencia original de la marca')).toHaveCount(
    0,
  );
  await expect(page.locator('.home-hero img')).toHaveCount(0);
  await expect(page.locator('.home-hero .bakery-illustration')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver el menú' })).toHaveAttribute(
    'href',
    '/menu/',
  );
});

test('menu exposes graphic media slots without product photography', async ({
  page,
}) => {
  await page.goto('/menu/');

  await expect(page.getByTestId('product-card')).toHaveCount(8);
  await expect(page.locator('.product-card__media')).toHaveCount(8);
  await expect(page.locator('.product-card img')).toHaveCount(0);
  await expect(page.locator('.product-card__art-note').first()).toHaveText(
    'Ilustración de categoría',
  );
});

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

const responsiveViewports = [
  { name: 'compact', width: 320, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'intermediate', width: 1024, height: 900 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

for (const viewport of responsiveViewports) {
  test(`${viewport.name} shell has no horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}

test('reduced motion disables smooth scrolling and decorative animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  await expect(page.locator('.bakery-illustration')).toHaveCSS(
    'animation-name',
    'none',
  );
});

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

test('mobile menu closes after selecting a destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const mobileNavigation = page.locator('details.mobile-navigation');
  await mobileNavigation.locator('summary').click();
  await mobileNavigation.getByRole('link', { name: 'Menú' }).click();

  await expect(page).toHaveURL(/\/menu\/$/);
  await expect(mobileNavigation).not.toHaveAttribute('open', '');
});

test('contact exposes factual guidance without an active demo destination', async ({
  page,
}) => {
  await page.goto('/contact/');

  const main = page.getByRole('main');
  await expect(main.getByText('4256-9861', { exact: true })).toBeVisible();
  await expect(
    main.getByText(
      'Esta demostración muestra cómo se coordina una consulta sin abrir un chat real.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    main.getByText('Pedidos con 2 días de anticipación.', { exact: true }),
  ).toBeVisible();
  await expect(
    main.getByText('Costo de envío por confirmar según ubicación', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    main.getByText('Solicita información de recogida por WhatsApp', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    main.getByText('El pedido queda sujeto a confirmación por WhatsApp', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(main.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(
    main.getByText('Las solicitudes no se envían desde esta demostración.', {
      exact: true,
    }),
  ).toBeVisible();
});

for (const route of routes) {
  test(`${route.path} has no mobile overflow and exposes 44 pixel interactive targets`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route.path);
    await page.locator('summary', { hasText: 'Abrir menú' }).click();

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);

    const interactiveTargets = page.locator(
      '.site-header a:visible, .site-header summary:visible, main a:visible, main button:visible, .site-footer a:visible',
    );
    expect(await interactiveTargets.count()).toBeGreaterThan(0);

    for (const target of await interactiveTargets.all()) {
      const box = await target.boundingBox();
      const targetName = await target.evaluate((element) => ({
        className: element.className,
        tagName: element.tagName,
        text: element.textContent?.trim(),
      }));

      expect(box).not.toBeNull();
      expect(
        Math.min(box?.width ?? 0, box?.height ?? 0),
        `${targetName.tagName}.${targetName.className} "${targetName.text}"`,
      ).toBeGreaterThanOrEqual(44);
    }
  });
}

test('desktop shows its navigation and keeps the mobile control hidden', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await expect(page.locator('.desktop-navigation')).toBeVisible();
  await expect(page.locator('.mobile-navigation')).toBeHidden();
});

for (const path of ['/contact/', '/ruta-inexistente/']) {
  test(`${path} keeps the footer at the desktop document bottom`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(path);

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

  const main = page.locator('main#main-content');
  await expect(main).toBeVisible();
  await expect(main).toHaveAttribute('tabindex', '-1');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Güteli Bakery, inicio' }),
  ).toBeVisible();
  await expect(page.getByText('4256-9861')).toBeVisible();

  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(main).toBeFocused();
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
  await expect(footer.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(
    footer.getByText('Las solicitudes no se envían desde esta demostración.', {
      exact: true,
    }),
  ).toBeVisible();
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
