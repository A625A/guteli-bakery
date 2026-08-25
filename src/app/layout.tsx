import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { CartProvider } from '@/components/cart/CartProvider';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { publicSiteConfig } from '@/config/public-site';
import { siteConfig } from '@/content/business';

import '@/styles/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    'Pretzels, bagels y panes artesanales por encargo de Güteli Bakery.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={siteConfig.locale} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <DemoBanner enabled={publicSiteConfig.isDemoMode} />
        <CartProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
