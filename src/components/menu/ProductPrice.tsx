import { formatGTQ } from '@/lib/money';
import type { PublicProductDto } from '@/server/products/types';
export function ProductPrice({ product }: { product: PublicProductDto }) {
  return (
    <span className="product-price">
      {product.promotion ? (
        <>
          <del aria-label="Precio original">
            {formatGTQ(product.originalPriceMinor ?? product.priceMinor)}
          </del>{' '}
        </>
      ) : null}
      <strong className="product-card__price">
        {formatGTQ(product.priceMinor)}
      </strong>
      {product.promotion ? (
        <span className="product-promotion">
          {product.promotion.name} · {product.promotion.discountBps / 100}%
        </span>
      ) : null}
    </span>
  );
}
