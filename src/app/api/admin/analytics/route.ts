import { getAdminAnalytics } from '@/server/admin/analytics';
import { parseAdminPeriod } from '@/lib/admin-period';
import { requireAdmin } from '@/server/auth/authorize';
import { getRequestId } from '@/server/observability/request-id';
import {
  adminCatalogErrorResponse,
  adminCatalogValidationError,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    await requireAdmin(request.headers);
    const params = new URL(request.url).searchParams;
    for (const key of params.keys())
      if (
        !['period', 'from', 'to'].includes(key) ||
        params.getAll(key).length !== 1
      )
        throw new RangeError('Invalid range');
    const result = await getAdminAnalytics(
      parseAdminPeriod(Object.fromEntries(params)),
      request.headers,
    );
    return Response.json(result, {
      headers: privateAdminCatalogHeaders(requestId),
    });
  } catch (error) {
    if (error instanceof RangeError)
      return adminCatalogValidationError(requestId);
    return adminCatalogErrorResponse(error, requestId);
  }
}
