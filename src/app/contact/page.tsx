import { BrandSymbol } from '@/components/shared/BrandSymbol';
import { publicSiteConfig } from '@/config/public-site';
import { operationalCopy, siteConfig } from '@/content/business';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

const contactQuestion =
  'Hola, quisiera hacer una consulta sobre Güteli Bakery.';

export default function ContactPage() {
  const whatsappUrl =
    publicSiteConfig.handoff.kind === 'live'
      ? buildWhatsAppUrl(publicSiteConfig.handoff.destination, contactQuestion)
      : null;

  return (
    <main id="main-content" className="contact-page" tabIndex={-1}>
      <header className="contact-page__intro">
        <p className="eyebrow">Consulta directa</p>
        <h1>Contacto</h1>
        <p>
          {publicSiteConfig.handoff.kind === 'demo'
            ? 'Esta demostración muestra cómo se coordina una consulta sin abrir un chat real.'
            : publicSiteConfig.handoff.kind === 'live'
              ? 'Abre una conversación solamente cuando quieras hacer una consulta. El enlace no envía mensajes por sí solo.'
              : 'Consulta la información confirmada mientras el envío por WhatsApp no está disponible.'}
        </p>
      </header>

      <div className="contact-layout">
        <section className="contact-card" aria-labelledby="contact-number">
          <BrandSymbol className="brand-symbol--contact" />
          <p className="eyebrow">WhatsApp</p>
          <h2 id="contact-number">{siteConfig.whatsappNumber}</h2>
          <p>Pedidos con {siteConfig.advanceDays} días de anticipación.</p>
          {whatsappUrl ? (
            <a
              className="button-link button-link--primary"
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              Hacer una consulta por WhatsApp
            </a>
          ) : (
            <p className="contact-card__handoff-note">
              {publicSiteConfig.handoff.kind === 'demo'
                ? 'Las solicitudes no se envían desde esta demostración.'
                : 'El envío por WhatsApp no está configurado en este momento.'}
            </p>
          )}
        </section>

        <section
          className="contact-guidance"
          aria-labelledby="contact-guidance-title"
        >
          <p className="eyebrow">Antes de solicitar</p>
          <h2 id="contact-guidance-title">Información por confirmar</h2>
          <ul>
            <li>{operationalCopy.deliveryCost}</li>
            <li>{operationalCopy.pickupInformation}</li>
            <li>{operationalCopy.confirmation}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
