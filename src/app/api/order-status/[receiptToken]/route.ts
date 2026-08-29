import { errorResponse } from '@/server/http/error-response';
import { getRequestId } from '@/server/observability/request-id';
import { getReceipt } from '@/server/orders/get-receipt';
import type { OrdersDatabase } from '@/server/orders/types';

export const dynamic = 'force-dynamic';

export type ReceiptRouteDependencies = Readonly<{
  database?: OrdersDatabase;
}>;

export function createGetReceiptHandler(
  dependencies: ReceiptRouteDependencies = {},
) {
  return async function GET(
    request: Request,
    context: { params: Promise<{ receiptToken: string }> },
  ): Promise<Response> {
    const requestId = getRequestId(request.headers);

    try {
      const { receiptToken } = await context.params;
      const receipt = await getReceipt(receiptToken, dependencies.database);
      if (!receipt) {
        return errorResponse(
          {
            code: 'ORDER_NOT_FOUND',
            message: 'No se encontró el pedido.',
            requestId,
          },
          404,
        );
      }
      return Response.json(
        { receipt },
        {
          status: 200,
          headers: {
            'cache-control': 'no-store',
            'x-request-id': requestId,
          },
        },
      );
    } catch {
      return errorResponse(
        {
          code: 'INTERNAL_ERROR',
          message: 'No se pudo consultar el pedido.',
          requestId,
        },
        500,
      );
    }
  };
}

export const GET = createGetReceiptHandler();
