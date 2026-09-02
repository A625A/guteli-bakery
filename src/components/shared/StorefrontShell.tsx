import type { ReactNode } from 'react';

import { CartProvider } from '@/components/cart/CartProvider';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { publicSiteConfig } from '@/config/public-site';
import { getPublicCatalog } from '@/server/products/list-public-products';

export async function StorefrontShell({ children }: { children: ReactNode }) {
  const catalog = await getPublicCatalog();
  const products = catalog.categories.flatMap((category) => category.products);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <DemoBanner enabled={publicSiteConfig.isDemoMode} />
      <CartProvider products={products}>
        <SiteHeader />
        {children}
        <SiteFooter />
      </CartProvider>
    </>
  );
}
