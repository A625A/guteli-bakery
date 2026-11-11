import { describe, expect, it } from 'vitest';
import { createOrderRequestSchema } from '@/domain/order-contract';
import { hashCreateOrderRequest } from '@/server/orders/request-hash';

const request = {
  customerName: 'Ana',
  phone: '55551234',
  requestedDate: '2099-12-31',
  items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
};
describe('customer payment contract', () => {
  it.each([
    ['pickup', 'BANK_TRANSFER', true],
    ['delivery', 'BANK_TRANSFER', true],
    ['pickup', 'CASH_PICKUP', true],
    ['delivery', 'CASH_DELIVERY', true],
    ['pickup', 'CASH_DELIVERY', false],
    ['delivery', 'CASH_PICKUP', false],
    ['pickup', 'CARD', false],
    ['pickup', undefined, false],
  ])('validates %s / %s on the server', (fulfillment, paymentMethod, valid) => {
    expect(
      createOrderRequestSchema.safeParse({
        ...request,
        fulfillment,
        paymentMethod,
        ...(fulfillment === 'delivery' ? { deliveryLocation: 'Zona 1' } : {}),
      }).success,
    ).toBe(valid);
  });
  it('binds payment choice to submission idempotency', () => {
    const bank = createOrderRequestSchema.parse({
      ...request,
      fulfillment: 'pickup',
      paymentMethod: 'BANK_TRANSFER',
    });
    expect(hashCreateOrderRequest(bank)).not.toBe(
      hashCreateOrderRequest({ ...bank, paymentMethod: 'CASH_PICKUP' }),
    );
  });
});
