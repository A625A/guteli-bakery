import { createOrderRequestSchema } from '@/domain/order-contract';
import {
  getOrderSecuritySettings,
  type OrderSecuritySettings,
} from '@/server/config/order-security-env';
import { errorResponse, type PublicError } from '@/server/http/error-response';
import { getRequestId } from '@/server/observability/request-id';
import { CreateOrderError, createOrder } from '@/server/orders/create-order';
import type { PublicOrderErrorCode } from '@/server/orders/errors';
import type { OrdersDatabase } from '@/server/orders/types';
import {
  createHmacSubject,
  getTrustedClientAddress,
  normalizeGuatemalaPhoneRateIdentity,
} from '@/server/security/client-subject';
import { consumeFixedWindowRateLimit } from '@/server/security/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_ORDER_BODY_BYTES = 16 * 1024;
const idempotencyKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PostError = PublicError<PublicOrderErrorCode>;

function postErrorResponse(
  error: PostError,
  status: number,
  retryAfterSeconds?: number,
) {
  return errorResponse(error, status, retryAfterSeconds);
}

class OrderRequestBodyError extends Error {
  readonly kind: 'malformed' | 'too_large';

  constructor(kind: 'malformed' | 'too_large') {
    super(kind);
    this.kind = kind;
  }
}

export type OrdersRouteDependencies = Readonly<{
  database?: OrdersDatabase;
  now?: () => Date;
  getOrderSecuritySettings?: () => OrderSecuritySettings;
  getDirectClientAddress?: (request: Request) => string | null | undefined;
}>;

async function getDatabase(database?: OrdersDatabase) {
  return database ?? (await import('@/server/db/client')).db;
}

function isJsonContentType(value: string | null) {
  return value?.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

async function readBoundedJsonBody(request: Request): Promise<unknown> {
  if (!request.body) throw new OrderRequestBodyError('malformed');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_ORDER_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new OrderRequestBodyError('too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    throw new OrderRequestBodyError('malformed');
  }
}

function validationResponse(
  requestId: string,
  fieldErrors?: Record<string, string>,
) {
  return postErrorResponse(
    {
      code: 'VALIDATION_ERROR',
      message: 'Los datos del pedido no son válidos.',
      requestId,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    400,
  );
}

function safeFieldErrors(
  error: ReturnType<typeof createOrderRequestSchema.safeParse>,
) {
  if (error.success) return undefined;

  const fieldErrors: Record<string, string> = {};
  for (const issue of error.error.issues) {
    const field = issue.path.map(String).join('.') || 'request';
    fieldErrors[field] = 'Revisa este campo.';
  }
  return fieldErrors;
}

function orderErrorResponse(error: CreateOrderError, requestId: string) {
  switch (error.code) {
    case 'IDEMPOTENCY_CONFLICT':
      return postErrorResponse(
        {
          code: error.code,
          message: 'Esta clave de solicitud ya fue usada con otro pedido.',
          requestId,
        },
        409,
      );
    case 'PRODUCT_UNAVAILABLE':
    case 'PRODUCT_OUT_OF_STOCK':
      return postErrorResponse(
        {
          code: error.code,
          message: 'Uno de los productos ya no está disponible.',
          requestId,
        },
        409,
      );
    case 'RATE_LIMITED':
      return postErrorResponse(
        {
          code: error.code,
          message: 'Intenta de nuevo más tarde.',
          requestId,
        },
        429,
        error.retryAfterSeconds,
      );
    default:
      return postErrorResponse(
        {
          code: 'INTERNAL_ERROR',
          message: 'No se pudo crear el pedido.',
          requestId,
        },
        500,
      );
  }
}

export function createPostOrderHandler(
  dependencies: OrdersRouteDependencies = {},
) {
  return async function POST(request: Request): Promise<Response> {
    const requestId = getRequestId(request.headers);
    const now = dependencies.now?.() ?? new Date();
    let settings: OrderSecuritySettings;
    let clientAddress: string;

    try {
      settings =
        dependencies.getOrderSecuritySettings?.() ?? getOrderSecuritySettings();
      clientAddress = getTrustedClientAddress(request, {
        trustedProxyHops: settings.trustedProxyHops,
        directAddress: dependencies.getDirectClientAddress?.(request),
      });
    } catch {
      return postErrorResponse(
        {
          code: 'INTERNAL_ERROR',
          message: 'El servicio de pedidos no está disponible.',
          requestId,
        },
        503,
      );
    }

    try {
      const database = await getDatabase(dependencies.database);
      const attemptRateLimit = await database.transaction((transaction) =>
        consumeFixedWindowRateLimit(transaction, {
          policy: 'ORDER_ATTEMPT_IP',
          subject: createHmacSubject(
            settings.rateLimitSecret,
            'order-attempt-ip',
            clientAddress,
          ),
          limit: 10,
          windowMs: 15 * 60 * 1000,
          now,
        }),
      );
      if (!attemptRateLimit.allowed) {
        return postErrorResponse(
          {
            code: 'RATE_LIMITED',
            message: 'Intenta de nuevo más tarde.',
            requestId,
          },
          429,
          attemptRateLimit.retryAfterSeconds,
        );
      }

      if (!isJsonContentType(request.headers.get('content-type'))) {
        return validationResponse(requestId);
      }

      const idempotencyKey = request.headers.get('idempotency-key');
      if (!idempotencyKey || !idempotencyKeyPattern.test(idempotencyKey)) {
        return validationResponse(requestId);
      }

      const parsedRequest = createOrderRequestSchema.safeParse(
        await readBoundedJsonBody(request),
      );
      if (!parsedRequest.success) {
        return validationResponse(requestId, safeFieldErrors(parsedRequest));
      }
      const phoneRateIdentity = normalizeGuatemalaPhoneRateIdentity(
        parsedRequest.data.phone,
      );

      const result = await createOrder({
        request: parsedRequest.data,
        idempotencyKey: idempotencyKey.toLowerCase(),
        idempotencySubject: createHmacSubject(
          settings.receiptTokenSecret,
          'public-order-idempotency',
          'public-storefront',
        ),
        successfulOrderRateLimitSubject: createHmacSubject(
          settings.rateLimitSecret,
          'order-success-phone',
          phoneRateIdentity,
        ),
        requestId,
        receiptTokenSecret: settings.receiptTokenSecret,
        now,
        database,
      });

      return Response.json(
        { order: result.order },
        {
          status: result.kind === 'created' ? 201 : 200,
          headers: {
            'cache-control': 'no-store',
            'x-request-id': requestId,
          },
        },
      );
    } catch (error) {
      if (error instanceof OrderRequestBodyError) {
        if (error.kind === 'too_large') {
          return postErrorResponse(
            {
              code: 'VALIDATION_ERROR',
              message: 'El pedido es demasiado grande.',
              requestId,
            },
            413,
          );
        }
        return validationResponse(requestId);
      }
      if (error instanceof CreateOrderError) {
        return orderErrorResponse(error, requestId);
      }
      return postErrorResponse(
        {
          code: 'INTERNAL_ERROR',
          message: 'No se pudo crear el pedido.',
          requestId,
        },
        500,
      );
    }
  };
}

export const POST = createPostOrderHandler();
