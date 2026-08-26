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
      `- ${line.quantity} × ${line.product.categoryLabel} — ${line.product.name}`,
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
