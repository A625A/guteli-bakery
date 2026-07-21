import Link from 'next/link';

import {
  operationalCopy,
  primaryNavigation,
  siteConfig,
} from '@/content/business';
import { publicSiteConfig } from '@/config/public-site';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { OfficialLogo } from '@/components/shared/OfficialLogo';

const footerInquiry =
  'Hola, quisiera información sobre los productos de Güteli Bakery.';

export function SiteFooter() {
  const whatsappUrl =
    publicSiteConfig.handoff.kind === 'live'
      ? buildWhatsAppUrl(publicSiteConfig.handoff.destination, footerInquiry)
      : null;

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__facts">
          <OfficialLogo className="official-logo official-logo--footer" />
          <p>Pedidos con {siteConfig.advanceDays} días de anticipación.</p>
          <p>{operationalCopy.deliveryCost}</p>
          <p>{operationalCopy.confirmation}</p>
        </div>

        <nav
          className="site-footer__navigation"
          aria-label="Navegación del pie de página"
        >
          <ul>
            {primaryNavigation.map(({ href, label }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {whatsappUrl ? (
          <a
            className="site-footer__whatsapp"
            href={whatsappUrl}
            aria-label={`Consultar por WhatsApp al ${siteConfig.whatsappNumber}`}
          >
            <span>Consultar por WhatsApp</span>
            <strong>{siteConfig.whatsappNumber}</strong>
          </a>
        ) : (
          <div className="site-footer__whatsapp">
            <span>WhatsApp de referencia</span>
            <strong>{siteConfig.whatsappNumber}</strong>
            <small>
              {publicSiteConfig.handoff.kind === 'demo'
                ? 'Las solicitudes no se envían desde esta demostración.'
                : 'El envío por WhatsApp no está configurado en este momento.'}
            </small>
          </div>
        )}
      </div>
    </footer>
  );
}
