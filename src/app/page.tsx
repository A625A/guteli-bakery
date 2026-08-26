import Link from 'next/link';

import { operationalCopy, siteConfig } from '@/content/business';

function OrderingStepIcon({
  name,
}: {
  name: 'bread-basket' | 'calendar' | 'whatsapp';
}) {
  const commonProps = {
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'bread-basket') {
    return (
      <span className="ordering-guide__icon" aria-hidden="true">
        <svg {...commonProps}>
          <path d="M9 21h30l-3 17H12L9 21Z" />
          <path d="M16 21c0-5 3.4-9 8-9s8 4 8 9" />
          <path d="M16 27h16M14 32h20M19 21l2.5 17M29 21l-2.5 17" />
          <path d="M20 15.5c1.5.2 2.7 1 3.5 2.2M28 15.5c-1.5.2-2.7 1-3.5 2.2" />
        </svg>
      </span>
    );
  }

  if (name === 'calendar') {
    return (
      <span className="ordering-guide__icon" aria-hidden="true">
        <svg {...commonProps}>
          <rect x="8" y="11" width="32" height="28" rx="4" />
          <path d="M15 7v8M33 7v8M8 20h32" />
          <path d="M16 27h4M28 27h4M16 33h4M28 33h4" />
        </svg>
      </span>
    );
  }

  return (
    <span className="ordering-guide__icon" aria-hidden="true">
      <svg {...commonProps}>
        <path d="m9 39 2.5-7A15 15 0 1 1 18 38.5L9 39Z" />
        <path d="M19 21.5c.8 5.7 5 10 10.7 10.8l2.2-3.2-4.3-2.2-1.8 2c-2.2-1-4-2.8-5-5l2-1.8-2.2-4.3-3.2 2.2 1.6 1.5Z" />
      </svg>
    </span>
  );
}

export default function HomePage() {
  return (
    <main id="main-content" className="home-page" tabIndex={-1}>
      <h1 className="visually-hidden">Pretzels, bagels y panes por encargo</h1>

      <section
        className="home-banner"
        aria-label="Presentación de Güteli Bakery"
      >
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/images/guteli-banner-mobile.webp"
            type="image/webp"
          />
          <source srcSet="/images/guteli-banner.webp" type="image/webp" />
          <img
            src="/images/guteli-banner.png"
            alt="Güteli Bakery: pretzels, bagels y panes por encargo"
            width={1731}
            height={909}
            decoding="async"
            fetchPriority="high"
          />
        </picture>
      </section>

      <section className="home-action-strip" aria-label="Acciones principales">
        <div className="home-actions">
          <Link className="button-link button-link--primary" href="/menu/">
            Ver el menú
          </Link>
          <Link className="button-link button-link--secondary" href="/cart/">
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
            <OrderingStepIcon name="bread-basket" />
            <div>
              <h3>Elige del menú</h3>
              <p>Agrega productos y cantidades al carrito.</p>
            </div>
          </li>
          <li>
            <OrderingStepIcon name="calendar" />
            <div>
              <h3>Completa los datos</h3>
              <p>Indica fecha y si deseas recogida o envío.</p>
            </div>
          </li>
          <li>
            <OrderingStepIcon name="whatsapp" />
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
