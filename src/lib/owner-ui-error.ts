/** Only deliberate, Spanish interface errors may be shown directly to an owner. */
export class OwnerUiError extends Error {}
export function ownerErrorMessage(error: unknown, fallback: string): string {
  return error instanceof OwnerUiError ? error.message : fallback;
}
