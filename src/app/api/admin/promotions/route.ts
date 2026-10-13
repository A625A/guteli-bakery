import { getRequestId } from '@/server/observability/request-id';
import {
  adminPromotionEditor,
  savePromotion,
} from '@/server/products/admin-promotions';
import { promotionInputSchema } from '@/server/products/promotion-contract';
import { promotionErrorResponse } from '@/server/products/promotion-http';
import {
  adminCatalogValidationError,
  hasJsonContentType,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    return Response.json(await adminPromotionEditor(request.headers), {
      headers: privateAdminCatalogHeaders(requestId),
    });
  } catch (error) {
    return promotionErrorResponse(error, requestId);
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
  const parsed = promotionInputSchema.safeParse(body);
  if (!parsed.success) return adminCatalogValidationError(requestId);
  try {
    return Response.json(
      await savePromotion(parsed.data, request.headers, requestId),
      { status: 201, headers: privateAdminCatalogHeaders(requestId) },
    );
  } catch (error) {
    return promotionErrorResponse(error, requestId);
  }
}
