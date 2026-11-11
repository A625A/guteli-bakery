import { expect, it } from 'vitest';
import { createOrderRequestSchema } from '@/domain/order-contract';
import { hashCreateOrderRequest } from '@/server/orders/request-hash';
const base = {
  customerName: 'PRUEBA',
  phone: '55555555',
  fulfillment: 'delivery',
  paymentMethod: 'BANK_TRANSFER' as const,
  requestedDate: '2099-01-01',
  deliveryLocation: 'Dirección ficticia',
  items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
};
it('accepts only a confirmed valid point; never browser tariffs', () => {
  const data = {
    ...base,
    deliveryPoint: { lng: 1, lat: 1 },
    deliveryConfirmed: true,
  };
  expect(createOrderRequestSchema.safeParse(data).success).toBe(true);
  for (const extra of [
    { shippingMinor: 1000 },
    { totalMinor: 1 },
    { deliveryPoint: { lng: 181, lat: 1 } },
    { deliveryConfirmed: false },
    { fulfillment: 'pickup' },
    { deliveryQuote: 'unsigned' },
  ])
    expect(
      createOrderRequestSchema.safeParse({ ...data, ...extra }).success,
    ).toBe(false);
});
it('quote requires a confirmed point; text-only manual orders remain compatible', () => {
  expect(createOrderRequestSchema.safeParse(base).success).toBe(true);
  expect(
    createOrderRequestSchema.safeParse({
      ...base,
      deliveryQuote: 'x'.repeat(80),
    }).success,
  ).toBe(false);
});
it('coordinates and quotes participate in idempotency, while legacy requests retain their shape', () => {
  const a = createOrderRequestSchema.parse({
    ...base,
    deliveryPoint: { lng: 1, lat: 1 },
    deliveryConfirmed: true,
  });
  const b = { ...a, deliveryPoint: { lng: 2, lat: 1 } };
  expect(hashCreateOrderRequest(a)).not.toBe(hashCreateOrderRequest(b));
});
