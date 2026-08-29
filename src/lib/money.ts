const wholeGtqFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const minorGtqFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGTQ(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError('GTQ amount must be a non-negative safe integer.');
  }

  const formatter =
    amountMinor % 100 === 0 ? wholeGtqFormatter : minorGtqFormatter;
  return formatter.format(amountMinor / 100).replace(/\u00a0/g, '');
}
