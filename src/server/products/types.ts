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
