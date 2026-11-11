import { isAdminOrderReference } from '@/server/orders/admin-order-reference';
import { getRequestId } from '@/server/observability/request-id';
import {
  BoundedJsonBodyError,
  readBoundedJson,
} from '@/server/http/read-bounded-json';
import {
  manualPaymentInput,
  recordManualPayment,
} from '@/server/orders/verify-payment';
import {
  adminOrderErrorResponse,
  adminOrderValidationError,
  privateAdminOrderHeaders,
} from '../../route';

export const dynamic = 'force-dynamic';
export async function POST(
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
  )
    return adminOrderValidationError(requestId);
  try {
    const input = await readBoundedJson(request, 2048);
    const data = manualPaymentInput.safeParse(input);
    const { id } = await context.params;
    if (!data.success || !isAdminOrderReference(id))
      return adminOrderValidationError(requestId);
    const result = await recordManualPayment(
      id,
      data.data,
      request.headers,
      requestId,
    );
    return Response.json(
      { order: result },
      { headers: privateAdminOrderHeaders(requestId) },
    );
  } catch (error) {
    if (error instanceof BoundedJsonBodyError)
      return adminOrderValidationError(requestId);
    return adminOrderErrorResponse(error, requestId);
  }
}
