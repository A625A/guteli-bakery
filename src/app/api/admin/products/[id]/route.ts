import { z } from 'zod';

import { getRequestId } from '@/server/observability/request-id';
import {
  adminProductDeleteSchema,
  adminProductUpdateSchema,
} from '@/server/products/admin-contracts';
import {
  adminCatalogErrorResponse,
  adminCatalogValidationError,
  hasJsonContentType,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
import {
  AdminProductError,
  adminGetProduct,
  deleteAdminProduct,
  updateAdminProduct,
} from '@/server/products/admin-products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const idSchema = z.string().uuid();

async function validatedId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return idSchema.safeParse(id);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  if (new URL(request.url).search)
    return adminCatalogValidationError(requestId);
  const id = await validatedId(context);
  if (!id.success) return adminCatalogValidationError(requestId);
  try {
    const product = await adminGetProduct(id.data, request.headers);
    if (!product) {
      return adminCatalogErrorResponse(
        new AdminProductError('PRODUCT_NOT_FOUND'),
        requestId,
      );
    }
    return Response.json(
      { product },
      { headers: privateAdminCatalogHeaders(requestId) },
    );
  } catch (error) {
    return adminCatalogErrorResponse(error, requestId);
  }
}

async function requestBody(request: Request) {
  if (!hasJsonContentType(request)) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  const [id, rawBody] = await Promise.all([
    validatedId(context),
    requestBody(request),
  ]);
  const body = adminProductUpdateSchema.safeParse(rawBody);
  if (!id.success || !body.success) {
    return adminCatalogValidationError(requestId);
  }
  try {
    const result = await updateAdminProduct(
      id.data,
      body.data,
      request.headers,
      requestId,
    );
    return Response.json(result, {
      headers: privateAdminCatalogHeaders(requestId),
    });
  } catch (error) {
    return adminCatalogErrorResponse(error, requestId);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  const [id, rawBody] = await Promise.all([
    validatedId(context),
    requestBody(request),
  ]);
  const body = adminProductDeleteSchema.safeParse(rawBody);
  if (!id.success || !body.success) {
    return adminCatalogValidationError(requestId);
  }
  try {
    const result = await deleteAdminProduct(
      id.data,
      body.data.expectedVersion,
      request.headers,
      requestId,
    );
    return Response.json(result, {
      headers: privateAdminCatalogHeaders(requestId),
    });
  } catch (error) {
    return adminCatalogErrorResponse(error, requestId);
  }
}
