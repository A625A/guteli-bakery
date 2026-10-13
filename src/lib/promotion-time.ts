const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Guatemala',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function toGuatemalaLocal(date: Date) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromGuatemalaLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new RangeError('Invalid Guatemala date');
  const wallTime = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wallTime))
    throw new RangeError('Invalid Guatemala date');
  let instant = wallTime;
  for (let attempt = 0; attempt < 3; attempt++) {
    const represented = Date.parse(
      `${toGuatemalaLocal(new Date(instant))}:00Z`,
    );
    instant += wallTime - represented;
  }
  const result = new Date(instant);
  if (toGuatemalaLocal(result) !== value)
    throw new RangeError('Invalid Guatemala date');
  return result;
}
