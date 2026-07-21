import Link from 'next/link';

import { BakeryIllustration } from '@/components/shared/BakeryIllustration';
import { operationalCopy, siteConfig } from '@/content/business';
import { menuCategories, menuProducts } from '@/content/menu';
import { formatGTQ } from '@/lib/money';

export default function HomePage() {
  return (
    <main id="main-content" className="home-page" tabIndex={-1}>
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">Güteli Bakery · Panadería por encargo</p>
          <h1>Pretzels, bagels y panes por encargo</h1>
          <p className="home-hero__slogan">{siteConfig.slogan}</p>
          <p className="home-hero__intro">
            Explora el menú, arma tu solicitud y envíala para confirmar los
            detalles por WhatsApp.
          </p>
          <div className="home-actions">
            <Link className="button-link button-link--primary" href="/menu/">
              Ver el menú
            </Link>
            <Link className="button-link button-link--secondary" href="/order/">
              Preparar mi pedido
            </Link>
          </div>
        </div>

        <div className="home-hero__art">
          <div className="home-hero__wordmark" aria-label="Güteli Bakery">
            <strong>GÜTELI</strong>
            <span>Bakery</span>
          </div>
          <BakeryIllustration variant="hero" />
          <p className="home-hero__stamp">Hecho por encargo · Guatemala</p>
          <div className="home-hero__label">
            <span>Ilustración editorial de panadería</span>
            <ul aria-label="Categorías del menú">
              {menuCategories.map((category) => (
                <li key={category.id}>{category.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="home-menu-preview" aria-label="Precios del menú">
        <div className="section-heading">
          <p className="eyebrow">Una mirada al menú</p>
          <h2>Cuatro categorías para elegir</h2>
          <p>Precios publicados para preparar tu solicitud.</p>
        </div>

        <div className="home-menu-preview__list">
          {menuCategories.map((category) => {
            const product = menuProducts.find(
              (candidate) => candidate.category === category.id,
            );

            if (!product) {
              return null;
            }

            return (
              <article className="home-menu-preview__item" key={category.id}>
                <p>{category.label}</p>
                <h3>{product.name}</h3>
                <span>
                  {product.saleUnit ?? operationalCopy.quantityUnknown}
                </span>
                <strong>{formatGTQ(product.price)}</strong>
              </article>
            );
          })}
        </div>

        <Link className="text-link home-menu-preview__link" href="/menu/">
          Ver las ocho opciones del menú
        </Link>
      </section>

      <section className="ordering-guide">
        <div className="section-heading">
          <p className="eyebrow">Tu solicitud, paso a paso</p>
          <h2>Cómo hacer un pedido</h2>
        </div>
        <ol className="ordering-guide__steps" aria-label="Cómo hacer un pedido">
          <li>
            <span>01</span>
            <div>
              <h3>Elige del menú</h3>
              <p>Agrega productos y cantidades al carrito.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Completa los datos</h3>
              <p>Indica fecha y si deseas recogida o envío.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Confirma por WhatsApp</h3>
              <p>Envía el resumen para coordinar los detalles.</p>
            </div>
          </li>
        </ol>

        <aside className="ordering-guide__notice" aria-label="Antes de pedir">
          <p>
            Haz tu pedido con {siteConfig.advanceDays} días de anticipación.
          </p>
          <p>{operationalCopy.confirmation}</p>
        </aside>
      </section>
    </main>
  );
}
