import { z } from 'zod';

import { getRequestId } from '@/server/observability/request-id';
import {
  adminCategoryDeleteSchema,
  adminCategoryUpdateSchema,
} from '@/server/products/admin-contracts';
import {
  adminCatalogErrorResponse,
  adminCatalogValidationError,
  hasJsonContentType,
  privateAdminCatalogHeaders,
} from '@/server/products/admin-http';
import {
  AdminCategoryError,
  adminGetCategory,
  deactivateAdminCategory,
  updateAdminCategory,
} from '@/server/products/admin-categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function body(request: Request) {
  if (!hasJsonContentType(request)) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function id(context: { params: Promise<{ id: string }> }) {
  return z
    .string()
    .uuid()
    .safeParse((await context.params).id);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  if (new URL(request.url).search)
    return adminCatalogValidationError(requestId);
  const parsedId = await id(context);
  if (!parsedId.success) return adminCatalogValidationError(requestId);
  try {
    const category = await adminGetCategory(parsedId.data, request.headers);
    if (!category) {
      return adminCatalogErrorResponse(
        new AdminCategoryError('CATEGORY_NOT_FOUND'),
        requestId,
      );
    }
    return Response.json(
      { category },
      { headers: privateAdminCatalogHeaders(requestId) },
    );
  } catch (error) {
    return adminCatalogErrorResponse(error, requestId);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request.headers);
  const [parsedId, raw] = await Promise.all([id(context), body(request)]);
  const parsed = adminCategoryUpdateSchema.safeParse(raw);
  if (!parsedId.success || !parsed.success) {
    return adminCatalogValidationError(requestId);
  }
  try {
    const result = await updateAdminCategory(
      parsedId.data,
      parsed.data,
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
  const [parsedId, raw] = await Promise.all([id(context), body(request)]);
  const parsed = adminCategoryDeleteSchema.safeParse(raw);
  if (!parsedId.success || !parsed.success) {
    return adminCatalogValidationError(requestId);
  }
  try {
    const result = await deactivateAdminCategory(
      parsedId.data,
      parsed.data,
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
