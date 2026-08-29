'use client';

import { useState } from 'react';

import { ProductCard } from '@/components/menu/ProductCard';
import type {
  PublicCategoryDto,
  PublicProductDto,
} from '@/server/products/types';

type MenuFilterId = 'all' | 'pretzels' | 'bagels' | 'breads';

const menuFilters: readonly { id: MenuFilterId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pretzels', label: 'Pretzels' },
  { id: 'bagels', label: 'Bagels' },
  { id: 'breads', label: 'Panes' },
];

function matchesFilter(
  product: PublicProductDto,
  filter: MenuFilterId,
): boolean {
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
}

export function MenuCatalog({
  categories,
}: Readonly<{ categories: readonly PublicCategoryDto[] }>) {
  const [activeFilter, setActiveFilter] = useState<MenuFilterId>('all');
  const products = categories.flatMap((category) => category.products);
  const visibleProducts = products.filter((product) =>
    matchesFilter(product, activeFilter),
  );
  const activeFilterLabel =
    menuFilters.find((filter) => filter.id === activeFilter)?.label ?? 'Todos';

  return (
    <div className="menu-catalog">
      <div className="menu-toolbar">
        <div
          className="menu-filters"
          role="group"
          aria-label="Filtrar productos"
        >
          {menuFilters.map((filter) => (
            <button
              className="menu-filter"
              type="button"
              aria-pressed={activeFilter === filter.id}
              onClick={() => setActiveFilter(filter.id)}
              key={filter.id}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="menu-results" aria-live="polite">
          {activeFilterLabel}: {visibleProducts.length}{' '}
          {visibleProducts.length === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      <section aria-label="Productos del menú">
        <h2 className="visually-hidden">Productos disponibles</h2>
        <div className="menu-product-grid">
          {visibleProducts.map((product, productIndex) => (
            <ProductCard
              product={product}
              eager={productIndex < 4}
              key={product.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
