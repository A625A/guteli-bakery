import { expect, test, type Page } from '@playwright/test';

const pretzelOriginalId = '00000000-0000-4000-8000-000000000001';

async function prepareOrder(page: Page) {
  await page.addInitScript((productId) => {
    window.localStorage.setItem(
      'guteli-cart-v2',
      `[{"productId":"${productId}","quantity":1}]`,
    );
  }, pretzelOriginalId);
  await page.goto('/cart/');
  await page.getByLabel('Nombre completo').fill('Ana López');
  await page.getByLabel('Teléfono').fill('5555 5555');
  const date = page.getByLabel('Fecha solicitada');
  await date.fill((await date.getAttribute('min')) ?? '');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
}

test('an unapproved live destination fails closed across the customer journey', async ({
  page,
}) => {
  await prepareOrder(page);

  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(
    page.getByText(
      'El envío por WhatsApp no está configurado. Copia el resumen para conservarlo.',
      { exact: true },
    ),
  ).toBeVisible();

  await page.goto('/contact/');
  await expect(page.getByRole('heading', { name: '4256-9861' })).toBeVisible();
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(
    page.getByText(
      'El envío por WhatsApp no está configurado en este momento.',
      { exact: true },
    ),
  ).toHaveCount(2);
});
