import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { CartProvider } from '@/components/cart/CartProvider';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { publicSiteConfig } from '@/config/public-site';
import { siteConfig } from '@/content/business';
import { getPublicCatalog } from '@/server/products/list-public-products';

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

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const catalog = await getPublicCatalog();
  const products = catalog.categories.flatMap((category) => category.products);

  return (
    <html lang={siteConfig.locale} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <DemoBanner enabled={publicSiteConfig.isDemoMode} />
        <CartProvider products={products}>
          <SiteHeader />
          {children}
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
