import { AuthorizationError } from '@/server/auth/authorize';
import {
  adminListOrders,
  parseAdminOrderFilters,
} from '@/server/orders/admin-list-orders';
import { AdminOrderError } from '@/server/orders/update-order';
import { getRequestId } from '@/server/observability/request-id';
import { InvalidMutationOriginError } from '@/server/security/origin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const privateAdminOrderHeaders = (requestId: string) => ({
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-request-id': requestId,
  'x-robots-tag': 'noindex, nofollow',
});

function responseError(
  requestId: string,
  code: string,
  message: string,
  status: number,
) {
  return Response.json(
    { error: { code, message, requestId } },
    { status, headers: privateAdminOrderHeaders(requestId) },
  );
}

export function adminOrderErrorResponse(error: unknown, requestId: string) {
  if (error instanceof AuthorizationError) {
    const status = error.code === 'FORBIDDEN' ? 403 : 401;
    const message =
      error.code === 'REAUTHENTICATION_REQUIRED'
        ? 'Vuelve a iniciar sesión y completa MFA para continuar.'
        : error.code === 'FORBIDDEN'
          ? 'Esta cuenta no puede administrar pedidos.'
          : 'Inicia sesión y completa MFA para continuar.';
    return responseError(requestId, error.code, message, status);
  }
  if (error instanceof InvalidMutationOriginError) {
    return responseError(
      requestId,
      error.code,
      'El origen de la solicitud no es válido.',
      403,
    );
  }
  if (error instanceof AdminOrderError) {
    const responses: Record<
      AdminOrderError['code'],
      readonly [number, string]
    > = {
      ORDER_NOT_FOUND: [404, 'No se encontró el pedido.'],
      STALE_ORDER: [
        409,
        'El pedido cambió. Actualiza la página antes de intentar de nuevo.',
      ],
      INVALID_STATUS_TRANSITION: [
        409,
        'Ese cambio de estado no está permitido.',
      ],
      PICKUP_QUOTE_FORBIDDEN: [
        409,
        'Los pedidos para recoger no admiten cotización de envío.',
      ],
      TERMINAL_ORDER: [409, 'Un pedido finalizado ya no puede cambiar.'],
      DELIVERY_QUOTE_OVERFLOW: [
        400,
        'La cotización excede el monto permitido.',
      ],
    };
    const [status, message] = responses[error.code];
    return responseError(requestId, error.code, message, status);
  }
  return responseError(
    requestId,
    'INTERNAL_ERROR',
    'No se pudo completar la operación del pedido.',
    500,
  );
}

export function adminOrderValidationError(requestId: string) {
  return responseError(
    requestId,
    'VALIDATION_ERROR',
    'Los datos del pedido no son válidos.',
    400,
  );
}

function filtersFrom(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const allowed = new Set([
    'page',
    'pageSize',
    'status',
    'fulfillment',
    'date',
  ]);
  for (const key of parameters.keys()) {
    if (!allowed.has(key) || parameters.getAll(key).length !== 1) {
      throw new RangeError('Invalid order filters.');
    }
  }
  return parseAdminOrderFilters({
    page: parameters.get('page'),
    pageSize: parameters.get('pageSize'),
    status: parameters.get('status') ?? undefined,
    fulfillment: parameters.get('fulfillment') ?? undefined,
    date: parameters.get('date') ?? undefined,
  });
}

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    const result = await adminListOrders(request.headers, filtersFrom(request));
    return Response.json(result, {
      status: 200,
      headers: privateAdminOrderHeaders(requestId),
    });
  } catch (error) {
    if (error instanceof RangeError)
      return adminOrderValidationError(requestId);
    return adminOrderErrorResponse(error, requestId);
  }
}
