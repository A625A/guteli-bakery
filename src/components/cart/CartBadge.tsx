'use client';

import Link from 'next/link';

import { useCart } from '@/components/cart/CartProvider';
import { BasketIcon } from '@/components/shared/BasketIcon';

export function CartBadge() {
  const { hydrated, itemCount } = useCart();
  const itemLabel = itemCount === 1 ? 'producto' : 'productos';

  return (
    <Link
      className="cart-badge"
      href="/cart/"
      aria-label={
        hydrated ? `Canasta, ${itemCount} ${itemLabel}` : 'Canasta, cargando'
      }
    >
      <BasketIcon className="basket-icon cart-badge__icon" />
      <span>Canasta</span>
      <span className="cart-badge__count" aria-hidden="true">
        {hydrated ? itemCount : '…'}
      </span>
    </Link>
  );
}
