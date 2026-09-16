import 'server-only';

import { formatGTQ } from '@/lib/money';

import {
  OWNER_ORDER_TEMPLATE_CONTRACT_VERSION,
  type OwnerOrderMessage,
  type OwnerOrderSnapshot,
} from './types';

type BuildOwnerOrderMessageOptions = Readonly<{
  publicAdminBaseUrl: string;
}>;

function isNonempty(value: string) {
  return value.trim().length > 0;
}

function isMinorAmount(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function buildAdminOrderUrl(baseValue: string, publicId: string) {
  let base: URL;
  try {
    base = new URL(baseValue);
  } catch {
    throw new Error('Invalid public admin base URL');
  }

  if (
    base.protocol !== 'https:' ||
    !base.hostname ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error('Invalid public admin base URL');
  }

  const baseWithSlash = new URL(base.href);
  if (!baseWithSlash.pathname.endsWith('/')) {
    baseWithSlash.pathname += '/';
  }
  return new URL(`admin/orders/${encodeURIComponent(publicId)}`, baseWithSlash)
    .href;
}

function deliveryQuoteLine(order: OwnerOrderSnapshot) {
  if (order.fulfillment === 'PICKUP') {
    if (
      order.deliveryLocation !== null ||
      order.shippingMinor !== 0 ||
      order.totalMinor !== order.subtotalMinor
    ) {
      throw new Error('Invalid owner order message');
    }
    return 'No aplica';
  }

  if (!order.deliveryLocation || !isNonempty(order.deliveryLocation)) {
    throw new Error('Invalid owner order message');
  }
  if (order.shippingMinor === null && order.totalMinor === null) {
    return 'Pendiente';
  }
  if (
    order.shippingMinor === null ||
    order.totalMinor === null ||
    !isMinorAmount(order.shippingMinor) ||
    !isMinorAmount(order.totalMinor) ||
    order.totalMinor !== order.subtotalMinor + order.shippingMinor
  ) {
    throw new Error('Invalid owner order message');
  }
  return `${formatGTQ(order.shippingMinor)} (total ${formatGTQ(order.totalMinor)})`;
}

function assertValidOrder(order: OwnerOrderSnapshot) {
  if (
    !isNonempty(order.publicId) ||
    !isNonempty(order.customerName) ||
    !isNonempty(order.phone) ||
    !isNonempty(order.requestedDate) ||
    !isMinorAmount(order.subtotalMinor) ||
    order.items.length === 0 ||
    order.items.some(
      (item) =>
        !isNonempty(item.productName) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0,
    )
  ) {
    throw new Error('Invalid owner order message');
  }
}

export function buildOwnerOrderMessage(
  order: OwnerOrderSnapshot,
  options: BuildOwnerOrderMessageOptions,
): OwnerOrderMessage {
  assertValidOrder(order);
  const quote = deliveryQuoteLine(order);
  const adminOrderUrl = buildAdminOrderUrl(
    options.publicAdminBaseUrl,
    order.publicId,
  );
  const lines = [
    'Nuevo pedido Guteli',
    `Pedido: ${order.publicId}`,
    `Cliente: ${order.customerName}`,
    `Teléfono: ${order.phone}`,
    `Modalidad: ${order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Recoger'}`,
  ];

  if (order.fulfillment === 'DELIVERY') {
    lines.push(`Ubicación de entrega: ${order.deliveryLocation}`);
  }

  lines.push(`Fecha solicitada: ${order.requestedDate}`, 'Productos:');
  for (const item of order.items) {
    lines.push(`- ${item.quantity} × ${item.productName}`);
  }
  lines.push(
    `Subtotal: ${formatGTQ(order.subtotalMinor)}`,
    `Cotización de entrega: ${quote}`,
  );
  if (order.notes && isNonempty(order.notes)) {
    lines.push(`Notas: ${order.notes}`);
  }
  lines.push(`Administrar: ${adminOrderUrl}`);

  return {
    templateContractVersion: OWNER_ORDER_TEMPLATE_CONTRACT_VERSION,
    publicOrderId: order.publicId,
    bodyText: lines.join('\n'),
    adminOrderUrl,
  };
}
