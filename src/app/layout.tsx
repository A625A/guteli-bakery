import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { primaryNavigation, siteConfig } from '@/content/business';

import '@/styles/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Fundación`,
    template: `%s | ${siteConfig.name}`,
  },
  description: 'Fundación técnica del sitio de Güteli Bakery.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={siteConfig.locale}>
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <header className="site-header">
          <div className="site-header__inner">
            <Link
              className="wordmark"
              href="/"
              aria-label="Güteli Bakery, inicio"
            >
              {siteConfig.name}
            </Link>
            <nav aria-label="Principal">
              <ul className="site-nav">
                {primaryNavigation.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <p>Fundación del sitio · Milestone 1</p>
        </footer>
      </body>
    </html>
  );
}
