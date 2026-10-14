import type { WhatsAppHandoff } from '@/config/public-site';

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildCheckoutWhatsAppUrl(
  handoff: WhatsAppHandoff,
  message: string,
): string | null {
  return handoff.kind === 'live'
    ? buildWhatsAppUrl(handoff.destination, message)
    : null;
}
