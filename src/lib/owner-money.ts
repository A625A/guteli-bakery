import { OwnerUiError } from './owner-ui-error';
/** Decimal input is parsed as integers so owner-entered prices never silently round. */
export function parseQuetzales(value: string): number {
  const parts = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!parts)
    throw new OwnerUiError(
      'Escribe el monto en quetzales con hasta dos decimales y punto decimal.',
    );
  const minor =
    Number(parts[1]) * 100 + Number((parts[2] ?? '').padEnd(2, '0'));
  if (minor > 2_147_483_647)
    throw new OwnerUiError('El monto en quetzales excede el límite permitido.');
  return minor;
}
export function quetzalesInput(minor: number | null | undefined): string {
  return minor == null
    ? ''
    : `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
