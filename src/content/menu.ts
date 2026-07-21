export const menuProductIds = [
  'pretzel-original',
  'pretzel-jalapeno',
  'pretzel-pepperoni',
  'bagel-original',
  'bagel-jalapeno',
  'bagel-pepperoni',
  'burger-buns',
  'nuditos',
] as const;

export type MenuProductId = (typeof menuProductIds)[number];

export type MenuProduct = {
  id: MenuProductId;
  category: 'pretzels' | 'bagels' | 'burger-buns' | 'nuditos';
  categoryLabel: string;
  name: string;
  price: number;
  saleUnit: string | null;
};

export const menuCategories = [
  { id: 'pretzels', label: 'Pretzels', note: 'Nuestro sello' },
  { id: 'bagels', label: 'Bagels', note: 'Para cualquier momento' },
  { id: 'burger-buns', label: 'Burger buns', note: 'Hechos para compartir' },
  { id: 'nuditos', label: 'Nuditos', note: 'Bocados para la mesa' },
] as const;

export const menuProducts: readonly MenuProduct[] = [
  {
    id: 'pretzel-original',
    category: 'pretzels',
    categoryLabel: 'Pretzels',
    name: 'Originales',
    price: 60,
    saleUnit: 'Bolsa de 5',
  },
  {
    id: 'pretzel-jalapeno',
    category: 'pretzels',
    categoryLabel: 'Pretzels',
    name: 'Queso y jalapeño',
    price: 75,
    saleUnit: 'Bolsa de 5',
  },
  {
    id: 'pretzel-pepperoni',
    category: 'pretzels',
    categoryLabel: 'Pretzels',
    name: 'Queso y pepperoni',
    price: 75,
    saleUnit: 'Bolsa de 5',
  },
  {
    id: 'bagel-original',
    category: 'bagels',
    categoryLabel: 'Bagels',
    name: 'Originales',
    price: 60,
    saleUnit: null,
  },
  {
    id: 'bagel-jalapeno',
    category: 'bagels',
    categoryLabel: 'Bagels',
    name: 'Queso y jalapeño',
    price: 75,
    saleUnit: null,
  },
  {
    id: 'bagel-pepperoni',
    category: 'bagels',
    categoryLabel: 'Bagels',
    name: 'Queso y pepperoni',
    price: 75,
    saleUnit: null,
  },
  {
    id: 'burger-buns',
    category: 'burger-buns',
    categoryLabel: 'Burger buns',
    name: 'Burger buns',
    price: 55,
    saleUnit: null,
  },
  {
    id: 'nuditos',
    category: 'nuditos',
    categoryLabel: 'Nuditos',
    name: 'Nuditos',
    price: 60,
    saleUnit: 'Bolsa de 15',
  },
];

export function getMenuProduct(id: MenuProductId): MenuProduct | undefined {
  return menuProducts.find((product) => product.id === id);
}
