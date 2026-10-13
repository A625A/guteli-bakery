import { z } from 'zod';
import { getRequestId } from '@/server/observability/request-id';
import { savePromotion } from '@/server/products/admin-promotions';
import { promotionInputSchema } from '@/server/products/promotion-contract';
import { promotionErrorResponse } from '@/server/products/promotion-http';
import {
  adminCatalogValidationError,
  hasJsonContentType,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
export const dynamic = 'force-dynamic';
export async function PATCH(
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
  const envelope = z
    .object({ expectedVersion: z.number().int().positive() })
    .passthrough()
    .safeParse(body);
  const id = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  if (!envelope.success || !id.success)
    return adminCatalogValidationError(requestId);
  const { expectedVersion, ...input } = envelope.data;
  const parsed = promotionInputSchema.safeParse(input);
  if (!parsed.success) return adminCatalogValidationError(requestId);
  try {
    return Response.json(
      await savePromotion(parsed.data, request.headers, requestId, {
        id: id.data,
        expectedVersion,
      }),
      { headers: privateAdminCatalogHeaders(requestId) },
    );
  } catch (error) {
    return promotionErrorResponse(error, requestId);
  }
}
