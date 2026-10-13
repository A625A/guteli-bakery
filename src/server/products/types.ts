export type PublicCategory = Readonly<{
  id: string;
  slug: string;
  name: string;
}>;

export type PublicProductDto = Readonly<{
  id: string;
  slug: string;
  name: string;
  category: PublicCategory;
  priceMinor: number;
  originalPriceMinor?: number;
  promotion?: Readonly<{
    id: string;
    name: string;
    discountBps: number;
    endsAt: string;
  }> | null;
  pricingValidUntil?: string | null;
  pricedAt?: string;
  saleUnit: string | null;
  stockAvailable: boolean;
  imageUrl: string | null;
}>;

export type PublicCategoryDto = Readonly<
  PublicCategory & {
    products: readonly PublicProductDto[];
  }
>;

export type PublicCatalogDto = Readonly<{
  categories: readonly PublicCategoryDto[];
}>;
