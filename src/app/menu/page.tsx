import { MenuCatalog } from '@/components/menu/MenuCatalog';
import { BrandSymbol } from '@/components/shared/BrandSymbol';
import { operationalCopy, siteConfig } from '@/content/business';

export default function MenuPage() {
  return (
    <main id="main-content" className="menu-page" tabIndex={-1}>
      <header className="menu-page__intro">
        <div className="menu-page__title">
          <div>
            <p className="eyebrow">Ocho opciones para tu solicitud</p>
            <h1>Nuestro menú</h1>
            <p className="menu-page__count">
              <strong>08</strong>
              <span>opciones confirmadas en 4 categorías</span>
            </p>
          </div>
          <BrandSymbol className="brand-symbol--menu" />
        </div>
        <div className="menu-page__guidance">
          <p>
            Agrega las cantidades que deseas y revisa tu canasta antes de enviar
            la solicitud.
          </p>
          <p>
            Pedidos con {siteConfig.advanceDays} días de anticipación.{' '}
            {operationalCopy.confirmation}.
          </p>
        </div>
      </header>
      <MenuCatalog />
    </main>
  );
}
