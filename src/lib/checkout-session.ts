import { z } from 'zod';
import { acceptedOrderSchema } from './order-api';

const responseSchema = z
  .object({
    order: acceptedOrderSchema.nullable(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export async function checkoutSession(
  action: 'read' | 'prepare' | 'new' = 'read',
  expectedOrderId?: string,
): Promise<z.infer<typeof responseSchema>> {
  if (action === 'read') return requestSession(action);
  // Serialize cookie issuance across tabs of this origin. Never use an
  // uncoordinated fallback: it could make a saved order unrecoverable.
  if (!navigator.locks) throw new Error('Checkout coordination unavailable');
  return navigator.locks.request('guteli-checkout', () =>
    requestSession(action, expectedOrderId),
  );
}

async function requestSession(
  action: 'read' | 'prepare' | 'new',
  expectedOrderId?: string,
): Promise<z.infer<typeof responseSchema>> {
  const response = await fetch('/api/checkout-session', {
    method: action === 'read' ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      action === 'new'
        ? {
            'x-checkout-action': 'new',
            'x-checkout-order': expectedOrderId ?? '',
          }
        : {},
  });
  if (!response.ok)
    throw new Error(
      'No pudimos comprobar tu pedido guardado. Inténtalo de nuevo antes de enviar otra solicitud.',
    );
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success || (action !== 'read' && !parsed.data.idempotencyKey)) {
    throw new Error(
      'No pudimos comprobar tu pedido guardado. Inténtalo de nuevo antes de enviar otra solicitud.',
    );
  }
  if (action !== 'read') {
    // Verify the browser retained the HttpOnly credential before sending PII.
    const retained = await requestSession('read');
    if (retained.idempotencyKey !== parsed.data.idempotencyKey) {
      throw new Error(
        'No pudimos comprobar tu pedido guardado. Permite las cookies necesarias para continuar.',
      );
    }
    return { ...parsed.data, order: retained.order };
  }
  return parsed.data;
}
