import { expect, it } from 'vitest';
import { parseProductFilters } from '@/server/products/admin-contracts';
it('validates filters, preserves literals and rejects invalid choices', () => {
  expect(
    parseProductFilters({ search: ' Pan % ', state: 'active', sort: 'price' }),
  ).toEqual({
    search: 'Pan %',
    state: 'active',
    sort: 'price',
    category: undefined,
  });
  for (const input of [
    { state: 'bad' },
    { sort: 'bad' },
    { category: 'not-a-uuid' },
    { search: 'a'.repeat(161) },
  ])
    expect(() => parseProductFilters(input)).toThrow();
});
