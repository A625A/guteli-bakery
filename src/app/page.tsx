import Image from 'next/image';
import Link from 'next/link';

import { operationalCopy, siteConfig } from '@/content/business';

export default function HomePage() {
  return (
    <main id="main-content" className="home-page" tabIndex={-1}>
      <h1 className="visually-hidden">Pretzels, bagels y panes por encargo</h1>

      <section
        className="home-banner"
        aria-label="Presentación de Güteli Bakery"
      >
        <Image
          src="/images/guteli-banner.png"
          alt="Güteli Bakery: pretzels, bagels y panes por encargo"
          width={1731}
          height={909}
          priority
          sizes="100vw"
        />
      </section>

      <section className="home-action-strip" aria-label="Acciones principales">
        <div className="home-actions">
          <Link className="button-link button-link--primary" href="/menu/">
            Ver el menú
          </Link>
          <Link className="button-link button-link--secondary" href="/order/">
            Preparar mi pedido
          </Link>
        </div>
        <p>Pedidos con {siteConfig.advanceDays} días de anticipación.</p>
      </section>

      <section className="ordering-guide">
        <div className="section-heading ordering-guide__heading">
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
