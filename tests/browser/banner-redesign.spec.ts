import { expect, test } from '@playwright/test';

test('homepage uses the approved banner-led structure', async ({ page }) => {
  await page.goto('/');

  const banner = page.getByRole('img', {
    name: 'Güteli Bakery: pretzels, bagels y panes por encargo',
  });
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('src', /\/images\/guteli-banner\.png$/);
  await expect(page.locator('.home-banner picture')).toHaveCount(1);
  await expect(page.locator('.brand-mark__loop')).toHaveCount(2);
  await expect(page.locator('.home-hero__art')).toHaveCount(0);
  await expect(page.locator('.home-hero__wordmark')).toHaveCount(0);
  await expect(page.locator('.home-menu-preview')).toHaveCount(0);
  await expect(page.locator('.home-action-strip')).toContainText(
    'Pedidos con 2 días de anticipación.',
  );
  await expect(page.getByRole('link', { name: 'Ver el menú' })).toHaveAttribute(
    'href',
    '/menu/',
  );
  await expect(
    page.getByRole('link', { name: 'Preparar mi pedido' }),
  ).toHaveAttribute('href', '/cart/');
});

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
]) {
  test(`banner remains intact at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const banner = page.locator('.home-banner img');
    await expect(banner).toHaveCSS('object-fit', 'contain');
    const bannerMetrics = await banner.evaluate((image) => {
      const rect = image.getBoundingClientRect();
      const element = image as HTMLImageElement;

      return {
        currentSource: new URL(element.currentSrc).pathname,
        intrinsicRatio: element.naturalWidth / element.naturalHeight,
        renderedRatio: rect.width / rect.height,
      };
    });
    expect(bannerMetrics.currentSource).toBe(
      viewport.width < 768
        ? '/images/guteli-banner-mobile.webp'
        : '/images/guteli-banner.webp',
    );
    expect(
      Math.abs(bannerMetrics.renderedRatio - bannerMetrics.intrinsicRatio),
    ).toBeLessThan(0.01);
    await expect(page.locator('.brand-mark__symbol')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}
