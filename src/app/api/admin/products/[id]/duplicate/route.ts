import { z } from 'zod';

import { getRequestId } from '@/server/observability/request-id';
import { adminProductDuplicateSchema } from '@/server/products/admin-contracts';
import {
  adminCatalogErrorResponse,
  adminCatalogValidationError,
  hasJsonContentType,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
import { duplicateAdminProduct } from '@/server/products/admin-products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  if (!hasJsonContentType(request))
    return adminCatalogValidationError(requestId);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminCatalogValidationError(requestId);
  }
  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  const parsed = adminProductDuplicateSchema.safeParse(body);
  if (!parsedId.success || !parsed.success) {
    return adminCatalogValidationError(requestId);
  }
  try {
    const result = await duplicateAdminProduct(
      parsedId.data,
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
