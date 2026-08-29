import { MenuCatalog } from '@/components/menu/MenuCatalog';
import { operationalCopy, siteConfig } from '@/content/business';
import { getPublicCatalog } from '@/server/products/list-public-products';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const catalog = await getPublicCatalog();

  return (
    <main id="main-content" className="menu-page" tabIndex={-1}>
      <header className="menu-page__intro">
        <div>
          <p className="eyebrow">Horneado artesanal</p>
          <h1>Nuestros productos</h1>
          <p className="menu-page__lead">
            Elige tus favoritos y agrega la cantidad que necesitas.
          </p>
        </div>
        <div className="menu-page__guidance">
          <p>Diez opciones preparadas para que armes tu solicitud con calma.</p>
          <p>
            Pedidos con {siteConfig.advanceDays} días de anticipación.{' '}
            {operationalCopy.confirmation}.
          </p>
        </div>
      </header>
      <MenuCatalog categories={catalog.categories} />
    </main>
  );
}
