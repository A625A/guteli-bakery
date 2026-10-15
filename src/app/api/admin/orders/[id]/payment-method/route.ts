import { getRequestId } from '@/server/observability/request-id';
import {
  assignPaymentMethod,
  paymentMethodInput as schema,
} from '@/server/orders/assign-payment-method';

import {
  adminOrderErrorResponse,
  adminOrderValidationError,
  privateAdminOrderHeaders,
} from '../../route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const result = await assignPaymentMethod(
      id,
      parsed.data,
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
