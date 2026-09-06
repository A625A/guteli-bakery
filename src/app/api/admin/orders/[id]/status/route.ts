import { z } from 'zod';

import { orderStatuses } from '@/domain/order-state';
import { getRequestId } from '@/server/observability/request-id';
import { updateOrderStatus } from '@/server/orders/update-order';

import {
  adminOrderErrorResponse,
  adminOrderValidationError,
  privateAdminOrderHeaders,
} from '../../route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const schema = z
  .object({
    status: z.enum(orderStatuses),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
const publicIdPattern = /^GUT-\d{2}-[A-Z0-9]{8}$/;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  if (
    request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase() !== 'application/json'
  ) {
    return adminOrderValidationError(requestId);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminOrderValidationError(requestId);
  }
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(body);
    if (!publicIdPattern.test(id) || !parsed.success) {
      return adminOrderValidationError(requestId);
    }
    const result = await updateOrderStatus(
      { orderId: id, ...parsed.data },
      request.headers,
      requestId,
    );
    return Response.json(result, {
      status: 200,
      headers: privateAdminOrderHeaders(requestId),
    });
  } catch (error) {
    return adminOrderErrorResponse(error, requestId);
  }
}
