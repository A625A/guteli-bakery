import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', heading: 'Fundación frontend lista' },
  { path: '/menu/', heading: 'Menú' },
  { path: '/cart/', heading: 'Carrito' },
  { path: '/order/', heading: 'Pedido' },
  { path: '/contact/', heading: 'Contacto' },
] as const;

for (const route of routes) {
  test(`${route.path} renders the Spanish foundation shell`, async ({
    page,
  }) => {
    await page.goto(route.path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-GT');
    await expect(
      page.getByRole('heading', { level: 1, name: route.heading }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Saltar al contenido' }),
    ).toBeAttached();
    await expect(
      page.getByRole('navigation', { name: 'Principal' }),
    ).toBeVisible();
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
