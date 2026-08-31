import { z } from 'zod';

import type { CreateOrderRequest } from '@/domain/order-contract';

const safeRetryMessage = 'No pudimos enviar tu pedido. Inténtalo de nuevo.';
const networkMessage =
  'No pudimos conectarnos para enviar tu pedido. Revisa tu conexión e inténtalo de nuevo.';

const publicOrderErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'PRODUCT_UNAVAILABLE',
  'PRODUCT_OUT_OF_STOCK',
  'INTERNAL_ERROR',
]);

const moneySchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const acceptedOrderSchema = z
  .object({
    publicId: z.string().min(1).max(32),
    receiptToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    orderStatus: z.enum([
      'RECEIVED',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'COMPLETED',
      'CANCELLED',
    ]),
    paymentStatus: z.enum(['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED']),
    subtotalMinor: moneySchema,
    shippingMinor: moneySchema.nullable(),
    totalMinor: moneySchema.nullable(),
  })
  .strict();

const successEnvelopeSchema = z.object({ order: acceptedOrderSchema }).strict();

const errorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: publicOrderErrorCodeSchema,
        message: z.string(),
        requestId: z.string(),
        fieldErrors: z.record(z.string(), z.string()).optional(),
      })
      .strict(),
  })
  .strict();

export type AcceptedOrder = z.infer<typeof acceptedOrderSchema>;
export type SubmitOrderResult =
  | Readonly<{
      ok: true;
      kind: 'created' | 'replayed';
      order: AcceptedOrder;
    }>
  | Readonly<{
      ok: false;
      code:
        | z.infer<typeof publicOrderErrorCodeSchema>
        | 'NETWORK_ERROR'
        | 'UNEXPECTED_RESPONSE';
      message: string;
      canRetryUnchanged: boolean;
    }>;

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function safeRequestBody(request: CreateOrderRequest): CreateOrderRequest {
  return {
    customerName: request.customerName,
    phone: request.phone,
    fulfillment: request.fulfillment,
    requestedDate: request.requestedDate,
    ...(request.fulfillment === 'delivery' && request.deliveryLocation
      ? { deliveryLocation: request.deliveryLocation }
      : {}),
    ...(request.notes === undefined ? {} : { notes: request.notes }),
    items: request.items.map(({ productId, quantity }) => ({
      productId,
      quantity,
    })),
  };
}

function knownFailure(
  code: z.infer<typeof publicOrderErrorCodeSchema>,
): Extract<SubmitOrderResult, { ok: false }> {
  switch (code) {
    case 'VALIDATION_ERROR':
      return {
        ok: false,
        code,
        message: 'Revisa los datos del pedido e inténtalo de nuevo.',
        canRetryUnchanged: false,
      };
    case 'IDEMPOTENCY_CONFLICT':
      return {
        ok: false,
        code,
        message:
          'Los datos del pedido cambiaron. Revísalos antes de intentarlo de nuevo.',
        canRetryUnchanged: false,
      };
    case 'RATE_LIMITED':
      return {
        ok: false,
        code,
        message:
          'Hay demasiados intentos. Espera un momento e inténtalo de nuevo.',
        canRetryUnchanged: true,
      };
    case 'PRODUCT_UNAVAILABLE':
    case 'PRODUCT_OUT_OF_STOCK':
      return {
        ok: false,
        code,
        message:
          'Uno de los productos ya no está disponible. Revisa tu carrito.',
        canRetryUnchanged: false,
      };
    case 'INTERNAL_ERROR':
      return {
        ok: false,
        code,
        message: safeRetryMessage,
        canRetryUnchanged: true,
      };
  }
}

export async function submitOrder(
  request: CreateOrderRequest,
  idempotencyKey: string,
  fetchImplementation: FetchImplementation = fetch,
): Promise<SubmitOrderResult> {
  let response: Response;

  try {
    response = await fetchImplementation('/api/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(safeRequestBody(request)),
    });
  } catch {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: networkMessage,
      canRetryUnchanged: true,
    };
  }

  const contentType = response.headers
    .get('content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json') {
    return {
      ok: false,
      code: 'UNEXPECTED_RESPONSE',
      message: safeRetryMessage,
      canRetryUnchanged: true,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      code: 'UNEXPECTED_RESPONSE',
      message: safeRetryMessage,
      canRetryUnchanged: true,
    };
  }

  if (response.status === 200 || response.status === 201) {
    const parsed = successEnvelopeSchema.safeParse(body);
    if (parsed.success) {
      return {
        ok: true,
        kind: response.status === 201 ? 'created' : 'replayed',
        order: parsed.data.order,
      };
    }
  } else {
    const parsed = errorEnvelopeSchema.safeParse(body);
    if (parsed.success) return knownFailure(parsed.data.error.code);
  }

  return {
    ok: false,
    code: 'UNEXPECTED_RESPONSE',
    message: safeRetryMessage,
    canRetryUnchanged: true,
  };
}
