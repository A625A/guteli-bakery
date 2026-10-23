/** Private admin references; public checkout identifiers remain unchanged. */
export function isAdminOrderReference(value: string) {
  return /^(?:GUT-\d{2}-[A-Z0-9]{8}|PRUEBA-[1-5]-[a-f0-9]{8})$/.test(value);
}

export function normalizeAdminOrderReference(value: string) {
  const normalized = value.trim().toUpperCase();
  const practice = /^PRUEBA-([1-5])-([A-F0-9]{8})$/.exec(normalized);
  return practice
    ? `PRUEBA-${practice[1]}-${practice[2].toLowerCase()}`
    : normalized;
}
