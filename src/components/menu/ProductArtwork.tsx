import Image from 'next/image';

import type { PublicProductDto } from '@/server/products/types';

type ProductArtworkProps = {
  product: PublicProductDto;
  variant?: 'card' | 'cart';
  eager?: boolean;
};

const artworkMarks: Record<string, string> = {
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
  const categoryLabel = product.category.name;
  const categorySlug = product.category.slug;
  const label = `${product.name} de ${categoryLabel}`;

  if (product.imageUrl) {
    return (
      <div className={`${baseClass}__media`}>
        <Image
          className={`${baseClass}__photo`}
          src={product.imageUrl}
          alt={variant === 'cart' ? '' : label}
          fill
          loading={eager ? 'eager' : 'lazy'}
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
      className={`${baseClass}__media ${baseClass}__media--${categorySlug}`}
      role={variant === 'card' ? 'img' : undefined}
      aria-label={
        variant === 'card'
          ? `${categoryLabel}: ilustración de categoría, no fotografía de producto`
          : undefined
      }
      aria-hidden={variant === 'cart' ? true : undefined}
    >
      <span className={`${baseClass}__art-symbol`} aria-hidden="true">
        {artworkMarks[categorySlug] ?? '✦'}
      </span>
      {variant === 'card' ? (
        <span className="product-card__art-note">Ilustración de categoría</span>
      ) : null}
    </div>
  );
}
