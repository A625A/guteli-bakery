import { PromotionError } from './admin-promotions';
import {
  adminCatalogErrorResponse,
  privateAdminCatalogHeaders,
} from './admin-http';

export function promotionErrorResponse(error: unknown, requestId: string) {
  if (error instanceof PromotionError) {
    const errors = {
      PROMOTION_NOT_FOUND: [404, 'No se encontró la promoción.'],
      STALE_PROMOTION: [
        409,
        'La promoción cambió. Actualiza la página antes de guardar.',
      ],
      INVALID_PROMOTION_PRODUCTS: [
        400,
        'Selecciona productos existentes para la promoción.',
      ],
    } as const;
    const [status, message] = errors[error.code];
    return Response.json(
      { error: { code: error.code, message, requestId } },
      { status, headers: privateAdminCatalogHeaders(requestId) },
    );
  }
  return adminCatalogErrorResponse(error, requestId);
}
