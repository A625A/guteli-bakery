'use client';

import { useState, type ChangeEvent } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { operationalCopy } from '@/content/business';
import type { MenuProduct } from '@/content/menu';
import { formatGTQ } from '@/lib/money';

type ProductCardProps = {
  product: MenuProduct;
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
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [announcement, setAnnouncement] = useState('');
  const inputId = `quantity-${product.id}`;

  function updateQuantity(event: ChangeEvent<HTMLInputElement>) {
    const nextQuantity = Math.trunc(event.currentTarget.valueAsNumber);

    if (Number.isNaN(nextQuantity)) {
      return;
    }

    setQuantity(Math.min(99, Math.max(1, nextQuantity)));
  }

  function addToCart() {
    addItem(product.id, quantity);
    setAnnouncement(getAddedMessage(product, quantity));
  }

  return (
    <article className="product-card" data-testid="product-card">
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
        />
        <button type="button" onClick={addToCart}>
          Agregar {product.name} de {product.categoryLabel}
        </button>
      </div>
      {announcement ? (
        <p className="product-card__status" role="status">
          {announcement}
        </p>
      ) : null}
    </article>
  );
}
