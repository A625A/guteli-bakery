import { expect, it } from 'vitest';
import { createOrderRequestSchema } from '@/domain/order-contract';
import { hashCreateOrderRequest } from '@/server/orders/request-hash';
import { getMinimumOrderDate } from '@/lib/date';
const request = {
  customerName: 'Ana',
  phone: '55551234',
  fulfillment: 'pickup' as const,
  requestedDate: getMinimumOrderDate(),
  items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
};
it('accepts explicit optional consent and binds it to the idempotent request', () => {
  const optedIn = createOrderRequestSchema.parse({
    ...request,
    whatsappOptIn: true,
  });
  expect(optedIn.whatsappOptIn).toBe(true);
  expect(hashCreateOrderRequest(optedIn)).not.toBe(
    hashCreateOrderRequest(request),
  );
  expect(hashCreateOrderRequest({ ...request, whatsappOptIn: false })).toBe(
    hashCreateOrderRequest(request),
  );
});
it('rejects ambiguous international WhatsApp numbers only when consent is selected', () => {
  expect(
    createOrderRequestSchema.safeParse({
      ...request,
      phone: '15555551234',
      whatsappOptIn: true,
    }).success,
  ).toBe(false);
  expect(
    createOrderRequestSchema.safeParse({ ...request, phone: '15555551234' })
      .success,
  ).toBe(true);
  expect(
    createOrderRequestSchema.safeParse({
      ...request,
      phone: '+502 5555-1234',
      whatsappOptIn: true,
    }).success,
  ).toBe(true);
  expect(
    createOrderRequestSchema.safeParse({ ...request, whatsappOptIn: 'true' })
      .success,
  ).toBe(false);
});

import { submitOrder } from '@/lib/order-api';
it('preserves explicit consent through the browser request allowlist while omitting declined consent', async () => {
  const bodies: unknown[] = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: 503 });
  };
  await submitOrder({ ...request, whatsappOptIn: true }, 'test-key', fetchImpl);
  await submitOrder(request, 'test-key', fetchImpl);
  expect(bodies[0]).toMatchObject({ whatsappOptIn: true });
  expect(bodies[1]).not.toHaveProperty('whatsappOptIn');
});
