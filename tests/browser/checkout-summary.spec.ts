import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
const productId = '00000000-0000-4000-8000-000000000001';
async function order(page: Page, optIn = false) {
  const identity = Number.parseInt(
    createHash('sha256').update(test.info().testId).digest('hex').slice(0, 6),
    16,
  );
  await page.setExtraHTTPHeaders({
    'x-forwarded-for': `198.51.${Math.floor(identity / 256) % 256}.${identity % 256}`,
  });
  await page.addInitScript((id) => {
    localStorage.setItem(
      'guteli-cart-v2',
      JSON.stringify([{ productId: id, quantity: 2 }]),
    );
    Object.defineProperty(window, 'open', {
      value: (url: string) => {
        (window as unknown as { opened: string }).opened = url;
        return null;
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  }, productId);
  await page.goto('/cart/');
  const consent = page.getByRole('checkbox', {
    name: /Quiero recibir por WhatsApp/,
  });
  await expect(consent).not.toBeChecked();
  if (optIn) await consent.check();
  await page.getByLabel('Nombre completo').fill('Ana López & José');
  await page.getByLabel('Teléfono').fill(String(50000000 + identity));
  await page.getByLabel('Envío', { exact: true }).check();
  await page.getByLabel('Ubicación o dirección').fill('Zona 10');
  const date = page.getByLabel('Fecha solicitada');
  await date.fill((await date.getAttribute('min'))!);
  await page.getByLabel('Notas opcionales').fill('Café & té + 50%');
  await page
    .getByRole('button', { name: 'Enviar pedido', exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\/confirmation\//);
}
for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.skip(
      process.env.GUTELI_SUMMARY_DEMO === 'true',
      'Live handoff cases use an explicitly enabled local build.',
    );
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.name === 'mobile',
      hasTouch: viewport.name === 'mobile',
    });
    test('records customer WhatsApp consent only after an explicit selection', async ({
      page,
    }) => {
      const submitted = page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/orders') && request.method() === 'POST',
      );
      await order(page, true);
      expect((await submitted).postDataJSON().whatsappOptIn).toBe(true);
      await expect(page.getByLabel('Resumen para compartir')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => (window as unknown as { opened?: string }).opened,
        ),
      ).toBeUndefined();
    });
    test('previews only on request and opens/copies a fresh correctly encoded unpaid summary', async ({
      page,
    }) => {
      await order(page);
      await expect(page.getByLabel('Resumen para compartir')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Preparar resumen para WhatsApp' })
        .click();
      const preview = page.getByLabel('Resumen para compartir');
      await expect(preview).toContainText('Ana López & José');
      await expect(preview).toContainText('Total: por confirmar');
      await expect(preview).toContainText('Sin pagar');
      await expect(preview).toContainText('Precio unitario: Q60');
      await page
        .getByRole('button', { name: 'Copiar resumen', exact: true })
        .click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Resumen copiado' }),
      ).toBeVisible();
      const copied = await page.evaluate(
        () => (window as unknown as { copied: string }).copied,
      );
      expect(copied).toContain('Café & té + 50%');
      await page
        .getByRole('button', { name: 'Abrir WhatsApp', exact: true })
        .click();
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { opened?: string }).opened,
          ),
        )
        .toBeTruthy();
      const url = new URL(
        await page.evaluate(
          () => (window as unknown as { opened: string }).opened,
        ),
      );
      expect(url.hostname).toBe('wa.me');
      expect(url.pathname).toBe('/50242569861');
      expect(url.searchParams.get('text')).toContain('Ana López & José');
      expect(url.searchParams.get('text')).toContain('Café & té + 50%');
      expect(url.searchParams.get('text')).not.toContain(
        new URL(page.url()).pathname.split('/').at(-2)!,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole('button', { name: 'Ocultar resumen' }).click();
      await expect(preview).toHaveCount(0);
    });

    test('requires review on a refreshed conflict and clears private text after session failure', async ({
      page,
    }) => {
      await order(page);
      await page
        .getByRole('button', { name: 'Preparar resumen para WhatsApp' })
        .click();
      await expect(page.getByLabel('Resumen para compartir')).toBeVisible();
      await page.route('**/api/checkout-summary', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        data.summary.message += '\nTotal actualizado: Q525';
        await route.fulfill({ status: 409, json: data });
      });
      await page
        .getByRole('button', { name: 'Abrir WhatsApp', exact: true })
        .click();
      await expect(
        page.getByRole('status').filter({ hasText: 'El pedido cambió' }),
      ).toBeVisible();
      await expect(page.getByLabel('Resumen para compartir')).toHaveValue(
        /Total actualizado: Q525/,
      );
      expect(
        await page.evaluate(
          () => (window as unknown as { opened?: string }).opened,
        ),
      ).toBeUndefined();
      await page.unroute('**/api/checkout-summary');
      await page.context().clearCookies();
      await page
        .getByRole('button', { name: 'Copiar resumen', exact: true })
        .click();
      await expect(page.getByLabel('Resumen para compartir')).toHaveCount(0);
      await expect(
        page.getByRole('status').filter({ hasText: 'Tu sesión pudo vencer' }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => (window as unknown as { copied?: string }).copied,
        ),
      ).toBeUndefined();
    });
    test('offers complete selectable text for long messages and clipboard failure', async ({
      page,
    }) => {
      await order(page);
      await page.route('**/api/checkout-summary', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        data.summary.message += '\n' + 'Producto muy largo & café '.repeat(400);
        await route.fulfill({ response, json: data });
      });
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async () => {
              throw new Error('Clipboard blocked');
            },
          },
        }),
      );
      await page
        .getByRole('button', { name: 'Preparar resumen para WhatsApp' })
        .click();
      await expect(
        page.getByRole('button', { name: 'Abrir WhatsApp', exact: true }),
      ).toBeDisabled();
      await page
        .getByRole('button', { name: 'Copiar resumen', exact: true })
        .click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Selecciona el texto' }),
      ).toBeVisible();
      await expect(page.getByLabel('Resumen para compartir')).toBeFocused();
      expect(
        (await page.getByLabel('Resumen para compartir').inputValue()).length,
      ).toBeGreaterThan(10000);
    });
    test('discards previews on focus and at a known pricing boundary', async ({
      page,
    }) => {
      await order(page);
      await page
        .getByRole('button', { name: 'Preparar resumen para WhatsApp' })
        .click();
      await expect(page.getByLabel('Resumen para compartir')).toBeVisible();
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.getByLabel('Resumen para compartir')).toHaveCount(0);
      await page.route('**/api/checkout-summary', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        data.summary.validUntil = new Date(
          Date.parse(data.summary.pricedAt) + 1200,
        ).toISOString();
        await route.fulfill({ response, json: data });
      });
      await page
        .getByRole('button', { name: 'Preparar resumen para WhatsApp' })
        .click();
      await expect(page.getByLabel('Resumen para compartir')).toBeVisible();
      await expect(page.getByLabel('Resumen para compartir')).toHaveCount(0, {
        timeout: 5000,
      });
      await expect(
        page.getByRole('status').filter({ hasText: 'precios vigentes' }),
      ).toBeVisible();
    });
  });
}

test('demo mode allows a private preview and copy but no live WhatsApp navigation', async ({
  page,
}) => {
  test.skip(
    process.env.GUTELI_SUMMARY_DEMO !== 'true',
    'Demo-only configuration',
  );
  await order(page);
  await page
    .getByRole('button', { name: 'Preparar resumen para WhatsApp' })
    .click();
  await expect(page.getByLabel('Resumen para compartir')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Abrir WhatsApp', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Copiar resumen', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Resumen copiado' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { opened?: string }).opened,
    ),
  ).toBeUndefined();
});
