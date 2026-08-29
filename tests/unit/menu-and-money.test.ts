import { describe, expect, it } from 'vitest';

import { operationalCopy } from '@/content/business';
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
  it('keeps public catalog prices in integer minor units', () => {
    expect(
      catalog
        .flatMap(({ products }) => products)
        .map(({ priceMinor }) => priceMinor),
    ).toEqual([6000, 6000]);
  });

  it('exposes category labels and stable database product identity', () => {
    expect(catalog.map(({ slug }) => slug)).toEqual(['pretzels', 'nuditos']);
    expect(catalog[0]?.products[0]).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Originales',
      category: { name: 'Pretzels' },
      priceMinor: 6000,
    });
  });

  it('formats whole quetzal minor-unit prices for Guatemala', () => {
    expect(formatGTQ(13500)).toBe('Q135');
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
