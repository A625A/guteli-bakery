import type { PublicProductDto } from '@/server/products/types';

export type MenuFilterId = 'all' | 'pretzels' | 'bagels' | 'breads';

export function filterMenuProducts(
  products: readonly PublicProductDto[],
  filter: MenuFilterId,
): PublicProductDto[] {
  return products.filter((product) => {
    if (filter === 'all') {
      return true;
    }

    if (filter === 'breads') {
      return (
        product.category.slug === 'burger-buns' ||
        product.category.slug === 'nuditos'
      );
    }

    return product.category.slug === filter;
  });
}

export function getMenuGuidance(productCount: number): string {
  if (productCount === 1) {
    return 'Una opción preparada para que armes tu solicitud con calma.';
  }

  return productCount === 10
    ? 'Diez opciones preparadas para que armes tu solicitud con calma.'
    : `${productCount} opciones preparadas para que armes tu solicitud con calma.`;
}
