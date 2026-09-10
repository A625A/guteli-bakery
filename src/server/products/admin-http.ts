import { AuthorizationError } from '@/server/auth/authorize';
import { InvalidMutationOriginError } from '@/server/security/origin';

import { AdminCategoryError } from './admin-categories';
import { AdminProductError } from './admin-products';

export const privateAdminCatalogHeaders = (requestId: string) => ({
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-request-id': requestId,
  'x-robots-tag': 'noindex, nofollow',
});

function responseError(
  requestId: string,
  code: string,
  message: string,
  status: number,
) {
  return Response.json(
    { error: { code, message, requestId } },
    { status, headers: privateAdminCatalogHeaders(requestId) },
  );
}

export function adminCatalogValidationError(requestId: string) {
  return responseError(
    requestId,
    'VALIDATION_ERROR',
    'Los datos del catálogo no son válidos.',
    400,
  );
}

export function adminCatalogErrorResponse(error: unknown, requestId: string) {
  if (error instanceof AuthorizationError) {
    const status = error.code === 'FORBIDDEN' ? 403 : 401;
    const message =
      error.code === 'REAUTHENTICATION_REQUIRED'
        ? 'Vuelve a iniciar sesión y completa MFA para continuar.'
        : error.code === 'FORBIDDEN'
          ? 'Esta cuenta no puede administrar el catálogo.'
          : 'Inicia sesión y completa MFA para continuar.';
    return responseError(requestId, error.code, message, status);
  }
  if (error instanceof InvalidMutationOriginError) {
    return responseError(
      requestId,
      error.code,
      'El origen de la solicitud no es válido.',
      403,
    );
  }
  if (error instanceof AdminProductError) {
    const response: Record<
      AdminProductError['code'],
      readonly [number, string]
    > = {
      PRODUCT_NOT_FOUND: [404, 'No se encontró el producto.'],
      PRODUCT_SLUG_EXISTS: [409, 'Ya existe un producto con ese slug.'],
      STALE_PRODUCT: [
        409,
        'El producto cambió. Actualiza la página antes de continuar.',
      ],
      INACTIVE_CATEGORY: [
        409,
        'Un producto activo requiere una categoría activa.',
      ],
    };
    const [status, message] = response[error.code];
    return responseError(requestId, error.code, message, status);
  }
  if (error instanceof AdminCategoryError) {
    const response: Record<
      AdminCategoryError['code'],
      readonly [number, string]
    > = {
      CATEGORY_NOT_FOUND: [404, 'No se encontró la categoría.'],
      CATEGORY_SLUG_EXISTS: [409, 'Ya existe una categoría con ese slug.'],
      STALE_CATEGORY: [
        409,
        'La categoría cambió. Actualiza la página antes de continuar.',
      ],
      CATEGORY_CONFIRMATION_REQUIRED: [
        400,
        'Confirma el impacto antes de desactivar la categoría.',
      ],
    };
    const [status, message] = response[error.code];
    return responseError(requestId, error.code, message, status);
  }
  return responseError(
    requestId,
    'INTERNAL_ERROR',
    'No se pudo completar la operación del catálogo.',
    500,
  );
}

export function hasJsonContentType(request: Request) {
  return (
    request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase() === 'application/json'
  );
}

export function paginationFromRequest(request: Request) {
  const parameters = new URL(request.url).searchParams;
  for (const key of parameters.keys()) {
    if (
      (key !== 'page' && key !== 'pageSize') ||
      parameters.getAll(key).length !== 1
    ) {
      throw new RangeError('Invalid catalog pagination.');
    }
  }
  return {
    page: parameters.get('page'),
    pageSize: parameters.get('pageSize'),
  };
}
