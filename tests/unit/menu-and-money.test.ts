import { describe, expect, it } from 'vitest';

import { menuProducts } from '@/content/menu';
import { formatGTQ } from '@/lib/money';

describe('confirmed menu', () => {
  it('contains the eight flyer variants without invented quantities', () => {
    expect(
      menuProducts.map(({ id, price, saleUnit }) => ({ id, price, saleUnit })),
    ).toEqual([
      { id: 'pretzel-original', price: 60, saleUnit: 'Bolsa de 5' },
      { id: 'pretzel-jalapeno', price: 75, saleUnit: 'Bolsa de 5' },
      { id: 'pretzel-pepperoni', price: 75, saleUnit: 'Bolsa de 5' },
      { id: 'bagel-original', price: 60, saleUnit: null },
      { id: 'bagel-jalapeno', price: 75, saleUnit: null },
      { id: 'bagel-pepperoni', price: 75, saleUnit: null },
      { id: 'burger-buns', price: 55, saleUnit: null },
      { id: 'nuditos', price: 60, saleUnit: 'Bolsa de 15' },
    ]);
  });

  it('formats whole quetzal prices for Guatemala', () => {
    expect(formatGTQ(135)).toBe('Q135');
  });
});
