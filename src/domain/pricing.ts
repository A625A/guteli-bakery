export type Promotion = Readonly<{
  id: string;
  name: string;
  scope: 'CATALOG' | 'SELECTED';
  productIds: readonly string[];
  discountBps: number;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
  version: number;
}>;

export function priceProduct(
  productId: string,
  basePriceMinor: number,
  promotions: readonly Promotion[],
  now: Date,
) {
  if (
    !Number.isSafeInteger(basePriceMinor) ||
    basePriceMinor < 0 ||
    basePriceMinor > 2_147_483_647 ||
    !Number.isFinite(now.getTime())
  )
    throw new RangeError('Invalid pricing input');
  const applicable = promotions.filter(
    (promotion) =>
      promotion.enabled &&
      (promotion.scope === 'CATALOG' ||
        promotion.productIds.includes(productId)),
  );
  const active = applicable.filter(
    (promotion) =>
      Date.parse(promotion.startsAt) <= now.getTime() &&
      now.getTime() < Date.parse(promotion.endsAt),
  );
  active.sort(
    (a, b) => b.discountBps - a.discountBps || a.id.localeCompare(b.id),
  );
  const promotion = active[0] ?? null;
  if (
    promotion &&
    (!Number.isInteger(promotion.discountBps) ||
      promotion.discountBps < 1 ||
      promotion.discountBps > 10000)
  )
    throw new RangeError('Invalid discount');
  const boundaries = applicable
    .flatMap((value) => [Date.parse(value.startsAt), Date.parse(value.endsAt)])
    .filter((time) => time > now.getTime());
  return {
    basePriceMinor,
    unitPriceMinor: promotion
      ? Math.floor(
          (basePriceMinor * (10000 - promotion.discountBps) + 5000) / 10000,
        )
      : basePriceMinor,
    promotion,
    nextChangeAt: boundaries.length
      ? new Date(Math.min(...boundaries)).toISOString()
      : null,
  };
}
