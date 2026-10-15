import { expect, it } from 'vitest';
import { parseQuetzales, quetzalesInput } from '@/lib/owner-money';
it('converts owner-entered quetzales exactly to integer centavos', () => {
  expect(parseQuetzales('60.50')).toBe(6050);
  expect(parseQuetzales('0.01')).toBe(1);
  expect(parseQuetzales('0')).toBe(0);
  expect(parseQuetzales('21474836.47')).toBe(2147483647);
  expect(quetzalesInput(6050)).toBe('60.50');
  expect(quetzalesInput(null)).toBe('');
});
it('rejects ambiguous, rounded, negative and overflowing amounts', () => {
  for (const value of [
    '',
    '1.234',
    '1,50',
    '-1',
    '1e3',
    '21474836.48',
    'Infinity',
  ]) {
    expect(() => parseQuetzales(value)).toThrow('quetzales');
  }
});
