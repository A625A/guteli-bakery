/** Eight local digits identify Guatemala; all other inputs need explicit country code. */
export function whatsappDestination(phone: string): string | null {
  if (!/^[0-9+(). -]+$/.test(phone.trim())) return null;
  const digits = phone.replace(/\D/g, '');
  if (/^[2-9]\d{7}$/.test(digits) && !phone.trim().startsWith('+'))
    return `502${digits}`;
  return /^\+[1-9]/.test(phone.trim()) &&
    /^[1-9]\d{7,14}$/.test(digits) &&
    !phone.trim().slice(1).includes('+')
    ? digits
    : null;
}
export const WHATSAPP_CONSENT_VERSION = 'order-updates-v1';
export const WHATSAPP_CONSENT_TEXT =
  'Quiero recibir por WhatsApp de Güteli el resumen de este pedido y, cuando exista un pago verificado, su confirmación en el número indicado. Es opcional. Puedo cancelar con BAJA o contactando a Güteli.';
