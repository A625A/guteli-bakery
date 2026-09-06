import { adminGetOrder } from '@/server/orders/admin-get-order';
import { getRequestId } from '@/server/observability/request-id';

import {
  adminOrderErrorResponse,
  adminOrderValidationError,
  privateAdminOrderHeaders,
} from '../route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const publicIdPattern = /^GUT-\d{2}-[A-Z0-9]{8}$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  try {
    if (new URL(request.url).search)
      return adminOrderValidationError(requestId);
    const { id } = await context.params;
    if (!publicIdPattern.test(id)) return adminOrderValidationError(requestId);
    const order = await adminGetOrder(id, request.headers);
    if (!order) {
      return Response.json(
        {
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'No se encontró el pedido.',
            requestId,
          },
        },
        { status: 404, headers: privateAdminOrderHeaders(requestId) },
      );
    }
    return Response.json(
      { order },
      { status: 200, headers: privateAdminOrderHeaders(requestId) },
    );
  } catch (error) {
    return adminOrderErrorResponse(error, requestId);
  }
}
