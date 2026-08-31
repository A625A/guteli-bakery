import { expect, test, type Page } from '@playwright/test';

const pretzelOriginalId = '00000000-0000-4000-8000-000000000001';
const savedOriginalPretzels = `[{"productId":"${pretzelOriginalId}","quantity":2}]`;

async function openOrderWithSavedCart(page: Page) {
  await page.addInitScript((cart) => {
    window.localStorage.setItem('guteli-cart-v2', cart);
  }, savedOriginalPretzels);
  await page.goto('/cart/');
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

test('creates a durable delivery order and renders only its public receipt', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);
  await expect(
    page.getByTestId(`cart-line-${pretzelOriginalId}`).getByText('Q120'),
  ).toBeVisible();
  await expect(page.getByText('Subtotal estimado: Q120')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Pagar en línea — Próximamente' }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      /Tu nombre, teléfono, ubicación de entrega y notas se usan para procesar, contactarte y coordinar el pedido/,
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  const errorSummary = page.getByRole('main').getByRole('alert');
  await expect(errorSummary).toContainText('Revisa los campos');
  await expect(errorSummary).toBeFocused();

  await completeRequiredOrderFields(page, 'Envío');
  await page.getByLabel('Teléfono').fill('+502 4300-1101');
  await page.getByLabel('Notas opcionales').fill('Tocar el timbre');
  await page.getByRole('button', { name: 'Enviar pedido' }).click();

  await expect(page).toHaveURL(/\/order\/confirmation\/[A-Za-z0-9_-]{43}\/$/, {
    timeout: 15_000,
  });
  const receiptToken = new URL(page.url()).pathname.split('/').at(-2) ?? '';
  await expect(
    page.getByRole('heading', { name: '¡Pedido recibido!' }),
  ).toBeVisible();
  await expect(page.getByText(/^GUT-\d{2}-[A-Z0-9]+$/)).toBeVisible();
  await expect(
    page.getByText('Pedido recibido', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Pago pendiente', { exact: true })).toBeVisible();
  await expect(page.getByText('Envío', { exact: true })).toBeVisible();
  await expect(page.getByText('Originales', { exact: true })).toBeVisible();
  await expect(page.getByText('Pretzels', { exact: true })).toBeVisible();
  await expect(page.getByText('Subtotal: Q120', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Costo de envío por confirmar', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Total por confirmar', { exact: true }),
  ).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  for (const privateValue of [
    'Ana López',
    '+502 4300-1101',
    'Zona 10, Guatemala',
    'Tocar el timbre',
    receiptToken,
  ]) {
    expect(bodyText).not.toContain(privateValue);
  }
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('guteli-cart-v2')),
    )
    .toBe('[]');
  await expect(
    page.getByRole('link', { name: 'Carrito, 0 productos' }),
  ).toBeVisible();
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
  await expect(page).toHaveURL(/\/cart\/$/);
  await expect(
    page.getByRole('heading', { name: 'Tu carrito está vacío' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explorar el menú' }),
  ).toHaveAttribute('href', '/menu/');
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
    window.localStorage.setItem('guteli-cart-v2', '{malformed');
  });

  await page.goto('/cart/');

  await expect(
    page.getByRole('heading', { name: 'Tu carrito está vacío' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('guteli-cart-v2')),
    )
    .toBe('[]');
});

test('expires legacy slug carts without guessing product identity', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'guteli-cart-v1',
      '[{"productId":"pretzel-original","quantity":2}]',
    );
  });

  await page.goto('/cart/');

  await expect(
    page.getByRole('heading', { name: 'Tu carrito está vacío' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        legacy: window.localStorage.getItem('guteli-cart-v1'),
        current: window.localStorage.getItem('guteli-cart-v2'),
      })),
    )
    .toEqual({ legacy: null, current: '[]' });
});

test('prunes a stale UUID from the badge, storage, and order summary', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'guteli-cart-v2',
      '[{"productId":"00000000-0000-4000-8000-000000000099","quantity":2}]',
    );
  });

  await page.goto('/cart/');

  await expect(
    page.getByRole('heading', { name: 'Tu carrito está vacío' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Carrito, 0 productos' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('guteli-cart-v2')),
    )
    .toBe('[]');
  await expect(page.getByText('Resumen de la solicitud')).toHaveCount(0);
});

test('shows pickup guidance and omits a delivery location from the API payload', async ({
  page,
}) => {
  let submittedBody: Record<string, unknown> | undefined;
  await page.route('**/api/orders', async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'private server detail',
          requestId: 'private-request-id',
        },
      }),
    });
  });
  await openOrderWithSavedCart(page);

  await expect(
    page.getByText('Solicita información de recogida por WhatsApp', {
      exact: true,
    }),
  ).toBeVisible();
  await completeRequiredOrderFields(page, 'Recogida');
  await page.getByRole('button', { name: 'Enviar pedido' }).click();

  await expect(page.locator('.order-submit-error')).toContainText(
    'No pudimos enviar tu pedido.',
  );
  expect(submittedBody).toMatchObject({ fulfillment: 'pickup' });
  expect(submittedBody).not.toHaveProperty('deliveryLocation');
});

test('selected fulfillment exposes clear state', async ({ page }) => {
  await openOrderWithSavedCart(page);

  const pickup = page.getByLabel('Recogida');
  await expect(pickup).toBeChecked();
  await expect(pickup.locator('..')).toHaveAttribute('data-selected', 'true');
});

