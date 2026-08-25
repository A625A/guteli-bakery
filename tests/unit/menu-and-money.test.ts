import { describe, expect, it } from 'vitest';

import { operationalCopy } from '@/content/business';
import { getMenuProduct, menuCategories, menuProducts } from '@/content/menu';
import { formatGTQ } from '@/lib/money';

describe('confirmed menu', () => {
  it('contains the approved variants without invented quantities', () => {
    expect(
      menuProducts.map(({ id, price, saleUnit }) => ({ id, price, saleUnit })),
    ).toEqual([
      { id: 'pretzel-original', price: 60, saleUnit: 'Bolsa de 5' },
      { id: 'pretzel-jalapeno', price: 75, saleUnit: 'Bolsa de 5' },
      { id: 'pretzel-pepperoni', price: 75, saleUnit: 'Bolsa de 5' },
      {
        id: 'pretzel-tomato-basil',
        price: 75,
        saleUnit: 'Bolsa de 5',
      },
      { id: 'bagel-original', price: 60, saleUnit: null },
      { id: 'bagel-jalapeno', price: 75, saleUnit: null },
      { id: 'bagel-pepperoni', price: 75, saleUnit: null },
      {
        id: 'bagel-tomato-basil',
        price: 75,
        saleUnit: 'Bolsa de 5',
      },
      { id: 'burger-buns', price: 55, saleUnit: null },
      { id: 'nuditos', price: 60, saleUnit: 'Bolsa de 15' },
    ]);
  });

  it('formats whole quetzal prices for Guatemala', () => {
    expect(formatGTQ(135)).toBe('Q135');
  });

  it('exposes the confirmed category order and product lookup', () => {
    expect(menuCategories.map(({ id }) => id)).toEqual([
      'pretzels',
      'bagels',
      'burger-buns',
      'nuditos',
    ]);
    expect(getMenuProduct('pretzel-jalapeno')).toMatchObject({
      name: 'Queso y jalapeño',
      price: 75,
    });
  });

  it('uses the approved fallback and confirmation language', () => {
    expect(operationalCopy).toMatchObject({
      quantityUnknown: 'Cantidad por confirmar',
      deliveryCost: 'Costo de envío por confirmar según ubicación',
      confirmation: 'El pedido queda sujeto a confirmación por WhatsApp',
      pickupInformation: 'Solicita información de recogida por WhatsApp',
    });
  });
});
