'use client';

import Link from 'next/link';

import { useCart } from '@/components/cart/CartProvider';

export function CartBadge() {
  const { hydrated, itemCount } = useCart();
  const itemLabel = itemCount === 1 ? 'producto' : 'productos';

  return (
    <Link
      className="cart-badge"
      href="/cart/"
      aria-label={
        hydrated ? `Carrito, ${itemCount} ${itemLabel}` : 'Carrito, cargando'
      }
    >
      <span>Carrito</span>
      <span className="cart-badge__count" aria-hidden="true">
        {hydrated ? itemCount : '…'}
      </span>
    </Link>
  );
}
