import type { MenuProduct } from '@/content/menu';

type ProductArtworkProps = {
  category: MenuProduct['category'];
  label: string;
};

const artworkMarks: Record<MenuProduct['category'], string> = {
  pretzels: '∞',
  bagels: '○ ○',
  'burger-buns': '◒',
  nuditos: '⌁⌁⌁',
};

export function ProductArtwork({ category, label }: ProductArtworkProps) {
  return (
    <div
      className={`product-card__media product-card__media--${category}`}
      role="img"
      aria-label={`${label}: ilustración de categoría, no fotografía de producto`}
    >
      <span className="product-card__art-symbol" aria-hidden="true">
        {artworkMarks[category]}
      </span>
      <span className="product-card__art-note">Ilustración de categoría</span>
    </div>
  );
}
