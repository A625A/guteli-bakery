import { expect, test, type Page } from '@playwright/test';

const confirmedDestination = '50242569861';
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

test('live mode identifies and uses the confirmed WhatsApp destination', async ({
  page,
}) => {
  await prepareOrder(page);

  await expect(page.getByText('Sitio de demostración')).toHaveCount(0);
  const orderLink = page.getByRole('link', {
    name: 'Enviar pedido por WhatsApp',
  });
  await expect(orderLink).toHaveAttribute(
    'href',
    new RegExp(`^https://wa\\.me/${confirmedDestination}\\?text=`),
  );
  expect(
    decodeURIComponent((await orderLink.getAttribute('href')) ?? ''),
  ).toContain('Ana López');

  await page.goto('/contact/');
  await expect(page.getByRole('heading', { name: '4256-9861' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Hacer una consulta por WhatsApp' }),
  ).toHaveAttribute(
    'href',
    new RegExp(`^https://wa\\.me/${confirmedDestination}\\?text=`),
  );
  await expect(
    page.getByRole('link', { name: 'Consultar por WhatsApp al 4256-9861' }),
  ).toHaveAttribute(
    'href',
    new RegExp(`^https://wa\\.me/${confirmedDestination}\\?text=`),
  );
});
