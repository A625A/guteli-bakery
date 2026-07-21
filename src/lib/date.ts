import { siteConfig } from '@/content/business';

const guatemalaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guatemala',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export function getGuatemalaDate(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    guatemalaDateFormatter
      .formatToParts(now)
      .filter(
        ({ type }) => type === 'year' || type === 'month' || type === 'day',
      )
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addCalendarDays(date: string, days: number): string {
  const parts = parseIsoDate(date);

  if (!parts || !Number.isInteger(days)) {
    throw new RangeError('Expected a valid YYYY-MM-DD date and whole days.');
  }

  const result = new Date(0);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCFullYear(parts.year, parts.month - 1, parts.day + days);

  return formatDateParts({
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  });
}

export function getMinimumOrderDate(
  now: Date = new Date(),
  advanceDays: number = siteConfig.advanceDays,
): string {
  return addCalendarDays(getGuatemalaDate(now), advanceDays);
}

function parseIsoDate(value: string): DateParts | null {
  const match = isoDatePattern.exec(value);

  if (!match) {
    return null;
  }

  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(parts.year, parts.month - 1, parts.day);

  return parsed.getUTCFullYear() === parts.year &&
    parsed.getUTCMonth() + 1 === parts.month &&
    parsed.getUTCDate() === parts.day
    ? parts
    : null;
}

function formatDateParts({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
