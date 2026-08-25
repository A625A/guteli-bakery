'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useCart } from '@/components/cart/CartProvider';

export function CartBadge({
  icon,
  isCurrent = false,
}: {
  icon?: ReactNode;
  isCurrent?: boolean;
}) {
  const { hydrated, itemCount } = useCart();
  const itemLabel = itemCount === 1 ? 'producto' : 'productos';

  return (
    <Link
      className="site-nav__link cart-badge"
      href="/cart/"
      aria-current={isCurrent ? 'page' : undefined}
      aria-label={
        hydrated ? `Carrito, ${itemCount} ${itemLabel}` : 'Carrito, cargando'
      }
    >
      {icon}
      <span className="site-nav__label">Carrito</span>
      <span className="cart-badge__count" aria-hidden="true">
        {hydrated ? itemCount : '…'}
      </span>
    </Link>
  );
}
