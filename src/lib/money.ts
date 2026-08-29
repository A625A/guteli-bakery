const wholeGtqFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatGTQ(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError('GTQ amount must be a non-negative safe integer.');
  }

  const minor = BigInt(amountMinor);
  const whole = minor / BigInt(100);
  const cents = minor % BigInt(100);
  const wholeDisplay = wholeGtqFormatter
    .format(Number(whole))
    .replace(/\u00a0/g, '');

  return cents === BigInt(0)
    ? wholeDisplay
    : `${wholeDisplay}.${cents.toString().padStart(2, '0')}`;
}