test('blocks rapid double submission synchronously and disables the action', async ({
  page,
}) => {
  let requestCount = 0;
  let releaseResponse: (() => void) | undefined;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/orders', async (route) => {
    requestCount += 1;
    await responseGate;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'private detail',
          requestId: 'private-request-id',
        },
      }),
    });
  });
  await openOrderWithSavedCart(page);
  await completeRequiredOrderFields(page, 'Recogida');

  await page.locator('.order-form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });

  await expect.poll(() => requestCount).toBe(1);
  await expect(
    page.getByRole('button', { name: 'Enviando pedido…' }),
  ).toBeDisabled();
  releaseResponse?.();
  await expect(page.locator('.order-submit-error')).toContainText(
    'No pudimos enviar tu pedido.',
  );
});

test('retains form and cart after a 500 and reuses the same key unchanged', async ({
  page,
}) => {
  const idempotencyKeys: string[] = [];
  await page.route('**/api/orders', async (route) => {
    idempotencyKeys.push(route.request().headers()['idempotency-key']);
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'raw private failure',
          requestId: 'private-request-id',
        },
      }),
    });
  });
  await openOrderWithSavedCart(page);
  await completeRequiredOrderFields(page, 'Recogida');

  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  const failure = page.locator('.order-submit-error');
  await expect(failure).toContainText('No pudimos enviar tu pedido.');
  await expect(failure).not.toContainText('raw private failure');
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Ana López');
  await expect(
    page.getByTestId(`cart-line-${pretzelOriginalId}`),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('guteli-cart-v2')),
    )
    .toBe(savedOriginalPretzels);

  await page.getByRole('button', { name: 'Intentar de nuevo' }).click();
  await expect.poll(() => idempotencyKeys.length).toBe(2);
  expect(idempotencyKeys[0]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
});

test('rotates the key after a non-retryable idempotency conflict', async ({
  page,
}) => {
  const idempotencyKeys: string[] = [];
  await page.route('**/api/orders', async (route) => {
    idempotencyKeys.push(route.request().headers()['idempotency-key']);
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'private conflict detail',
          requestId: 'private-request-id',
        },
      }),
    });
  });
  await openOrderWithSavedCart(page);
  await completeRequiredOrderFields(page, 'Recogida');

  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  await expect(page.locator('.order-submit-error')).toContainText(
    'Los datos del pedido cambiaron.',
  );
  await page.getByRole('button', { name: 'Intentar de nuevo' }).click();

  await expect.poll(() => idempotencyKeys.length).toBe(2);
  expect(idempotencyKeys[1]).not.toBe(idempotencyKeys[0]);
});

test('rotates the retry key after a form edit and a cart quantity change', async ({
  page,
}) => {
  const submissions: Array<{ key: string; body: Record<string, unknown> }> = [];
  await page.route('**/api/orders', async (route) => {
    submissions.push({
      key: route.request().headers()['idempotency-key'],
      body: route.request().postDataJSON() as Record<string, unknown>,
    });
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'private detail',
          requestId: 'private-request-id',
        },
      }),
    });
  });
  await openOrderWithSavedCart(page);
  await completeRequiredOrderFields(page, 'Recogida');

  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  await expect.poll(() => submissions.length).toBe(1);
  await expect(page.locator('.order-submit-error')).toBeVisible();
  await page.getByLabel('Nombre completo').fill('Ana Pérez');
  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  await expect.poll(() => submissions.length).toBe(2);
  await expect(page.locator('.order-submit-error')).toBeVisible();
  expect(submissions[1].key).not.toBe(submissions[0].key);

  await page
    .getByLabel('Cantidad de Originales, Pretzels en el carrito')
    .fill('3');
  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  await expect.poll(() => submissions.length).toBe(3);
  expect(submissions[2].key).not.toBe(submissions[1].key);
  expect(submissions[2].body).toMatchObject({
    customerName: 'Ana Pérez',
    items: [{ productId: pretzelOriginalId, quantity: 3 }],
  });
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

  await page.getByRole('button', { name: 'Enviar pedido' }).click();

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
  await page.getByRole('button', { name: 'Enviar pedido' }).click();

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
  await page.getByRole('button', { name: 'Enviar pedido' }).click();

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
    'Enviar pedido',
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

  await page.getByRole('button', { name: 'Enviar pedido' }).click();

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
  await page.getByRole('button', { name: 'Enviar pedido' }).click();

  await expect(date).toHaveAttribute('min', '2026-07-23');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Selecciona una fecha a partir del 2026-07-23.',
  );
});

test('uses one generic experience for malformed and unknown receipt tokens', async ({
  page,
}) => {
  for (const token of ['not-a-token', 'a'.repeat(43)]) {
    await page.goto(`/order/confirmation/${token}/`);
    await expect(
      page.getByRole('heading', { name: 'No encontramos este pedido' }),
    ).toBeVisible();
    await expect(page.getByText(token, { exact: true })).toHaveCount(0);
  }
});

test('describes the 99 cap as applying to each menu option', async ({
  page,
}) => {
  await page.addInitScript((productId) => {
    window.localStorage.setItem(
      'guteli-cart-v2',
      `[{"productId":"${productId}","quantity":99}]`,
    );
  }, pretzelOriginalId);
  await page.goto('/menu/');

  await expect(
    page.getByText('Máximo de 99 unidades para esta opción del menú.', {
      exact: true,
    }),
  ).toBeVisible();
});
