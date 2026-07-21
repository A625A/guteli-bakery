'use client';

import { useState, type ChangeEvent } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { ProductArtwork } from '@/components/menu/ProductArtwork';
import { operationalCopy } from '@/content/business';
import type { MenuProduct } from '@/content/menu';
import { formatGTQ } from '@/lib/money';

type ProductCardProps = {
  product: MenuProduct;
};

type Announcement = {
  id: number;
  message: string;
};

function getAddedMessage(product: MenuProduct, quantity: number): string {
  const unit = product.saleUnit?.toLocaleLowerCase('es-GT').startsWith('bolsa')
    ? quantity === 1
      ? 'bolsa agregada'
      : 'bolsas agregadas'
    : quantity === 1
      ? 'producto agregado'
      : 'productos agregados';

  return `${quantity} ${unit} al carrito: ${product.name} de ${product.categoryLabel}.`;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, hydrated, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const inputId = `quantity-${product.id}`;
  const capacityId = `capacity-${product.id}`;
  const currentQuantity =
    items.find((item) => item.productId === product.id)?.quantity ?? 0;
  const remainingCapacity = Math.max(0, 99 - currentQuantity);
  const isAtCapacity = remainingCapacity === 0;

  function updateQuantity(event: ChangeEvent<HTMLInputElement>) {
    const nextQuantity = Math.trunc(event.currentTarget.valueAsNumber);

    if (Number.isNaN(nextQuantity)) {
      return;
    }

    setQuantity(Math.min(99, Math.max(1, nextQuantity)));
  }

  function addToCart() {
    const effectiveQuantity = Math.min(quantity, remainingCapacity);

    if (effectiveQuantity < 1) {
      return;
    }

    addItem(product.id, effectiveQuantity);
    setQuantity(1);
    setAnnouncement((currentAnnouncement) => ({
      id: (currentAnnouncement?.id ?? 0) + 1,
      message: getAddedMessage(product, effectiveQuantity),
    }));
  }

  return (
    <article className="product-card" data-testid="product-card">
      <ProductArtwork
        category={product.category}
        label={product.categoryLabel}
      />
      <div className="product-card__body">
        <p className="product-card__category">{product.categoryLabel}</p>
        <h3>{product.name}</h3>
        <p className="product-card__unit">
          {product.saleUnit ?? operationalCopy.quantityUnknown}
        </p>
        <strong className="product-card__price">
          {formatGTQ(product.price)}
        </strong>
        <div className="product-card__actions">
          <label htmlFor={inputId}>
            Cantidad de {product.name}, {product.categoryLabel}
          </label>
          <input
            id={inputId}
            type="number"
            min="1"
            max="99"
            inputMode="numeric"
            value={quantity}
            onChange={updateQuantity}
            disabled={!hydrated || isAtCapacity}
            aria-describedby={isAtCapacity ? capacityId : undefined}
          />
          <button
            type="button"
            onClick={addToCart}
            disabled={!hydrated || isAtCapacity}
          >
            {isAtCapacity
              ? `Máximo de 99 alcanzado para ${product.name} de ${product.categoryLabel}`
              : `Agregar ${product.name} de ${product.categoryLabel}`}
          </button>
        </div>
        {isAtCapacity ? (
          <p className="product-card__capacity" id={capacityId}>
            Máximo de 99 unidades para esta opción del menú.
          </p>
        ) : null}
        {announcement ? (
          <p
            className="product-card__status"
            key={announcement.id}
            role="status"
          >
            {announcement.message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
