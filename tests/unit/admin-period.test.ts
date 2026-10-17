import { describe, expect, it } from 'vitest';
import { parseAdminPeriod } from '@/lib/admin-period';
describe('Guatemala analytics periods', () => {
  it('uses the local day and compares equal elapsed intervals', () => {
    const p = parseAdminPeriod(
      { period: 'today' },
      new Date('2026-10-15T05:30:00Z'),
    );
    expect(p.from).toBe('2026-10-14');
    expect(p.start).toBe('2026-10-14T06:00:00.000Z');
    expect(p.end).toBe('2026-10-15T05:30:00.000Z');
    expect(Date.parse(p.end) - Date.parse(p.start)).toBe(
      Date.parse(p.previousEnd) - Date.parse(p.previousStart),
    );
  });
  it('rejects invalid, reversed, future and unbounded ranges', () => {
    const now = new Date('2026-10-15T18:00:00Z');
    for (const [from, to] of [
      ['2026-02-30', '2026-03-01'],
      ['2026-10-15', '2026-10-01'],
      ['2026-10-01', '2026-10-16'],
      ['2020-01-01', '2026-10-15'],
    ])
      expect(() =>
        parseAdminPeriod({ period: 'custom', from, to }, now),
      ).toThrow(RangeError);
    expect(() => parseAdminPeriod({ period: 'bad' }, now)).toThrow(RangeError);
  });
  it('accepts an inclusive custom range and fills calendar dates', () => {
    const p = parseAdminPeriod(
      { period: 'custom', from: '2026-10-01', to: '2026-10-03' },
      new Date('2026-10-15T18:00:00Z'),
    );
    expect(p.days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(p.end).toBe('2026-10-04T06:00:00.000Z');
  });
});
