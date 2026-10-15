export type PricingLine = Readonly<{
  productId: string;
  catalogVersion: number;
  productName: string;
  categoryLabel: string;
  saleUnit: string | null;
  basePriceMinor: number;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  available: boolean;
  promotion: Readonly<{
    id: string;
    name: string;
    version: number;
    discountBps: number;
    startsAt: string;
    endsAt: string;
  }> | null;
}>;

export type PricingSnapshot = Readonly<{
  items: readonly PricingLine[];
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  requestedDate: string;
  fulfillment: 'PICKUP' | 'DELIVERY';
  deliveryLocationHash: string | null;
  deliveryQuoteVersion: number;
}>;

export type CheckoutPricingReview = Readonly<{
  publicId: string;
  revisionId: string | null;
  accepted: boolean;
  canAccept: boolean;
  conflict: boolean;
  paymentMethod?: import('@/domain/payment-method').PaymentMethod | null;
  paymentStatus: string;
  orderStatus: string;
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  items: readonly PricingLine[];
  pricedAt: string;
  validUntil: string | null;
}>;
