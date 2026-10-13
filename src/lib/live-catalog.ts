import { z } from 'zod';
import type { PublicProductDto } from '@/server/products/types';
const product = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  category: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
  }),
  priceMinor: z.number().int().nonnegative(),
  originalPriceMinor: z.number().int().nonnegative(),
  promotion: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      discountBps: z.number().int(),
      endsAt: z.string().datetime(),
    })
    .nullable(),
  pricingValidUntil: z.string().datetime().nullable(),
  pricedAt: z.string().datetime(),
  saleUnit: z.string().nullable(),
  stockAvailable: z.boolean(),
  imageUrl: z.string().nullable(),
});
const catalog = z.object({
  categories: z.array(z.object({ products: z.array(product) })),
});
export async function readLiveCatalog(): Promise<readonly PublicProductDto[]> {
  const response = await fetch('/api/products', {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Catalog unavailable');
  return catalog
    .parse(await response.json())
    .categories.flatMap((category) => category.products);
}
export function catalogRefreshDelay(products: readonly PublicProductDto[]) {
  return Math.min(
    30000,
    ...products
      .filter((product) => product.pricingValidUntil && product.pricedAt)
      .map(
        (product) =>
          Date.parse(product.pricingValidUntil!) -
          Date.parse(product.pricedAt!),
      ),
  );
}
