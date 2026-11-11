import {
  paymentMethodLabel,
  type PaymentMethod,
} from '../../domain/payment-method';
import { formatGTQ } from '../../lib/money';

export type OwnerEmailSnapshot = {
  publicId: string;
  fulfillment: 'PICKUP' | 'DELIVERY';
  requestedDate: string;
  paymentMethod: PaymentMethod | null;
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  items: { productName: string; quantity: number; lineTotalMinor: number }[];
};
export type OwnerEmailRequest = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};
export type FrozenOwnerEmail = {
  firstAttemptAt: string;
  configurationFingerprint: string;
  request: OwnerEmailRequest;
};

const clean = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .trim();

/** Minimal saved-order snapshot. Customer contact/address/notes remain behind admin auth. */
export function buildOwnerOrderEmail(
  order: OwnerEmailSnapshot,
  adminOrigin: string,
) {
  return {
    subject: `Nuevo pedido ${clean(order.publicId)} — Güteli`,
    text: [
      'Nueva solicitud guardada en Güteli.',
      `Pedido: ${clean(order.publicId)}`,
      `Modalidad: ${order.fulfillment === 'PICKUP' ? 'Recogida' : 'Entrega'}`,
      `Fecha solicitada: ${order.requestedDate}`,
      `Método seleccionado: ${paymentMethodLabel(order.paymentMethod)}`,
      '',
      ...order.items.map(
        (item) =>
          `${item.quantity} × ${clean(item.productName)} — ${formatGTQ(item.lineTotalMinor)}`,
      ),
      '',
      `Subtotal: ${formatGTQ(order.subtotalMinor)}`,
      order.shippingMinor === null
        ? 'Envío: por cotizar'
        : `Envío: ${formatGTQ(order.shippingMinor)}`,
      order.totalMinor === null
        ? 'Total: por confirmar (falta cotizar el envío)'
        : `Total guardado: ${formatGTQ(order.totalMinor)}; revisa la aceptación vigente en el panel.`,
      '',
      'Este aviso refleja el pedido al guardarse. No confirma un pago ni que el cliente haya enviado WhatsApp.',
      'El panel administrativo es el registro autorizado. Inicia sesión para revisar el estado y los detalles actuales:',
      `${new URL(adminOrigin).origin}/admin/orders/${encodeURIComponent(order.publicId)}/`,
    ].join('\n'),
  };
}
