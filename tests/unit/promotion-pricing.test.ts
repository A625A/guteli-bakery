import { describe, expect, it } from 'vitest';
import { priceProduct, type Promotion } from '@/domain/pricing';
import { fromGuatemalaLocal, toGuatemalaLocal } from '@/lib/promotion-time';

const promotion: Promotion = {
  id: 'p1',
  name: 'Semana Güteli',
  scope: 'CATALOG',
  productIds: [],
  discountBps: 7000,
  enabled: true,
  startsAt: '2026-10-08T06:00:00.000Z',
  endsAt: '2026-10-09T06:00:00.000Z',
  version: 1,
};
describe('current promotional pricing', () => {
  it('prices five Q100 items at Q150 only inside the promotion window', () => {
    const active = priceProduct(
      'product',
      10000,
      [promotion],
      new Date(promotion.startsAt),
    );
    expect(active.unitPriceMinor * 5).toBe(15000);
    expect(active.promotion?.name).toBe('Semana Güteli');
    expect(
      priceProduct('product', 10000, [promotion], new Date(promotion.endsAt))
        .unitPriceMinor * 5,
    ).toBe(50000);
    expect(
      priceProduct(
        'product',
        10000,
        [promotion],
        new Date('2026-10-08T05:59:59Z'),
      ).promotion,
    ).toBeNull();
  });
  it('uses only the highest enabled matching discount with deterministic ties', () => {
    const selected: Promotion = {
      ...promotion,
      id: 'p0',
      scope: 'SELECTED',
      productIds: ['chosen'],
      discountBps: 8000,
    };
    const disabled = {
      ...selected,
      id: 'p2',
      discountBps: 9000,
      enabled: false,
    };
    const now = new Date(promotion.startsAt);
    expect(
      priceProduct('chosen', 10000, [promotion, selected, disabled], now)
        .unitPriceMinor,
    ).toBe(2000);
    expect(
      priceProduct('other', 10000, [selected, promotion], now).unitPriceMinor,
    ).toBe(3000);
    expect(
      priceProduct('chosen', 10000, [{ ...selected, id: 'p3' }, selected], now)
        .promotion?.id,
    ).toBe('p0');
    expect(priceProduct('chosen', 10000, [disabled], now).unitPriceMinor).toBe(
      10000,
    );
  });
  it('rounds discounted unit prices to centavos before multiplying quantities', () => {
    expect(
      priceProduct(
        'product',
        101,
        [{ ...promotion, discountBps: 5000 }],
        new Date(promotion.startsAt),
      ).unitPriceMinor,
    ).toBe(51);
  });
  it('converts scheduling in the bakery timezone and rejects invalid dates', () => {
    expect(fromGuatemalaLocal('2026-10-08T00:00').toISOString()).toBe(
      '2026-10-08T06:00:00.000Z',
    );
    expect(toGuatemalaLocal(new Date(promotion.endsAt))).toBe(
      '2026-10-09T00:00',
    );
    expect(() => fromGuatemalaLocal('2026-02-30T10:00')).toThrow();
  });
});

import { promotionInputSchema } from '@/server/products/promotion-contract';
it('validates one or many selected products, nonzero bounded discounts and strictly increasing Guatemala schedules', () => {
  const input = {
    name: 'Oferta',
    scope: 'CATALOG',
    productIds: [],
    discountPercent: 12.34,
    startsAtLocal: '2026-10-08T00:00',
    endsAtLocal: '2026-10-09T00:00',
    enabled: true,
  };
  expect(promotionInputSchema.safeParse(input).success).toBe(true);
  const ids = [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
  ];
  for (const productIds of [[ids[0]], ids])
    expect(
      promotionInputSchema.safeParse({
        ...input,
        scope: 'SELECTED',
        productIds,
      }).success,
    ).toBe(true);
  for (const change of [
    { discountPercent: 0 },
    { discountPercent: 101 },
    { discountPercent: 1.234 },
    { endsAtLocal: input.startsAtLocal },
    { startsAtLocal: '2026-02-30T12:00' },
    { scope: 'SELECTED' },
    { scope: 'SELECTED', productIds: [ids[0], ids[0]] },
    { productIds: ids },
  ])
    expect(
      promotionInputSchema.safeParse({ ...input, ...change }).success,
    ).toBe(false);
});
