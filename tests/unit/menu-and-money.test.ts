import { describe, expect, it } from 'vitest';

import { operationalCopy } from '@/content/business';
import { filterMenuProducts, getMenuGuidance } from '@/domain/menu';
import { formatGTQ } from '@/lib/money';
import type { PublicCategoryDto } from '@/server/products/types';

const catalog: PublicCategoryDto[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'pretzels',
    name: 'Pretzels',
    products: [
      {
        id: '00000000-0000-4000-8000-000000000001',
        slug: 'pretzel-original',
        name: 'Originales',
        category: {
          id: '00000000-0000-4000-8000-000000000101',
          slug: 'pretzels',
          name: 'Pretzels',
        },
        priceMinor: 6000,
        saleUnit: 'Bolsa de 5',
        stockAvailable: true,
        imageUrl: '/images/products/pretzel-original.webp',
      },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    slug: 'nuditos',
    name: 'Nuditos',
    products: [
      {
        id: '00000000-0000-4000-8000-000000000010',
        slug: 'nuditos',
        name: 'Nuditos',
        category: {
          id: '00000000-0000-4000-8000-000000000104',
          slug: 'nuditos',
          name: 'Nuditos',
        },
        priceMinor: 6000,
        saleUnit: 'Bolsa de 15',
        stockAvailable: true,
        imageUrl: null,
      },
    ],
  },
];

describe('persistent menu', () => {
  it('filters known categories while preserving server order', () => {
    const products = catalog.flatMap(({ products }) => products);

    expect(
      filterMenuProducts(products, 'pretzels').map(({ slug }) => slug),
    ).toEqual(['pretzel-original']);
    expect(
      filterMenuProducts(products, 'breads').map(({ slug }) => slug),
    ).toEqual(['nuditos']);
    expect(filterMenuProducts(products, 'all').map(({ slug }) => slug)).toEqual(
      ['pretzel-original', 'nuditos'],
    );
  });

  it('keeps future categories visible in all products but out of known filters', () => {
    const futureProduct = {
      ...catalog[0].products[0],
      id: '00000000-0000-4000-8000-000000000099',
      slug: 'future-special',
      category: {
        id: '00000000-0000-4000-8000-000000000199',
        slug: 'future-special',
        name: 'Especiales',
      },
    };

    expect(
      filterMenuProducts([futureProduct], 'all').map(({ slug }) => slug),
    ).toEqual(['future-special']);
    expect(filterMenuProducts([futureProduct], 'pretzels')).toEqual([]);
  });

  it('derives current and future menu guidance without changing the ten-option copy', () => {
    expect(getMenuGuidance(10)).toBe(
      'Diez opciones preparadas para que armes tu solicitud con calma.',
    );
    expect(getMenuGuidance(11)).toBe(
      '11 opciones preparadas para que armes tu solicitud con calma.',
    );
  });

  it('formats integer minor-unit prices exactly for Guatemala', () => {
    expect(formatGTQ(1)).toBe('Q0.01');
    expect(formatGTQ(6001)).toBe('Q60.01');
    expect(formatGTQ(6050)).toBe('Q60.50');
    expect(formatGTQ(6000)).toBe('Q60');
    expect(formatGTQ(123456)).toBe('Q1,234.56');
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
