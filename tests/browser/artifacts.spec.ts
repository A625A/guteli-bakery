import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const artifactPath = (...segments: string[]) =>
  path.resolve(process.cwd(), 'artifacts', 'screenshots', ...segments);

const screenshots = {
  desktop: {
    homepage: artifactPath('desktop', 'milestone-3-homepage.png'),
    menu: artifactPath('desktop', 'milestone-3-menu.png'),
    cart: artifactPath('desktop', 'milestone-3-cart.png'),
    confirmation: artifactPath('desktop', 'milestone-3-confirmation.png'),
  },
  mobile: {
    homepage: artifactPath('mobile', 'milestone-3-homepage.png'),
    menu: artifactPath('mobile', 'milestone-3-menu.png'),
    cart: artifactPath('mobile', 'milestone-3-cart.png'),
    confirmation: artifactPath('mobile', 'milestone-3-confirmation.png'),
  },
  states: {
    validation: artifactPath(
      'interaction-states',
      'milestone-3-validation.png',
    ),
  },
} as const;

async function capture(page: Page, screenshotPath: string) {
  await page.locator('nextjs-portal').evaluateAll((portals) => {
    for (const portal of portals) {
      portal.remove();
    }
  });
  const scrollBehavior = await page.evaluate(() => {
    const root = document.documentElement;
    const current = {
      priority: root.style.getPropertyPriority('scroll-behavior'),
      value: root.style.getPropertyValue('scroll-behavior'),
    };
    root.style.setProperty('scroll-behavior', 'auto', 'important');
    window.scrollTo(0, 0);
    return current;
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
  await page.evaluate(({ priority, value }) => {
    if (value) {
      document.documentElement.style.setProperty(
        'scroll-behavior',
        value,
        priority,
      );
    } else {
      document.documentElement.style.removeProperty('scroll-behavior');
    }
  }, scrollBehavior);
}

async function buildTwoItemCart(page: Page, mobile: boolean) {
  await page.goto('/menu/');

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

  await expect(
    page.getByTestId('cart-line-00000000-0000-4000-8000-000000000001'),
  ).toBeVisible();
  await expect(
    page.getByTestId('cart-line-00000000-0000-4000-8000-000000000005'),
  ).toBeVisible();
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

test.describe.serial('Milestone 3 evidence capture', () => {
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

    await page.goto('/menu/');
    await capture(page, screenshots.desktop.menu);

    await buildTwoItemCart(page, false);
    await capture(page, screenshots.desktop.cart);

    await fillPickupRequest(page, false);
    await page.getByRole('button', { name: 'Enviar pedido' }).click();

    const errorSummary = page.getByRole('main').getByRole('alert');
    await expect(errorSummary).toBeFocused();
    await expect(errorSummary.getByRole('link')).toHaveCount(1);
    await expect(
      errorSummary.getByRole('link', {
        name: 'Nombre completo: Ingresa tu nombre.',
      }),
    ).toBeVisible();
    await capture(page, screenshots.states.validation);

    await page.getByLabel('Nombre completo').fill('Ana López');
    await page.getByRole('button', { name: 'Enviar pedido' }).click();
    await expect(
      page.getByRole('heading', {
        name: '¡Pedido recibido!',
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(
      /\/order\/confirmation\/[A-Za-z0-9_-]{43}\/$/,
      { timeout: 15_000 },
    );
    await capture(page, screenshots.desktop.confirmation);

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

    await page.goto('/menu/');
    await capture(page, screenshots.mobile.menu);

    await buildTwoItemCart(page, true);
    await capture(page, screenshots.mobile.cart);

    await fillPickupRequest(page);
    await page.getByRole('button', { name: 'Enviar pedido' }).click();
    await expect(
      page.getByRole('heading', {
        name: '¡Pedido recibido!',
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(
      /\/order\/confirmation\/[A-Za-z0-9_-]{43}\/$/,
      { timeout: 15_000 },
    );
    await capture(page, screenshots.mobile.confirmation);

    expect(consoleErrors).toEqual([]);
  });
});
