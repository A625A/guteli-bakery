import { expect, test, type Page } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
const productId = '00000000-0000-4000-8000-000000000001';
async function order(
  page: Page,
  fulfillment: 'pickup' | 'delivery' = 'delivery',
) {
  const identity = Number.parseInt(
    createHash('sha256').update(test.info().testId).digest('hex').slice(0, 6),
    16,
  );
  await page.setExtraHTTPHeaders({
    'x-forwarded-for': `198.51.${Math.floor(identity / 256) % 256}.${identity % 256}`,
  });
  await page.addInitScript((id) => {
    (window as unknown as { originalOpen: typeof window.open }).originalOpen =
      window.open.bind(window);
    if (localStorage.getItem('guteli-cart-v2') === null)
      localStorage.setItem(
        'guteli-cart-v2',
        JSON.stringify([{ productId: id, quantity: 2 }]),
      );
    Object.defineProperty(window, 'open', {
      value: () => {
        const state = window as unknown as {
          opened?: string;
          reservedDuringTap?: boolean;
          popupClosed?: boolean;
        };
        state.reservedDuringTap = navigator.userActivation.isActive;
        return {
          opener: null,
          closed: false,
          close: () => {
            state.popupClosed = true;
          },
          document: {
            createElement: document.createElement.bind(document),
            head: { append: () => {} },
          },
          location: {
            replace: (url: string) => {
              state.opened = url;
            },
          },
        };
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
  await page.getByLabel('Nombre completo').fill('Ana López & José');
  await page.getByLabel('Teléfono').fill(String(50000000 + identity));
  await page
    .getByLabel(fulfillment === 'delivery' ? 'Envío' : 'Recogida', {
      exact: true,
    })
    .check();
  await page.getByLabel('Transferencia bancaria', { exact: true }).check();
  if (fulfillment === 'delivery')
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
      process.env.GUTELI_SUMMARY_DEMO !== 'false',
      'Live handoff cases use an explicitly enabled local build.',
    );
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.name === 'mobile',
      hasTouch: viewport.name === 'mobile',
    });
    test('saves the selected payment without starting WhatsApp automatically', async ({
      page,
    }) => {
      const submitted = page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/orders') && request.method() === 'POST',
      );
      await order(page);
      expect((await submitted).postDataJSON().paymentMethod).toBe(
        'BANK_TRANSFER',
      );
      expect((await submitted).postDataJSON().whatsappOptIn).toBeUndefined();
      await expect(page.getByLabel('Resumen para compartir')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => (window as unknown as { opened?: string }).opened,
        ),
      ).toBeUndefined();
      await page
        .getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        })
        .click();
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { opened?: string }).opened,
          ),
        )
        .toContain('https://wa.me/');
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { reservedDuringTap: boolean })
              .reservedDuringTap,
        ),
      ).toBe(true);
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: 'requiere que pulses Enviar' }),
      ).toBeVisible();
    });
    test('reopens the private link without a checkout cookie to accept and share its exact order', async ({
      page,
    }) => {
      await order(page, 'pickup');
      const receiptToken = new URL(page.url()).pathname.split('/').at(-2)!;
      const publicId = (await page
        .locator('.order-confirmation__public-id')
        .textContent())!.trim();
      const storedCart = await page.evaluate(() =>
        localStorage.getItem('guteli-cart-v2'),
      );
      const cookie = (await page.context().cookies()).find(
        ({ name }) => name === 'guteli-checkout',
      );
      expect(cookie?.httpOnly).toBe(true);
      await page.context().clearCookies({ name: 'guteli-checkout' });
      await page.reload();
      expect(
        (await page.context().cookies()).some(
          ({ name }) => name === 'guteli-checkout',
        ),
      ).toBe(false);
      expect(
        await page.evaluate(() => localStorage.getItem('guteli-cart-v2')),
      ).toBe(storedCart);
      const unauthorizedPayment = await page.request.post(
        `/api/admin/orders/${publicId}/payment-verification`,
        {
          headers: {
            origin: new URL(page.url()).origin,
            'x-order-receipt': receiptToken,
          },
          data: {
            kind: 'VERIFIED',
            amountMinor: 12000,
            currency: 'GTQ',
            paymentMethod: 'BANK_TRANSFER',
            expectedVersion: 1,
            revisionId: randomUUID(),
            idempotencyKey: randomUUID(),
            confirmation: true,
            evidence: 'BANK_FUNDS_RECEIVED',
            note: '',
          },
        },
      );
      expect(unauthorizedPayment.status()).toBe(401);
      expect(await unauthorizedPayment.json()).toMatchObject({
        error: { code: 'UNAUTHENTICATED' },
      });
      const acceptance = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/checkout-review') &&
          response.request().method() === 'POST',
      );
      await page
        .getByRole('button', {
          name: 'Acepto el total de Q120 y el método de pago indicado',
          exact: true,
        })
        .click();
      const accepted = await acceptance;
      expect(accepted.status()).toBe(200);
      expect(accepted.request().headers()['x-order-receipt']).toBe(
        receiptToken,
      );
      await expect(
        page.getByRole('status').filter({ hasText: 'Total aceptado: Q120' }),
      ).toBeVisible();
      const summary = page.waitForResponse((response) =>
        response.url().endsWith('/api/checkout-summary'),
      );
      await page
        .getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        })
        .click();
      const shared = await summary;
      expect(shared.status()).toBe(200);
      expect(shared.request().headers()['x-order-receipt']).toBe(receiptToken);
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { opened?: string }).opened,
          ),
        )
        .toBeTruthy();
      const outbound = await page.evaluate(
        () => (window as unknown as { opened: string }).opened,
      );
      const message = new URL(outbound).searchParams.get('text');
      expect(message).toContain('Total aceptado por el cliente: Q120');
      expect(message).not.toMatch(/Ana López|Zona 10|Café & té|Teléfono:/);
      expect(outbound).not.toContain(receiptToken);
    });
    test('previews only on request and opens/copies a fresh correctly encoded unpaid summary', async ({
      page,
    }) => {
      await order(page);
      await expect(page.getByLabel('Resumen para compartir')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Ver resumen antes de compartir' })
        .click();
      const preview = page.getByLabel('Resumen para compartir');
      await expect(preview).not.toContainText('Ana López & José');
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
      expect(copied).not.toContain('Café & té + 50%');
      await page
        .getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        })
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
      expect(url.searchParams.get('text')).not.toContain('Ana López & José');
      expect(url.searchParams.get('text')).not.toContain('Café & té + 50%');
      expect(url.searchParams.get('text')).not.toContain('Zona 10');
      expect(url.searchParams.get('text')).toContain(
        'Método de pago: Transferencia bancaria',
      );
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { reservedDuringTap: boolean })
              .reservedDuringTap,
        ),
      ).toBe(true);
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

    test('requires review on a refreshed conflict and clears private text after invalid access proof', async ({
      page,
    }) => {
      await order(page);
      await page
        .getByRole('button', { name: 'Ver resumen antes de compartir' })
        .click();
      await expect(page.getByLabel('Resumen para compartir')).toBeVisible();
      await page.route('**/api/checkout-summary', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        data.summary.message += '\nTotal actualizado: Q525';
        await route.fulfill({ status: 409, json: data });
      });
      await page
        .getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        })
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
      await page.route('**/api/checkout-summary', (route) =>
        route.continue({
          headers: {
            ...route.request().headers(),
            'x-order-receipt': 'invalid',
          },
        }),
      );
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
        .getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        })
        .click();
      await expect(
        page.getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        }),
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
    test('offers copy and retry when the browser blocks the first WhatsApp tap', async ({
      page,
    }) => {
      await order(page);
      await page.evaluate(() =>
        Object.defineProperty(window, 'open', { value: () => null }),
      );
      await page
        .getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        })
        .click();
      await expect(
        page.getByRole('status').filter({ hasText: 'bloqueó la apertura' }),
      ).toBeVisible();
      await expect(page.getByLabel('Resumen para compartir')).toBeVisible();
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
    test('opens a real isolated popup without leaking the private page as referrer', async ({
      page,
      context,
    }) => {
      await order(page);
      await context.route('https://wa.me/**', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><title>Intercepted WhatsApp handoff</title>',
        }),
      );
      await page.evaluate(() =>
        Object.defineProperty(window, 'open', {
          value: (window as unknown as { originalOpen: typeof window.open })
            .originalOpen,
        }),
      );
      const popup = page.waitForEvent('popup');
      await page
        .getByRole('button', {
          name: 'Enviar pedido por WhatsApp',
          exact: true,
        })
        .click();
      const opened = await popup;
      await expect(opened).toHaveURL(/https:\/\/wa\.me\//);
      await opened.waitForLoadState();
      expect(await opened.evaluate(() => window.opener)).toBeNull();
      expect(await opened.evaluate(() => document.referrer)).toBe('');
      expect(new URL(opened.url()).searchParams.get('text')).not.toMatch(
        /Ana López|Zona 10|Café & té/,
      );
      expect(opened.url()).not.toContain(
        new URL(page.url()).pathname.split('/').at(-2)!,
      );
      await opened.close();
    });
    test('discards previews on focus and at a known pricing boundary', async ({
      page,
    }) => {
      await order(page);
      await page
        .getByRole('button', { name: 'Ver resumen antes de compartir' })
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
        .getByRole('button', { name: 'Ver resumen antes de compartir' })
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
    process.env.GUTELI_SUMMARY_DEMO === 'false',
    'Demo-only configuration',
  );
  await order(page);
  await page
    .getByRole('button', { name: 'Ver resumen antes de compartir' })
    .click();
  await expect(page.getByLabel('Resumen para compartir')).toBeVisible();
  await page
    .getByRole('button', { name: 'Enviar pedido por WhatsApp', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'no está habilitado' }),
  ).toBeVisible();
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
