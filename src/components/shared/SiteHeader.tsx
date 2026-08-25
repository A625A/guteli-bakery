'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, type MouseEvent } from 'react';

import { CartBadge } from '@/components/cart/CartBadge';
import { BrandMark } from '@/components/shared/BrandMark';
import { primaryNavigation } from '@/content/business';

type NavigationIconName = 'home' | 'menu' | 'cart' | 'order' | 'contact';

const navigationIcons: Record<
  (typeof primaryNavigation)[number]['href'],
  NavigationIconName
> = {
  '/': 'home',
  '/menu/': 'menu',
  '/cart/': 'cart',
  '/order/': 'order',
  '/contact/': 'contact',
};

function NavigationIcon({ name }: { name: NavigationIconName }) {
  const commonProps = {
    className: 'site-nav__icon',
    viewBox: '0 0 32 32',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'home') {
    return (
      <svg {...commonProps}>
        <path d="M4.5 14.5 16 4l11.5 10.5" />
        <path d="M7.5 13v14h17V13M13 27v-8h6v8" />
        <path className="site-nav__icon-accent" d="M20.5 7.9 24 11V6h-3.5" />
      </svg>
    );
  }

  if (name === 'menu') {
    return (
      <svg {...commonProps}>
        <ellipse cx="12" cy="15.5" rx="6.8" ry="9" />
        <ellipse cx="20" cy="15.5" rx="6.8" ry="9" />
        <path
          className="site-nav__icon-accent"
          d="M10 23.5c2.8 2.4 9.2 2.4 12 0"
        />
      </svg>
    );
  }

  if (name === 'cart') {
    return (
      <svg {...commonProps}>
        <path d="M7 11h18l-1.5 15h-15L7 11Z" />
        <path d="M12 12V9a4 4 0 0 1 8 0v3" />
        <path
          className="site-nav__icon-accent"
          d="M12.5 18.5c2 2.5 5 2.5 7 0"
        />
      </svg>
    );
  }

  if (name === 'order') {
    return (
      <svg {...commonProps}>
        <path d="M5 23h22M7 20h18c0-6-3.8-10-9-10S7 14 7 20Z" />
        <path d="M16 10V7" />
        <path className="site-nav__icon-accent" d="M13.5 6.5h5" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M6 24.5 7.6 20A10 10 0 1 1 12 24.3L6 24.5Z" />
      <path
        className="site-nav__icon-accent"
        d="M16 19.7s-4.2-2.4-4.2-5.4a2.4 2.4 0 0 1 4.2-1.6 2.4 2.4 0 0 1 4.2 1.6c0 3-4.2 5.4-4.2 5.4Z"
      />
    </svg>
  );
}

function normalizePath(path: string) {
  return path === '/' ? path : path.replace(/\/$/, '');
}

function NavigationLinks() {
  const pathname = usePathname();

  return (
    <ul className="site-nav">
      {primaryNavigation.map(({ href, label }) => {
        const isCurrent = normalizePath(pathname) === normalizePath(href);
        const icon = <NavigationIcon name={navigationIcons[href]} />;

        return (
          <li key={href}>
            {href === '/cart/' ? (
              <CartBadge icon={icon} isCurrent={isCurrent} />
            ) : (
              <Link
                className={`site-nav__link${href === '/order/' ? ' site-nav__link--order' : ''}`}
                href={href}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {icon}
                <span className="site-nav__label">{label}</span>
              </Link>
            )}
          </li>
        );
      })}
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
          <BrandMark />
        </Link>

        <nav className="desktop-navigation" aria-label="Navegación principal">
          <NavigationLinks />
        </nav>

        <details className="mobile-navigation" ref={mobileNavigationRef}>
          <summary>
            <span className="mobile-navigation__menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Abrir menú</span>
          </summary>
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
