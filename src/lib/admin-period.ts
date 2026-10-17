const DAY = 86_400_000;
export type AdminPeriod = {
  key: string;
  from: string;
  to: string;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  days: string[];
  partial: boolean;
};
export function parseAdminPeriod(
  input: Record<string, unknown> = {},
  now = new Date(),
): AdminPeriod {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const key = input.period ?? '7';
  if (
    typeof key !== 'string' ||
    !['today', '7', '30', '90', 'custom'].includes(key)
  )
    throw new RangeError('Período inválido.');
  const midnight = (date: string) => Date.parse(date + 'T06:00:00.000Z');
  const iso = (n: number) => new Date(n).toISOString().slice(0, 10);
  let from: string, to: string;
  if (key === 'custom') {
    if (typeof input.from !== 'string' || typeof input.to !== 'string')
      throw new RangeError('Selecciona ambas fechas.');
    from = input.from;
    to = input.to;
  } else {
    to = today;
    from = iso(midnight(today) - (key === 'today' ? 0 : Number(key) - 1) * DAY);
  }
  if (
    ![from, to].every(
      (d) =>
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        Number.isFinite(midnight(d)) &&
        iso(midnight(d)) === d,
    ) ||
    from > to ||
    to > today
  )
    throw new RangeError('Rango de fechas inválido.');
  const start = midnight(from),
    limit = midnight(to) + DAY,
    span = limit - start;
  if (span > 366 * DAY)
    throw new RangeError('Selecciona como máximo 366 días.');
  const end = Math.min(limit, now.getTime());
  return {
    key,
    from,
    to,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    previousStart: new Date(start - span).toISOString(),
    previousEnd: new Date(start - span + end - start).toISOString(),
    days: Array.from({ length: span / DAY }, (_, i) => iso(start + i * DAY)),
    partial: end < limit,
  };
}
