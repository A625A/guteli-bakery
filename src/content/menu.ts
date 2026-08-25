export const menuProductIds = [
  'pretzel-original',
  'pretzel-jalapeno',
  'pretzel-pepperoni',
  'pretzel-tomato-basil',
  'bagel-original',
  'bagel-jalapeno',
  'bagel-pepperoni',
  'bagel-tomato-basil',
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
  image: string | null;
};

export const menuCategories = [
  { id: 'pretzels', label: 'Pretzels' },
  { id: 'bagels', label: 'Bagels' },
  { id: 'burger-buns', label: 'Burger buns' },
  { id: 'nuditos', label: 'Nuditos' },
] as const;

export const menuProducts: readonly MenuProduct[] = [
  {
    id: 'pretzel-original',
    category: 'pretzels',
    categoryLabel: 'Pretzels',
    name: 'Originales',
    price: 60,
    saleUnit: 'Bolsa de 5',
    image: '/images/products/pretzel-original.webp',
  },
  {
    id: 'pretzel-jalapeno',
    category: 'pretzels',
    categoryLabel: 'Pretzels',
    name: 'Queso y jalapeño',
    price: 75,
    saleUnit: 'Bolsa de 5',
    image: '/images/products/pretzel-jalapeno.webp',
  },
  {
    id: 'pretzel-pepperoni',
    category: 'pretzels',
    categoryLabel: 'Pretzels',
    name: 'Queso y pepperoni',
    price: 75,
    saleUnit: 'Bolsa de 5',
    image: '/images/products/pretzel-pepperoni.webp',
  },
  {
    id: 'pretzel-tomato-basil',
    category: 'pretzels',
    categoryLabel: 'Pretzels',
    name: 'Tomate y albahaca',
    price: 75,
    saleUnit: 'Bolsa de 5',
    image: '/images/products/pretzel-tomate-albahaca.webp',
  },
  {
    id: 'bagel-original',
    category: 'bagels',
    categoryLabel: 'Bagels',
    name: 'Originales',
    price: 60,
    saleUnit: null,
    image: '/images/products/bagel-original.webp',
  },
  {
    id: 'bagel-jalapeno',
    category: 'bagels',
    categoryLabel: 'Bagels',
    name: 'Queso y jalapeño',
    price: 75,
    saleUnit: null,
    image: '/images/products/bagel-jalapeno.webp',
  },
  {
    id: 'bagel-pepperoni',
    category: 'bagels',
    categoryLabel: 'Bagels',
    name: 'Queso y pepperoni',
    price: 75,
    saleUnit: null,
    image: '/images/products/bagel-pepperoni.webp',
  },
  {
    id: 'bagel-tomato-basil',
    category: 'bagels',
    categoryLabel: 'Bagels',
    name: 'Tomate y albahaca',
    price: 75,
    saleUnit: 'Bolsa de 5',
    image: '/images/products/bagel-tomate-albahaca.webp',
  },
  {
    id: 'burger-buns',
    category: 'burger-buns',
    categoryLabel: 'Burger buns',
    name: 'Burger buns',
    price: 55,
    saleUnit: null,
    image: '/images/products/pan-hamburguesa.webp',
  },
  {
    id: 'nuditos',
    category: 'nuditos',
    categoryLabel: 'Nuditos',
    name: 'Nuditos',
    price: 60,
    saleUnit: 'Bolsa de 15',
    image: null,
  },
];

export function getMenuProduct(id: MenuProductId): MenuProduct | undefined {
  return menuProducts.find((product) => product.id === id);
}
