import { expect, test, type Page } from '@playwright/test';

const savedOriginalPretzels = '[{"productId":"pretzel-original","quantity":2}]';

async function openOrderWithSavedCart(page: Page) {
  await page.addInitScript((cart) => {
    window.localStorage.setItem('guteli-cart-v1', cart);
  }, savedOriginalPretzels);
  await page.goto('/order/');
}

async function completeRequiredOrderFields(
  page: Page,
  fulfillment: 'Recogida' | 'Envío',
) {
  await page.getByLabel('Nombre completo').fill('Ana López');
  await page.getByLabel('Teléfono').fill('5555 5555');
  await page.getByLabel(fulfillment).check();

  if (fulfillment === 'Envío') {
    await page.getByLabel('Ubicación o dirección').fill('Zona 10, Guatemala');
  }

  const date = page.getByLabel('Fecha solicitada');
  await date.fill((await date.getAttribute('min')) ?? '');
}

test('completes a delivery request without sending it', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/menu/');
  await page
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();
  await page.goto('/cart/');
  await page
    .getByLabel('Cantidad de Originales, Pretzels en el carrito')
    .fill('2');
  await expect(
    page.getByTestId('cart-line-pretzel-original').getByText('Q120'),
  ).toBeVisible();
  await expect(page.getByText('Subtotal estimado: Q120')).toBeVisible();
  await page.getByRole('link', { name: 'Completar datos del pedido' }).click();

  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  const errorSummary = page.getByRole('main').getByRole('alert');
  await expect(errorSummary).toContainText('Revisa los campos');
  await expect(errorSummary).toBeFocused();

  await completeRequiredOrderFields(page, 'Envío');
  await page.getByLabel('Notas opcionales').fill('Tocar el timbre');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  await expect(page).toHaveURL(/\/order\/$/);
  await expect(
    page.getByRole('heading', { name: 'Tu solicitud está lista para revisar' }),
  ).toBeVisible();
  await expect(
    page
      .getByLabel('Tu solicitud está lista para revisar')
      .getByText('El pedido queda sujeto a confirmación por WhatsApp', {
        exact: true,
      }),
  ).toBeVisible();
  await expect(page.getByLabel('Resumen de la solicitud')).toContainText(
    'Modalidad: Entrega',
  );
  await expect(page.getByLabel('Resumen de la solicitud')).toContainText(
    'Ubicación de entrega: Zona 10, Guatemala',
  );
  await page.getByRole('button', { name: 'Copiar resumen' }).click();
  await expect(page.getByRole('status')).toHaveText('Resumen copiado.');

  await expect(
    page.getByText(
      'Modo demostración: copia el resumen para probar el flujo.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Abrir WhatsApp con mi solicitud' }),
  ).toHaveCount(0);
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);

  const storage = await page.evaluate(() => ({ ...window.localStorage }));
  expect(storage).toEqual({
    'guteli-cart-v1': '[{"productId":"pretzel-original","quantity":2}]',
  });
  expect(JSON.stringify(storage)).not.toContain('Ana');
  expect(await page.getByLabel('Nombre completo').inputValue()).toBe(
    'Ana López',
  );
});

test('offers a menu recovery path when the cart is empty', async ({ page }) => {
  await page.goto('/cart/');

  await expect(
    page.getByRole('heading', { name: 'Tu carrito está vacío' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explorar el menú' }),
  ).toHaveAttribute('href', '/menu/');

  await page.goto('/order/');
  await expect(
    page.getByRole('heading', { name: 'Agrega productos antes de continuar' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir al menú' })).toHaveAttribute(
    'href',
    '/menu/',
  );
  await expect(page.getByLabel('Nombre completo')).toHaveCount(0);
});

test('persists cart changes across reload and removes a line on request', async ({
  page,
}) => {
  await page.goto('/menu/');
  await page.getByLabel('Cantidad de Originales, Pretzels').fill('3');
  await page
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();
  await page.goto('/cart/');

  await expect(
    page.getByLabel('Cantidad de Originales, Pretzels en el carrito'),
  ).toHaveValue('3');
  await page.reload();
  await expect(
    page.getByLabel('Cantidad de Originales, Pretzels en el carrito'),
  ).toHaveValue('3');
  await expect(page.getByText('Subtotal estimado: Q180')).toBeVisible();

  await page
    .getByRole('button', { name: 'Quitar Originales de Pretzels' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Tu carrito está vacío' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Carrito, 0 productos' }),
  ).toBeVisible();
});

test('recovers malformed saved cart data as an empty cart', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('guteli-cart-v1', '{malformed');
  });

  await page.goto('/cart/');

  await expect(
    page.getByRole('heading', { name: 'Tu carrito está vacío' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('guteli-cart-v1')),
    )
    .toBe('[]');
});

test('shows pickup guidance and omits a delivery location from the summary', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);

  await expect(
    page.getByText('Solicita información de recogida por WhatsApp', {
      exact: true,
    }),
  ).toBeVisible();
  await completeRequiredOrderFields(page, 'Recogida');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  const summary = page.getByLabel('Resumen de la solicitud');
  await expect(summary).toContainText('Modalidad: Recogida');
  await expect(summary).not.toContainText('Ubicación de entrega:');
});

