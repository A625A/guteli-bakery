import Link from 'next/link';

import { CartBadge } from '@/components/cart/CartBadge';
import { BrandMark } from '@/components/shared/BrandMark';
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
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link
          className="brand-link"
          href="/"
          aria-label="Güteli Bakery, inicio"
        >
          <BrandMark />
        </Link>

        <nav className="desktop-navigation" aria-label="Navegación principal">
          <NavigationLinks />
        </nav>

        <details className="mobile-navigation">
          <summary>Abrir menú</summary>
          <nav aria-label="Navegación principal">
            <NavigationLinks />
          </nav>
        </details>
      </div>
    </header>
  );
}
