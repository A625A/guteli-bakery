import { paymentMethodLabel } from '@/domain/payment-method';
import { operationalCopy, siteConfig } from '@/content/business';
import type { CartLine } from '@/domain/cart';
import { getCartSubtotal } from '@/domain/cart';
import type { OrderFormValues } from '@/domain/order';
import { formatGTQ } from '@/lib/money';

const fulfillmentLabels: Record<OrderFormValues['fulfillment'], string> = {
  pickup: 'Recogida',
  delivery: 'Entrega',
};

export function buildOrderSummary(
  cartLines: readonly CartLine[],
  values: OrderFormValues,
): string {
  const summary = [
    `Solicitud de pedido — ${siteConfig.name}`,
    '',
    `Nombre: ${normalizeSummaryField(values.name)}`,
    `Teléfono: ${normalizeSummaryField(values.phone)}`,
    `Modalidad: ${fulfillmentLabels[values.fulfillment]}`,
    `Fecha solicitada: ${values.requestedDate.trim()}`,
  ];

  if (values.fulfillment === 'delivery') {
    summary.push(
      `Ubicación de entrega: ${normalizeSummaryField(values.location)}`,
    );
  }

  if (values.notes.trim()) {
    summary.push(`Notas: ${normalizeSummaryField(values.notes)}`);
  }

  summary.push('', 'Productos:');

  for (const line of cartLines) {
    summary.push(
      `- ${line.quantity} × ${line.product.category.name} — ${line.product.name}`,
      `  Presentación: ${line.product.saleUnit ?? operationalCopy.quantityUnknown}`,
      `  Total de línea: ${formatGTQ(line.lineTotal)}`,
    );
  }

  summary.push(
    '',
    `Subtotal estimado: ${formatGTQ(getCartSubtotal(cartLines))}`,
    operationalCopy.confirmation,
  );

  return summary.join('\n');
}

function normalizeSummaryField(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Private, server-resolved order data. Never build this from cart/browser prices. */
export type CheckoutSummaryInput = Readonly<{
  publicId: string;
  customerName: string;
  phone: string;
  fulfillment: 'PICKUP' | 'DELIVERY';
  requestedDate: string;
  deliveryLocation: string | null;
  notes: string | null;
  orderStatus: string;
  paymentMethod?: import('@/domain/payment-method').PaymentMethod | null;
  paymentStatus: string;
  accepted: boolean;
  pricedAt: string;
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  items: readonly import('@/domain/checkout-pricing').PricingLine[];
}>;

const summaryPaymentLabels: Readonly<Record<string, string>> = {
  UNPAID: 'Sin pagar. No se ha verificado ningún pago.',
  PENDING: 'Pago en proceso, todavía sin verificar.',
  FAILED: 'Pago no completado.',
  // Ticket05 has not provided an authoritative verification record yet.
  PAID: 'Pago registrado, sin verificación del proveedor. No es comprobante de pago.',
  REFUNDED: 'Reembolso registrado, sin verificación del proveedor.',
};
const summaryOrderLabels: Readonly<Record<string, string>> = {
  RECEIVED: 'Solicitud recibida',
  CONFIRMED: 'Confirmado por la tienda',
  PREPARING: 'En preparación',
  READY: 'Listo para entregar',
  OUT_FOR_DELIVERY: 'En camino',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export function buildCheckoutSummary(order: CheckoutSummaryInput): string {
  const clean = (value: string) =>
    normalizeSummaryField(value).replace(/[\u202a-\u202e\u2066-\u2069]/g, '');
  const text = [
    `Resumen de pedido — ${siteConfig.name}`,
    `Pedido: ${clean(order.publicId)}`,
    `Estado del pedido: ${summaryOrderLabels[order.orderStatus] ?? 'Por confirmar'}`,
    `Método de pago: ${paymentMethodLabel(order.paymentMethod)}`,
    `Pago: ${summaryPaymentLabels[order.paymentStatus] ?? 'Sin verificación disponible.'}`,
    `Precios consultados: ${new Intl.DateTimeFormat('es-GT', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Guatemala' }).format(new Date(order.pricedAt))} (America/Guatemala)`,
    '',
    `Nombre: ${clean(order.customerName)}`,
    `Teléfono: ${clean(order.phone)}`,
    `Modalidad: ${order.fulfillment === 'PICKUP' ? 'Recogida' : 'Entrega'}`,
    `Fecha solicitada: ${order.requestedDate}`,
  ];
  if (order.fulfillment === 'DELIVERY')
    text.push(`Ubicación de entrega: ${clean(order.deliveryLocation ?? '')}`);
  if (order.notes) text.push(`Notas: ${clean(order.notes)}`);
  text.push('', 'Productos:');
  for (const item of order.items) {
    text.push(
      `- ${item.quantity} × ${clean(item.categoryLabel)} — ${clean(item.productName)}`,
      `  Presentación: ${clean(item.saleUnit ?? operationalCopy.quantityUnknown)}`,
      `  Precio regular: ${formatGTQ(item.basePriceMinor)}`,
      `  Precio unitario: ${formatGTQ(item.unitPriceMinor)}`,
    );
    if (item.promotion)
      text.push(
        `  Promoción: ${clean(item.promotion.name)} (${item.promotion.discountBps / 100}% de descuento)`,
      );
    text.push(`  Total de línea: ${formatGTQ(item.lineTotalMinor)}`);
    if (!item.available)
      text.push('  Producto no disponible actualmente; consulta con Güteli.');
  }
  const discount = order.items.reduce(
    (total, item) =>
      total + (item.basePriceMinor - item.unitPriceMinor) * item.quantity,
    0,
  );
  text.push(
    '',
    `Descuento total: ${formatGTQ(discount)}`,
    `Subtotal: ${formatGTQ(order.subtotalMinor)}`,
    order.shippingMinor === null
      ? 'Envío: por cotizar'
      : `Envío: ${formatGTQ(order.shippingMinor)}`,
    order.totalMinor === null
      ? 'Total: por confirmar (falta cotizar el envío)'
      : `Total: ${formatGTQ(order.totalMinor)}`,
    `Aceptación del total: ${order.accepted ? 'aceptado por el cliente' : 'sin aceptación vigente'}`,
    '',
    'Este resumen no es comprobante de pago ni confirma disponibilidad.',
    'Los precios de pedidos sin pago verificado pueden cambiar. Consulta el total actual en la tienda.',
    'Enviar este mensaje no realiza un pago ni modifica el pedido.',
  );
  return text.join('\n');
}
