import { operationalCopy, siteConfig } from '@/content/business';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <p className="site-footer__brand">{siteConfig.name}</p>
          <p>Pedidos con {siteConfig.advanceDays} días de anticipación.</p>
        </div>
        <div>
          <p>
            Pedidos por WhatsApp:{' '}
            <a href={`tel:+${siteConfig.whatsappDigits}`}>
              {siteConfig.whatsappNumber}
            </a>
          </p>
          <p>{operationalCopy.deliveryCost}.</p>
        </div>
      </div>
    </footer>
  );
}
