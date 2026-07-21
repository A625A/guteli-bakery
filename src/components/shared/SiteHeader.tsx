'use client';

import Link from 'next/link';
import { useRef, type MouseEvent } from 'react';

import { CartBadge } from '@/components/cart/CartBadge';
import { OfficialLogo } from '@/components/shared/OfficialLogo';
import { primaryNavigation } from '@/content/business';

function NavigationLinks() {
  return (
    <ul className="site-nav">
      {primaryNavigation.map(({ href, label }) => (
        <li key={href}>
          {href === '/cart/' ? <CartBadge /> : <Link href={href}>{label}</Link>}
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  const mobileNavigationRef = useRef<HTMLDetailsElement>(null);

  function closeMobileNavigation(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('a')) {
      mobileNavigationRef.current?.removeAttribute('open');
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link
          className="brand-link"
          href="/"
          aria-label="Güteli Bakery, inicio"
        >
          <OfficialLogo
            priority
            className="official-logo official-logo--header"
          />
        </Link>

        <nav className="desktop-navigation" aria-label="Navegación principal">
          <NavigationLinks />
        </nav>

        <details className="mobile-navigation" ref={mobileNavigationRef}>
          <summary>Abrir menú</summary>
          <nav
            aria-label="Navegación principal"
            onClick={closeMobileNavigation}
          >
            <NavigationLinks />
          </nav>
        </details>
      </div>
    </header>
  );
}
