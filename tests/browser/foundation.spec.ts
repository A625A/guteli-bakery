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
