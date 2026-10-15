export const paymentMethods = [
  'BANK_TRANSFER',
  'CASH_PICKUP',
  'CASH_DELIVERY',
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export function paymentMethodLabel(method: string | null | undefined): string {
  const labels: Record<PaymentMethod, string> = {
    BANK_TRANSFER: 'Transferencia bancaria',
    CASH_PICKUP: 'Efectivo al recoger',
    CASH_DELIVERY: 'Efectivo contra entrega',
  };
  return method && Object.hasOwn(labels, method)
    ? labels[method as PaymentMethod]
    : 'Método de pago pendiente de definir por la tienda';
}
export function methodMatchesFulfillment(
  method: PaymentMethod,
  fulfillment: 'PICKUP' | 'DELIVERY',
) {
  return (
    method === 'BANK_TRANSFER' ||
    (method === 'CASH_PICKUP'
      ? fulfillment === 'PICKUP'
      : fulfillment === 'DELIVERY')
  );
}
// No authoritative collection evidence exists yet. Never turn a legacy marker into proof.
export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'UNPAID':
      return 'Pendiente de pago';
    case 'PENDING':
      return 'Pago pendiente de verificación';
    case 'PAID':
      return 'Pago registrado, sin verificación';
    case 'REFUNDED':
      return 'Reembolso registrado, sin verificación';
    case 'FAILED':
      return 'Pago no completado';
    default:
      return 'Pago sin verificación disponible';
  }
}
