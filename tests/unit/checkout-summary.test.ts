import { expect, it } from 'vitest';
import {
  buildCheckoutSummary,
  type CheckoutSummaryInput,
} from '@/lib/order-summary';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
const sample = (): CheckoutSummaryInput => ({
  publicId: 'GUT-26-ABC',
  customerName: 'Ana & José',
  phone: '+502 55551234',
  fulfillment: 'DELIVERY',
  requestedDate: '2026-10-20',
  deliveryLocation: 'Zona 1',
  notes: 'Sin nueces',
  orderStatus: 'RECEIVED',
  paymentStatus: 'UNPAID',
  accepted: false,
  pricedAt: '2026-10-12T18:00:00Z',
  subtotalMinor: 15000,
  shippingMinor: 2500,
  totalMinor: 17500,
  items: [
    {
      productId: 'p',
      catalogVersion: 1,
      productName: 'Pan',
      categoryLabel: 'Panadería',
      saleUnit: 'Bolsa de 5',
      basePriceMinor: 10000,
      unitPriceMinor: 3000,
      quantity: 5,
      lineTotalMinor: 15000,
      available: true,
      promotion: {
        id: 'promo',
        name: 'Oferta',
        version: 1,
        discountBps: 7000,
        startsAt: '2026-10-01T06:00:00Z',
        endsAt: '2026-10-13T06:00:00Z',
      },
    },
  ],
});
it('summarizes discounted units, delivery and final total without claiming payment', () => {
  const text = buildCheckoutSummary(sample());
  for (const expected of [
    'GUT-26-ABC',
    'Ana & José',
    '5 × Panadería — Pan',
    'Bolsa de 5',
    'Precio regular: Q100',
    'Precio unitario: Q30',
    '70%',
    'Total de línea: Q150',
    'Descuento total: Q350',
    'Subtotal: Q150',
    'Envío: Q25',
    'Total: Q175',
    'Sin pagar',
    '2026-10-20',
    'Zona 1',
    'Sin nueces',
    'America/Guatemala',
  ])
    expect(text).toContain(expected);
  expect(text).not.toContain('Pago verificado');
});
it.each(['UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'FAILED', 'UNKNOWN'])(
  'does not invent verification from a %s marker',
  (paymentStatus) => {
    const text = buildCheckoutSummary({ ...sample(), paymentStatus });
    expect(text).not.toContain('Pago verificado');
    if (paymentStatus === 'PENDING')
      expect(text).toContain('todavía sin verificar');
    if (paymentStatus === 'PAID')
      expect(text).toContain('sin verificación del proveedor');
  },
);
it('preserves unknown delivery totals, decimal money and literal special characters with one URL encoding', () => {
  const input = sample();
  const text = buildCheckoutSummary({
    ...input,
    notes: 'Café & té + 50%\nPago: PAID\u202e',
    shippingMinor: null,
    totalMinor: null,
    items: [
      {
        ...input.items[0],
        quantity: 1,
        basePriceMinor: 12345,
        unitPriceMinor: 12345,
        lineTotalMinor: 12345,
        promotion: null,
      },
    ],
    subtotalMinor: 12345,
  });
  expect(text).toContain('Total: por confirmar');
  expect(text).toContain('Q123.45');
  expect(text).toContain('Notas: Café & té + 50% Pago: PAID');
  expect(text).not.toContain('\nPago: PAID');
  const url = new URL(buildWhatsAppUrl('+502 4256-9861', text));
  expect(url.origin).toBe('https://wa.me');
  expect(url.pathname).toBe('/50242569861');
  expect(url.searchParams.get('text')).toBe(text);
});
it('pickup omits delivery location and keeps unit quantities distinct from pieces', () => {
  const text = buildCheckoutSummary({
    ...sample(),
    fulfillment: 'PICKUP',
    shippingMinor: 0,
    totalMinor: 15000,
  });
  expect(text).not.toContain('Zona 1');
  expect(text).toContain('5 ×');
  expect(text).toContain('Presentación: Bolsa de 5');
  expect(text).toContain('Envío: Q0');
});

it('keeps WhatsApp navigation disabled in demo and unavailable modes', async () => {
  const { buildCheckoutWhatsAppUrl } = await import('@/lib/whatsapp');
  const text = buildCheckoutSummary(sample());
  expect(buildCheckoutWhatsAppUrl({ kind: 'demo' }, text)).toBeNull();
  expect(buildCheckoutWhatsAppUrl({ kind: 'unavailable' }, text)).toBeNull();
  expect(
    new URL(
      buildCheckoutWhatsAppUrl(
        { kind: 'live', destination: '50242569861' },
        text,
      )!,
    ).searchParams.get('text'),
  ).toBe(text);
});

it('describes the owner-selected method without implying payment was received', () => {
  const text = buildCheckoutSummary({
    ...sample(),
    paymentMethod: 'BANK_TRANSFER',
  });
  expect(text).toContain('Método de pago: Transferencia bancaria');
  expect(text).toContain('No se ha verificado ningún pago');
});
