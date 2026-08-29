export const publicOrderErrorCodes = [
  'VALIDATION_ERROR',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'PRODUCT_UNAVAILABLE',
  'PRODUCT_OUT_OF_STOCK',
  'INTERNAL_ERROR',
] as const;

export type PublicOrderErrorCode = (typeof publicOrderErrorCodes)[number];
