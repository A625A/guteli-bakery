import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

const artifactPath = (...segments: string[]) =>
  path.resolve(process.cwd(), 'artifacts', 'screenshots', ...segments);

const screenshots = {
  desktop: {
    homepage: artifactPath('desktop', 'milestone-4-homepage.png'),
    headerLogo: artifactPath('desktop', 'milestone-4-header-logo.png'),
    menu: artifactPath('desktop', 'milestone-4-menu.png'),
    cart: artifactPath('desktop', 'milestone-4-cart.png'),
    summary: artifactPath('desktop', 'milestone-4-summary.png'),
  },
  mobile: {
    homepage: artifactPath('mobile', 'milestone-4-homepage.png'),
    headerLogo: artifactPath('mobile', 'milestone-4-header-logo.png'),
    menu: artifactPath('mobile', 'milestone-4-menu.png'),
    cart: artifactPath('mobile', 'milestone-4-cart.png'),
    summary: artifactPath('mobile', 'milestone-4-summary.png'),
    footer: artifactPath('mobile', 'milestone-4-footer.png'),
  },
  states: {
    validation: artifactPath(
      'interaction-states',
      'milestone-4-validation.png',
    ),
    demoHandoff: artifactPath(
      'interaction-states',
      'milestone-4-demo-handoff.png',
    ),
    mobileDemoBanner: artifactPath(
      'interaction-states',
      'milestone-4-mobile-demo-banner.png',
    ),
  },
} as const;

async function expectProportionalLogo(page: Page) {
  const logo = page.locator('.site-header .official-logo');
  await expect(logo).toBeVisible();

  const ratioDifference = await logo.evaluate((element) => {
    const image = element as HTMLImageElement;
    const renderedRatio =
      image.getBoundingClientRect().width /
      image.getBoundingClientRect().height;
    const intrinsicRatio = image.naturalWidth / image.naturalHeight;
    return Math.abs(renderedRatio - intrinsicRatio);
  });

  expect(ratioDifference).toBeLessThan(0.02);
}

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
    .getByRole('button', {
      name: 'Agregar a la canasta: Originales de Pretzels',
    })
    .click();
  await page
    .getByRole('button', {
      name: 'Agregar a la canasta: Originales de Bagels',
    })
    .click();

  if (mobile) {
    await page.locator('summary', { hasText: 'Abrir menú' }).click();
  }

  await expect(
    page.getByRole('link', { name: 'Canasta, 2 productos' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Canasta, 2 productos' }).click();
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

test.describe.serial('Milestone 4 evidence capture', () => {
  test('captures the desktop customer journey and one field-error state', async ({
    context,
    page,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page).toHaveTitle(/Güteli Bakery/);
    await expectProportionalLogo(page);
    await capture(page, screenshots.desktop.homepage);
    await page.locator('.site-header .official-logo').screenshot({
      animations: 'disabled',
      path: screenshots.desktop.headerLogo,
    });
    expect(existsSync(screenshots.desktop.headerLogo)).toBe(true);

    await page.goto('/menu/');
    await capture(page, screenshots.desktop.menu);

    await buildTwoItemCart(page, false);
    await capture(page, screenshots.desktop.cart);

    await page.getByRole('link', { name: 'Completar mi solicitud' }).click();
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
    await capture(page, screenshots.states.validation);

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

    await page.getByRole('button', { name: 'Copiar resumen' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'Resumen copiado. Listo para compartir.',
    );
    await expect(
      page.getByText(
        'Modo demostración: copia el resumen para probar el flujo.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
    await capture(page, screenshots.states.demoHandoff);

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
    await expectProportionalLogo(page);
    await capture(page, screenshots.mobile.homepage);
    await page.locator('.site-header .official-logo').screenshot({
      animations: 'disabled',
      path: screenshots.mobile.headerLogo,
    });
    expect(existsSync(screenshots.mobile.headerLogo)).toBe(true);
    await page.getByRole('note', { name: 'Modo demostración' }).screenshot({
      animations: 'disabled',
      path: screenshots.states.mobileDemoBanner,
    });
    expect(existsSync(screenshots.states.mobileDemoBanner)).toBe(true);

    const footerLinksMeetTargetSize = await page
      .getByRole('contentinfo')
      .locator('a')
      .evaluateAll((links) =>
        links.every((link) => link.getBoundingClientRect().height >= 44),
      );
    expect(footerLinksMeetTargetSize).toBe(true);
    await page.getByRole('contentinfo').screenshot({
      animations: 'disabled',
      path: screenshots.mobile.footer,
    });
    expect(existsSync(screenshots.mobile.footer)).toBe(true);

    await page.goto('/menu/');
    await capture(page, screenshots.mobile.menu);

    await buildTwoItemCart(page, true);
    await capture(page, screenshots.mobile.cart);

    await page.getByRole('link', { name: 'Completar mi solicitud' }).click();
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
