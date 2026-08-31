import { describe, expect, it, vi } from 'vitest';

import { submitOrder } from '@/lib/order-api';

const request = {
  customerName: 'Ana López',
  phone: '+502 5555-5555',
  fulfillment: 'delivery' as const,
  requestedDate: '2026-09-02',
  deliveryLocation: 'Zona 10, Guatemala',
  notes: 'Tocar el timbre',
  items: [
    {
      productId: '00000000-0000-4000-8000-000000000001',
      quantity: 2,
    },
  ],
};

const acceptedOrder = {
  publicId: 'GUT-26-K7M4P9Q2',
  receiptToken: 'a'.repeat(43),
  orderStatus: 'RECEIVED',
  paymentStatus: 'UNPAID',
  subtotalMinor: 12000,
  shippingMinor: null,
  totalMinor: null,
};

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('order API adapter', () => {
  it.each([
    [201, 'created'],
    [200, 'replayed'],
  ] as const)(
    'accepts an allowlisted %i order response as %s',
    async (status, kind) => {
      const fetchImplementation = vi.fn(async () =>
        jsonResponse({ order: acceptedOrder }, status),
      );

      await expect(
        submitOrder(
          request,
          '11111111-1111-4111-8111-111111111111',
          fetchImplementation,
        ),
      ).resolves.toEqual({ ok: true, kind, order: acceptedOrder });
    },
  );

  it('sends only the flat public DTO and the UUID idempotency header', async () => {
    const fetchImplementation = vi.fn<FetchImplementation>(async () =>
      jsonResponse({ order: acceptedOrder }, 201),
    );
    const poisonedRequest = {
      ...request,
      priceMinor: 1,
      totalMinor: 1,
      orderStatus: 'PAID',
      role: 'OWNER',
      whatsappDestination: 'private-owner-number',
    } as typeof request;

    await submitOrder(
      poisonedRequest,
      '11111111-1111-4111-8111-111111111111',
      fetchImplementation,
    );

    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImplementation.mock.calls[0];
    expect(url).toBe('/api/orders');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': '11111111-1111-4111-8111-111111111111',
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual(request);
  });

  it.each([
    [
      'VALIDATION_ERROR',
      false,
      'Revisa los datos del pedido e inténtalo de nuevo.',
    ],
    [
      'IDEMPOTENCY_CONFLICT',
      false,
      'Los datos del pedido cambiaron. Revísalos antes de intentarlo de nuevo.',
    ],
    [
      'RATE_LIMITED',
      true,
      'Hay demasiados intentos. Espera un momento e inténtalo de nuevo.',
    ],
    [
      'PRODUCT_UNAVAILABLE',
      false,
      'Uno de los productos ya no está disponible. Revisa tu carrito.',
    ],
    [
      'PRODUCT_OUT_OF_STOCK',
      false,
      'Uno de los productos ya no está disponible. Revisa tu carrito.',
    ],
    [
      'INTERNAL_ERROR',
      true,
      'No pudimos enviar tu pedido. Inténtalo de nuevo.',
    ],
  ] as const)(
    'maps %s to fixed safe copy',
    async (code, canRetryUnchanged, message) => {
      const privateServerText = 'SQL password private-owner-number';
      const result = await submitOrder(
        request,
        '11111111-1111-4111-8111-111111111111',
        async () =>
          jsonResponse(
            {
              error: {
                code,
                message: privateServerText,
                requestId: 'private-request-id',
              },
            },
            code === 'RATE_LIMITED' ? 429 : 409,
          ),
      );

      expect(result).toEqual({
        ok: false,
        code,
        message,
        canRetryUnchanged,
      });
      expect(JSON.stringify(result)).not.toContain(privateServerText);
      expect(JSON.stringify(result)).not.toContain('private-request-id');
    },
  );

  it.each([
    ['malformed JSON success', new Response('{', { status: 201 })],
    [
      'success with unknown fields',
      jsonResponse({ order: { ...acceptedOrder, phone: '5555-5555' } }, 201),
    ],
    [
      'success with malformed money',
      jsonResponse({ order: { ...acceptedOrder, subtotalMinor: 'Q120' } }, 201),
    ],
    [
      'JSON body with a non-JSON content type',
      new Response(JSON.stringify({ order: acceptedOrder }), {
        status: 201,
        headers: { 'content-type': 'text/plain' },
      }),
    ],
    ['non-JSON error', new Response('private stack trace', { status: 500 })],
    [
      'unknown server error',
      jsonResponse(
        {
          error: {
            code: 'DATABASE_SECRET_ERROR',
            message: 'private database path',
            requestId: 'private-request-id',
          },
        },
        500,
      ),
    ],
  ])('maps a %s to one safe recoverable failure', async (_, response) => {
    const result = await submitOrder(
      request,
      '11111111-1111-4111-8111-111111111111',
      async () => response,
    );

    expect(result).toEqual({
      ok: false,
      code: 'UNEXPECTED_RESPONSE',
      message: 'No pudimos enviar tu pedido. Inténtalo de nuevo.',
      canRetryUnchanged: true,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /private|stack|database|request-id/i,
    );
  });

  it('maps a network exception without reflecting its text', async () => {
    const result = await submitOrder(
      request,
      '11111111-1111-4111-8111-111111111111',
      async () => {
        throw new Error('fetch failed for private internal URL');
      },
    );

    expect(result).toEqual({
      ok: false,
      code: 'NETWORK_ERROR',
      message:
        'No pudimos conectarnos para enviar tu pedido. Revisa tu conexión e inténtalo de nuevo.',
      canRetryUnchanged: true,
    });
    expect(JSON.stringify(result)).not.toContain('private internal URL');
  });
});
