import { ProductCard } from '@/components/menu/ProductCard';
import { menuCategories, menuProducts } from '@/content/menu';

export function MenuCatalog() {
  return (
    <div className="menu-catalog">
      {menuCategories.map((category) => {
        const products = menuProducts.filter(
          (product) => product.category === category.id,
        );
        const headingId = `menu-category-${category.id}`;

        return (
          <section
            className="menu-category"
            aria-labelledby={headingId}
            key={category.id}
          >
            <div className="menu-category__heading">
              <p className="menu-category__number" aria-hidden="true">
                {String(menuCategories.indexOf(category) + 1).padStart(2, '0')}
              </p>
              <h2 id={headingId}>{category.label}</h2>
            </div>
            <div className="menu-category__products">
              {products.map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
