import { getRequestId } from '@/server/observability/request-id';
import {
  adminCategoryCreateSchema,
  parseAdminCategorySearch,
  parseAdminCatalogPagination,
} from '@/server/products/admin-contracts';
import {
  adminCatalogErrorResponse,
  adminCatalogValidationError,
  categoryListFromRequest,
  hasJsonContentType,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
import {
  adminListCategories,
  createAdminCategory,
} from '@/server/products/admin-categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    const parameters = categoryListFromRequest(request);
    const result = await adminListCategories(request.headers, {
      ...parseAdminCatalogPagination(parameters),
      search: parseAdminCategorySearch(parameters.search),
    });
    return Response.json(result, {
      headers: privateAdminCatalogHeaders(requestId),
    });
  } catch (error) {
    if (error instanceof RangeError)
      return adminCatalogValidationError(requestId);
    return adminCatalogErrorResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  if (!hasJsonContentType(request))
    return adminCatalogValidationError(requestId);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminCatalogValidationError(requestId);
  }
  const parsed = adminCategoryCreateSchema.safeParse(body);
  if (!parsed.success) return adminCatalogValidationError(requestId);
  try {
    const result = await createAdminCategory(
      parsed.data,
      request.headers,
      requestId,
    );
    return Response.json(result, {
      status: 201,
      headers: privateAdminCatalogHeaders(requestId),
    });
  } catch (error) {
    return adminCatalogErrorResponse(error, requestId);
  }
}
