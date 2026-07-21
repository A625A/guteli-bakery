import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const artifactPath = (...segments: string[]) =>
  path.resolve(process.cwd(), 'artifacts', 'screenshots', ...segments);

const screenshots = {
  desktop: {
    homepage: artifactPath('desktop', 'milestone-2-homepage.png'),
    cart: artifactPath('desktop', 'milestone-2-cart.png'),
    summary: artifactPath('desktop', 'milestone-2-summary.png'),
    validation: artifactPath(
      'interaction-states',
      'milestone-2-validation.png',
    ),
  },
  mobile: {
    homepage: artifactPath('mobile', 'milestone-2-homepage.png'),
    cart: artifactPath('mobile', 'milestone-2-cart.png'),
    summary: artifactPath('mobile', 'milestone-2-summary.png'),
  },
} as const;

async function capture(page: Page, screenshotPath: string) {
  await page.locator('nextjs-portal').evaluateAll((portals) => {
    for (const portal of portals) {
      portal.remove();
    }
  });
  await page.evaluate(() => {
    const root = document.documentElement;
    const scrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = scrollBehavior;
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: screenshotPath,
  });
}

async function buildTwoItemCart(page: Page, mobile: boolean) {
  await page.getByRole('link', { name: 'Ver el menú' }).click();
  await expect(page).toHaveURL(/\/menu\/$/);

  await page
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();
  await page
    .getByRole('button', { name: 'Agregar Originales de Bagels' })
    .click();

  if (mobile) {
    await page.locator('summary', { hasText: 'Abrir menú' }).click();
  }

  await expect(
    page.getByRole('link', { name: 'Carrito, 2 productos' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Carrito, 2 productos' }).click();
  await expect(page).toHaveURL(/\/cart\/$/);

  if (mobile) {
    await expect(page.locator('details.mobile-navigation')).not.toHaveAttribute(
      'open',
      '',
    );
  }

  await expect(page.getByTestId('cart-line-pretzel-original')).toBeVisible();
  await expect(page.getByTestId('cart-line-bagel-original')).toBeVisible();
}

async function fillPickupRequest(page: Page, includeName = true) {
  if (includeName) {
    await page.getByLabel('Nombre completo').fill('Ana López');
  }
  await page.getByLabel('Teléfono').fill('5555 5555');
  await page.getByLabel('Recogida').check();

  const date = page.getByLabel('Fecha solicitada');
  const minimumDate = await date.getAttribute('min');
  expect(minimumDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await date.fill(minimumDate ?? '');
}

test.describe.serial('Milestone 2 evidence capture', () => {
  test('captures the desktop customer journey and one field-error state', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Güteli Bakery/);
    await capture(page, screenshots.desktop.homepage);

    await buildTwoItemCart(page, false);
    await capture(page, screenshots.desktop.cart);

    await page
      .getByRole('link', { name: 'Completar datos del pedido' })
      .click();
    await fillPickupRequest(page, false);
    await page.getByRole('button', { name: 'Revisar solicitud' }).click();

    const errorSummary = page.getByRole('main').getByRole('alert');
    await expect(errorSummary).toBeFocused();
    await expect(errorSummary.getByRole('link')).toHaveCount(1);
    await expect(
      errorSummary.getByRole('link', {
        name: 'Nombre completo: Ingresa tu nombre.',
      }),
    ).toBeVisible();
    await capture(page, screenshots.desktop.validation);

    await page.getByLabel('Nombre completo').fill('Ana López');
    await page.getByRole('button', { name: 'Revisar solicitud' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Tu solicitud está lista para revisar',
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Resumen de la solicitud')).toContainText(
      'Modalidad: Recogida',
    );
    await capture(page, screenshots.desktop.summary);

    expect(consoleErrors).toEqual([]);
  });

  test('captures the mobile customer journey', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Güteli Bakery/);
    await capture(page, screenshots.mobile.homepage);

    await buildTwoItemCart(page, true);
    await capture(page, screenshots.mobile.cart);

    await page
      .getByRole('link', { name: 'Completar datos del pedido' })
      .click();
    await fillPickupRequest(page);
    await page.getByRole('button', { name: 'Revisar solicitud' }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Tu solicitud está lista para revisar',
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Resumen de la solicitud')).toContainText(
      'Modalidad: Recogida',
    );
    await capture(page, screenshots.mobile.summary);

    expect(consoleErrors).toEqual([]);
  });
});
