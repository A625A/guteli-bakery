export type CatalogSeedProduct = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  priceMinor: number;
  saleUnit: string | null;
  imageFile: string | null;
};

export const catalogSeedCategories = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    name: 'Pretzels',
    slug: 'pretzels',
    sortOrder: 0,
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    name: 'Bagels',
    slug: 'bagels',
    sortOrder: 1,
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    name: 'Burger buns',
    slug: 'burger-buns',
    sortOrder: 2,
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    name: 'Nuditos',
    slug: 'nuditos',
    sortOrder: 3,
  },
] as const;

export const catalogSeedProducts: readonly CatalogSeedProduct[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    categoryId: catalogSeedCategories[0].id,
    slug: 'pretzel-original',
    name: 'Originales',
    priceMinor: 6000,
    saleUnit: 'Bolsa de 5',
    imageFile: 'pretzel-original.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    categoryId: catalogSeedCategories[0].id,
    slug: 'pretzel-jalapeno',
    name: 'Queso y jalapeño',
    priceMinor: 7500,
    saleUnit: 'Bolsa de 5',
    imageFile: 'pretzel-jalapeno.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    categoryId: catalogSeedCategories[0].id,
    slug: 'pretzel-pepperoni',
    name: 'Queso y pepperoni',
    priceMinor: 7500,
    saleUnit: 'Bolsa de 5',
    imageFile: 'pretzel-pepperoni.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    categoryId: catalogSeedCategories[0].id,
    slug: 'pretzel-tomato-basil',
    name: 'Tomate y albahaca',
    priceMinor: 7500,
    saleUnit: 'Bolsa de 5',
    imageFile: 'pretzel-tomate-albahaca.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    categoryId: catalogSeedCategories[1].id,
    slug: 'bagel-original',
    name: 'Originales',
    priceMinor: 6000,
    saleUnit: null,
    imageFile: 'bagel-original.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    categoryId: catalogSeedCategories[1].id,
    slug: 'bagel-jalapeno',
    name: 'Queso y jalapeño',
    priceMinor: 7500,
    saleUnit: null,
    imageFile: 'bagel-jalapeno.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    categoryId: catalogSeedCategories[1].id,
    slug: 'bagel-pepperoni',
    name: 'Queso y pepperoni',
    priceMinor: 7500,
    saleUnit: null,
    imageFile: 'bagel-pepperoni.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    categoryId: catalogSeedCategories[1].id,
    slug: 'bagel-tomato-basil',
    name: 'Tomate y albahaca',
    priceMinor: 7500,
    saleUnit: 'Bolsa de 5',
    imageFile: 'bagel-tomate-albahaca.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    categoryId: catalogSeedCategories[2].id,
    slug: 'burger-buns',
    name: 'Burger buns',
    priceMinor: 5500,
    saleUnit: null,
    imageFile: 'pan-hamburguesa.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    categoryId: catalogSeedCategories[3].id,
    slug: 'nuditos',
    name: 'Nuditos',
    priceMinor: 6000,
    saleUnit: 'Bolsa de 15',
    imageFile: null,
  },
] as const;
