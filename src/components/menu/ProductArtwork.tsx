import Image from 'next/image';

import type { MenuProduct } from '@/content/menu';

type ProductArtworkProps = {
  product: MenuProduct;
  variant?: 'card' | 'cart';
  eager?: boolean;
};

const artworkMarks: Record<MenuProduct['category'], string> = {
  pretzels: '∞',
  bagels: '○ ○',
  'burger-buns': '◒',
  nuditos: '⌁⌁⌁',
};

export function ProductArtwork({
  product,
  variant = 'card',
  eager = false,
}: ProductArtworkProps) {
  const baseClass = variant === 'card' ? 'product-card' : 'cart-line';
  const label = `${product.name} de ${product.categoryLabel}`;

  if (product.image) {
    return (
      <div className={`${baseClass}__media`}>
        <Image
          className={`${baseClass}__photo`}
          src={product.image}
          alt={variant === 'cart' ? '' : label}
          fill
          loading={variant === 'cart' || eager ? 'eager' : 'lazy'}
          sizes={
            variant === 'card'
              ? '(min-width: 1088px) 31vw, (min-width: 768px) 44vw, 100vw'
              : '(min-width: 768px) 120px, 88px'
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClass}__media ${baseClass}__media--${product.category}`}
      role={variant === 'card' ? 'img' : undefined}
      aria-label={
        variant === 'card'
          ? `${product.categoryLabel}: ilustración de categoría, no fotografía de producto`
          : undefined
      }
      aria-hidden={variant === 'cart' ? true : undefined}
    >
      <span className={`${baseClass}__art-symbol`} aria-hidden="true">
        {artworkMarks[product.category]}
      </span>
      {variant === 'card' ? (
        <span className="product-card__art-note">Ilustración de categoría</span>
      ) : null}
    </div>
  );
}
