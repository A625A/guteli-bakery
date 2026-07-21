import Link from 'next/link';

import {
  operationalCopy,
  primaryNavigation,
  siteConfig,
} from '@/content/business';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

const footerInquiry =
  'Hola, quisiera información sobre los productos de Güteli Bakery.';

export function SiteFooter() {
  const whatsappUrl = buildWhatsAppUrl(
    siteConfig.whatsappDigits,
    footerInquiry,
  );

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__facts">
          <p className="site-footer__brand">{siteConfig.name}</p>
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

        <a
          className="site-footer__whatsapp"
          href={whatsappUrl}
          aria-label={`Consultar por WhatsApp al ${siteConfig.whatsappNumber}`}
        >
          <span>Consultar por WhatsApp</span>
          <strong>{siteConfig.whatsappNumber}</strong>
        </a>
      </div>
    </footer>
  );
}