test('selected fulfillment and copy feedback expose clear state', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openOrderWithSavedCart(page);

  const pickup = page.getByLabel('Recogida');
  await expect(pickup).toBeChecked();
  await expect(pickup.locator('..')).toHaveAttribute('data-selected', 'true');

  await completeRequiredOrderFields(page, 'Recogida');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  await page.getByRole('button', { name: 'Copiar resumen' }).click();
  await expect(page.getByRole('status')).toHaveText('Resumen copiado.');
});

test('invalidates the reviewed demo handoff when details change', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);
  await completeRequiredOrderFields(page, 'Recogida');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  const handoff = page.getByText(
    'Modo demostración: copia el resumen para probar el flujo.',
    { exact: true },
  );
  await expect(handoff).toBeVisible();

  await page.getByLabel('Nombre completo').fill('Ana Pérez');
  await expect(handoff).toHaveCount(0);
  await expect(page.getByLabel('Resumen de la solicitud')).toHaveCount(0);

  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  await expect(handoff).toBeVisible();
  await page.getByLabel('Envío').check();
  await expect(handoff).toHaveCount(0);
});

test('requires delivery location and preserves active form progress on error', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);
  await page.getByLabel('Nombre completo').fill('Ana López');
  await page.getByLabel('Teléfono').fill('5555 5555');
  await page.getByLabel('Envío').check();
  await page.getByLabel('Notas opcionales').fill('Sin servilletas');
  const date = page.getByLabel('Fecha solicitada');
  await date.fill((await date.getAttribute('min')) ?? '');

  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  const errorSummary = page.getByRole('main').getByRole('alert');
  await expect(errorSummary).toContainText('Ingresa la ubicación de entrega.');
  await expect(errorSummary).toBeFocused();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Ana López');
  await expect(page.getByLabel('Teléfono')).toHaveValue('5555 5555');
  await expect(page.getByLabel('Envío')).toBeChecked();
  await expect(page.getByLabel('Notas opcionales')).toHaveValue(
    'Sin servilletas',
  );
  await expect(date).not.toHaveValue('');
});

test('clears a delivery-only error when switching back to pickup without stealing focus', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);
  await completeRequiredOrderFields(page, 'Envío');
  await page.getByLabel('Ubicación o dirección').fill('');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  const errorSummary = page.getByRole('main').getByRole('alert');
  await expect(errorSummary).toBeFocused();
  await expect(
    errorSummary.getByRole('link', {
      name: 'Ubicación o dirección: Ingresa la ubicación de entrega.',
    }),
  ).toHaveAttribute('href', '#order-location');

  const pickup = page.getByLabel('Recogida');
  await pickup.check();

  await expect(pickup).toBeFocused();
  await expect(errorSummary).toHaveCount(0);
  await expect(page.locator('a[href="#order-location"]')).toHaveCount(0);
  await expect(page.locator('#order-location')).toHaveCount(0);
  await expect(
    page.getByText('Solicita información de recogida por WhatsApp', {
      exact: true,
    }),
  ).toBeVisible();
});

test('gives the focused error summary and recovery links visible target geometry', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  const errorSummary = page.getByRole('main').getByRole('alert');
  await expect(errorSummary).toBeFocused();
  const focusStyle = await errorSummary.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(focusStyle.outlineWidth).toBeGreaterThan(0);

  const recoveryLinks = await errorSummary.getByRole('link').all();
  expect(recoveryLinks).toHaveLength(3);

  for (const link of recoveryLinks) {
    const box = await link.boundingBox();

    expect(box).not.toBeNull();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(
      44,
    );
  }
});

