const gtqFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatGTQ(amount: number): string {
  const digits = gtqFormatter.format(amount / 100).replace(/\D/g, '');

  return `Q${digits}`;
}
