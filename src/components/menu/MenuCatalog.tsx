'use client';

import { useState } from 'react';

import { ProductCard } from '@/components/menu/ProductCard';
import { filterMenuProducts, type MenuFilterId } from '@/domain/menu';
import type { PublicCategoryDto } from '@/server/products/types';

const menuFilters: readonly { id: MenuFilterId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pretzels', label: 'Pretzels' },
  { id: 'bagels', label: 'Bagels' },
  { id: 'breads', label: 'Panes' },
];

export function MenuCatalog({
  categories,
}: Readonly<{ categories: readonly PublicCategoryDto[] }>) {
  const [activeFilter, setActiveFilter] = useState<MenuFilterId>('all');
  const products = categories.flatMap((category) => category.products);
  const visibleProducts = filterMenuProducts(products, activeFilter);
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