test('marks every custom-validated required order field in the markup', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);

  await expect(page.getByLabel('Nombre completo')).toHaveAttribute(
    'required',
    '',
  );
  await expect(page.getByLabel('Teléfono')).toHaveAttribute('required', '');
  await expect(page.getByLabel('Fecha solicitada')).toHaveAttribute(
    'required',
    '',
  );
  await expect(page.getByLabel('Recogida')).toHaveAttribute('required', '');
  await expect(page.getByLabel('Envío')).toHaveAttribute('required', '');
  await expect(page.getByLabel('Ubicación o dirección')).toHaveCount(0);

  await page.getByLabel('Envío').check();

  await expect(page.getByLabel('Ubicación o dirección')).toHaveAttribute(
    'required',
    '',
  );
});

test('order fields follow a logical keyboard sequence', async ({ page }) => {
  await openOrderWithSavedCart(page);

  const orderControls = page.locator(
    '.order-form :is(input, textarea, button)',
  );
  await expect(orderControls).toHaveCount(7);

  const name = page.getByLabel('Nombre completo');
  await name.focus();
  await expect(name).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Teléfono')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Recogida')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Fecha solicitada')).toBeFocused();

  const controls = await orderControls.evaluateAll((elements) =>
    elements.map((element) => {
      const control = element as HTMLInputElement | HTMLTextAreaElement;

      return control.id || control.value || control.textContent?.trim();
    }),
  );

  expect(controls).toEqual([
    'order-name',
    'order-phone',
    'pickup',
    'delivery',
    'order-requestedDate',
    'order-notes',
    'Revisar solicitud',
  ]);

  const positiveTabIndexes = await orderControls.evaluateAll((elements) =>
    elements.filter((element) => (element as HTMLElement).tabIndex > 0),
  );
  expect(positiveTabIndexes).toEqual([]);
});

test('rejects a requested date earlier than the Guatemala minimum', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);
  await page.getByLabel('Nombre completo').fill('Ana López');
  await page.getByLabel('Teléfono').fill('5555 5555');
  const date = page.getByLabel('Fecha solicitada');
  const minimumDate = (await date.getAttribute('min')) ?? '';
  const priorDate = await page.evaluate((minimum) => {
    const value = new Date(`${minimum}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() - 1);
    return value.toISOString().slice(0, 10);
  }, minimumDate);
  await date.fill(priorDate);
  await expect(date).toHaveValue(priorDate);

  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    `Selecciona una fecha a partir del ${minimumDate}.`,
  );
});

test('refreshes the two-day minimum after Guatemala midnight', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-07-21T05:30:00.000Z') });
  await openOrderWithSavedCart(page);

  const date = page.getByLabel('Fecha solicitada');
  await expect(date).toHaveAttribute('min', '2026-07-22');
  await page.getByLabel('Nombre completo').fill('Ana López');
  await page.getByLabel('Teléfono').fill('5555 5555');
  await date.fill('2026-07-22');

  await page.clock.setFixedTime(new Date('2026-07-21T06:30:00.000Z'));
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();

  await expect(date).toHaveAttribute('min', '2026-07-23');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Selecciona una fecha a partir del 2026-07-23.',
  );
});

test('keeps the readable summary available when clipboard copy is rejected', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('Clipboard blocked')),
      },
    });
  });
  await openOrderWithSavedCart(page);
  await completeRequiredOrderFields(page, 'Recogida');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  const summary = page.getByLabel('Resumen de la solicitud');
  const summaryText = await summary.inputValue();

  await page.getByRole('button', { name: 'Copiar resumen' }).click();

  await expect(page.getByRole('status')).toHaveText(
    'No se pudo copiar automáticamente. Selecciona y copia el resumen manualmente.',
  );
  await expect(summary).toBeVisible();
  await expect(summary).toHaveValue(summaryText);
  await expect(
    page.getByRole('link', { name: 'Abrir WhatsApp con mi solicitud' }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      'Modo demostración: copia el resumen para probar el flujo.',
      { exact: true },
    ),
  ).toBeVisible();
});

test('describes the 99 cap as applying to each menu option', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'guteli-cart-v1',
      '[{"productId":"pretzel-original","quantity":99}]',
    );
  });
  await page.goto('/menu/');

  await expect(
    page.getByText('Máximo de 99 unidades para esta opción del menú.', {
      exact: true,
    }),
  ).toBeVisible();
});
